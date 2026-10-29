/**
 * E-54 会客拜访行程备忘与准备清单存储（插件自管 JSON）：Web Lock 临界区 + 写后回读。
 * 键：person-itineraries.json
 */
import type { Plugin } from "siyuan";
import { loadJson, loadJsonStrict, saveJsonVerified, withStoreLock } from "./storage.ts";
import {
    addOrUpdateItineraryInStore,
    normalizeItineraryStore,
    normalizeItineraryStoreForWrite,
    removeItineraryFromStore,
    toggleChecklistInStore,
    type PersonItineraryItem,
    type PersonItineraryStore,
} from "../domain/itineraries.ts";

export const ITINERARIES_STORAGE_KEY = "person-itineraries.json";

/** 容错读取（展示使用） */
export async function loadItinerariesStore(plugin: Plugin): Promise<PersonItineraryStore> {
    return normalizeItineraryStore(await loadJson(plugin, ITINERARIES_STORAGE_KEY));
}

/** 严格读取（写前检查使用） */
export async function loadItinerariesStoreStrict(plugin: Plugin): Promise<PersonItineraryStore> {
    return normalizeItineraryStoreForWrite(await loadJsonStrict(plugin, ITINERARIES_STORAGE_KEY));
}

/** 读取指定人物的会客拜访行程列表 */
export async function loadPersonItineraries(plugin: Plugin, personDocId: string): Promise<PersonItineraryItem[]> {
    const store = await loadItinerariesStore(plugin);
    return store.itineraries[personDocId] ? [...store.itineraries[personDocId]] : [];
}

/** 为指定人物保存一条行程（新增或更新）并落盘 */
export async function savePersonItinerary(
    plugin: Plugin,
    item: PersonItineraryItem,
): Promise<PersonItineraryItem[]> {
    return withStoreLock(ITINERARIES_STORAGE_KEY, async () => {
        const store = normalizeItineraryStoreForWrite(await loadJsonStrict(plugin, ITINERARIES_STORAGE_KEY));
        const updated = addOrUpdateItineraryInStore(store, item);
        await saveJsonVerified(plugin, ITINERARIES_STORAGE_KEY, updated);
        return updated.itineraries[item.personDocId] ? [...updated.itineraries[item.personDocId]] : [];
    });
}

/** 移除指定人物的某条行程并落盘 */
export async function removePersonItinerary(
    plugin: Plugin,
    personDocId: string,
    itineraryId: string,
): Promise<PersonItineraryItem[]> {
    return withStoreLock(ITINERARIES_STORAGE_KEY, async () => {
        const store = normalizeItineraryStoreForWrite(await loadJsonStrict(plugin, ITINERARIES_STORAGE_KEY));
        const updated = removeItineraryFromStore(store, personDocId, itineraryId);
        await saveJsonVerified(plugin, ITINERARIES_STORAGE_KEY, updated);
        return updated.itineraries[personDocId] ? [...updated.itineraries[personDocId]] : [];
    });
}

/** 快速切换行程核对清单项状态并落盘 */
export async function togglePersonItineraryChecklist(
    plugin: Plugin,
    personDocId: string,
    itineraryId: string,
    checklistId: string,
): Promise<PersonItineraryItem[]> {
    return withStoreLock(ITINERARIES_STORAGE_KEY, async () => {
        const store = normalizeItineraryStoreForWrite(await loadJsonStrict(plugin, ITINERARIES_STORAGE_KEY));
        const updated = toggleChecklistInStore(store, personDocId, itineraryId, checklistId);
        await saveJsonVerified(plugin, ITINERARIES_STORAGE_KEY, updated);
        return updated.itineraries[personDocId] ? [...updated.itineraries[personDocId]] : [];
    });
}

/** 迁移恢复合并：现状优先合并会客行程备忘与准备清单 */
export async function mergeItinerariesStore(
    plugin: Plugin,
    incoming: PersonItineraryStore,
): Promise<{ merged: number; skipped: number }> {
    return withStoreLock(ITINERARIES_STORAGE_KEY, async () => {
        const current = normalizeItineraryStoreForWrite(await loadJsonStrict(plugin, ITINERARIES_STORAGE_KEY));
        let merged = 0;
        let skipped = 0;
        const mergedMap: Record<string, PersonItineraryItem[]> = { ...current.itineraries };
        for (const [docId, incomingList] of Object.entries(incoming.itineraries ?? {})) {
            if (!Array.isArray(incomingList)) continue;
            const currentList = mergedMap[docId] ? [...mergedMap[docId]] : [];
            for (const item of incomingList) {
                if (!currentList.some((existing) => existing.id === item.id || (existing.title === item.title && existing.targetDate === item.targetDate))) {
                    currentList.push(item);
                    merged += 1;
                } else {
                    skipped += 1;
                }
            }
            mergedMap[docId] = currentList;
        }
        if (merged > 0) {
            await saveJsonVerified(plugin, ITINERARIES_STORAGE_KEY, {
                schemaVersion: 1,
                itineraries: mergedMap,
            });
        }
        return { merged, skipped };
    });
}
