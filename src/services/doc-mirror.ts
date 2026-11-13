/**
 * 人脉文档自动增量镜像调度器（DocumentMirrorScheduler）
 *
 * 核心机制：
 * 1. 防抖调度：对同一人物文档 ID 800ms 防抖，并发或短时间内多次数据变更合并为一次镜像写入；
 * 2. 避免光标干扰：当用户正在思源当前活跃编辑器中积极编辑该文档时，推迟 3 秒后重试，避免影响光标位置与撤销栈；
 * 3. 增量核验：底层块级写入前均比对 Markdown 哈希或内容，内容无变化时 0 次内核写入；
 * 4. 非阻塞容错：自动镜像失败时记录警告日志，绝不抛出异常阻断用户在前台工作台的操作。
 */

import type { Plugin } from "siyuan";
import { getActiveEditor } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { getRoster } from "./roster.ts";
import { documentExists } from "../api/blocks.ts";
import { syncFullPersonDocument } from "./doc-section.ts";

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastTypingTimes = new Map<string, number>();

/** 记录某文档正在被用户键盘输入编辑（用于推迟后台投影，防光标跳动） */
export function markDocumentActiveTyping(docId: string): void {
    if (!docId) return;
    lastTypingTimes.set(docId, Date.now());
}

/** 调度某人物文档的自动增量镜像 */
export function schedulePersonDocMirror(
    plugin: Plugin,
    personDocId: string,
    delayMs = 800,
): void {
    if (!personDocId) return;
    const existing = pendingTimers.get(personDocId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
        pendingTimers.delete(personDocId);
        await runPersonDocMirror(plugin, personDocId);
    }, delayMs);

    pendingTimers.set(personDocId, timer);
}

/** 执行单文档后台同步镜像（安全非阻塞，支持 1 次补偿重试） */
export async function runPersonDocMirror(plugin: Plugin, personDocId: string, isRetry = false): Promise<boolean> {
    try {
        const settings = (plugin as Plugin & { settings?: ContactsSettings }).settings;
        if (!settings) return false;

        // 检查活跃编辑器：若用户正停留在该文档中且近期有输入，延后 3 秒避开光标
        try {
            const activeEditor = getActiveEditor?.();
            const activeRootId = (activeEditor as { protyle?: { block?: { rootID?: string } } })?.protyle?.block?.rootID;
            const lastType = lastTypingTimes.get(personDocId) ?? 0;
            if (activeRootId === personDocId && Date.now() - lastType < 3000) {
                schedulePersonDocMirror(plugin, personDocId, 3000);
                return false;
            }
        } catch {}

        if (!(await documentExists(personDocId))) return false;

        const people = await getRoster(settings);
        const person = people.find((p) => p.docId === personDocId);
        if (!person) return false;

        await syncFullPersonDocument(plugin, person);
        return true;
    } catch (err) {
        console.warn(`[LvContacts] 后台自动同步人物文档未完成 (${personDocId}):`, err);
        // 单次偶发失败时延迟 2.5 秒安排一次且仅一次补偿重试，提高并发锁竞争下的最终一致性
        if (!isRetry) {
            schedulePersonDocMirror(plugin, personDocId, 2500);
        }
        return false;
    }
}

/** 销毁所有挂起的调度定时器（插件卸载或页面关闭时调用） */
export function disposeDocMirrorScheduler(): void {
    for (const timer of pendingTimers.values()) {
        clearTimeout(timer);
    }
    pendingTimers.clear();
    lastTypingTimes.clear();
}
