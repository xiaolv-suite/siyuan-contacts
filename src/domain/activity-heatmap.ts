/**
 * 年度社交互动活跃度热力图（Annual Social Activity Heatmap）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 类似 GitHub Contribution Heatmap，直观展现 52 周社交打卡足迹、连击天数与活跃度分布。
 */

import type { ContactSummary } from "./person.ts";
import type { InteractionEvent } from "./interactions.ts";
import { isValidDateKey } from "./date-key.ts";

export interface HeatmapDay {
    dateKey: string;      // YYYY-MM-DD
    dayOfWeek: number;    // 0 (周一) 到 6 (周日)
    count: number;        // 当天互动次数
    level: 0 | 1 | 2 | 3 | 4; // 活跃度颜色档位
    peopleCount: number;  // 当天互动的不同联系人数
    personNames: string[];// 参与互动的联系人姓名列表（去重，截取前 3 位）
    personDocIds: string[];// 当天参与互动的全部联系人 docId（去重）
    isFuture?: boolean;   // 是否为未来日期
}

export interface MonthLabel {
    label: string;      // 比如 "1月", "2月"
    weekIndex: number;  // 对应的列索引（0 ~ 51）
}

export interface ActivityHeatmapData {
    startDate: string;    // YYYY-MM-DD
    endDate: string;      // YYYY-MM-DD
    totalEvents: number;  // 统计区间内互动总数
    activeDays: number;   // 产生互动的总天数
    maxDayCount: number;  // 单日最高互动数
    currentStreak: number;// 当前连续打卡天数
    longestStreak: number;// 最长连续打卡天数
    weeks: HeatmapDay[][];// 按周排列的二维数组：weeks[col][row] (col: 0~51, row: 0~6)
    months: MonthLabel[]; // 月份标签位置
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad(val: number): string {
    return String(val).padStart(2, "0");
}

function formatDate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
}

/**
 * 计算社交互动活跃度热力图数据。
 * @param events 互动事件列表
 * @param people 联系人名册
 * @param referenceDate 参考基准日（默认今天）
 * @param totalWeeks 展示的总周数（默认 52 周）
 */
export function computeActivityHeatmap(
    events: readonly InteractionEvent[],
    people: readonly ContactSummary[] = [],
    referenceDate?: Date | string,
    totalWeeks: number = 52,
): ActivityHeatmapData {
    let today: Date;
    if (typeof referenceDate === "string" && DATE_RE.test(referenceDate) && isValidDateKey(referenceDate)) {
        const [y, m, d] = referenceDate.split("-").map(Number);
        today = new Date(y, m - 1, d);
    } else if (referenceDate instanceof Date) {
        today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    } else {
        const now = new Date();
        today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const todayKey = formatDate(today);

    // 1. 建立人名查找映射
    const personMap = new Map<string, string>();
    for (const p of people) {
        if (p.docId && p.name) personMap.set(p.docId, p.name.trim());
    }

    // 2. 聚合同一天的互动事件
    const dailyMap = new Map<string, { count: number; docIds: Set<string> }>();
    for (const ev of events) {
        if ((ev as { tombstone?: boolean }).tombstone) continue;
        if (!ev.localDate || !isValidDateKey(ev.localDate)) continue;
        let dayRec = dailyMap.get(ev.localDate);
        if (!dayRec) {
            dayRec = { count: 0, docIds: new Set() };
            dailyMap.set(ev.localDate, dayRec);
        }
        dayRec.count += 1;
        if (ev.personDocId) dayRec.docIds.add(ev.personDocId);
    }

    // 3. 计算 52 周起止时间
    // 规定以周一为每周第 0 天，周日为第 6 天
    const currentDayOfWeek = (today.getDay() + 6) % 7; // 0=Mon ... 6=Sun
    // 结束于当前周的周日
    const endDateObj = addDays(today, 6 - currentDayOfWeek);
    // 开始于 (totalWeeks - 1) 周前的周一
    const startDateObj = addDays(endDateObj, -(totalWeeks * 7 - 1));

    const startDate = formatDate(startDateObj);
    const endDate = formatDate(endDateObj);

    // 4. 填充网格
    const weeks: HeatmapDay[][] = [];
    const months: MonthLabel[] = [];
    let lastMonth = -1;

    let totalEvents = 0;
    let activeDays = 0;
    let maxDayCount = 0;

    let cursor = new Date(startDateObj);
    for (let w = 0; w < totalWeeks; w++) {
        const weekDays: HeatmapDay[] = [];
        for (let d = 0; d < 7; d++) {
            const dateKey = formatDate(cursor);
            const isFuture = dateKey > todayKey;
            const rec = dailyMap.get(dateKey);
            const count = (!isFuture && rec) ? rec.count : 0;
            const peopleCount = (!isFuture && rec) ? rec.docIds.size : 0;
            const personNames: string[] = [];

            if (!isFuture && rec) {
                for (const docId of rec.docIds) {
                    const name = personMap.get(docId);
                    if (name && !personNames.includes(name)) {
                        personNames.push(name);
                    }
                }
            }

            // 活跃度等级 (0~4)
            let level: 0 | 1 | 2 | 3 | 4 = 0;
            if (count >= 6) level = 4;
            else if (count >= 4) level = 3;
            else if (count >= 2) level = 2;
            else if (count >= 1) level = 1;

            if (!isFuture && count > 0) {
                totalEvents += count;
                activeDays += 1;
                if (count > maxDayCount) maxDayCount = count;
            }

            // 记录月份标签变更（取当月 1 号所在的周）
            const m = cursor.getMonth();
            if (m !== lastMonth && d <= 3) {
                months.push({
                    label: `${m + 1}月`,
                    weekIndex: w,
                });
                lastMonth = m;
            }

            weekDays.push({
                dateKey,
                dayOfWeek: d,
                count,
                level,
                peopleCount,
                personNames: personNames.slice(0, 3),
                personDocIds: (!isFuture && rec) ? [...rec.docIds] : [],
                isFuture,
            });

            cursor = addDays(cursor, 1);
        }
        weeks.push(weekDays);
    }

    // 5. 计算连击 (Streak)
    // 5.1 当前连击：从今天或昨天往回倒推连续有互动的有效天数
    let currentStreak = 0;
    let streakCursor = new Date(today);
    const todayCount = dailyMap.get(todayKey)?.count ?? 0;

    // 如果今天还没记录互动，但昨天有记录，则从昨天起算当前连击
    if (todayCount === 0) {
        streakCursor = addDays(streakCursor, -1);
    }

    while (true) {
        const key = formatDate(streakCursor);
        if (key < startDate) break;
        const c = dailyMap.get(key)?.count ?? 0;
        if (c > 0) {
            currentStreak += 1;
            streakCursor = addDays(streakCursor, -1);
        } else {
            break;
        }
    }

    // 5.2 最长连续打卡天数
    let longestStreak = 0;
    let tempStreak = 0;
    let scanCursor = new Date(startDateObj);

    while (formatDate(scanCursor) <= todayKey) {
        const key = formatDate(scanCursor);
        const c = dailyMap.get(key)?.count ?? 0;
        if (c > 0) {
            tempStreak += 1;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
            tempStreak = 0;
        }
        scanCursor = addDays(scanCursor, 1);
    }

    return {
        startDate,
        endDate,
        totalEvents,
        activeDays,
        maxDayCount,
        currentStreak,
        longestStreak,
        weeks,
        months,
    };
}
