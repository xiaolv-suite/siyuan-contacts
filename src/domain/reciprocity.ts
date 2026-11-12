/**
 * 人脉交往互惠与双向互动价值度评估纯函数域模型（E-57）：
 * 基于双向信诺（我方承诺 vs 对方承诺）、人情礼尚往来对账（应收/付出 vs 应付/受惠）
 * 与交往频次，客观推导互惠指数（0-100）、双向平衡态势及关系维系行动建议。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束，node --test 直接可测。
 */
import type { PersonPromiseItem } from "./promises.ts";
import type { ExchangeRecord } from "./exchanges.ts";

export type ReciprocityBalanceStatus = "balanced" | "giver_heavy" | "receiver_heavy" | "nascent";

export interface ReciprocityAuditResult {
    myPromisesTotal: number;
    myPromisesFulfilled: number;
    theirPromisesTotal: number;
    theirPromisesFulfilled: number;
    myFulfillRate: number; // 0-100%
    theirFulfillRate: number; // 0-100%
    totalPayable: number; // 应付/受惠金额 (我欠对方或对方赠予我)
    totalReceivable: number; // 应收/付出金额 (对方欠我或我赠予对方)
    settledExchangesCount: number;
    openExchangesCount: number;
    exchangeNetBalance: number; // 净往来差额 = totalReceivable - totalPayable (正为净付出，负为净受惠)
    balanceStatus: ReciprocityBalanceStatus;
    reciprocityScore: number; // 0-100 综合互惠指数
    statusLabel: string;
    actionableAdvice: string;
    mySharePercentage: number; // 0-100% 我方在总体付出中的比重
    theirSharePercentage: number; // 0-100% 对方在总体关照中的比重
}

export interface ReciprocityAuditInput {
    promises?: readonly PersonPromiseItem[];
    exchanges?: readonly ExchangeRecord[];
    timelineCount?: number;
}

/**
 * 纯函数：计算双向互惠健康度与人情平衡审计
 */
export function computeReciprocityAudit(input: ReciprocityAuditInput = {}): ReciprocityAuditResult {
    const promises = input.promises ?? [];
    const exchanges = input.exchanges ?? [];
    const timelineCount = input.timelineCount ?? 0;

    // 1. 双向信诺统计
    let myPromisesTotal = 0;
    let myPromisesFulfilled = 0;
    let theirPromisesTotal = 0;
    let theirPromisesFulfilled = 0;

    for (const p of promises) {
        if (p.direction === "i_promised") {
            myPromisesTotal += 1;
            if (p.status === "fulfilled") myPromisesFulfilled += 1;
        } else if (p.direction === "they_promised") {
            theirPromisesTotal += 1;
            if (p.status === "fulfilled") theirPromisesFulfilled += 1;
        }
    }

    const myFulfillRate = myPromisesTotal > 0
        ? Math.round((myPromisesFulfilled / myPromisesTotal) * 100)
        : 100;
    const theirFulfillRate = theirPromisesTotal > 0
        ? Math.round((theirPromisesFulfilled / theirPromisesTotal) * 100)
        : 100;

    // 2. 人情往来与账本统计
    let totalPayable = 0;
    let totalReceivable = 0;
    let settledExchangesCount = 0;
    let openExchangesCount = 0;

    for (const ex of exchanges) {
        if (ex.status === "cancelled") continue;
        if (ex.status === "settled") settledExchangesCount += 1;
        else if (ex.status === "open") openExchangesCount += 1;

        const currency = (ex.currency || "CNY").trim().toUpperCase();
        const amt = typeof ex.amount === "number" && Number.isFinite(ex.amount) && ex.amount > 0 ? ex.amount : 0;
        if (currency === "CNY") {
            if (ex.direction === "payable") {
                totalPayable += amt;
            } else if (ex.direction === "receivable") {
                totalReceivable += amt;
            }
        }
    }

    const exchangeNetBalance = totalReceivable - totalPayable;

    // 3. 总体双向付出占比估算
    // 权重体系：一个承诺折算 50 分，金额按 1:1，一次普通互动折算 20 分
    const myWeight = (myPromisesTotal * 50) + (myPromisesFulfilled * 30) + totalReceivable + (timelineCount * 10);
    const theirWeight = (theirPromisesTotal * 50) + (theirPromisesFulfilled * 30) + totalPayable + (timelineCount * 10);
    const sumWeight = myWeight + theirWeight;

    let mySharePercentage = 50;
    let theirSharePercentage = 50;
    if (sumWeight > 0) {
        mySharePercentage = Math.round((myWeight / sumWeight) * 100);
        theirSharePercentage = 100 - mySharePercentage;
    }

    // 4. 判断平衡状态与互惠指数 (0-100)
    let balanceStatus: ReciprocityBalanceStatus = "balanced";
    let statusLabel = "互利共赢 · 往来均衡";
    let actionableAdvice = "双方信诺履约良好，往来均平，人际关系互信稳固。";

    const hasMeaningfulHistory = (myPromisesTotal + theirPromisesTotal > 0) || (exchanges.length > 0) || (timelineCount >= 2);

    if (!hasMeaningfulHistory) {
        balanceStatus = "nascent";
        statusLabel = "初识浅交 · 往来尚简";
        actionableAdvice = "当前尚无深层事务交集，可借助共同话题或轻量承诺逐步建立互信。";
    } else if (mySharePercentage >= 68 || exchangeNetBalance > 500) {
        balanceStatus = "giver_heavy";
        statusLabel = "付出较多 · 关注回馈";
        const pendingTheirs = theirPromisesTotal - theirPromisesFulfilled;
        if (pendingTheirs > 0) {
            actionableAdvice = `对方尚有 ${pendingTheirs} 项未兑现信诺，后续会面时可适度沟通进度与落地成果。`;
        } else {
            actionableAdvice = "您在交往中展现出较多的主动支持与付出，可留心对方的积极回馈意向。";
        }
    } else if (theirSharePercentage >= 68 || exchangeNetBalance < -500) {
        balanceStatus = "receiver_heavy";
        statusLabel = "受惠关照 · 适宜答谢";
        actionableAdvice = "近期承蒙对方较多照料与支持，适宜在重要节日备手信礼物或回请聚餐以示诚挚谢意。";
    }

    // 综合互惠指数评分 (0-100)
    let reciprocityScore = 70;
    if (balanceStatus === "nascent") {
        reciprocityScore = 60;
    } else if (balanceStatus === "balanced") {
        // 履约率越高，分值越高
        const avgFulfill = Math.round((myFulfillRate + theirFulfillRate) / 2);
        reciprocityScore = Math.min(100, 75 + Math.round(avgFulfill * 0.25));
    } else {
        // 倾斜惩罚：对称偏差越大，扣分越多
        const diff = Math.abs(mySharePercentage - 50);
        reciprocityScore = Math.max(30, 75 - diff);
    }

    return {
        myPromisesTotal,
        myPromisesFulfilled,
        theirPromisesTotal,
        theirPromisesFulfilled,
        myFulfillRate,
        theirFulfillRate,
        totalPayable,
        totalReceivable,
        settledExchangesCount,
        openExchangesCount,
        exchangeNetBalance,
        balanceStatus,
        reciprocityScore,
        statusLabel,
        actionableAdvice,
        mySharePercentage,
        theirSharePercentage,
    };
}
