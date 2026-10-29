/**
 * 会前速查与雷区排查服务：聚合全库联系人的偏好忌口、待兑现承诺与会面谈资。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { getRoster } from "./roster.ts";
import { loadSocialPreferencesStore } from "../data/social-preferences.ts";
import { loadPromisesStore } from "../data/promises.ts";
import { loadTopicsStore } from "../data/topics.ts";
import { toLocalDateKey } from "../domain/interactions.ts";
import {
    buildContactPreMeetingDossier,
    type ContactPreMeetingDossier,
} from "../domain/pre-meeting-hub.ts";

export async function loadAllPreMeetingDossiers(
    plugin: Plugin,
    settings: ContactsSettings,
): Promise<ContactPreMeetingDossier[]> {
    const [roster, prefsStore, promisesStore, topicsStore] = await Promise.all([
        getRoster(settings),
        loadSocialPreferencesStore(plugin).catch((): import("../domain/social-preferences.ts").PersonSocialPreferencesStore => ({ schemaVersion: 1, preferences: {} })),
        loadPromisesStore(plugin).catch((): import("../domain/promises.ts").PersonPromisesStore => ({ schemaVersion: 1, promises: {} })),
        loadTopicsStore(plugin).catch((): import("../domain/topics.ts").PersonTopicStore => ({ schemaVersion: 1, topics: {} })),
    ]);

    const todayStr = toLocalDateKey(new Date());
    const dossiers: ContactPreMeetingDossier[] = [];

    for (const person of roster) {
        const prefs = prefsStore.preferences[person.docId] ?? [];
        const promises = promisesStore.promises[person.docId] ?? [];
        const topics = topicsStore.topics[person.docId] ?? [];

        const dossier = buildContactPreMeetingDossier(person, prefs, promises, topics, todayStr);
        dossiers.push(dossier);
    }

    return dossiers;
}
