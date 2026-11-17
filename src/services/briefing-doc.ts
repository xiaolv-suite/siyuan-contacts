/**
 * 会面准备简报服务：沉淀会面简报为思源实体文档。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import {
    buildBriefingMarkdown,
    buildBriefingDocumentHpath,
    type BriefingExportInput,
} from "../domain/briefing-export.ts";
import { createDocWithMd } from "../api/client.ts";
import { flushBlockIndex, setBlockAttrs } from "../api/blocks.ts";
import { qualifyContactsSubHPath } from "../domain/format.ts";

export async function createBriefingDoc(
    _plugin: Plugin,
    settings: ContactsSettings,
    input: BriefingExportInput,
    dateStr?: string,
): Promise<{ docId: string; hpath: string } | null> {
    if (!settings.notebookId || !input.person.docId) return null;

    const md = buildBriefingMarkdown(input);
    const date = dateStr || input.generatedAt.slice(0, 10);
    const hpath = qualifyContactsSubHPath(settings, buildBriefingDocumentHpath(input.person.name, date));

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-lvct-briefing-person": input.person.docId,
            "custom-lvct-briefing-date": date,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch {
        // 容错：属性设置失败不影响文档返回
    }

    return { docId, hpath };
}
