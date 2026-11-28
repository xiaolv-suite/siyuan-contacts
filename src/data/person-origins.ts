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
    validatePersonOrigin,
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

/** 保存或更新指定联系人的初识溯源与引荐信息（若全空则移除记录） */
export async function savePersonOrigin(plugin: Plugin, origin: PersonOrigin): Promise<PersonOrigin> {
    const errors = validatePersonOrigin(origin);
    if (errors.length > 0) {
        throw new Error(errors.join("；"));
    }
    return withStoreLock(PERSON_ORIGIN_STORAGE_KEY, async () => {
        const store = normalizePersonOriginStoreForWrite(await loadJsonStrict(plugin, PERSON_ORIGIN_STORAGE_KEY));
        const updatedOrigins = { ...store.origins };
        const metAt = origin.metAt ? origin.metAt.trim() : undefined;
        const introducedByDocId = origin.introducedByDocId ? origin.introducedByDocId.trim() : undefined;
        const preferences = origin.preferences ? origin.preferences.trim() : undefined;

        if (!metAt && !introducedByDocId && !preferences) {
            if (updatedOrigins[origin.personDocId]) {
                delete updatedOrigins[origin.personDocId];
                await saveJsonVerified(plugin, PERSON_ORIGIN_STORAGE_KEY, {
                    schemaVersion: 1,
                    origins: updatedOrigins,
                });
            }
            return { personDocId: origin.personDocId };
        }

        const now = Date.now();
        const existing = updatedOrigins[origin.personDocId];
        const nextOrigin: PersonOrigin = {
            personDocId: origin.personDocId,
            metAt,
            introducedByDocId,
            preferences,
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

/** 迁移恢复合并：现状优先合并初识溯源与引荐人链路 */
export async function mergePersonOriginStore(
    plugin: Plugin,
    incoming: PersonOriginStore,
): Promise<{ merged: number; skipped: number }> {
    return withStoreLock(PERSON_ORIGIN_STORAGE_KEY, async () => {
        const current = normalizePersonOriginStoreForWrite(await loadJsonStrict(plugin, PERSON_ORIGIN_STORAGE_KEY));
        const mergedOrigins: Record<string, PersonOrigin> = { ...current.origins };
        let merged = 0;
        let skipped = 0;

        for (const [docId, entry] of Object.entries(incoming.origins ?? {})) {
            if (!entry || validatePersonOrigin(entry).length > 0) {
                skipped += 1;
                continue;
            }
            const existing = mergedOrigins[docId];
            if (!existing) {
                mergedOrigins[docId] = { ...entry, personDocId: docId };
                merged += 1;
            } else {
                // 现状优先，仅补齐当前缺失的子字段
                const nextMetAt = existing.metAt || entry.metAt;
                const nextIntroducer = existing.introducedByDocId || entry.introducedByDocId;
                const nextPrefs = existing.preferences || entry.preferences;
                if (
                    nextMetAt !== existing.metAt ||
                    nextIntroducer !== existing.introducedByDocId ||
                    nextPrefs !== existing.preferences
                ) {
                    mergedOrigins[docId] = {
                        ...existing,
                        metAt: nextMetAt,
                        introducedByDocId: nextIntroducer,
                        preferences: nextPrefs,
                        updatedAt: Math.max(existing.updatedAt ?? 0, entry.updatedAt ?? 0) || Date.now(),
                    };
                    merged += 1;
                } else {
                    skipped += 1;
                }
            }
        }

        if (merged > 0) {
            await saveJsonVerified(plugin, PERSON_ORIGIN_STORAGE_KEY, {
                schemaVersion: 1,
                origins: mergedOrigins,
            });
        }
        return { merged, skipped };
    });
}
