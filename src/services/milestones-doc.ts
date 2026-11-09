/**
 * 人脉交往编年史里程碑服务：创建并沉淀编年史实体文档。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import type { ContactSummary } from "../domain/person.ts";
import {
    buildMilestonesDocumentHpath,
    buildMilestonesDocumentMarkdown,
    type MilestoneEvent,
} from "../domain/timeline-milestones.ts";
import { createDocWithMd } from "../api/client.ts";
import { flushBlockIndex, setBlockAttrs } from "../api/blocks.ts";
import { qualifyContactsSubHPath } from "../domain/format.ts";

export async function createMilestonesDoc(
    _plugin: Plugin,
    settings: ContactsSettings,
    person: ContactSummary,
    milestones: readonly MilestoneEvent[],
): Promise<{ docId: string; hpath: string } | null> {
    if (!settings.notebookId || !person.docId) return null;

    const md = buildMilestonesDocumentMarkdown(person, milestones);
    const hpath = qualifyContactsSubHPath(settings, buildMilestonesDocumentHpath(person.name));

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-lvct-milestones-person": person.docId,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch {
        // 容错：属性设置失败不阻断文档返回
    }

    return { docId, hpath };
}
