/**
 * iCalendar (.ics) 日历导出服务。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import type { ContactSummary } from "../domain/person.ts";
import { loadAnniversaryStore } from "../data/anniversaries.ts";
import { getRoster } from "./roster.ts";
import { toLocalDateKey } from "../domain/date-key.ts";
import {
    buildIcsFilename,
    serializeBatchAnniversariesToIcs,
    serializePersonAnniversariesToIcs,
    type IcsExportOptions,
} from "../domain/ical-export.ts";

export interface IcsExportResult {
    filename: string;
    content: string;
}

/** 导出单人物生日与纪念日为 .ics 文本与建议文件名 */
export function exportPersonAnniversariesIcs(
    person: ContactSummary,
    anniversaries: readonly import("../domain/anniversaries.ts").AnniversaryItem[] = [],
    options: IcsExportOptions = {},
): IcsExportResult {
    const content = serializePersonAnniversariesToIcs(person, anniversaries, options);
    const filename = buildIcsFilename(person.name);
    return { filename, content };
}

/** 导出全库联系人的生日与重要纪念日为全量 .ics 文本与建议文件名 */
export async function exportAllAnniversariesIcs(
    plugin: Plugin,
    settings: ContactsSettings,
    options: IcsExportOptions = {},
): Promise<IcsExportResult> {
    const [roster, store] = await Promise.all([
        getRoster(settings),
        loadAnniversaryStore(plugin),
    ]);

    const peopleWithAnnivs = roster.map((person) => ({
        person,
        anniversaries: store.anniversaries[person.docId] ?? [],
    }));

    const content = serializeBatchAnniversariesToIcs(peopleWithAnnivs, options);
    const today = toLocalDateKey(new Date());
    const filename = `小驴人脉_全量纪念日_${today}.ics`;

    return { filename, content };
}
