/**
 * 城市人脉专题文档（City Topic Document）同步服务。
 * 在思源笔记指定笔记本中沉淀《城市人脉 · {城市}》实体文档，
 * 并以 siyuan://blocks/ 双向链接汇聚常驻好友与关联机构，形成星系聚类。
 */
import { findCityTopicDocument, flushBlockIndex, setBlockAttrs, upsertMarkedBlock } from "../api/blocks";
import { createDocWithMd } from "../api/client";
import { buildCityTopicSectionMarkdown, buildCityInitialDocumentMarkdown, CITY_TOPIC_ATTR, CITY_CONTACTS_SECTION_ATTR } from "../domain/city-topic.ts";
import type { ContactSummary } from "../domain/person.ts";
import { toLocalDateKey } from "../domain/interactions.ts";

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
