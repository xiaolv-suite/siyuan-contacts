/**
 * E-33 联系人软删除回收站与时光机（Trash & Soft Delete Buffer）
 * 当联系人从名册移除（解绑）时，将其元数据快照缓存 30 天，支持一键无损撤销与恢复。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */

import { StoreIntegrityError } from "./store-integrity.ts";
import type { ContactSummary } from "./person.ts";

export const TRASH_STORE_VERSION = 1;
export const TRASH_RETENTION_DAYS = 30;
export const MAX_TRASH_ENTRIES = 200;

export class TrashCapacityError extends Error {
    readonly limit: number;
    readonly existingUnexpiredCount: number;
    readonly incomingCount: number;
    readonly availableSlots: number;

    constructor(existingUnexpiredCount: number, incomingCount: number, limit: number = MAX_TRASH_ENTRIES) {
        const availableSlots = Math.max(0, limit - existingUnexpiredCount);
        const message = availableSlots === 0
            ? `回收站已满（当前有 ${existingUnexpiredCount}/${limit} 条未到期 30 天快照），无法继续移入 ${incomingCount} 位联系人；为避免丢失恢复保障，已取消本次移除（未解绑任何联系人）。请先在回收站清理或恢复部分记录后再试。`
            : `回收站剩余容量不足（上限 ${limit} 条，已有未到期 ${existingUnexpiredCount} 条，仅剩 ${availableSlots} 个空位，本次需移入 ${incomingCount} 位联系人）；为避免丢失恢复保障，已取消本次移除（未解绑任何联系人）。请先清理回收站或分批移除。`;
        super(message);
        this.name = "TrashCapacityError";
        this.limit = limit;
        this.existingUnexpiredCount = existingUnexpiredCount;
        this.incomingCount = incomingCount;
        this.availableSlots = availableSlots;
    }
}

export interface BatchTrashResolution {
    ok: boolean;
    targets: ContactSummary[];
    missingIds: string[];
    error?: string;
}

/**
 * 批量移入回收站前解析每位选中联系人的完整快照；
 * 若存在任何未能解析到完整快照的 itemId，整批拒绝（绝不回退直接解绑 AV 行）。
 */
