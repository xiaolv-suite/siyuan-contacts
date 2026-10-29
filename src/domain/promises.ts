/**
 * 双向承诺与信诺履约追踪本（Mutual Promises & Commitments）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 区分“我承诺对方”与“对方承诺我”，管理履约全生命周期（待履行/已兑现/已取消）。
 */

import { toLocalDateKey } from "./interactions.ts";

export type PromiseDirection = "i_promised" | "they_promised";
export type PromiseStatus = "pending" | "fulfilled" | "broken";

export interface PersonPromiseItem {
    id: string; // "prm-xxxx"
    personDocId: string;
    direction: PromiseDirection; // "i_promised" 我承诺对方 | "they_promised" 对方承诺我
    title: string; // 承诺标题 (如 "引荐半导体行业专家")
    detail?: string; // 详细内容/约定
    promisedOn: string; // 许诺日期 YYYY-MM-DD
    dueOn?: string; // 约定兑现日期 YYYY-MM-DD
    status: PromiseStatus; // "pending" | "fulfilled" | "broken"
    fulfilledOn?: string; // 实际兑现日期 YYYY-MM-DD
    createdAt: number;
    updatedAt: number;
}

export interface PersonPromisesStore {
    schemaVersion: 1;
    promises: Record<string, PersonPromiseItem[]>;
}

export const PROMISES_STORE_VERSION = 1;

const VALID_DIRECTIONS = new Set<PromiseDirection>(["i_promised", "they_promised"]);
const VALID_STATUSES = new Set<PromiseStatus>(["pending", "fulfilled", "broken"]);

export function newPromiseId(): string {
    return `prm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyPromisesStore(): PersonPromisesStore {
    return {
        schemaVersion: PROMISES_STORE_VERSION,
        promises: {},
    };
}

export function isValidPromiseDirection(val: unknown): val is PromiseDirection {
    return typeof val === "string" && VALID_DIRECTIONS.has(val as PromiseDirection);
}

export function isValidPromiseStatus(val: unknown): val is PromiseStatus {
    return typeof val === "string" && VALID_STATUSES.has(val as PromiseStatus);
}

function sanitizePromise(raw: unknown, expectedPersonDocId?: string): PersonPromiseItem | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;

    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : newPromiseId();
    const personDocId = typeof r.personDocId === "string" && r.personDocId.trim()
        ? r.personDocId.trim()
        : expectedPersonDocId || "";
    if (!personDocId) return null;

    const direction: PromiseDirection = isValidPromiseDirection(r.direction) ? r.direction : "i_promised";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) return null;

    const detail = typeof r.detail === "string" && r.detail.trim() ? r.detail.trim() : undefined;
    const promisedOn = typeof r.promisedOn === "string" && r.promisedOn.trim()
        ? r.promisedOn.trim()
        : toLocalDateKey(new Date());
    const dueOn = typeof r.dueOn === "string" && r.dueOn.trim() ? r.dueOn.trim() : undefined;
    const status: PromiseStatus = isValidPromiseStatus(r.status) ? r.status : "pending";
    const fulfilledOn = typeof r.fulfilledOn === "string" && r.fulfilledOn.trim() ? r.fulfilledOn.trim() : undefined;
    const createdAt = typeof r.createdAt === "number" && r.createdAt > 0 ? r.createdAt : Date.now();
    const updatedAt = typeof r.updatedAt === "number" && r.updatedAt > 0 ? r.updatedAt : Date.now();

    return {
        id,
        personDocId,
        direction,
        title,
        ...(detail ? { detail } : {}),
        promisedOn,
        ...(dueOn ? { dueOn } : {}),
        status,
        ...(fulfilledOn ? { fulfilledOn } : {}),
        createdAt,
        updatedAt,
    };
}

export function normalizePromisesStore(raw: unknown): PersonPromisesStore {
    if (!raw || typeof raw !== "object") return emptyPromisesStore();
    const r = raw as Record<string, unknown>;
    const promises: Record<string, PersonPromiseItem[]> = {};

    if (r.promises && typeof r.promises === "object" && !Array.isArray(r.promises)) {
        for (const [docId, list] of Object.entries(r.promises as Record<string, unknown>)) {
            if (Array.isArray(list)) {
                const validList: PersonPromiseItem[] = [];
                for (const item of list) {
                    const sanitized = sanitizePromise(item, docId);
                    if (sanitized) validList.push(sanitized);
                }
                if (validList.length > 0) {
                    promises[docId] = validList;
                }
            }
        }
    }

    return {
        schemaVersion: PROMISES_STORE_VERSION,
        promises,
    };
}

export function normalizePromisesStoreForWrite(raw: unknown): PersonPromisesStore {
    if (!raw || typeof raw !== "object") return emptyPromisesStore();
    const r = raw as Record<string, unknown>;
    if ("schemaVersion" in r && r.schemaVersion !== PROMISES_STORE_VERSION) {
        throw new Error(`信诺存储版本不支持（schemaVersion: ${String(r.schemaVersion)}）`);
    }
    return normalizePromisesStore(raw);
}

export function addPromiseToStore(
    store: PersonPromisesStore,
    item: PersonPromiseItem,
): PersonPromisesStore {
    const sanitized = sanitizePromise(item);
    if (!sanitized) throw new Error("承诺信诺条目数据不合法");

    const existingList = store.promises[sanitized.personDocId] ? [...store.promises[sanitized.personDocId]] : [];
    const idx = existingList.findIndex((p) => p.id === sanitized.id);
    if (idx >= 0) {
        existingList[idx] = sanitized;
    } else {
        existingList.unshift(sanitized); // 新承诺置顶
    }

    return {
        ...store,
        promises: {
            ...store.promises,
            [sanitized.personDocId]: existingList,
        },
    };
}

export function updatePromiseInStore(
    store: PersonPromisesStore,
    personDocId: string,
    promiseId: string,
    patch: Partial<Omit<PersonPromiseItem, "id" | "personDocId" | "createdAt">>,
): PersonPromisesStore {
    if (!personDocId || !promiseId) return store;
    const existingList = store.promises[personDocId];
    if (!existingList) return store;

    const idx = existingList.findIndex((p) => p.id === promiseId);
    if (idx < 0) return store;

    const cur = existingList[idx];
    const updated: PersonPromiseItem = {
        ...cur,
        ...patch,
        updatedAt: Date.now(),
    };

    const nextList = [...existingList];
    nextList[idx] = updated;

    return {
        ...store,
        promises: {
            ...store.promises,
            [personDocId]: nextList,
        },
    };
}

export function removePromiseFromStore(
    store: PersonPromisesStore,
    personDocId: string,
    promiseId: string,
): PersonPromisesStore {
    if (!personDocId || !promiseId) return store;
    const existingList = store.promises[personDocId];
    if (!existingList) return store;

    const filtered = existingList.filter((p) => p.id !== promiseId);
    const updated = { ...store.promises };
    if (filtered.length > 0) {
        updated[personDocId] = filtered;
    } else {
        delete updated[personDocId];
    }

    return {
        ...store,
        promises: updated,
    };
}
