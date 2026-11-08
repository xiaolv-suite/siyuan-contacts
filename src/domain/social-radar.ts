/**
 * 联系人六维社交资本雷达图（Persona Social Capital Radar）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 综合评估互动活跃度、网络连接度、记忆深度、履约可靠度、交往频度与共同交集。
 */

import type { ContactSummary } from "./person.ts";
import type { PersonFactItem } from "./doc-section.ts";
import type { PersonTopicItem } from "./topics.ts";
import type { FollowUpItem } from "./followups.ts";
import { toLocalDateKey } from "./date-key.ts";

export interface SocialRadarMetrics {
    /** 互动活跃度 (0-100)：根据上次联系距今的天数评估 */
    recency: number;
    /** 网络连接度 (0-100)：根据直接相关人与所属机构评估 */
    connectivity: number;
    /** 记忆深度 (0-100)：根据沉淀的事实画像与谈资条数评估 */
    memoryDepth: number;
    /** 履约可靠度 (0-100)：根据跟进完成率与逾期情况评估 */
    commitment: number;
    /** 交往频度 (0-100)：根据历史累计互动次数评估 */
    frequency: number;
    /** 共同交集 (0-100)：根据共同活动出席与协作项目评估 */
    coOccurrence: number;
}

export type SocialTier =
    | "core_partner"   // 核心密友 / 核心伙伴 (平均分 >= 80)
    | "deep_connect"   // 深度连接 (平均分 >= 60)
    | "growing_tie"    // 稳步升温 (平均分 >= 40)
    | "light_touch"    // 轻度浅连接 (平均分 >= 20)
    | "dormant";       // 沉睡待唤醒 (平均分 < 20)

export interface SocialRadarAssessment {
    metrics: SocialRadarMetrics;
    overallScore: number;
    tier: SocialTier;
    tierLabel: string;
    highlights: string[];
    actionStrategies: string[];
    polygonPoints: string;
    axesCoordinates: Array<{ name: string; key: keyof SocialRadarMetrics; score: number; x: number; y: number }>;
}

export interface SocialRadarInput {
    person: ContactSummary;
    lastContactDays?: number; // 距上次联系天数（undefined 表示无记录）
    totalInteractions?: number;
    facts?: readonly PersonFactItem[];
    topics?: readonly PersonTopicItem[];
    followUps?: readonly FollowUpItem[];
    coAttendanceCount?: number;
    projectCount?: number;
}

// 6 个轴的角度单位向量（以 -90° 顶部为第 0 轴顺时针旋转，每次 60°）
const AXES_DEFINITIONS: Array<{ name: string; key: keyof SocialRadarMetrics; dx: number; dy: number }> = [
    { name: "活跃度", key: "recency", dx: 0, dy: -1 },
    { name: "连接度", key: "connectivity", dx: Math.cos(-Math.PI / 6), dy: Math.sin(-Math.PI / 6) },
    { name: "记忆度", key: "memoryDepth", dx: Math.cos(Math.PI / 6), dy: Math.sin(Math.PI / 6) },
    { name: "履约度", key: "commitment", dx: 0, dy: 1 },
    { name: "交往频度", key: "frequency", dx: Math.cos(5 * Math.PI / 6), dy: Math.sin(5 * Math.PI / 6) },
    { name: "共同交集", key: "coOccurrence", dx: Math.cos(7 * Math.PI / 6), dy: Math.sin(7 * Math.PI / 6) },
];

const CX = 65;
const CY = 65;
const MAX_RADIUS = 46;

/**
 * 计算单个人物的六维社交资本雷达评估指标与 SVG 多边形坐标。
 * 纯函数：零外部依赖。
 */
