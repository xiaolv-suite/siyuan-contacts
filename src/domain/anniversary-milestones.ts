/**
 * 人脉相识相聚周年纪念与重要里程碑通知纯函数模型（E-58）：
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束，node --test 直接可测。
 * 识别近期与当天重要纪念日里程碑（如相识N周年、合作破冰N载、结婚纪念），
 * 并根据人物姓名、交往年限与纪念日类型，智能生成温情个性化的周年祝贺问候草稿。
 */
import {
    nextAnniversary,
    type AnniversaryItem,
    type AnniversaryCategory,
} from "./anniversaries.ts";

export interface ContactAnniversaryMilestone {
    anniversary: AnniversaryItem;
    category: AnniversaryCategory;
    title: string;
    daysUntil: number; // 0 = 今天, >0 = 未来N天
    yearsCount?: number; // 满 N 周年
    displayDate: string;
    isToday: boolean;
    isNear: boolean; // 14 天内
    congratulatoryText: string;
}

/**
 * 纯函数：根据纪念日类型与相交年限，生成得体温润的个性化周年祝贺文案
 */
export function generateAnniversaryGreeting(
    category: AnniversaryCategory,
    personName: string,
    yearsCount?: number,
    anniversaryTitle?: string,
): string {
    const yearsStr = yearsCount && yearsCount > 0 ? `第 ${yearsCount} 周年` : "";
    const name = personName || "好友";

    switch (category) {
        case "acquaintance":
            return yearsCount && yearsCount > 0
                ? `时光荏苒，转眼已与${name}相识${yearsCount}载！一路相伴互信，感谢关照与支持，期待下次小聚畅叙！`
                : `祝${name}相识纪念日愉快！感谢相遇相知的缘分，愿长久同心、顺遂安康！`;
        case "wedding":
            return yearsCount && yearsCount > 0
                ? `祝二位${yearsStr}快乐！相濡以沫，恩爱如初，岁岁常欢愉，万事皆胜意！`
                : `祝二位结婚纪念日快乐！琴瑟和鸣，幸福美满！`;
        case "work":
            return yearsCount && yearsCount > 0
                ? `祝${name}入职/合作${yearsStr}快乐！携手同行创佳绩，感恩深度协作与价值共创！`
                : `祝${name}事业精进，合作纪念日愉快！愿并肩携手，更展宏图！`;
        case "memorial":
        case "other":
        default:
            return anniversaryTitle
                ? `祝${name}【${anniversaryTitle}】${yearsStr ? `${yearsStr}纪念日` : "纪念日"}快乐！愿往昔美好常存，未来皆得所愿！`
                : `祝${name}纪念日快乐！愿事事顺遂，常乐无忧！`;
    }
}

/**
 * 纯函数：从联系人的全量纪念日列表中提取 14 天内或当天的最近里程碑
 */
export function extractUpcomingMilestones(
    anniversaries: readonly AnniversaryItem[],
    personName: string,
    now: Date = new Date(),
    windowDays: number = 14,
): ContactAnniversaryMilestone[] {
    const list: ContactAnniversaryMilestone[] = [];

    for (const item of anniversaries) {
        if (item.remindDisabled) continue;
        const projection = nextAnniversary(item, now);
        if (!projection) continue;

        if (projection.daysUntil >= 0 && projection.daysUntil <= windowDays) {
            const congratulatoryText = generateAnniversaryGreeting(
                item.category,
                personName,
                projection.yearsCount,
                item.title,
            );

            list.push({
                anniversary: item,
                category: item.category,
                title: item.title,
                daysUntil: projection.daysUntil,
                yearsCount: projection.yearsCount,
                displayDate: projection.displayDate,
                isToday: projection.daysUntil === 0,
                isNear: projection.daysUntil <= windowDays,
                congratulatoryText,
            });
        }
    }

    return list.sort((a, b) => a.daysUntil - b.daysUntil);
}

export type MilestoneWindowFilter = "all" | "today" | "week" | "month";

export interface AnniversaryHubItem {
    id: string;
    personDocId: string;
    personName: string;
    group?: string;
    anniversary: AnniversaryItem;
    category: AnniversaryCategory;
    title: string;
    daysUntil: number;
    yearsCount?: number;
    displayDate: string;
    isToday: boolean;
    congratulatoryText: string;
}

/**
 * 纯函数：根据关键词、纪念日分类与时间窗口（全部/今天/本周7天/本月30天）过滤即将到来的里程碑列表
 */
export function filterAnniversaryMilestones<T extends { title: string; personName?: string; category: AnniversaryCategory; daysUntil: number }>(
    items: readonly T[],
    query: string,
    categoryFilter: AnniversaryCategory | "all" = "all",
    windowFilter: MilestoneWindowFilter = "all",
): T[] {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
        if (windowFilter === "today" && item.daysUntil !== 0) return false;
        if (windowFilter === "week" && item.daysUntil > 7) return false;
        if (windowFilter === "month" && item.daysUntil > 30) return false;
        if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
        if (!q) return true;
        const matchTitle = (item.title ?? "").toLowerCase().includes(q);
        const matchPerson = (item.personName ?? "").toLowerCase().includes(q);
        return matchTitle || matchPerson;
    });
}

