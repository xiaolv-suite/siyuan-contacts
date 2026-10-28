/**
 * 关系降温预警与破冰重联中枢（E-53）：
 * 纯函数模型，按客观交往时间与人物自定义节奏，精准识别全库关系降温（微凉、渐冻、从未联系）人脉。
 * 加权排序优先上浮星标 VIP 与深度逾期人物，提供结构化破冰候选名单。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */
import { computeRelationshipHealth, type PersonCadence, type RelationshipHealth } from "./cadence.ts";
import type { ContactSummary } from "./person.ts";
import { profileText } from "./people-profiles.ts";

export interface CoolingContactItem {
    person: ContactSummary;
    health: RelationshipHealth;
    isStarred: boolean;
    urgencyScore: number;
    primaryOrgAndTitle: string;
    lastInteractionDate: string;
    cadenceDays: number;
    overdueDays: number;
}

/**
 * 计算降温紧急度加权评分：
 * 星标加权 (+100) > 渐冻加权 (+50) > 微凉加权 (+20) + 逾期天数
 */
export function computeUrgencyScore(
    health: RelationshipHealth,
    isStarred: boolean,
): number {
    let score = 0;
    if (isStarred) score += 100;
    if (health.level === "cold") score += 50;
    else if (health.level === "cool") score += 20;
    else if (health.level === "unknown") score += 10;
    score += Math.min(100, health.overdueDays);
    return score;
}

export interface BuildCoolingRadarOptions {
    people: readonly ContactSummary[];
    recentInteractions?: Readonly<Record<string, { occurredAt: number; localDate?: string }>>;
    cadences?: Readonly<Record<string, PersonCadence>>;
    starredDocIds?: ReadonlySet<string> | readonly string[];
    defaultCadenceDays?: number;
    nowTime?: number;
}

/**
 * 汇编全库需破冰的降温联系人清单：
 * 筛选出 cool (微凉), cold (渐冻), unknown (从未联系) 状态的非暂停联系人，并按紧急度降序排列
 */
export function buildCoolingRadarItems(options: BuildCoolingRadarOptions): CoolingContactItem[] {
    const {
        people,
        recentInteractions = {},
        cadences = {},
        defaultCadenceDays = 30,
        nowTime = Date.now(),
    } = options;

    const starredSet = options.starredDocIds instanceof Set
        ? options.starredDocIds
        : new Set(options.starredDocIds ?? []);

    const result: CoolingContactItem[] = [];

    for (const person of people) {
        const cadence = cadences[person.docId];
        if (cadence?.paused) continue;

        const interaction = recentInteractions[person.docId];
        const lastTime = interaction?.occurredAt;
        const lastDate = interaction?.localDate ?? "";

        const health = computeRelationshipHealth({
            cadenceDays: cadence?.days ?? defaultCadenceDays,
            lastInteractionTime: lastTime,
            paused: false,
            nowTime,
        });

        // 仅收纳微凉、渐冻或从未联系的人选
        if (health.level !== "cool" && health.level !== "cold" && health.level !== "unknown") {
            continue;
        }

        const isStarred = starredSet.has(person.docId);
        const urgencyScore = computeUrgencyScore(health, isStarred);
        const orgAndTitle = profileText(person.profile, "work");
        const primaryOrgAndTitle = orgAndTitle !== "未填写" && orgAndTitle !== "尚未核实" && orgAndTitle !== "组织归属尚未核实"
            ? orgAndTitle
            : (person.group ? `[${person.group}]` : "");

        result.push({
            person,
            health,
            isStarred,
            urgencyScore,
            primaryOrgAndTitle,
            lastInteractionDate: lastDate,
            cadenceDays: health.cadenceDays,
            overdueDays: health.overdueDays,
        });
    }

    // 紧急度评分从高到低排序，同分者按逾期天数倒序，再按姓名排序
    result.sort((a, b) => {
        if (b.urgencyScore !== a.urgencyScore) {
            return b.urgencyScore - a.urgencyScore;
        }
        if (b.overdueDays !== a.overdueDays) {
            return b.overdueDays - a.overdueDays;
        }
        return a.person.name.localeCompare(b.person.name, "zh-CN");
    });

    return result;
}

export type CoolingRadarFilterType = "all" | "starred" | "cool" | "cold" | "unknown";

/**
 * 按检索词及分类维度过滤降温人脉条目
 */
export function filterCoolingRadarItems(
    items: readonly CoolingContactItem[],
    query = "",
    filterType: CoolingRadarFilterType = "all",
): CoolingContactItem[] {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
        if (filterType === "starred" && !item.isStarred) return false;
        if (filterType === "cool" && item.health.level !== "cool") return false;
        if (filterType === "cold" && item.health.level !== "cold") return false;
        if (filterType === "unknown" && item.health.level !== "unknown") return false;

        if (!q) return true;

        const nameMatch = item.person.name.toLowerCase().includes(q);
        const orgMatch = item.primaryOrgAndTitle.toLowerCase().includes(q);
        const tagMatch = item.person.tags.some((t) => t.toLowerCase().includes(q));
        const groupMatch = item.person.group.toLowerCase().includes(q);

        return nameMatch || orgMatch || tagMatch || groupMatch;
    });
}