export function resolveBatchTrashTargets(
    selectedIds: readonly string[],
    lookup: (itemId: string) => ContactSummary | undefined,
): BatchTrashResolution {
    const uniqueIds = [...new Set(selectedIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
        return { ok: false, targets: [], missingIds: [], error: "未选中任何联系人。" };
    }
    const targets: ContactSummary[] = [];
    const missingIds: string[] = [];
    for (const itemId of uniqueIds) {
        const person = lookup(itemId);
        if (person && person.itemId === itemId && typeof person.docId === "string" && person.docId.trim().length > 0) {
            targets.push(person);
        } else {
            missingIds.push(itemId);
        }
    }
    if (missingIds.length > 0) {
        return {
            ok: false,
            targets: [],
            missingIds,
            error: `有 ${missingIds.length} 位选中联系人未在当前名册快照中解析到完整资料，为避免跳过 30 天回收站保护，已拒绝本次批量移除（未解绑任何联系人）。请刷新名册后重试。`,
        };
    }
    return { ok: true, targets, missingIds: [] };
}

const DOC_ID_RE = /^\d{14}-[0-9a-z]{7}$/;

export interface TrashContactSnapshot {
    phone?: string;
    email?: string;
    wechat?: string;
    website?: string;
    birthday?: string;
    isLunar?: boolean;
    group?: string;
    tags: string[];
    avatar?: string;
    relatedItemIds?: string[];
    relatedDocIds?: string[];
}

export interface TrashContactEntry {
    /** 稳定垃圾箱条目 ID */
    id: string;
    /** 人物文档 ID */
    docId: string;
    /** 被删除时的数据库行 ID */
    itemId: string;
    /** 姓名快照 */
    name: string;
    /** 元数据字段快照（供恢复时完整还原到数据库行） */
    snapshot: TrashContactSnapshot;
    /** 移除时间戳（毫秒） */
    removedAt: number;
    /** 自动过期时间戳（毫秒，默认 30 天后） */
    expiresAt: number;
}

export interface TrashStore {
    schemaVersion: 1;
    entries: TrashContactEntry[];
}

export function emptyTrashStore(): TrashStore {
    return { schemaVersion: TRASH_STORE_VERSION, entries: [] };
}

export function newTrashId(): string {
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const random = Math.random().toString(36).slice(2, 9).padEnd(7, "0");
    return `${stamp}-${random}`;
}

/** 创建一条软删除回收站记录 */
export function createTrashEntry(
    person: ContactSummary,
    nowTime: number = Date.now(),
    relatedDocIds?: readonly string[],
): TrashContactEntry {
    const msInDay = 86400 * 1000;
    const cleanRelatedItemIds = [...new Set((person.relatedItemIds ?? []).filter((id) => typeof id === "string" && id.trim().length > 0))];
    const cleanRelatedDocIds = [...new Set((relatedDocIds ?? []).filter((id) => typeof id === "string" && DOC_ID_RE.test(id) && id !== person.docId))];
    return {
        id: newTrashId(),
        docId: person.docId,
        itemId: person.itemId,
        name: person.name,
        snapshot: {
            phone: person.phone || undefined,
            email: person.email || undefined,
            wechat: person.wechat || undefined,
            website: person.website || undefined,
            birthday: person.birthday || undefined,
            isLunar: Boolean(person.isLunar),
            group: person.group || undefined,
            tags: [...person.tags],
            avatar: person.avatar || undefined,
            ...(cleanRelatedItemIds.length > 0 ? { relatedItemIds: cleanRelatedItemIds } : {}),
            ...(cleanRelatedDocIds.length > 0 ? { relatedDocIds: cleanRelatedDocIds } : {}),
        },
        removedAt: nowTime,
        expiresAt: nowTime + TRASH_RETENTION_DAYS * msInDay,
    };
}

/** 清理已超过 30 天有效期的条目 */
export function pruneExpiredTrash(store: TrashStore, nowTime: number = Date.now()): TrashStore {
    const active = store.entries.filter((entry) => entry.expiresAt > nowTime);
    if (active.length === store.entries.length) return store;
    return {
        schemaVersion: TRASH_STORE_VERSION,
        entries: active,
    };
}

/**
 * 批量添加或更新回收站记录：
 * 1. 先清理真正超过 30 天保留期的过期条目；
 * 2. 同 docId 去重合并（保留本次批量中的最新快照并置顶）；
 * 3. 严禁驱逐尚未到期的有效 30 天快照——若未到期总数超过上限 200，原子抛出 TrashCapacityError。
 */
export function addTrashEntries(
    store: TrashStore,
    entries: readonly TrashContactEntry[],
    nowTime: number = Date.now(),
): TrashStore {
    const unexpired = pruneExpiredTrash(store, nowTime);
    if (entries.length === 0) return unexpired;

    const latestByDocId = new Map<string, TrashContactEntry>();
    for (const entry of entries) {
        latestByDocId.delete(entry.docId);
        latestByDocId.set(entry.docId, entry);
    }
    const incoming = [...latestByDocId.values()].reverse();
    const incomingDocIds = new Set(incoming.map((item) => item.docId));
    const remainingExisting = unexpired.entries.filter((item) => !incomingDocIds.has(item.docId));

    if (incoming.length + remainingExisting.length > MAX_TRASH_ENTRIES) {
        throw new TrashCapacityError(remainingExisting.length, incoming.length, MAX_TRASH_ENTRIES);
    }

    return {
        schemaVersion: TRASH_STORE_VERSION,
        entries: [...incoming, ...remainingExisting],
    };
}

/** 添加或更新回收站记录（若同一人物多次删除，更新为最新删除快照；严禁驱逐未到期记录） */
export function addTrashEntry(store: TrashStore, entry: TrashContactEntry, nowTime: number = Date.now()): TrashStore {
    return addTrashEntries(store, [entry], nowTime);
}

/** 移除某条回收站记录（恢复或永久物理清除时使用） */
export function removeTrashEntry(store: TrashStore, entryId: string): TrashStore {
    const filtered = store.entries.filter((entry) => entry.id !== entryId && entry.docId !== entryId);
    if (filtered.length === store.entries.length) return store;
    return {
        schemaVersion: TRASH_STORE_VERSION,
        entries: filtered,
    };
}

/** 距离过期的剩余天数（钳制在 0–30） */
export function daysUntilTrashExpiration(entry: TrashContactEntry, nowTime: number = Date.now()): number {
    const remainingMs = entry.expiresAt - nowTime;
    if (remainingMs <= 0) return 0;
    return Math.max(0, Math.min(TRASH_RETENTION_DAYS, Math.ceil(remainingMs / (86400 * 1000))));
}

/** 纯函数：根据关键词过滤回收站条目（匹配姓名、电话、分组或标签） */
export function filterTrashEntries(entries: readonly TrashContactEntry[], query: string): TrashContactEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return [...entries];
    return entries.filter((entry) => {
        const matchName = entry.name.toLowerCase().includes(q);
        const matchPhone = (entry.snapshot.phone ?? "").toLowerCase().includes(q);
        const matchGroup = (entry.snapshot.group ?? "").toLowerCase().includes(q);
        const matchTag = entry.snapshot.tags.some((t) => t.toLowerCase().includes(q));
        return matchName || matchPhone || matchGroup || matchTag;
    });
}

