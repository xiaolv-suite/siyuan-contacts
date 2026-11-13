/**
 * 互动日期回顾（F10）：日期范围过滤、按月分组与「历史上的今天」投影。
 * 复用现有时间线投影，无新存储。日期一律 localDate（YYYY-MM-DD）字符串比较，
 * 范围端点为闭区间；非法日期串视为该侧不限制；空月份不生成分组。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */

import { isValidDateKey } from "./date-key.ts";
import type { ContactSummary } from "./person.ts";
import type { InteractionEvent } from "./interactions.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidReviewDate(value: string): boolean {
    return DATE_RE.test(value) && isValidDateKey(value);
}

/** 闭区间日期范围过滤；非法/空端点视为不限制 */
export function inDateRange(localDate: string, from: string, to: string): boolean {
    if (!isValidReviewDate(localDate)) return false;
    const fromKey = isValidReviewDate(from) ? from : "";
    const toKey = isValidReviewDate(to) ? to : "";
    if (fromKey && localDate < fromKey) return false;
    if (toKey && localDate > toKey) return false;
    return true;
}

export interface MonthGroup<T extends { localDate: string }> {
    /** YYYY-MM */
    month: string;
    /** 展示文本：2026年9月 */
    label: string;
    items: T[];
}

/** 按月分组（输入需已按日期倒序，组序沿用输入顺序）；空月份不生成组 */
export function groupByMonth<T extends { localDate: string }>(items: readonly T[]): MonthGroup<T>[] {
    const groups: MonthGroup<T>[] = [];
    const byMonth = new Map<string, MonthGroup<T>>();
    for (const item of items) {
        if (!isValidReviewDate(item.localDate)) continue;
        const month = item.localDate.slice(0, 7);
        let group = byMonth.get(month);
        if (!group) {
            const [year, monthNumber] = month.split("-").map(Number);
            group = { month, label: `${year}年${monthNumber}月`, items: [] };
            byMonth.set(month, group);
            groups.push(group);
        }
        group.items.push(item);
    }
    return groups;
}

/** 「历史上的今天」：月日与今天相同、且早于今天的历史互动，按年份倒序 */
export function onThisDay<T extends { localDate: string }>(items: readonly T[], today: string): T[] {
    if (!isValidReviewDate(today)) return [];
    const suffix = today.slice(5);
    return items
        .filter((item) => isValidReviewDate(item.localDate) && item.localDate < today && item.localDate.slice(5) === suffix)
        .sort((a, b) => b.localDate.localeCompare(a.localDate));
}

/** 相对今天的日期键（快捷项：最近 30/90 天起点） */
export function addReviewDays(dateKey: string, days: number): string {
    if (!isValidReviewDate(dateKey)) return "";
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day + days);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface OnThisDayMemory {
    readonly eventId: string;
    readonly personDocId: string;
    readonly personName: string;
    readonly localDate: string; // "YYYY-MM-DD"
    readonly yearsAgo: number;  // 1, 2, 3...
    readonly source: string;
    readonly note?: string;
    readonly person?: ContactSummary;
}

/**
 * 全库「历史上的今天」时光胶囊提取引擎。
 * 纯函数：零外部依赖，严格比对月日与更早年份。
 * 规则：
 * 1. 过滤掉 tombstones 集合中的已删除互动；
 * 2. localDate 必须合法且有效，月日（MM-DD）与 today 严格相同；
 * 3. localDate 年份必须早于 today 年份（排除今天本年产生的记录）；
 * 4. 匹配对应人物（people），若找不到名字则回退为未知；
 * 5. 按年份由近及远（yearsAgo 升序，即 1年前 > 2年前 > 3年前）排列，同年按日期/事件ID稳定排序；
 * 6. 可选限制最大返回条数（默认 10）。
 */
export function findGlobalOnThisDay(
    events: readonly InteractionEvent[],
    people: readonly ContactSummary[],
    today: string,
    limit: number = 10,
    tombstones?: readonly string[],
): OnThisDayMemory[] {
    if (!isValidReviewDate(today)) return [];
    const todayYear = parseInt(today.slice(0, 4), 10);
    const todayMonthDay = today.slice(5);

    const tombstoneSet = tombstones && tombstones.length > 0 ? new Set(tombstones) : null;
    const peopleByDocId = new Map(people.map((p) => [p.docId, p]));
    const candidates: OnThisDayMemory[] = [];

    for (const event of events) {
        if (tombstoneSet && tombstoneSet.has(event.id)) continue;
        if (!isValidReviewDate(event.localDate)) continue;
        if (event.localDate.slice(5) !== todayMonthDay) continue;
        const eventYear = parseInt(event.localDate.slice(0, 4), 10);
        if (eventYear >= todayYear) continue;

        const yearsAgo = todayYear - eventYear;
        const person = peopleByDocId.get(event.personDocId);
        const personName = person?.name?.trim() || "未命名联系人";

        candidates.push({
            eventId: event.id,
            personDocId: event.personDocId,
            personName,
            localDate: event.localDate,
            yearsAgo,
            source: event.source,
            ...(event.note ? { note: event.note } : {}),
            ...(person ? { person } : {}),
        });
    }

    // 排序：先按距今年数升序（1年前在前），同年按 localDate 降序、eventId 稳定排序
    candidates.sort((a, b) => {
        if (a.yearsAgo !== b.yearsAgo) return a.yearsAgo - b.yearsAgo;
        if (a.localDate !== b.localDate) return b.localDate.localeCompare(a.localDate);
        return a.eventId.localeCompare(b.eventId);
    });

    return candidates.slice(0, Math.max(1, limit));
}

/**
 * 组装时光记忆破冰文本（用于一键复制发送给微信好友/通讯软件）。
 */
export function formatMemoryIcebreakerText(memory: OnThisDayMemory): string {
    const noteTrimmed = memory.note?.trim();
    if (noteTrimmed) {
        return `刚好 ${memory.yearsAgo} 年前的今天（${memory.localDate}），我们曾交流：${noteTrimmed}`;
    }
    return `刚好 ${memory.yearsAgo} 年前的今天（${memory.localDate}），曾与你有过互动交集，特此问候！`;
}
