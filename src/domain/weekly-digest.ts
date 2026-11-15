/**
 * 周度人脉交往简报（Weekly Social Digest）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 提供 ISO 周区间推算、本周交往事实聚合与结构化 Markdown 报告生成。
 */

import type { ContactSummary } from "./person.ts";
import type { InteractionEvent } from "./interactions.ts";
import type { FollowUpItem } from "./followups.ts";
import { isValidDateKey } from "./date-key.ts";
import { escapeLinkLabel } from "./format.ts";

export interface WeekRange {
    from: string; // YYYY-MM-DD（周一）
    to: string;   // YYYY-MM-DD（周日）
    year: number;
    weekNumber: number; // 1-53
    weekLabel: string;  // 如 "2026-W44"
}

export interface WeeklyDigestInput {
    weekRange: WeekRange;
    events: readonly InteractionEvent[];
    contacts: readonly ContactSummary[];
    upcomingFollowUps?: readonly FollowUpItem[];
    generatedAt?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

function toLocalDateString(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 根据传入日期（Date 对象或 YYYY-MM-DD 字符串）计算对应的 ISO 周一到周日闭区间及周次。
 */
export function computeISOWeekRange(input?: Date | string): WeekRange {
    let date: Date;
    if (typeof input === "string" && DATE_RE.test(input) && isValidDateKey(input)) {
        const [y, m, d] = input.split("-").map(Number);
        date = new Date(y, m - 1, d);
    } else if (input instanceof Date) {
        date = new Date(input.getFullYear(), input.getMonth(), input.getDate());
    } else {
        const now = new Date();
        date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // 周一为 1，周日为 7
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek - 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // ISO 周次计算（基于该周的周四）
    const thursday = new Date(monday);
    thursday.setDate(monday.getDate() + 3);
    const targetYear = thursday.getFullYear();

    const firstJan = new Date(targetYear, 0, 1);
    const dayDiff = (thursday.getTime() - firstJan.getTime()) / 86400000;
    const weekNumber = Math.floor((dayDiff + ((firstJan.getDay() + 6) % 7)) / 7) + 1;

    const from = toLocalDateString(monday);
    const to = toLocalDateString(sunday);
    const weekLabel = `${targetYear}-W${pad(weekNumber)}`;

    return {
        from,
        to,
        year: targetYear,
        weekNumber,
        weekLabel,
    };
}

/**
 * 组装结构化《周度人脉交往简报》Markdown 文本。
 */
export function buildWeeklyDigestMarkdown(input: WeeklyDigestInput): string {
    const { weekRange, events, contacts, upcomingFollowUps = [], generatedAt } = input;
    const from = weekRange.from;
    const to = weekRange.to;

    // 1. 过滤本周内的有效互动事件（排除 tombstone）
    const weekEvents = events.filter((e) => {
        if ((e as { tombstone?: boolean }).tombstone) return false;
        if (!e.localDate || e.localDate < from || e.localDate > to) return false;
        return true;
    });

    const contactMap = new Map(contacts.map((c) => [c.docId, c]));

    // 2. 统计指标
    const totalInteractions = weekEvents.length;
    const involvedDocIds = new Set(weekEvents.map((e) => e.personDocId));
    const involvedPeopleCount = involvedDocIds.size;

    // 按渠道来源统计
    const bySource = { manual: 0, diary: 0, api: 0, other: 0 };
    for (const ev of weekEvents) {
        if (ev.source === "manual") bySource.manual += 1;
        else if (ev.source === "diary") bySource.diary += 1;
        else if (ev.source === "api") bySource.api += 1;
        else bySource.other += 1;
    }

    // 3. 按联系人分组本周事件
    const eventsByPerson = new Map<string, InteractionEvent[]>();
    for (const ev of weekEvents) {
        const list = eventsByPerson.get(ev.personDocId) ?? [];
        list.push(ev);
        eventsByPerson.set(ev.personDocId, list);
    }

    const lines: string[] = [];
    const dateRangeLabel = `${from.slice(5)} ~ ${to.slice(5)}`;
    lines.push(`# ${weekRange.weekLabel} 人脉交往周报（${dateRangeLabel}）`);
    lines.push("");
    lines.push(`> 📅 本周周期：${from} 至 ${to}${generatedAt ? ` · 导出时刻：${generatedAt}` : ""}`);
    lines.push(`> 💡 专注于深度连接与真实交集，记录本周人脉足迹与下周跟进规划。`);
    lines.push("");

    // 概览指标卡
    lines.push("## 📊 本周交往概览");
    lines.push("");
    lines.push(`- **互动频次**：共记录 **${totalInteractions}** 次交往`);
    lines.push(`- **触达人脉**：覆盖 **${involvedPeopleCount}** 位联系人`);
    lines.push(`- **来源分布**：手工记录 ${bySource.manual} 次 · 日记同步 ${bySource.diary} 次 · 外部接口 ${bySource.api} 次`);
    lines.push("");

    // 重点人员往来纪要
    lines.push("## 👥 重点联络人员与交往纪要");
    lines.push("");

    if (eventsByPerson.size === 0) {
        lines.push("*本周暂无已记录的交往互动。保持开放与关怀，开启下周的温润破冰吧！*");
        lines.push("");
    } else {
        // 按互动次数降序排
        const sortedPersonEntries = Array.from(eventsByPerson.entries()).sort(
            (a, b) => b[1].length - a[1].length
        );

        for (const [docId, personEvents] of sortedPersonEntries) {
            const person = contactMap.get(docId);
            const name = person?.name?.trim() || "未命名联系人";
            const cleanName = escapeLinkLabel(name);
            let sub = "";
            const affs = person?.profile?.affiliations;
            if (affs?.state === "known" && affs.value?.work && affs.value.work.length > 0) {
                const firstWork = affs.value.work[0];
                sub = [firstWork.orgName?.trim(), firstWork.title?.trim()].filter(Boolean).join(" · ");
            } else if (person?.group?.trim()) {
                sub = person.group.trim();
            }

            lines.push(`### [${cleanName}](siyuan://blocks/${docId})${sub ? `（${sub}）` : ""}`);
            lines.push(`本周交往 ${personEvents.length} 次：`);
            // 按日期倒序展示
            const sortedEvents = personEvents.slice().sort((a, b) => b.localDate.localeCompare(a.localDate));
            for (const ev of sortedEvents) {
                const note = ev.note?.trim();
                const noteContent = note ? `：${note}` : "";
                lines.push(`- **${ev.localDate}**${noteContent}`);
            }
            lines.push("");
        }
    }

    // 下周待跟进规划
    lines.push("## 📌 近期待办与跟进规划");
    lines.push("");
    if (upcomingFollowUps.length === 0) {
        lines.push("*近期暂无待办跟进。可随时在人物详情页为关键人脉设立跟进计划。*");
        lines.push("");
    } else {
        // 筛选未完成项，限制前 10 条
        const activeFollowUps = upcomingFollowUps.filter((f) => f.status === "open").slice(0, 10);
        if (activeFollowUps.length === 0) {
            lines.push("*所有近期跟进计划已全部完成！*");
            lines.push("");
        } else {
            for (const item of activeFollowUps) {
                const person = contactMap.get(item.personDocId);
                const personName = person?.name?.trim() || "联系人";
                const cleanPersonName = escapeLinkLabel(personName);
                lines.push(`- [ ] [${item.dueDate}] ${item.title}（(( ${item.personDocId} '${cleanPersonName}' ))）`);
            }
            lines.push("");
        }
    }

    return lines.join("\n");
}
