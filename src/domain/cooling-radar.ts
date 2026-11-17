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

        const nameMatch = (item.person.name ?? "").toLowerCase().includes(q);
        const orgMatch = (item.primaryOrgAndTitle ?? "").toLowerCase().includes(q);
        const tagMatch = (item.person.tags ?? []).some((t) => (t ?? "").toLowerCase().includes(q));
        const groupMatch = (item.person.group ?? "").toLowerCase().includes(q);

        return nameMatch || orgMatch || tagMatch || groupMatch;
    });
}

export type DunbarCircleTier =
    | "core_5"       // 核心支持圈（最亲密的 5 人，如家人、核心合伙人）
    | "close_15"     // 亲密盟友圈（深度信任的 15 人，如核心团队、挚友）
    | "active_50"    // 活跃互助圈（高频协作的 50 人，如紧密业务伙伴）
    | "stable_150"   // 稳定人脉网（邓巴数上限 150 人，常规联系人）
    | "loose_broad";  // 泛人脉网络（关注与浅连接）

export interface DunbarCircleConfig {
    tier: DunbarCircleTier;
    label: string;
    maxMembers: number;
    recommendedCadenceDays: number;
    description: string;
}

export const DUNBAR_CIRCLE_CONFIGS: Record<DunbarCircleTier, DunbarCircleConfig> = {
    core_5: {
        tier: "core_5",
        label: "核心圈 (5人)",
        maxMembers: 5,
        recommendedCadenceDays: 14,
        description: "最核心的生活与事业同盟，建议每半月内保持互动",
    },
    close_15: {
        tier: "close_15",
        label: "盟友圈 (15人)",
        maxMembers: 15,
        recommendedCadenceDays: 30,
        description: "深度信任与频繁协作圈，建议每月至少联络一次",
    },
    active_50: {
        tier: "active_50",
        label: "互助圈 (50人)",
        maxMembers: 50,
        recommendedCadenceDays: 90,
        description: "活跃互惠圈，建议每季度至少保持一次有效互动",
    },
    stable_150: {
        tier: "stable_150",
        label: "人脉网 (150人)",
        maxMembers: 150,
        recommendedCadenceDays: 180,
        description: "稳定信任网络，建议每半年完成一次破冰交流",
    },
    loose_broad: {
        tier: "loose_broad",
        label: "泛连接",
        maxMembers: 1000,
        recommendedCadenceDays: 365,
        description: "年度维系与泛人际网络，建议每年至少问候一次",
    },
};

/**
 * 依据人物属性、关系标签与历史互动次数智能推断邓巴圈层归属
 */
export function inferDunbarTier(params: {
    isStarred?: boolean;
    group?: string;
    relationshipLabel?: string;
    totalInteractions?: number;
}): DunbarCircleTier {
    const grp = (params.group || "").trim().toLowerCase();
    const rel = (params.relationshipLabel || "").trim().toLowerCase();
    const interactions = Math.max(0, params.totalInteractions || 0);

    // 1. 核心圈判定：直系亲友、配偶、合伙人或显式星标且高频
    if (rel.includes("家") || rel.includes("妻") || rel.includes("夫") || rel.includes("子") || rel.includes("女") || rel.includes("合伙人") || grp.includes("核心") || grp.includes("合伙人") || grp.includes("家人")) {
        return "core_5";
    }
    if (params.isStarred && interactions >= 5) {
        return "core_5";
    }

    // 2. 盟友圈：星标联系人、密友、挚友、同盟
    if (params.isStarred || grp.includes("好友") || grp.includes("密友") || grp.includes("挚友") || grp.includes("朋友") || grp.includes("同盟") || interactions >= 8) {
        return "close_15";
    }

    // 3. 互助圈：同事、商业伙伴、中频交互
    if (grp.includes("同事") || grp.includes("业务") || grp.includes("合作") || interactions >= 3) {
        return "active_50";
    }

    // 4. 稳定网络：至少有 1 次互动或有特定归组
    if (interactions >= 1 || grp) {
        return "stable_150";
    }

    return "loose_broad";
}

export type RelationshipTemperature = "fresh" | "comfortable" | "cooling" | "cold" | "frozen";

export interface DunbarWarmthResult {
    warmthScore: number; // 0 ~ 100 (100 = 刚联系完，0 = 极度冰冻)
    temperature: RelationshipTemperature;
    tempBadge: string;
    decayRatio: number; // 当前天数 / 建议周期 (如 1.5 = 已逾期 50%)
    isOverdue: boolean;
    overdueDays: number;
    actionAdvice: string;
}

/**
 * 计算人际关系温度指数与动态衰减情况（Dunbar Contact Decay Engine）
 */
export function computeDunbarWarmthDecay(
    daysSinceLastInteraction: number | undefined,
    dunbarTier: DunbarCircleTier,
    customCadenceDays?: number
): DunbarWarmthResult {
    const config = DUNBAR_CIRCLE_CONFIGS[dunbarTier] || DUNBAR_CIRCLE_CONFIGS.stable_150;
    const cadence = Math.max(1, customCadenceDays || config.recommendedCadenceDays);

    if (daysSinceLastInteraction === undefined || !Number.isFinite(daysSinceLastInteraction) || daysSinceLastInteraction < 0) {
        return {
            warmthScore: 10,
            temperature: "frozen",
            tempBadge: "🧊",
            decayRatio: 2.0,
            isOverdue: true,
            overdueDays: cadence,
            actionAdvice: `尚未记录历史互动，建议作为新联结安排初次破冰。`,
        };
    }

    const days = Math.floor(daysSinceLastInteraction);
    const decayRatio = Number((days / cadence).toFixed(2));
    const isOverdue = days > cadence;
    const overdueDays = Math.max(0, days - cadence);

    // 指数平滑温度评分：warmth = 100 * (1 / (1 + (days / cadence)^1.8))
    const warmthScore = Math.max(0, Math.min(100, Math.round(100 / (1 + Math.pow(days / cadence, 1.8)))));

    let temperature: RelationshipTemperature = "comfortable";
    let tempBadge = "🟢";
    let actionAdvice = `处于良性交往周期内，关系保持舒适。`;

    if (decayRatio <= 0.4) {
        temperature = "fresh";
        tempBadge = "🔥";
        actionAdvice = `近期刚刚互动，关系热络，无需刻意打扰。`;
    } else if (decayRatio <= 1.0) {
        temperature = "comfortable";
        tempBadge = "🟢";
        actionAdvice = `处于正常交往节奏中（已过去 ${days}/${cadence} 天）。`;
    } else if (decayRatio <= 1.5) {
        temperature = "cooling";
        tempBadge = "🟡";
        actionAdvice = `已轻度逾期 ${overdueDays} 天，建议在本周内发送简短关怀或业务问候。`;
    } else if (decayRatio <= 2.5) {
        temperature = "cold";
        tempBadge = "🔴";
        actionAdvice = `已显著逾期 ${overdueDays} 天，关系明显降温，建议发起一次深度电话交流或约见。`;
    } else {
        temperature = "frozen";
        tempBadge = "🧊";
        actionAdvice = `长期未联系（已逾期 ${overdueDays} 天），建议借近期重要节点、节日或共同朋友为由正式破冰重联。`;
    }

    return {
        warmthScore,
        temperature,
        tempBadge,
        decayRatio,
        isOverdue,
        overdueDays,
        actionAdvice,
    };
}
