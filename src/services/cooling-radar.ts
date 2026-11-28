/**
 * 关系降温预警与破冰重联服务（E-53）：
 * 聚合全库联系人、交往流水、节奏偏好与星标状态，输出破冰候选与指标大盘。
 * 纯本地计算，零外部网络开销。
 */
import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { getRoster } from "./roster.ts";
import { loadInteractionStoreStrict, emptyStore } from "../data/interactions.ts";
import { loadCadenceMapStrict } from "../data/cadences.ts";
import { loadViewPreferences } from "./preferences.ts";
import { loadSelfIdentity } from "../data/self-identity.ts";
import { excludeSelf } from "../domain/self-identity.ts";
import {
    buildCoolingRadarItems,
    type CoolingContactItem,
} from "../domain/cooling-radar.ts";

export interface CoolingRadarSummaryData {
    items: CoolingContactItem[];
    totalCooling: number;
    starredCooling: number;
    coldCount: number;
    coolCount: number;
    unknownCount: number;
    avgOverdueDays: number;
}

export async function loadCoolingRadarSummary(
    plugin: Plugin,
    settings: ContactsSettings,
    options: { defaultCadenceDays?: number } = {},
): Promise<CoolingRadarSummaryData> {
    const [rosterAll, interactionStore, cadences, viewPrefs, identity] = await Promise.all([
        getRoster(settings),
        loadInteractionStoreStrict(plugin).catch(() => emptyStore()),
        loadCadenceMapStrict(plugin).catch(() => ({})),
        loadViewPreferences(plugin).catch(() => null),
        loadSelfIdentity(plugin).catch(() => null),
    ]);

    const roster = excludeSelf(rosterAll, identity);

    const lastInteractionMap: Record<string, { occurredAt: number; localDate?: string }> = {};
    for (const event of interactionStore.events) {
        const cur = lastInteractionMap[event.personDocId];
        if (!cur || event.occurredAt > cur.occurredAt) {
            lastInteractionMap[event.personDocId] = {
                occurredAt: event.occurredAt,
                localDate: event.localDate,
            };
        }
    }

    const starredDocIds: ReadonlySet<string> = viewPrefs?.starredDocIds
        ? new Set<string>(viewPrefs.starredDocIds)
        : new Set<string>();

    const items = buildCoolingRadarItems({
        people: roster,
        recentInteractions: lastInteractionMap,
        cadences,
        starredDocIds,
        defaultCadenceDays: options.defaultCadenceDays ?? viewPrefs?.staleThresholdDays ?? 30,
    });

    const totalCooling = items.length;
    const starredCooling = items.filter((item) => item.isStarred).length;
    const coldCount = items.filter((item) => item.health.level === "cold").length;
    const coolCount = items.filter((item) => item.health.level === "cool").length;
    const unknownCount = items.filter((item) => item.health.level === "unknown").length;
    const avgOverdueDays = totalCooling > 0
        ? Math.round(items.reduce((sum, item) => sum + item.overdueDays, 0) / totalCooling)
        : 0;

    return {
        items,
        totalCooling,
        starredCooling,
        coldCount,
        coolCount,
        unknownCount,
        avgOverdueDays,
    };
}
