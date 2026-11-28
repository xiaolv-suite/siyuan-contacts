/**
 * 周度人脉交往简报服务：数据聚合与思源实体文档沉淀。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { computeISOWeekRange, buildWeeklyDigestMarkdown, type WeekRange } from "../domain/weekly-digest.ts";
import { loadInteractionStoreStrict } from "../data/interactions.ts";
import { loadFollowUpStoreStrict } from "../data/followups.ts";
import { getRoster } from "./roster.ts";
import { createDocWithMd } from "../api/client.ts";
import { flushBlockIndex, setBlockAttrs } from "../api/blocks.ts";
import { qualifyContactsSubHPath } from "../domain/format.ts";

export interface CreateWeeklyDigestDocOptions {
    targetDateOrKey?: Date | string;
}

export async function createWeeklyDigestDoc(
    plugin: Plugin,
    settings: ContactsSettings,
    options: CreateWeeklyDigestDocOptions = {},
): Promise<{ docId: string; hpath: string; weekLabel: string } | null> {
    if (!settings.notebookId) return null;

    const weekRange: WeekRange = computeISOWeekRange(options.targetDateOrKey);
    const [roster, interactionStore, followUpStore] = await Promise.all([
        getRoster(settings),
        loadInteractionStoreStrict(plugin).catch(() => ({ schemaVersion: 1 as const, events: [], tombstones: [] })),
        loadFollowUpStoreStrict(plugin).catch(() => ({ schemaVersion: 1 as const, items: [] })),
    ]);

    const md = buildWeeklyDigestMarkdown({
        weekRange,
        events: interactionStore.events,
        contacts: roster,
        upcomingFollowUps: followUpStore.items,
        generatedAt: new Date().toLocaleString(),
    });

    const dateRangeLabel = `${weekRange.from.slice(5)} ~ ${weekRange.to.slice(5)}`;
    const hpath = qualifyContactsSubHPath(settings, `/人脉周报/${weekRange.weekLabel} 人脉交往周报（${dateRangeLabel}）`);

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-lvct-weekly-digest": weekRange.weekLabel,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch (error) {
        console.warn("[LvContacts] 设置人脉周报文档属性失败（已降级保留正文）：", error);
    }

    return { docId, hpath, weekLabel: weekRange.weekLabel };
}
