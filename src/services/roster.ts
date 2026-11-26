/**
 * 名册缓存：全量联系人列表的进程内缓存（TTL + 写失效）。
 *
 * 为什么需要（DATA-CONTRACT §4）：生日提醒、久未联系、图谱、关系候选都是"全员扫描"型需求，
 * 各自全量渲染一次数据库，人数上千就会卡。名册 30 秒 TTL 内复用一次内核渲染；
 * 所有经 services 层的写操作立即失效。多窗口下他人写入最多滞后一个 TTL，
 * 与"派生数据只投影"纪律一致——缓存可随时重建，不是事实源。
 */
import { renderView } from "../api/av";
import { querySql } from "../api/client";
import { isRosterFresh, rosterFromRender, ROSTER_TTL_MS } from "../domain/roster.ts";
import type { RosterEntry } from "../domain/roster";
import type { ContactsSettings } from "../domain/model";
import type { ContactSummary } from "../domain/person";
import { isSelfDoc } from "../domain/self-identity";
import { loadSelfIdentityBound } from "../data/self-identity";
import { normalizeChannels, type ContactChannel } from "../domain/person-channels";
import { parseContactLocationsAttr, type ContactLocations } from "../domain/china-regions";

let cache: RosterEntry | null = null;
let cacheKey: string | null = null;
let generation = 0;
let pending: { key: string; generation: number; promise: Promise<ContactSummary[]> } | null = null;

/** 轨道 A：联系人/关联文档 ID 内存 Set 快路径过滤集合 */
let contactDocIdSet: Set<string> | null = null;
const associatedDocIdSet = new Set<string>();

export { ROSTER_TTL_MS };

function extractLocationsIalValue(ial: string): string | undefined {
    for (const attr of ["custom-lv-locations", "custom-lvct-locations"]) {
        const m = ial.match(new RegExp(`(?:^|[\\s{:])${attr}="([^"]*)"`));
        if (m?.[1]) return m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    }
    return undefined;
}

function parseLocationsAndChannelsFromRows(
    rows: unknown,
    targetMap: Map<string, { channels?: ContactChannel[]; locations?: ContactLocations }>,
): void {
    if (!Array.isArray(rows)) return;
    for (const r of rows as Array<{ id?: string; ial?: string }>) {
        if (!r || typeof r.id !== "string" || !r.id) continue;
        const ial = r.ial || "";
        const entry: { channels?: ContactChannel[]; locations?: ContactLocations } = {};
        const m = ial.match(/(?:^|[\s{:])custom-lvct-channels="([^"]*)"/);
        if (m && m[1]) {
            const rawCh = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
            try {
                const parsed = JSON.parse(decodeURIComponent(rawCh));
                if (Array.isArray(parsed)) entry.channels = normalizeChannels(parsed);
            } catch {
                try {
                    const parsed = JSON.parse(rawCh);
                    if (Array.isArray(parsed)) entry.channels = normalizeChannels(parsed);
                } catch {}
            }
        }
        const locRaw = extractLocationsIalValue(ial);
        if (locRaw) {
            const parsedLocs = parseContactLocationsAttr(locRaw);
            if (parsedLocs.resident || parsedLocs.hometown) {
                entry.locations = parsedLocs;
            }
        }
        targetMap.set(r.id, entry);
    }
}

/** 批量预加载文档 IAL 中的 custom-lvct-channels 与 custom-lv-locations / custom-lvct-locations 并投影到联系人列表 */
export async function enrichContactLocationsAndChannels(
    people: ContactSummary[],
): Promise<ContactSummary[]> {
    try {
        const docIds = [...new Set(people.map((p) => p.docId).filter(Boolean))];
        if (docIds.length === 0) return people;
        const resultCache = new Map<string, { channels?: ContactChannel[]; locations?: ContactLocations }>();
        for (let i = 0; i < docIds.length; i += 500) {
            const batch = docIds.slice(i, i + 500);
            const inClause = batch.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
            const rows = await querySql<{ id: string; ial: string }>(
                `SELECT id, ial FROM blocks WHERE id IN (${inClause}) AND (ial LIKE '%custom-lvct-channels%' OR ial LIKE '%custom-lv-locations%' OR ial LIKE '%custom-lvct-locations%')`,
            );
            parseLocationsAndChannelsFromRows(rows, resultCache);
        }
        return people.map((person) => {
            const extra = resultCache.get(person.docId);
            if (!extra || (!extra.channels && !extra.locations)) return person;
            return {
                ...person,
                ...(extra.channels ? { channels: extra.channels } : {}),
                ...(extra.locations ? { locations: extra.locations } : {}),
            };
        });
    } catch {
        /* 旁路容错，不阻断名册返回 */
        return people;
    }
}

/** 渐进列表投影器：同轮跨页仅读取一次地区与通讯条目 IAL 快照，并缓存复用 */
export function createContactLocationsAndChannelsProjection(): (people: ContactSummary[]) => Promise<ContactSummary[]> {
    let snapshotPromise: Promise<Map<string, { channels?: ContactChannel[]; locations?: ContactLocations }>> | undefined;
    const readSnapshot = async (): Promise<Map<string, { channels?: ContactChannel[]; locations?: ContactLocations }>> => {
        const map = new Map<string, { channels?: ContactChannel[]; locations?: ContactLocations }>();
        try {
            const rows = await querySql<{ id: string; ial: string }>(
                `SELECT id, ial FROM blocks WHERE type = 'd' AND (ial LIKE '%custom-lvct-channels%' OR ial LIKE '%custom-lv-locations%' OR ial LIKE '%custom-lvct-locations%') LIMIT 5000`,
            );
            parseLocationsAndChannelsFromRows(rows, map);
        } catch {
            /* 旁路容错，不阻断名册返回 */
        }
        return map;
    };
    return async (people) => {
        if (people.length === 0) return people;
        const map = await (snapshotPromise ??= readSnapshot());
        if (map.size === 0) return people;
        return people.map((person) => {
            const extra = map.get(person.docId);
            if (!extra || (!extra.channels && !extra.locations)) return person;
            return {
                ...person,
                ...(extra.channels ? { channels: extra.channels } : {}),
                ...(extra.locations ? { locations: extra.locations } : {}),
            };
        });
    };
}

