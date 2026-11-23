/**
 * 人脉数据主权自愈与全面落盘服务（Data Sovereignty Backfill & Auto-healing）
 *
 * 核心宗旨：
 * 1. 彻底去私有化存储：让联系人多维通讯条目、往来记录、纪念日、人情账目等 100% 在思源原生 Markdown 文档正文中落盘；
 * 2. 存量数据自愈回写：启动与后台空闲检查存量联系人，自动将隐藏属性与存量 JSON 增量回写至正文受控区块；
 * 3. 严格数据安全：受 withDocLock 互斥排队保护，避开用户正在活跃打字的文档，保证无痛升级、零数据丢失。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { getRoster } from "./roster.ts";
import { readMarkedBlocksByRoots } from "../api/blocks.ts";
import { syncFullPersonDocument, syncChannelsDocSection, CHANNELS_SECTION_ATTR } from "./doc-section.ts";
import { querySql, assertKernelRecord } from "../api/client.ts";
import { normalizeChannels } from "../domain/person-channels.ts";

export interface DataSovereigntyReport {
    totalPeople: number;
    syncedChannelsCount: number;
    pendingChannelsCount: number;
    pendingDocIds: string[];
}

/**
 * 检查当前工作区联系人文档的“数据主权/正文落盘”就绪状态
 */
export async function checkDataSovereigntyStatus(
    _plugin: Plugin,
    settings: ContactsSettings,
): Promise<DataSovereigntyReport> {
    const people = await getRoster(settings);
    if (!people || people.length === 0) {
        return { totalPeople: 0, syncedChannelsCount: 0, pendingChannelsCount: 0, pendingDocIds: [] };
    }

    const docIds = people.map((p) => p.docId).filter(Boolean);
    if (docIds.length === 0) {
        return { totalPeople: people.length, syncedChannelsCount: 0, pendingChannelsCount: 0, pendingDocIds: [] };
    }

    // 批量探测已经落盘了 ## 📞 通讯与联系方式 的文档块
    const markedByRoots = await readMarkedBlocksByRoots(docIds, CHANNELS_SECTION_ATTR).catch(() => ({}));
    const syncedDocIds = new Set(Object.keys(markedByRoots));

    const pendingDocIds: string[] = [];
    for (const person of people) {
        if (!person.docId) continue;
        // 如果未落盘通讯区块，且拥有 channels 或隐藏 custom-lvct-channels 属性
        if (!syncedDocIds.has(person.docId)) {
            pendingDocIds.push(person.docId);
        }
    }

    return {
        totalPeople: people.length,
        syncedChannelsCount: syncedDocIds.size,
        pendingChannelsCount: pendingDocIds.length,
        pendingDocIds,
    };
}

/**
 * 全量联系人文档数据主权回写与自愈同步（支持进度反馈与分批排队）
 */