export function computeSocialRadar(input: SocialRadarInput): SocialRadarAssessment {
    const {
        person,
        lastContactDays,
        totalInteractions = 0,
        facts = [],
        topics = [],
        followUps = [],
        coAttendanceCount = 0,
        projectCount = 0,
    } = input;

    // 1. 活跃度 (recency)
    let recency = 10;
    if (typeof lastContactDays === "number") {
        if (lastContactDays <= 7) recency = 100;
        else if (lastContactDays <= 14) recency = 85;
        else if (lastContactDays <= 30) recency = 70;
        else if (lastContactDays <= 60) recency = 50;
        else if (lastContactDays <= 90) recency = 30;
        else recency = 15;
    }

    // 2. 连接度 (connectivity)
    const relatedCount = person.relatedItemIds?.length ?? 0;
    let connectivity = 15;
    if (relatedCount >= 5) connectivity = 100;
    else if (relatedCount >= 3) connectivity = 80;
    else if (relatedCount >= 2) connectivity = 60;
    else if (relatedCount === 1) connectivity = 40;

    // 3. 记忆度 (memoryDepth)
    const memoryCount = facts.length + topics.length;
    let memoryDepth = 10;
    if (memoryCount >= 6) memoryDepth = 100;
    else if (memoryCount >= 4) memoryDepth = 80;
    else if (memoryCount >= 2) memoryDepth = 55;
    else if (memoryCount === 1) memoryDepth = 35;

    // 4. 履约度 (commitment)
    let commitment = 50; // 无待办时给予基础中性分
    if (followUps.length > 0) {
        const doneCount = followUps.filter((f) => f.status === "done").length;
        const overdueCount = followUps.filter((f) => {
            if (f.status !== "open" || !f.dueDate) return false;
            const today = toLocalDateKey(new Date());
            return f.dueDate < today;
        }).length;

        const completionRate = doneCount / followUps.length;
        if (overdueCount === 0 && completionRate >= 0.7) commitment = 100;
        else if (overdueCount === 0) commitment = 80;
        else if (overdueCount === 1) commitment = 50;
        else commitment = 25;
    }

    // 5. 交往频度 (frequency)
    let frequency = 5;
    if (totalInteractions >= 10) frequency = 100;
    else if (totalInteractions >= 6) frequency = 85;
    else if (totalInteractions >= 3) frequency = 60;
    else if (totalInteractions >= 1) frequency = 30;

    // 6. 共同交集 (coOccurrence)
    const sharedTotal = coAttendanceCount + projectCount;
    let coOccurrence = 10;
    if (sharedTotal >= 4) coOccurrence = 100;
    else if (sharedTotal >= 2) coOccurrence = 75;
    else if (sharedTotal === 1) coOccurrence = 45;

    const metrics: SocialRadarMetrics = {
        recency,
        connectivity,
        memoryDepth,
        commitment,
        frequency,
        coOccurrence,
    };

    // 综合得分 (等权平均)
    const overallScore = Math.round(
        (recency + connectivity + memoryDepth + commitment + frequency + coOccurrence) / 6
    );

    let tier: SocialTier = "dormant";
    let tierLabel = "沉睡人脉";
    if (overallScore >= 80) {
        tier = "core_partner";
        tierLabel = "核心伙伴";
    } else if (overallScore >= 60) {
        tier = "deep_connect";
        tierLabel = "深度连接";
    } else if (overallScore >= 40) {
        tier = "growing_tie";
        tierLabel = "稳步升温";
    } else if (overallScore >= 20) {
        tier = "light_touch";
        tierLabel = "轻度浅交";
    }

    // 亮点描述
    const highlights: string[] = [];
    if (recency >= 80) highlights.push("近期联系紧密");
    else if (recency <= 30) highlights.push("较长时间未联系");

    if (memoryDepth >= 80) highlights.push("记忆事实完备");
    if (connectivity >= 80) highlights.push("人际网络通达");
    if (coOccurrence >= 75) highlights.push("同场活动频繁");

    // 根据多维雷达指标派生精准交往策略建议
    const actionStrategies = deriveSocialStrategyAdvice(metrics);

    // 计算各轴在 SVG 上的实际坐标点 (归一化到 0 ~ MAX_RADIUS)
    const points: string[] = [];
    const axesCoordinates: Array<{ name: string; key: keyof SocialRadarMetrics; score: number; x: number; y: number }> = [];

    for (const axis of AXES_DEFINITIONS) {
        const score = metrics[axis.key];
        const r = (score / 100) * MAX_RADIUS;
        const x = Math.round((CX + r * axis.dx) * 10) / 10;
        const y = Math.round((CY + r * axis.dy) * 10) / 10;
        points.push(`${x},${y}`);
        axesCoordinates.push({
            name: axis.name,
            key: axis.key,
            score,
            x,
            y,
        });
    }

    return {
        metrics,
        overallScore,
        tier,
        tierLabel,
        highlights,
        actionStrategies,
        polygonPoints: points.join(" "),
        axesCoordinates,
    };
}

/**
 * 依据六维社交雷达指标智能生成行动交往策略建议（Actionable Strategy Prescriptions）
 */
export function deriveSocialStrategyAdvice(metrics: SocialRadarMetrics): string[] {
    const advice: string[] = [];

    // 1. 履约可靠度优先原则
    if (metrics.commitment < 60) {
        advice.push("存在待办跟进拖延或履约不足：优先闭环已承诺的待办事项，守护契约信任。");
    }

    // 2. 记忆深度与连接度错位
    if (metrics.connectivity >= 60 && metrics.memoryDepth < 50) {
        advice.push("网络通达但细节沉淀不足：建议在近期交谈中多倾听对方业务痛点与个性化偏好，丰富事实档案。");
    }

    // 3. 活跃度严重降温
    if (metrics.recency <= 30) {
        if (metrics.memoryDepth >= 60) {
            advice.push("关系基底深厚但近期降温：拥有充分共同谈资，建议以历史共同话题或合伙项目轻松破冰。");
        } else {
            advice.push("长期未联系且认知积累较浅：建议借行业资讯、节日祝福或共同朋友引荐发起轻量问候。");
        }
    } else if (metrics.recency >= 85 && metrics.coOccurrence >= 60) {
        advice.push("近期互动紧密且交集丰富：处于高信任心流期，适合推进核心业务合作或深度战略探讨。");
    }

    // 4. 共同交集扩展建议
    if (metrics.coOccurrence < 30 && metrics.frequency >= 60) {
        advice.push("交流频次较高但缺少共同事功：建议邀请共同参与一次行业活动、周会研讨或小范围聚会深化连接。");
    }

    if (advice.length === 0) {
        advice.push("关系处于良性稳步发展轨道，按当前节奏保持自然交往即可。");
    }

    return advice;
}

/**
 * 生成雷达图背景环（25%, 50%, 75%, 100% 刻度）多边形点集字符串。
 */
export function getRadarGridRings(): string[] {
    const fractions = [0.25, 0.5, 0.75, 1.0];
    return fractions.map((frac) => {
        const r = MAX_RADIUS * frac;
        return AXES_DEFINITIONS.map((axis) => {
            const x = Math.round((CX + r * axis.dx) * 10) / 10;
            const y = Math.round((CY + r * axis.dy) * 10) / 10;
            return `${x},${y}`;
        }).join(" ");
    });
}
