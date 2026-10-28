/**
 * E-42 联系人自管闪念速记便签板存储层（插件自管 JSON）：Web Lock 临界区 + 写后回读。
 * 键：person-scratchpads.json
 */

import type { Plugin } from "siyuan";
import { loadJson, loadJsonStrict, saveJsonVerified, withStoreLock } from "./storage.ts";
import {
    addScratchpadItem,
    normalizeScratchpadStore,
    normalizeScratchpadStoreForWrite,
    removeScratchpadItem,
    updateScratchpadItem,
    type PersonScratchpadItem,
    type PersonScratchpadStore,
} from "../domain/person-scratchpad.ts";

export const PERSON_SCRATCHPAD_STORAGE_KEY = "person-scratchpads.json";

/** 容错读取（展示使用） */
export async function loadScratchpadStore(plugin: Plugin): Promise<PersonScratchpadStore> {
    return normalizeScratchpadStore(await loadJson(plugin, PERSON_SCRATCHPAD_STORAGE_KEY));
}

/** 严格读取（写前检查使用） */
export async function loadScratchpadStoreStrict(plugin: Plugin): Promise<PersonScratchpadStore> {
    return normalizeScratchpadStoreForWrite(await loadJsonStrict(plugin, PERSON_SCRATCHPAD_STORAGE_KEY));
}

/** 读取指定人物的速记便签列表 */
export async function loadPersonScratchpads(
    plugin: Plugin,
    personDocId: string,
): Promise<PersonScratchpadItem[]> {
    const store = await loadScratchpadStore(plugin);
    return store.notes[personDocId] ? [...store.notes[personDocId]] : [];
}

/** 为指定人物保存或新增速记便签并落盘 */
export async function savePersonScratchpad(
    plugin: Plugin,
    item: PersonScratchpadItem,
): Promise<PersonScratchpadItem[]> {
    return withStoreLock(PERSON_SCRATCHPAD_STORAGE_KEY, async () => {
        const store = normalizeScratchpadStoreForWrite(await loadJsonStrict(plugin, PERSON_SCRATCHPAD_STORAGE_KEY));
        const updated = addScratchpadItem(store, item);
        await saveJsonVerified(plugin, PERSON_SCRATCHPAD_STORAGE_KEY, updated);
        return updated.notes[item.personDocId] ? [...updated.notes[item.personDocId]] : [];
    });
}

/** 更新指定便签属性（置顶、颜色、内容）并落盘 */
export async function updatePersonScratchpad(
    plugin: Plugin,
    personDocId: string,
    noteId: string,
    patch: Partial<Omit<PersonScratchpadItem, "id" | "personDocId" | "createdAt">>,
): Promise<PersonScratchpadItem[]> {
    return withStoreLock(PERSON_SCRATCHPAD_STORAGE_KEY, async () => {
        const store = normalizeScratchpadStoreForWrite(await loadJsonStrict(plugin, PERSON_SCRATCHPAD_STORAGE_KEY));
        const updated = updateScratchpadItem(store, personDocId, noteId, patch);
        await saveJsonVerified(plugin, PERSON_SCRATCHPAD_STORAGE_KEY, updated);
        return updated.notes[personDocId] ? [...updated.notes[personDocId]] : [];
    });
}

/** 移除指定便签并落盘 */
export async function removePersonScratchpad(
    plugin: Plugin,
    personDocId: string,
    noteId: string,
): Promise<PersonScratchpadItem[]> {
    return withStoreLock(PERSON_SCRATCHPAD_STORAGE_KEY, async () => {
        const store = normalizeScratchpadStoreForWrite(await loadJsonStrict(plugin, PERSON_SCRATCHPAD_STORAGE_KEY));
        const updated = removeScratchpadItem(store, personDocId, noteId);
        await saveJsonVerified(plugin, PERSON_SCRATCHPAD_STORAGE_KEY, updated);
        return updated.notes[personDocId] ? [...updated.notes[personDocId]] : [];
    });
}