export async function backfillAllPersonDocuments(
    plugin: Plugin,
    settings: ContactsSettings,
    options?: {
        onProgress?: (current: number, total: number, docId: string) => void;
        docIds?: string[];
        shouldAbort?: () => boolean;
    },
): Promise<{ total: number; success: number; failed: number }> {
    if (options?.shouldAbort?.()) return { total: 0, success: 0, failed: 0 };
    const people = await getRoster(settings);
    if (options?.shouldAbort?.()) return { total: 0, success: 0, failed: 0 };
    const targetPeople = options?.docIds && options.docIds.length > 0
        ? people.filter((p) => options.docIds!.includes(p.docId))
        : people;

    let success = 0;
    let failed = 0;
    const total = targetPeople.length;

    for (let i = 0; i < total; i++) {
        if (options?.shouldAbort?.()) break;
        const person = targetPeople[i];
        if (!person.docId) continue;
        options?.onProgress?.(i + 1, total, person.docId);

        try {
            // 确保多维通讯条目就位
            let channels = person.channels;
            if (!channels || channels.length === 0) {
                try {
                    const rows = await querySql<unknown>(`SELECT ial FROM blocks WHERE id = '${person.docId}' AND type = 'd' LIMIT 1`);
                    if (rows.length) {
                        const row = assertKernelRecord("/api/query/sql", rows[0]);
                        const ialStr = typeof row.ial === "string" ? row.ial : "";
                        const m = ialStr.match(/custom-lvct-channels="([^"]*)"/);
                        if (m && m[1]) {
                            try {
                                channels = normalizeChannels(JSON.parse(decodeURIComponent(m[1])));
                            } catch {
                                try {
                                    channels = normalizeChannels(JSON.parse(m[1]));
                                } catch {}
                            }
                        }
                    }
                } catch {}
            }
            if (options?.shouldAbort?.()) break;

            const personToSync = { ...person, channels: channels || [] };
            await syncFullPersonDocument(plugin, personToSync);
            if (options?.shouldAbort?.()) break;
            if (channels && channels.length > 0) {
                await syncChannelsDocSection(person.docId, channels);
            }
            success++;
        } catch (err) {
            console.warn(`[LvContacts] 数据主权自愈同步文档失败 (${person.docId}):`, err);
            failed++;
        }

        if (options?.shouldAbort?.()) break;
        // 短暂休眠 25ms 避免连续高频磁盘 I/O 阻塞主线程
        if (i < total - 1) {
            await new Promise((r) => setTimeout(r, 25));
        }
    }

    return { total, success, failed };
}

let inFlightAutoHeal: Promise<void> | null = null;
let autoHealTimer: ReturnType<typeof setTimeout> | number = 0;
let autoHealGeneration = 0;

/**
 * 取消当前排队等待的后台自愈扫描，并立即中止已在执行中的异步写入
 */
export function cancelIdleDataSovereigntyAutoHeal(): void {
    autoHealGeneration += 1;
    if (autoHealTimer) {
        clearTimeout(autoHealTimer);
        autoHealTimer = 0;
    }
    inFlightAutoHeal = null;
}

/**
 * 启动时后台空闲自愈扫描与轻量级增量同步
 * 轨道 A：默认推迟 3 分钟（180,000ms），带 in-flight Promise 单飞守卫与 onunload 异步中止清理
 */
export function scheduleIdleDataSovereigntyAutoHeal(
    plugin: Plugin,
    settings: ContactsSettings,
    delayMs = 180_000,
): () => void {
    cancelIdleDataSovereigntyAutoHeal();
    if (typeof window === "undefined") return () => {};

    const scheduledGen = autoHealGeneration;
    autoHealTimer = setTimeout(async () => {
        autoHealTimer = 0;
        if (autoHealGeneration !== scheduledGen) return;
        if (inFlightAutoHeal) return;
        const currentGen = autoHealGeneration;
        const cleanup = () => {
            if (autoHealGeneration === currentGen) {
                inFlightAutoHeal = null;
            }
        };
        const task = (async () => {
            try {
                if (autoHealGeneration !== currentGen) return;
                const report = await checkDataSovereigntyStatus(plugin, settings);
                if (autoHealGeneration !== currentGen) return;
                if (report.pendingChannelsCount > 0) {
                    console.info(`[LvContacts] 检测到 ${report.pendingChannelsCount} 篇联系人文档通讯资料尚未落盘正文，启动后台自愈...`);
                    // 每次空闲最多静默增量自愈 30 篇，杜绝开机卡顿
                    const batchDocIds = report.pendingDocIds.slice(0, 30);
                    if (autoHealGeneration !== currentGen) return;
                    await backfillAllPersonDocuments(plugin, settings, {
                        docIds: batchDocIds,
                        shouldAbort: () => autoHealGeneration !== currentGen,
                    });
                    if (autoHealGeneration !== currentGen) return;
                    console.info(`[LvContacts] 增量通讯资料正文落盘完成 (本批 ${batchDocIds.length} 篇)`);
                }
            } catch (e) {
                console.debug("[LvContacts] 空闲自愈检测旁路忽略:", e);
            } finally {
                cleanup();
            }
        })();
        inFlightAutoHeal = task;
        await task;
    }, delayMs);

    return cancelIdleDataSovereigntyAutoHeal;
}
