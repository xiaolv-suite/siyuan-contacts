/**
 * E-49 联系人自管社交偏好与交往忌口档案存储层（插件自管 JSON）：Web Lock 临界区 + 写后回读。
 * 键：person-social-preferences.json
 */

import type { Plugin } from "siyuan";
import { loadJson, loadJsonStrict, saveJsonVerified, withStoreLock } from "./storage.ts";
import {
    addSocialPreference,
    normalizeSocialPreferencesStore,
    normalizeSocialPreferencesStoreForWrite,
    removeSocialPreference,
    updateSocialPreference,
    type PersonSocialPreferenceItem,
    type PersonSocialPreferencesStore,
} from "../domain/social-preferences.ts";

export const PERSON_SOCIAL_PREFERENCES_STORAGE_KEY = "person-social-preferences.json";

/** 容错读取（展示使用） */
export async function loadSocialPreferencesStore(plugin: Plugin): Promise<PersonSocialPreferencesStore> {
    return normalizeSocialPreferencesStore(await loadJson(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY));
}

/** 严格读取（写前检查使用） */
export async function loadSocialPreferencesStoreStrict(plugin: Plugin): Promise<PersonSocialPreferencesStore> {
    return normalizeSocialPreferencesStoreForWrite(await loadJsonStrict(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY));
}

/** 读取指定人物的社交偏好与忌口清单 */
export async function loadPersonSocialPreferences(
    plugin: Plugin,
    personDocId: string,
): Promise<PersonSocialPreferenceItem[]> {
    const store = await loadSocialPreferencesStore(plugin);
    return store.preferences[personDocId] ? [...store.preferences[personDocId]] : [];
}

/** 为指定人物新增或更新偏好忌口并落盘 */
export async function addPersonSocialPreference(
    plugin: Plugin,
    item: PersonSocialPreferenceItem,
): Promise<PersonSocialPreferenceItem[]> {
    return withStoreLock(PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, async () => {
        const store = normalizeSocialPreferencesStoreForWrite(await loadJsonStrict(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY));
        const updated = addSocialPreference(store, item);
        await saveJsonVerified(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, updated);
        return updated.preferences[item.personDocId] ? [...updated.preferences[item.personDocId]] : [];
    });
}

/** 更新指定偏好忌口属性并落盘 */
export async function updatePersonSocialPreference(
    plugin: Plugin,
    personDocId: string,
    prefId: string,
    patch: Partial<Omit<PersonSocialPreferenceItem, "id" | "personDocId" | "createdAt">>,
): Promise<PersonSocialPreferenceItem[]> {
    return withStoreLock(PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, async () => {
        const store = normalizeSocialPreferencesStoreForWrite(await loadJsonStrict(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY));
        const updated = updateSocialPreference(store, personDocId, prefId, patch);
        await saveJsonVerified(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, updated);
        return updated.preferences[personDocId] ? [...updated.preferences[personDocId]] : [];
    });
}

/** 移除指定偏好忌口并落盘 */
export async function removePersonSocialPreference(
    plugin: Plugin,
    personDocId: string,
    prefId: string,
): Promise<PersonSocialPreferenceItem[]> {
    return withStoreLock(PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, async () => {
        const store = normalizeSocialPreferencesStoreForWrite(await loadJsonStrict(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY));
        const updated = removeSocialPreference(store, personDocId, prefId);
        await saveJsonVerified(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, updated);
        return updated.preferences[personDocId] ? [...updated.preferences[personDocId]] : [];
    });
}
