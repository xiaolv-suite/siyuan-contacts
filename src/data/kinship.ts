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
