/**
 * E-39 双向承诺与信诺履约存储层（插件自管 JSON）：Web Lock 临界区 + 写后回读。
 * 键：person-promises.json
 */

import type { Plugin } from "siyuan";
import { loadJson, loadJsonStrict, saveJsonVerified, withStoreLock } from "./storage.ts";
import {
    addPromiseToStore,
    normalizePromisesStore,
    normalizePromisesStoreForWrite,
    removePromiseFromStore,
    updatePromiseInStore,
    type PersonPromiseItem,
    type PersonPromisesStore,
} from "../domain/promises.ts";

export const PERSON_PROMISES_STORAGE_KEY = "person-promises.json";

/** 容错读取（展示使用） */
export async function loadPromisesStore(plugin: Plugin): Promise<PersonPromisesStore> {
    return normalizePromisesStore(await loadJson(plugin, PERSON_PROMISES_STORAGE_KEY));
}

/** 严格读取（写前检查使用） */
export async function loadPromisesStoreStrict(plugin: Plugin): Promise<PersonPromisesStore> {
    return normalizePromisesStoreForWrite(await loadJsonStrict(plugin, PERSON_PROMISES_STORAGE_KEY));
}

/** 读取指定人物的承诺与信诺清单 */
export async function loadPersonPromises(plugin: Plugin, personDocId: string): Promise<PersonPromiseItem[]> {
    const store = await loadPromisesStore(plugin);
    return store.promises[personDocId] ? [...store.promises[personDocId]] : [];
}

/** 为指定人物新增或更新承诺并落盘 */
export async function addPersonPromise(
    plugin: Plugin,
    item: PersonPromiseItem,
): Promise<PersonPromiseItem[]> {
    return withStoreLock(PERSON_PROMISES_STORAGE_KEY, async () => {
        const store = normalizePromisesStoreForWrite(await loadJsonStrict(plugin, PERSON_PROMISES_STORAGE_KEY));
        const updated = addPromiseToStore(store, item);
        await saveJsonVerified(plugin, PERSON_PROMISES_STORAGE_KEY, updated);
        return updated.promises[item.personDocId] ? [...updated.promises[item.personDocId]] : [];
    });
}

/** 更新指定承诺状态或内容并落盘 */
export async function updatePersonPromise(
    plugin: Plugin,
    personDocId: string,
    promiseId: string,
    patch: Partial<Omit<PersonPromiseItem, "id" | "personDocId" | "createdAt">>,
): Promise<PersonPromiseItem[]> {
    return withStoreLock(PERSON_PROMISES_STORAGE_KEY, async () => {
        const store = normalizePromisesStoreForWrite(await loadJsonStrict(plugin, PERSON_PROMISES_STORAGE_KEY));
        const updated = updatePromiseInStore(store, personDocId, promiseId, patch);
        await saveJsonVerified(plugin, PERSON_PROMISES_STORAGE_KEY, updated);
        return updated.promises[personDocId] ? [...updated.promises[personDocId]] : [];
    });
}

/** 移除指定承诺并落盘 */
export async function removePersonPromise(
    plugin: Plugin,
    personDocId: string,
    promiseId: string,
): Promise<PersonPromiseItem[]> {
    return withStoreLock(PERSON_PROMISES_STORAGE_KEY, async () => {
        const store = normalizePromisesStoreForWrite(await loadJsonStrict(plugin, PERSON_PROMISES_STORAGE_KEY));
        const updated = removePromiseFromStore(store, personDocId, promiseId);
        await saveJsonVerified(plugin, PERSON_PROMISES_STORAGE_KEY, updated);
        return updated.promises[personDocId] ? [...updated.promises[personDocId]] : [];
    });
}

/** 迁移恢复合并：现状优先合并双向信诺承诺 */
export async function mergePromisesStore(
    plugin: Plugin,
    incoming: PersonPromisesStore,
): Promise<{ merged: number; skipped: number }> {
    return withStoreLock(PERSON_PROMISES_STORAGE_KEY, async () => {
        const current = normalizePromisesStoreForWrite(await loadJsonStrict(plugin, PERSON_PROMISES_STORAGE_KEY));
        let merged = 0;
        let skipped = 0;
        const mergedMap: Record<string, PersonPromiseItem[]> = { ...current.promises };
        for (const [docId, incomingList] of Object.entries(incoming.promises ?? {})) {
            if (!Array.isArray(incomingList)) continue;
            const currentList = mergedMap[docId] ? [...mergedMap[docId]] : [];
            for (const item of incomingList) {
                if (!currentList.some((existing) => existing.id === item.id || (existing.title === item.title && existing.promisedOn === item.promisedOn))) {
                    currentList.push(item);
                    merged += 1;
                } else {
                    skipped += 1;
                }
            }
            mergedMap[docId] = currentList;
        }
        if (merged > 0) {
            await saveJsonVerified(plugin, PERSON_PROMISES_STORAGE_KEY, {
                schemaVersion: 1,
                promises: mergedMap,
            });
        }
        return { merged, skipped };
    });
}