/** 容错读取归一化（坏条目过滤，安全展示） */
export function normalizeTrashStore(raw: unknown): TrashStore {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return emptyTrashStore();
    const record = raw as Record<string, unknown>;
    if (record.schemaVersion !== TRASH_STORE_VERSION || !Array.isArray(record.entries)) return emptyTrashStore();

    const validEntries: TrashContactEntry[] = [];
    const seen = new Set<string>();

    for (const item of record.entries) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const candidate = item as Partial<TrashContactEntry>;
        if (typeof candidate.id !== "string" || !candidate.id || seen.has(candidate.id)) continue;
        if (typeof candidate.docId !== "string" || !DOC_ID_RE.test(candidate.docId)) continue;
        if (typeof candidate.itemId !== "string" || !candidate.itemId) continue;
        if (typeof candidate.name !== "string" || !candidate.name.trim()) continue;
        if (typeof candidate.removedAt !== "number" || !Number.isFinite(candidate.removedAt)) continue;
        if (typeof candidate.expiresAt !== "number" || !Number.isFinite(candidate.expiresAt)) continue;

        const snapRaw = candidate.snapshot;
        const relatedItemIds = Array.isArray(snapRaw?.relatedItemIds)
            ? [...new Set(snapRaw.relatedItemIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
            : undefined;
        const relatedDocIds = Array.isArray(snapRaw?.relatedDocIds)
            ? [...new Set(snapRaw.relatedDocIds.filter((id): id is string => typeof id === "string" && DOC_ID_RE.test(id)))]
            : undefined;
        const snapshot: TrashContactSnapshot = {
            phone: typeof snapRaw?.phone === "string" ? snapRaw.phone : undefined,
            email: typeof snapRaw?.email === "string" ? snapRaw.email : undefined,
            wechat: typeof snapRaw?.wechat === "string" ? snapRaw.wechat : undefined,
            website: typeof snapRaw?.website === "string" ? snapRaw.website : undefined,
            birthday: typeof snapRaw?.birthday === "string" ? snapRaw.birthday : undefined,
            isLunar: Boolean(snapRaw?.isLunar),
            group: typeof snapRaw?.group === "string" ? snapRaw.group : undefined,
            tags: Array.isArray(snapRaw?.tags) ? snapRaw!.tags.filter((t): t is string => typeof t === "string") : [],
            ...(typeof snapRaw?.avatar === "string" && snapRaw.avatar ? { avatar: snapRaw.avatar } : {}),
            ...(relatedItemIds && relatedItemIds.length > 0 ? { relatedItemIds } : {}),
            ...(relatedDocIds && relatedDocIds.length > 0 ? { relatedDocIds } : {}),
        };

        seen.add(candidate.id);
        validEntries.push({
            id: candidate.id,
            docId: candidate.docId,
            itemId: candidate.itemId,
            name: candidate.name.trim(),
            snapshot,
            removedAt: candidate.removedAt,
            expiresAt: candidate.expiresAt,
        });

        if (validEntries.length >= MAX_TRASH_ENTRIES) break;
    }

    return {
        schemaVersion: TRASH_STORE_VERSION,
        entries: validEntries,
    };
}

/** 写前检查（严格校验，损坏拒绝） */
export function normalizeTrashStoreForWrite(raw: unknown): TrashStore {
    if (raw == null || raw === "") return emptyTrashStore();
    if (typeof raw !== "object" || Array.isArray(raw)) {
        throw new StoreIntegrityError("回收站", "需要版本化对象");
    }
    const record = raw as Record<string, unknown>;
    if (record.schemaVersion !== TRASH_STORE_VERSION) {
        throw new StoreIntegrityError("回收站", "版本不兼容");
    }
    if (!Array.isArray(record.entries)) {
        throw new StoreIntegrityError("回收站", "条目容器必须为数组");
    }
    if (record.entries.length > MAX_TRASH_ENTRIES) {
        throw new StoreIntegrityError("回收站", `条目数超出上限（${record.entries.length}/${MAX_TRASH_ENTRIES}）`, record.entries.length);
    }

    const seen = new Set<string>();
    for (let i = 0; i < record.entries.length; i++) {
        const item = record.entries[i];
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new StoreIntegrityError("回收站", `条目结构无效（索引 ${i}）`, record.entries.length, i);
        }
        const candidate = item as Partial<TrashContactEntry>;
        if (typeof candidate.id !== "string" || !candidate.id) {
            throw new StoreIntegrityError("回收站", `条目 ID 无效（索引 ${i}）`, record.entries.length, i);
        }
        if (seen.has(candidate.id)) {
            throw new StoreIntegrityError("回收站", `存在重复条目 ID（${candidate.id}）`, record.entries.length, i);
        }
        seen.add(candidate.id);
        if (typeof candidate.docId !== "string" || !DOC_ID_RE.test(candidate.docId)) {
            throw new StoreIntegrityError("回收站", `人物文档 ID 无效（索引 ${i}）`, record.entries.length, i);
        }
        if (typeof candidate.itemId !== "string" || !candidate.itemId) {
            throw new StoreIntegrityError("回收站", `数据库行 ID 无效（索引 ${i}）`, record.entries.length, i);
        }
        if (typeof candidate.name !== "string" || !candidate.name.trim()) {
            throw new StoreIntegrityError("回收站", `人物姓名无效（索引 ${i}）`, record.entries.length, i);
        }
    }

    return normalizeTrashStore(raw);
}
