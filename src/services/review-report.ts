/**
 * 交往回顾报表服务（F12）：名册（人名解析）+ 互动事件 → 区间报表。
 * 只读投影，无新存储；区间由组件选择（本月/最近 30/90 天/自定义起止）。
 */
import type { Plugin } from "siyuan";
import { buildReviewReport, buildReviewReportMarkdown } from "../domain/review-report";
import type { ReviewRange, ReviewReport } from "../domain/review-report";
import type { ContactsSettings } from "../domain/model";
import { loadInteractionStoreStrict } from "../data/interactions";
import { getRoster } from "./roster";
import { createDocWithMd } from "../api/client";
import { flushBlockIndex, setBlockAttrs } from "../api/blocks";
import { qualifyContactsSubHPath } from "../domain/format";

export async function buildReview(
    plugin: Plugin,
    settings: ContactsSettings,
    range: ReviewRange,
): Promise<ReviewReport> {
    const [roster, store] = await Promise.all([getRoster(settings), loadInteractionStoreStrict(plugin)]);
    return buildReviewReport({ events: store.events, roster, range });
}

/**
 * 将某区间的交往回顾报表在当前笔记本沉淀为实体思源文档《人脉交往回顾 · YYYY-MM-DD 至 YYYY-MM-DD》
 */
export async function exportReviewReportToDoc(
    plugin: Plugin,
    settings: ContactsSettings,
    range: ReviewRange,
): Promise<{ docId: string; hpath: string } | null> {
    if (!settings.notebookId) return null;
    const report = await buildReview(plugin, settings, range);
    const md = buildReviewReportMarkdown(report);

    const dateRangeStr = report.range.from && report.range.to
        ? `${report.range.from} 至 ${report.range.to}`
        : report.range.from || report.range.to || "全量回顾";
    const hpath = qualifyContactsSubHPath(settings, `/人脉交往回顾/人脉交往回顾 · ${dateRangeStr}`);

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-lvct-review": dateRangeStr,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch (error) {
        console.warn("[LvContacts] 设置交往回顾文档属性失败（已降级保留正文）：", error);
    }

    return { docId, hpath };
}
