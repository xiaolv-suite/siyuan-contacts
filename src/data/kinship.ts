/**
 * E-38 人物家庭与亲属关系存储层（插件自管 JSON）：Web Lock 临界区 + 写后回读。
 * 键：person-kinship.json
 */

import type { Plugin } from "siyuan";
import { loadJson, loadJsonStrict, saveJsonVerified, withStoreLock } from "./storage.ts";
import {
    addKinshipToStore,
    normalizeKinshipStore,
    normalizeKinshipStoreForWrite,
    removeKinshipFromStore,
    type KinshipMemberItem,
    type PersonKinshipStore,
} from "../domain/kinship.ts";

export const PERSON_KINSHIP_STORAGE_KEY = "person-kinship.json";

/** 容错读取（展示使用） */
export async function loadKinshipStore(plugin: Plugin): Promise<PersonKinshipStore> {
    return normalizeKinshipStore(await loadJson(plugin, PERSON_KINSHIP_STORAGE_KEY));
}

/** 严格读取（写前检查使用） */
export async function loadKinshipStoreStrict(plugin: Plugin): Promise<PersonKinshipStore> {
    return normalizeKinshipStoreForWrite(await loadJsonStrict(plugin, PERSON_KINSHIP_STORAGE_KEY));
}

/** 读取指定人物的家庭亲属成员列表 */
export async function loadPersonKinships(plugin: Plugin, personDocId: string): Promise<KinshipMemberItem[]> {
    const store = await loadKinshipStore(plugin);
    return store.kinships[personDocId] ? [...store.kinships[personDocId]] : [];
}

/** 为指定人物新增或更新亲属成员并落盘 */
export async function addPersonKinship(
    plugin: Plugin,
    item: KinshipMemberItem,
): Promise<KinshipMemberItem[]> {
    return withStoreLock(PERSON_KINSHIP_STORAGE_KEY, async () => {
        const store = normalizeKinshipStoreForWrite(await loadJsonStrict(plugin, PERSON_KINSHIP_STORAGE_KEY));
        const updated = addKinshipToStore(store, item);
        await saveJsonVerified(plugin, PERSON_KINSHIP_STORAGE_KEY, updated);
        return updated.kinships[item.personDocId] ? [...updated.kinships[item.personDocId]] : [];
    });
}

/** 移除指定人物的某个亲属成员并落盘 */
export async function removePersonKinship(
    plugin: Plugin,
    personDocId: string,
    memberId: string,
): Promise<KinshipMemberItem[]> {
    return withStoreLock(PERSON_KINSHIP_STORAGE_KEY, async () => {
        const store = normalizeKinshipStoreForWrite(await loadJsonStrict(plugin, PERSON_KINSHIP_STORAGE_KEY));
        const updated = removeKinshipFromStore(store, personDocId, memberId);
        await saveJsonVerified(plugin, PERSON_KINSHIP_STORAGE_KEY, updated);
        return updated.kinships[personDocId] ? [...updated.kinships[personDocId]] : [];
    });
}

/** 迁移恢复合并：现状优先合并亲属关系树谱 */
export async function mergeKinshipStore(
    plugin: Plugin,
    incoming: PersonKinshipStore,
): Promise<{ merged: number; skipped: number }> {
    return withStoreLock(PERSON_KINSHIP_STORAGE_KEY, async () => {
        const current = normalizeKinshipStoreForWrite(await loadJsonStrict(plugin, PERSON_KINSHIP_STORAGE_KEY));
        let merged = 0;
        let skipped = 0;
        const mergedMap: Record<string, KinshipMemberItem[]> = { ...current.kinships };
        for (const [docId, incomingList] of Object.entries(incoming.kinships ?? {})) {
            if (!Array.isArray(incomingList)) continue;
            const currentList = mergedMap[docId] ? [...mergedMap[docId]] : [];
            for (const item of incomingList) {
                if (!currentList.some((existing) => existing.id === item.id || (existing.name === item.name && existing.role === item.role))) {
                    currentList.push(item);
                    merged += 1;
                } else {
                    skipped += 1;
                }
            }
            mergedMap[docId] = currentList;
        }
        if (merged > 0) {
            await saveJsonVerified(plugin, PERSON_KINSHIP_STORAGE_KEY, {
                schemaVersion: 1,
                kinships: mergedMap,
            });
        }
        return { merged, skipped };
    });
}
