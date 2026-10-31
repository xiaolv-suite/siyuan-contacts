/**
 * RFC 5545 iCalendar (.ics) 日历格式序列化纯函数。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 支持联系人生日、结婚纪念、合作里程碑等重要日期的标准日历导出，
 * 兼容 Apple Calendar、Google Calendar、Outlook 及系统原生全端日历。
 */

import type { ContactSummary } from "./person.ts";
import { ANNIVERSARY_CATEGORY_LABELS, type AnniversaryItem } from "./anniversaries.ts";
import { sanitizeFileName } from "./format.ts";
import { toLocalDateKey } from "./date-key.ts";

export interface IcsEventItem {
    uid: string;
    summary: string;
    description?: string;
    startDateStr: string; // YYYYMMDD
    isAllDay: boolean;
    isYearly: boolean;
    categories?: string[];
}

export interface IcsExportOptions {
    includeBirthday?: boolean;
    includeAnniversaries?: boolean;
    alarmDaysBefore?: number;
}

/** 规范转义 RFC 5545 文本字符：反斜杠、分号、逗号和换行 */
export function escapeIcsText(text: string): string {
    if (!text) return "";
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 规定单行不可超过 75 字节，超长需 CRLF + 空格折行 */
export function foldIcsLine(line: string): string {
    if (line.length <= 72) return line;
    const parts: string[] = [];
    let cur = line;
    let first = true;
    while (cur.length > 0) {
        const limit = first ? 72 : 71;
        parts.push(cur.slice(0, limit));
        cur = cur.slice(limit);
        first = false;
    }
    return parts.join("\r\n ");
}

function normalizeDateToYmd(dateStr: string): string | null {
    if (!dateStr || typeof dateStr !== "string") return null;
    const trimmed = dateStr.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return null;
    let year = match[1];
    const month = match[2];
    const day = match[3];
    if (year === "0000") {
        year = "2000"; // 未知年份以 2000 年做循环锚点
    }
    return `${year}${month}${day}`;
}

function formatUtcTimestamp(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/**
 * 计算全天事件排除性结束日期（RFC 5545 §3.6.1 / §3.8.2.2 规定全天事件 DTEND 为开始日期的次日）。
 */
export function nextDayYmd(ymd: string): string {
    if (!ymd || ymd.length !== 8) return ymd;
    const year = Number(ymd.slice(0, 4));
    const month = Number(ymd.slice(4, 6)) - 1;
    const day = Number(ymd.slice(6, 8));
    const d = new Date(Date.UTC(year, month, day + 1));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export function serializeIcsCalendar(
    events: readonly IcsEventItem[],
    calName = "小驴人脉 · 重要日期与纪念日",
): string {
    const nowUtc = formatUtcTimestamp();
    const rawLines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Lv Contacts//SiYuan Plugin//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeIcsText(calName)}`,
        "X-WR-TIMEZONE:Asia/Shanghai",
    ];

    for (const ev of events) {
        rawLines.push("BEGIN:VEVENT");
        rawLines.push(`UID:${ev.uid}`);
        rawLines.push(`DTSTAMP:${nowUtc}`);
        rawLines.push(`DTSTART;VALUE=DATE:${ev.startDateStr}`);
        if (ev.isAllDay) {
            rawLines.push(`DTEND;VALUE=DATE:${nextDayYmd(ev.startDateStr)}`);
        }
        if (ev.isYearly) {
            rawLines.push("RRULE:FREQ=YEARLY");
        }
        rawLines.push(`SUMMARY:${escapeIcsText(ev.summary)}`);
        if (ev.description) {
            rawLines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
        }
        if (ev.categories && ev.categories.length > 0) {
            rawLines.push(`CATEGORIES:${escapeIcsText(ev.categories.join(","))}`);
        }
        rawLines.push("TRANSP:TRANSPARENT");
        rawLines.push("END:VEVENT");
    }

    rawLines.push("END:VCALENDAR");

    return rawLines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export function buildContactEventsForIcs(
    person: ContactSummary,
    anniversaries: readonly AnniversaryItem[] = [],
    options: IcsExportOptions = {},
): IcsEventItem[] {
    const events: IcsEventItem[] = [];
    const includeBirthday = options.includeBirthday !== false;
    const includeAnnivs = options.includeAnniversaries !== false;
    const personName = person.name.trim() || "联系人";

    // 1. 生日
    if (includeBirthday && person.birthday) {
        const ymd = normalizeDateToYmd(person.birthday);
        if (ymd) {
            const lunarTag = person.isLunar ? " (农历)" : "";
            events.push({
                uid: `bday-${person.docId || person.itemId}@lv-contacts`,
                summary: `🎂 ${personName} 的生日${lunarTag}`,
                description: `小驴人脉记录 · ${personName} 的生日${lunarTag}（原始登记：${person.birthday}）`,
                startDateStr: ymd,
                isAllDay: true,
                isYearly: true,
                categories: ["生日", "人脉"],
            });
        }
    }

    // 2. 纪念日
    if (includeAnnivs && anniversaries.length > 0) {
        for (const anniv of anniversaries) {
            if (anniv.remindDisabled) continue;
            const ymd = normalizeDateToYmd(anniv.date);
            if (!ymd) continue;

            const catMeta = ANNIVERSARY_CATEGORY_LABELS[anniv.category] ?? { label: "纪念日", icon: "🌟" };
            const lunarTag = anniv.isLunar ? " (农历)" : "";
            const desc = anniv.note ? `${anniv.note}\n` : "";

            events.push({
                uid: `anniv-${anniv.id}@lv-contacts`,
                summary: `${catMeta.icon} ${personName} · ${anniv.title}${lunarTag}`,
                description: `${desc}小驴人脉记录 · 类别：${catMeta.label}（原始登记：${anniv.date}）`,
                startDateStr: ymd,
                isAllDay: true,
                isYearly: true,
                categories: ["纪念日", catMeta.label, "人脉"],
            });
        }
    }

    return events;
}

export function serializePersonAnniversariesToIcs(
    person: ContactSummary,
    anniversaries: readonly AnniversaryItem[] = [],
    options: IcsExportOptions = {},
): string {
    const events = buildContactEventsForIcs(person, anniversaries, options);
    const personName = person.name.trim() || "联系人";
    return serializeIcsCalendar(events, `${personName} 的重要日期与纪念日`);
}

export function serializeBatchAnniversariesToIcs(
    peopleWithAnnivs: Array<{ person: ContactSummary; anniversaries: readonly AnniversaryItem[] }>,
    options: IcsExportOptions = {},
): string {
    const allEvents: IcsEventItem[] = [];
    for (const item of peopleWithAnnivs) {
        const evs = buildContactEventsForIcs(item.person, item.anniversaries, options);
        allEvents.push(...evs);
    }
    return serializeIcsCalendar(allEvents, "小驴人脉 · 全量重要日期与纪念日");
}

export function buildIcsFilename(personName: string, dateStr?: string): string {
    const safeName = sanitizeFileName(personName, "联系人", 40);
    const safeDate = (dateStr || toLocalDateKey(new Date())).trim();
    return `小驴人脉_纪念日_${safeName}_${safeDate}.ics`;
}

export function buildBatchIcsFilename(label = "全量纪念日", dateStr?: string): string {
    const safeLabel = sanitizeFileName(label, "纪念日", 40);
    const safeDate = (dateStr || toLocalDateKey(new Date())).trim();
    return `小驴人脉_${safeLabel}_${safeDate}.ics`;
}