/** 判断名册是否已加载就绪 */
export function isRosterReady(): boolean {
    return contactDocIdSet !== null;
}

/**
 * 判断指定文档 ID 是否属于联系人或已登记的关联文档（组织/城市专题等）
 * 仅在名册已就绪时具有权威性；未就绪时返回 false（需回退走常规加载）。
 */
export function isKnownContactOrRelatedDoc(docId: string): boolean {
    if (!contactDocIdSet) return false;
    return contactDocIdSet.has(docId) || associatedDocIdSet.has(docId);
}

/** 获取当前就绪的联系人/关联文档 ID 集合只读视图 */
export function getKnownContactDocIds(): ReadonlySet<string> | null {
    return contactDocIdSet;
}

/** 登记关联文档 ID（如组织文档、城市专题文档），自动纳入快路径集合 */
export function registerRelatedDocId(docId: string): void {
    if (!docId) return;
    associatedDocIdSet.add(docId);
    contactDocIdSet?.add(docId);
}

/** 注销关联文档 ID */
export function unregisterRelatedDocId(docId: string): void {
    if (!docId) return;
    associatedDocIdSet.delete(docId);
    contactDocIdSet?.delete(docId);
}

/** 同步增量向快路径集合追加联系人文档 ID */
export function addKnownContactDocId(docId: string): void {
    if (!docId) return;
    contactDocIdSet?.add(docId);
}

/** 同步从快路径集合移除联系人文档 ID */
export function removeKnownContactDocId(docId: string): void {
    if (!docId) return;
    contactDocIdSet?.delete(docId);
}

/** 显式预设已知文档 ID 集合（主要用于测试与快速初始化） */
export function setKnownContactDocIds(docIds: Iterable<string>): void {
    const nextSet = new Set<string>(docIds);
    for (const id of associatedDocIdSet) nextSet.add(id);
    contactDocIdSet = nextSet;
}

/** 使联系人文档 ID 快路径缓存失效 */
export function invalidateContactDocIdSet(): void {
    contactDocIdSet = null;
}

export function invalidateRoster(): void {
    cache = null;
    cacheKey = null;
    generation += 1;
    pending = null;
    contactDocIdSet = null;
}

/** 全量名册（缓存优先）。仪表盘/图谱/详情关系候选都应走这里，不要自己再全量渲染 */
export async function getRoster(settings: ContactsSettings): Promise<ContactSummary[]> {
    const now = Date.now();
    const key = JSON.stringify([settings.avId, settings.dbBlockId, settings.fieldMap]);
    const fresh = cache;
    if (cacheKey === key && fresh !== null && isRosterFresh(fresh, settings.avId, now)) {
        if (contactDocIdSet === null) {
            const nextSet = new Set<string>();
            for (const p of fresh.people) {
                if (p.docId) nextSet.add(p.docId);
            }
            for (const id of associatedDocIdSet) {
                nextSet.add(id);
            }
            contactDocIdSet = nextSet;
        }
        return fresh.people;
    }
    if (pending?.key === key && pending.generation === generation) return pending.promise;
    const fieldMap = { ...settings.fieldMap };
    const request = { key, generation, promise: Promise.resolve([] as ContactSummary[]) };
    request.promise = (async () => {
        try {
            /* 名册服务已有自己的 generation/pending 合并。generation 失效后，
             * 必须绕过 API 层同键共享，否则旧 renderAttributeView 请求仍会
             * 占住新读取，导致失效后的最新结果无法及时取得。 */
            const rendered = await renderView(settings.avId, settings.dbBlockId, "", false, { dedupe: generation === 0 });
            const people = rosterFromRender(rendered, fieldMap);
            /* B11.4：名册保留并标识本人——isSelf 供卡片徽标/选人器排除等投影使用；
               身份读取失败或未装配按无标记降级（roster 不因身份层故障而失败） */
            const identity = await loadSelfIdentityBound();
            if (identity) {
                for (const person of people) {
                    if (isSelfDoc(identity, person.docId)) person.isSelf = true;
                }
            }

            // 通讯多维条目与结构化常住地/籍贯批量预加载（赋能城市与地区识别、同城匹配、快捷外联等）
            const enrichedPeople = await enrichContactLocationsAndChannels(people);
            // 已失效或被新配置的请求取代时，仅返回给原调用方，不回填共享缓存。
            if (request.generation === generation && pending === request) {
                cache = { people: enrichedPeople, avId: settings.avId, fetchedAt: Date.now() };
                cacheKey = key;
                const nextSet = new Set<string>();
                for (const p of enrichedPeople) {
                    if (p.docId) nextSet.add(p.docId);
                }
                for (const id of associatedDocIdSet) {
                    nextSet.add(id);
                }
                contactDocIdSet = nextSet;
            }
            return enrichedPeople;
        } finally {
            if (pending === request) pending = null;
        }
    })();
    pending = request;
    return request.promise;
}
