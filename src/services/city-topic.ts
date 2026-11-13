/**
 * 城市人脉专题文档（City Topic Document）同步服务。
 * 在思源笔记指定笔记本中沉淀《城市人脉 · {城市}》实体文档，
 * 并以 siyuan://blocks/ 双向链接汇聚常驻好友与关联机构，形成星系聚类。
 */
import { findCityTopicDocument, flushBlockIndex, setBlockAttrs, upsertMarkedBlock } from "../api/blocks";
import { createDocWithMd } from "../api/client";
import {
    buildCityTopicSectionMarkdown,
    buildCityInitialDocumentMarkdown,
    CITY_TOPIC_ATTR,
    CITY_CONTACTS_SECTION_ATTR,
    extractCityOrganizations,
    buildTripItineraryMarkdown,
    TRIP_CONTEXT_METAS,
    type TripItineraryInput,
} from "../domain/city-topic.ts";
import type { ContactSummary } from "../domain/person.ts";
import { toLocalDateKey } from "../domain/interactions.ts";
import { filterContactsByRegion } from "../domain/region.ts";

export interface SyncCityTopicInput {
    notebookId: string;
    city: string;
    contacts: readonly ContactSummary[];
    organizations?: readonly { name: string; docId: string }[];
}

export async function syncCityTopicDocument(
    input: SyncCityTopicInput,
): Promise<{ docId: string; created: boolean } | null> {
    const cityName = input.city.trim();
    if (!input.notebookId || !cityName || cityName === "未知") return null;

    try {
        const topicInput = {
            city: cityName,
            contacts: input.contacts,
            organizations: input.organizations,
            generatedDate: toLocalDateKey(new Date()),
        };
        const sectionMarkdown = buildCityTopicSectionMarkdown(topicInput);

        const existing = await findCityTopicDocument(input.notebookId, cityName);
        if (existing?.docId) {
            // 已有该城市专题文档：仅受控更新人脉区块，用户手写的其他城市内容完全不受影响
            await upsertMarkedBlock(existing.docId, CITY_CONTACTS_SECTION_ATTR, sectionMarkdown);
            await setBlockAttrs(existing.docId, {
                [CITY_TOPIC_ATTR]: cityName,
                "custom-lvct-updated": String(Date.now()),
            });
            await flushBlockIndex();
            return { docId: existing.docId, created: false };
        }

        // 不存在则新建文档：以正式城市名命名文档标题（如 /城市/深圳），下方挂载人脉受控区块
        const initialDocMarkdown = buildCityInitialDocumentMarkdown(topicInput);
        const hPath = `/城市/${cityName}`;
        const newDocId = await createDocWithMd(input.notebookId, hPath, `${initialDocMarkdown}\n{: ${CITY_CONTACTS_SECTION_ATTR}="1"}`);
        if (newDocId) {
            await setBlockAttrs(newDocId, {
                [CITY_TOPIC_ATTR]: cityName,
                "custom-lvct-created": String(Date.now()),
            });
            await flushBlockIndex();
            return { docId: newDocId, created: true };
        }

        return null;
    } catch (err) {
        console.warn("[LvContacts] 同步城市专题文档失败：", err);
        return null;
    }
}

/**
 * 如果指定城市已经存在专题文档，则执行增量受控刷新（Auto-Rebase）；若不存在则安静跳过，不创建新文档。
 */
export async function rebaseCityTopicIfPresent(
    notebookId: string,
    city: string,
    allContacts: readonly ContactSummary[],
): Promise<boolean> {
    const cityName = city.trim();
    if (!notebookId || !cityName || cityName === "未知") return false;

    try {
        const existing = await findCityTopicDocument(notebookId, cityName);
        if (!existing?.docId) return false;

        const cityContacts = filterContactsByRegion(allContacts, cityName);
        const organizations = extractCityOrganizations(cityContacts);

        const topicInput = {
            city: cityName,
            contacts: cityContacts,
            organizations,
            generatedDate: toLocalDateKey(new Date()),
        };
        const sectionMarkdown = buildCityTopicSectionMarkdown(topicInput);

        await upsertMarkedBlock(existing.docId, CITY_CONTACTS_SECTION_ATTR, sectionMarkdown);
        await setBlockAttrs(existing.docId, {
            [CITY_TOPIC_ATTR]: cityName,
            "custom-lvct-updated": String(Date.now()),
        });
        await flushBlockIndex();
        return true;
    } catch (err) {
        console.warn(`[LvContacts] 增量刷新城市文档《${cityName}》受控区块失败：`, err);
        return false;
    }
}

/**
 * 批量防抖增量受控刷新一组变动的城市文档。
 * 仅刷新已有专题文档的城市，绝不静默新建。
 */
export async function autoRebaseCityTopics(
    notebookId: string,
    cities: Iterable<string>,
    allContacts: readonly ContactSummary[],
): Promise<string[]> {
    const refreshed: string[] = [];
    const list = Array.from(new Set(cities)).filter((c) => c && c.trim() && c !== "未知");
    for (const city of list) {
        const ok = await rebaseCityTopicIfPresent(notebookId, city, allContacts);
        if (ok) refreshed.push(city);
    }
    return refreshed;
}

/**
 * 将某个城市的出差/行程拜访清单沉淀为实体思源文档《出差拜访清单 · 城市 · YYYY-MM-DD》
 */
export async function createTripItineraryDoc(
    notebookId: string,
    input: TripItineraryInput,
): Promise<{ docId: string; hpath: string } | null> {
    if (!notebookId || !input.city.trim() || input.city.trim() === "未知") return null;
    const cityName = input.city.trim();
    const targetDate = input.date || toLocalDateKey(new Date());
    const ctx = TRIP_CONTEXT_METAS.find((c) => c.id === input.context) ?? TRIP_CONTEXT_METAS[0];
    const hpath = `/出差行程/${ctx.titlePrefix} · ${cityName} · ${targetDate}`;
    const md = buildTripItineraryMarkdown({ ...input, city: cityName, date: targetDate });

    const docId = await createDocWithMd(notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-lvct-trip": cityName,
            "custom-lvct-trip-context": input.context,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch (error) {
        console.warn("[LvContacts] 设置行程备忘文档属性失败（已降级保留正文）：", error);
    }

    return { docId, hpath };
}
