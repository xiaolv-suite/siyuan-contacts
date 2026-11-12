/**
 * 会前速查与雷区排查（Pre-Meeting Check Hub & Taboo Radar）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 汇总联系人红线禁忌、饮食忌口、茶酒偏好、待兑现承诺与会面谈资，
 * 帮助用户在会面拜访前 10 秒快速扫除雷区，做好周全准备。
 */

import type { ContactSummary } from "./person.ts";
import type { PersonSocialPreferenceItem } from "./social-preferences.ts";
import type { PersonPromiseItem } from "./promises.ts";
import type { PersonTopicItem } from "./topics.ts";
import { toLocalDateKey } from "./date-key.ts";

export interface ContactPreMeetingDossier {
    person: ContactSummary;
    taboos: PersonSocialPreferenceItem[];
    normalPreferences: PersonSocialPreferenceItem[];
    pendingPromises: PersonPromiseItem[];
    topics: PersonTopicItem[];
    hasUrgentAlerts: boolean;
}

export function buildContactPreMeetingDossier(
    person: ContactSummary,
    allPreferences: readonly PersonSocialPreferenceItem[] = [],
    allPromises: readonly PersonPromiseItem[] = [],
    allTopics: readonly PersonTopicItem[] = [],
    todayStr = toLocalDateKey(new Date()),
): ContactPreMeetingDossier {
    const taboos: PersonSocialPreferenceItem[] = [];
    const normalPreferences: PersonSocialPreferenceItem[] = [];

    for (const pref of allPreferences) {
        if (pref.isTaboo || pref.category === "taboos") {
            taboos.push(pref);
        } else {
            normalPreferences.push(pref);
        }
    }

    const pendingPromises = allPromises.filter((p) => p.status === "pending");
    const hasOverduePromise = pendingPromises.some((p) => Boolean(p.dueOn && p.dueOn <= todayStr));
    const hasUrgentAlerts = taboos.length > 0 || hasOverduePromise;

    return {
        person,
        taboos,
        normalPreferences,
        pendingPromises,
        topics: [...allTopics],
        hasUrgentAlerts,
    };
}

export function filterPreMeetingDossiers(
    dossiers: readonly ContactPreMeetingDossier[],
    query = "",
    filterType: "all" | "taboo_only" | "promise_only" = "all",
): ContactPreMeetingDossier[] {
    const q = query.trim().toLowerCase();

    return dossiers.filter((d) => {
        // 类型过滤
        if (filterType === "taboo_only" && d.taboos.length === 0) return false;
        if (filterType === "promise_only" && d.pendingPromises.length === 0) return false;

        // 关键词搜索
        if (!q) return true;

        const nameMatch = (d.person.name ?? "").toLowerCase().includes(q);
        const groupMatch = (d.person.group ?? "").toLowerCase().includes(q);
        const rawComp = "company" in d.person && typeof (d.person as Record<string, unknown>).company === "string" ? (d.person as Record<string, unknown>).company as string : "";
        const companyMatch = rawComp.toLowerCase().includes(q);
        const tagMatch = (d.person.tags ?? []).some((t) => (t ?? "").toLowerCase().includes(q));
        const tabooMatch = (d.taboos ?? []).some((t) => (t.content ?? "").toLowerCase().includes(q));
        const prefMatch = (d.normalPreferences ?? []).some((p) => (p.content ?? "").toLowerCase().includes(q));
        const promiseMatch = (d.pendingPromises ?? []).some((p) => (p.title ?? "").toLowerCase().includes(q));
        const topicMatch = (d.topics ?? []).some((t) => (t.text ?? "").toLowerCase().includes(q));

        return nameMatch || groupMatch || companyMatch || tagMatch || tabooMatch || prefMatch || promiseMatch || topicMatch;
    });
}
