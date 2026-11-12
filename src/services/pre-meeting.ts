/**
 * 会前速查与雷区排查服务：聚合全库联系人的偏好忌口、待兑现承诺与会面谈资。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { getRoster } from "./roster.ts";
import { readMarkedBlocksByRoots } from "../api/blocks.ts";
import { loadSocialPreferencesStore } from "../data/social-preferences.ts";
import { loadPromisesStore } from "../data/promises.ts";
import { loadTopicsStore } from "../data/topics.ts";
import { FACTS_SECTION_ATTR, parseFactsSectionMarkdown } from "../domain/doc-section.ts";
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

    const factBlocksByDoc = await readMarkedBlocksByRoots(roster.map((p) => p.docId), FACTS_SECTION_ATTR).catch(() => ({} as Record<string, string>));
    const todayStr = toLocalDateKey(new Date());
    const dossiers: ContactPreMeetingDossier[] = [];

    for (const person of roster) {
        const legacyPrefs = prefsStore.preferences[person.docId] ?? [];
        const promises = promisesStore.promises[person.docId] ?? [];
        const legacyTopics = topicsStore.topics[person.docId] ?? [];
        const docFacts = factBlocksByDoc[person.docId] ? parseFactsSectionMarkdown(factBlocksByDoc[person.docId]) : [];

        const seenPref = new Set(legacyPrefs.map((item) => item.content.trim()));
        const docPrefs: import("../domain/social-preferences.ts").PersonSocialPreferenceItem[] = [];
        const seenTopic = new Set(legacyTopics.map((item) => item.text.trim()));
        const docTopics: import("../domain/topics.ts").PersonTopicItem[] = [];

        for (const fact of docFacts) {
            const text = fact.text.trim();
            if (!text) continue;
            if (fact.category === "preference") {
                if (!seenPref.has(text)) {
                    seenPref.add(text);
                    docPrefs.push({
                        id: fact.id,
                        personDocId: person.docId,
                        category: fact.isTaboo ? "taboos" : "dietary",
                        content: text,
                        isTaboo: Boolean(fact.isTaboo),
                        createdAt: 0,
                        updatedAt: 0,
                    });
                }
            } else if (!seenTopic.has(text)) {
                seenTopic.add(text);
                docTopics.push({
                    id: fact.id,
                    text,
                    createdAt: Date.parse(fact.date) || 0,
                });
            }
        }

        const dossier = buildContactPreMeetingDossier(
            person,
            [...docPrefs, ...legacyPrefs],
            promises,
            [...docTopics, ...legacyTopics],
            todayStr,
        );
        dossiers.push(dossier);
    }

    return dossiers;
}
