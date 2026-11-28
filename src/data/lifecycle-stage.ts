/**
 * E-40 联系人交往生命周期阶段存储层（插件自管 JSON）：Web Lock 临界区 + 写后回读。
 * 键：person-lifecycle-stage.json
 */

import type { Plugin } from "siyuan";
import { loadJson, loadJsonStrict, saveJsonVerified, withStoreLock } from "./storage.ts";
import {
    getPersonLifecycle,
    normalizeLifecycleStore,
    normalizeLifecycleStoreForWrite,
    updatePersonStage,
    batchUpdatePersonStages,
    type PersonLifecycleRecord,
    type PersonLifecycleStore,
    type RelationshipStageKey,
} from "../domain/lifecycle-stage.ts";

export const PERSON_LIFECYCLE_STORAGE_KEY = "person-lifecycle-stage.json";

/** 容错读取（展示使用） */
export async function loadLifecycleStore(plugin: Plugin): Promise<PersonLifecycleStore> {
    return normalizeLifecycleStore(await loadJson(plugin, PERSON_LIFECYCLE_STORAGE_KEY));
}

/** 严格读取（写前检查使用） */
export async function loadLifecycleStoreStrict(plugin: Plugin): Promise<PersonLifecycleStore> {
    return normalizeLifecycleStoreForWrite(await loadJsonStrict(plugin, PERSON_LIFECYCLE_STORAGE_KEY));
}

/** 读取指定人物的交往生命周期记录 */
export async function loadPersonLifecycleStage(
    plugin: Plugin,
    personDocId: string,
): Promise<PersonLifecycleRecord> {
    const store = await loadLifecycleStore(plugin);
    return getPersonLifecycle(store, personDocId);
}

/** 批量获取全量人物的当前阶段映射（personDocId -> currentStage） */
export async function loadAllLifecycleStages(plugin: Plugin): Promise<Record<string, RelationshipStageKey>> {
    const store = await loadLifecycleStore(plugin);
    const result: Record<string, RelationshipStageKey> = {};
    for (const [docId, record] of Object.entries(store.records)) {
        if (record && record.currentStage) {
            result[docId] = record.currentStage;
        }
    }
    return result;
}

/** 推进或变更人物交往阶段并落盘 */
export async function updatePersonLifecycleStage(
    plugin: Plugin,
    personDocId: string,
    stage: RelationshipStageKey,
    dateStr?: string,
    note?: string,
): Promise<PersonLifecycleRecord> {
    return withStoreLock(PERSON_LIFECYCLE_STORAGE_KEY, async () => {
        const store = normalizeLifecycleStoreForWrite(await loadJsonStrict(plugin, PERSON_LIFECYCLE_STORAGE_KEY));
        const updated = updatePersonStage(store, personDocId, stage, dateStr, note);
        await saveJsonVerified(plugin, PERSON_LIFECYCLE_STORAGE_KEY, updated);
        return getPersonLifecycle(updated, personDocId);
    });
}

/** 批量更新多位人物的交往阶段并落盘 */
export async function batchUpdatePersonLifecycleStages(
    plugin: Plugin,
    personDocIds: readonly string[],
    stage: RelationshipStageKey,
    dateStr?: string,
    note?: string,
): Promise<{ updatedCount: number; currentStages: Record<string, RelationshipStageKey> }> {
    return withStoreLock(PERSON_LIFECYCLE_STORAGE_KEY, async () => {
        const store = normalizeLifecycleStoreForWrite(await loadJsonStrict(plugin, PERSON_LIFECYCLE_STORAGE_KEY));
        const { nextStore, updatedCount } = batchUpdatePersonStages(store, personDocIds, stage, dateStr, note);
        await saveJsonVerified(plugin, PERSON_LIFECYCLE_STORAGE_KEY, nextStore);
        const currentStages: Record<string, RelationshipStageKey> = {};
        for (const [docId, record] of Object.entries(nextStore.records)) {
            if (record?.currentStage) currentStages[docId] = record.currentStage;
        }
        return { updatedCount, currentStages };
    });
}

/** 迁移恢复合并：现状优先合并交往生命周期阶段与变迁历史 */
export async function mergeLifecycleStore(
    plugin: Plugin,
    incoming: PersonLifecycleStore,
): Promise<{ merged: number; skipped: number }> {
    return withStoreLock(PERSON_LIFECYCLE_STORAGE_KEY, async () => {
        const current = normalizeLifecycleStoreForWrite(await loadJsonStrict(plugin, PERSON_LIFECYCLE_STORAGE_KEY));
        let merged = 0;
        let skipped = 0;
        const mergedRecords = { ...current.records };
        for (const [docId, incomingRec] of Object.entries(incoming.records ?? {})) {
            if (!incomingRec || !incomingRec.currentStage) continue;
            const existing = mergedRecords[docId];
            if (!existing || !existing.currentStage) {
                mergedRecords[docId] = incomingRec;
                merged += 1;
            } else {
                const existingHistSet = new Set(existing.history.map((h) => `${h.stage}_${h.timestamp}`));
                const combinedHist = [...existing.history];
                for (const h of incomingRec.history ?? []) {
                    const key = `${h.stage}_${h.timestamp}`;
                    if (!existingHistSet.has(key)) {
                        combinedHist.push(h);
                        existingHistSet.add(key);
                    }
                }
                mergedRecords[docId] = {
                    ...existing,
                    history: combinedHist.sort((a, b) => b.timestamp - a.timestamp),
                };
                skipped += 1;
            }
        }
        if (merged > 0) {
            await saveJsonVerified(plugin, PERSON_LIFECYCLE_STORAGE_KEY, {
                schemaVersion: 1,
                records: mergedRecords,
            });
        }
        return { merged, skipped };
    });
}
