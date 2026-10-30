/**
 * 初识溯源与引荐人档案存储层（Monica 标杆融合）：Web Lock 临界区 + 写后回读。
 * 键：person-origins.json
 */
import type { Plugin } from "siyuan";
import { loadJson, loadJsonStrict, saveJsonVerified, withStoreLock } from "./storage.ts";
import {
    normalizePersonOriginStore,
    normalizePersonOriginStoreForWrite,
    PERSON_ORIGIN_STORAGE_KEY,
    type PersonOrigin,
    type PersonOriginStore,
} from "../domain/person-origin.ts";

export { PERSON_ORIGIN_STORAGE_KEY };

/** 容错读取（展示与图谱渲染使用） */
export async function loadPersonOriginStore(plugin: Plugin): Promise<PersonOriginStore> {
    return normalizePersonOriginStore(await loadJson(plugin, PERSON_ORIGIN_STORAGE_KEY));
}

/** 严格读取（写前检查使用） */
export async function loadPersonOriginStoreStrict(plugin: Plugin): Promise<PersonOriginStore> {
    return normalizePersonOriginStoreForWrite(await loadJsonStrict(plugin, PERSON_ORIGIN_STORAGE_KEY));
}

/** 读取指定人物的初识溯源与引荐信息 */
export async function loadPersonOrigin(plugin: Plugin, personDocId: string): Promise<PersonOrigin | null> {
    const store = await loadPersonOriginStore(plugin);
    return store.origins[personDocId] ? { ...store.origins[personDocId] } : null;
}

/** 读取全库初识溯源与引荐信息（供图谱引荐边渲染批量消费） */
export async function loadAllPersonOrigins(plugin: Plugin): Promise<Record<string, PersonOrigin>> {
    const store = await loadPersonOriginStore(plugin);
    return { ...store.origins };
}

/** 保存或更新指定联系人的初识溯源与引荐信息 */
export async function savePersonOrigin(plugin: Plugin, origin: PersonOrigin): Promise<PersonOrigin> {
    return withStoreLock(PERSON_ORIGIN_STORAGE_KEY, async () => {
        const store = normalizePersonOriginStoreForWrite(await loadJsonStrict(plugin, PERSON_ORIGIN_STORAGE_KEY));
        const updatedOrigins = { ...store.origins };
        const now = Date.now();
        const existing = updatedOrigins[origin.personDocId];
        const nextOrigin: PersonOrigin = {
            personDocId: origin.personDocId,
            metAt: origin.metAt ? origin.metAt.trim() : undefined,
            introducedByDocId: origin.introducedByDocId || undefined,
            preferences: origin.preferences ? origin.preferences.trim() : undefined,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        updatedOrigins[origin.personDocId] = nextOrigin;
        const nextStore: PersonOriginStore = {
            schemaVersion: 1,
            origins: updatedOrigins,
        };
        await saveJsonVerified(plugin, PERSON_ORIGIN_STORAGE_KEY, nextStore);
        return { ...nextOrigin };
    });
}

/** 删除指定联系人的初识溯源信息 */
export async function deletePersonOrigin(plugin: Plugin, personDocId: string): Promise<void> {
    return withStoreLock(PERSON_ORIGIN_STORAGE_KEY, async () => {
        const store = normalizePersonOriginStoreForWrite(await loadJsonStrict(plugin, PERSON_ORIGIN_STORAGE_KEY));
        if (!store.origins[personDocId]) return;
        const updatedOrigins = { ...store.origins };
        delete updatedOrigins[personDocId];
        const nextStore: PersonOriginStore = {
            schemaVersion: 1,
            origins: updatedOrigins,
        };
        await saveJsonVerified(plugin, PERSON_ORIGIN_STORAGE_KEY, nextStore);
    });
}
