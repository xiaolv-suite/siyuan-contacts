<script lang="ts">
    import type { ReciprocityAuditResult } from "../../domain/reciprocity.ts";
    import { translateText } from "../../domain/translation";
    import { Scale, HeartHandshake, CheckCircle2, ArrowRightLeft } from "@lucide/svelte";

    let {
        audit,
        i18n,
    }: {
        audit: ReciprocityAuditResult;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));
</script>

<div class="lvct-reciprocity-card" role="region" aria-label={text("reciprocityCardTitle", "交往互惠与双向平衡")}>
    <div class="card-header">
        <div class="header-left">
            <span class="header-icon">⚖️</span>
            <span class="header-title">{text("reciprocityCardTitle", "交往互惠与双向平衡")}</span>
            <span class="status-badge status-{audit.balanceStatus}">{audit.statusLabel}</span>
        </div>

        <div class="header-right">
            <span class="score-pill">
                <HeartHandshake size={13} class="lvct-icon-inline" />
                {text("reciprocityScoreLabel", "互惠指数 {n} 分", { n: audit.reciprocityScore })}
            </span>
        </div>
    </div>

    <!-- 双向付出天平比例条 -->
    <div class="balance-bar-wrap">
        <div class="balance-labels">
            <span class="label-me">{text("myShareLabel", "我方付出与承诺 ({n}%)", { n: audit.mySharePercentage })}</span>
            <span class="label-them">{text("theirShareLabel", "对方关照与信诺 ({n}%)", { n: audit.theirSharePercentage })}</span>
        </div>
        <div class="balance-track" role="progressbar" aria-label="双向付出平衡比例">
            <div
                class="segment-me"
                style="width: {audit.mySharePercentage}%;"
                title={text("myShareLabel", "我方付出与承诺 ({n}%)", { n: audit.mySharePercentage })}
            ></div>
            <div
                class="segment-them"
                style="width: {audit.theirSharePercentage}%;"
                title={text("theirShareLabel", "对方关照与信诺 ({n}%)", { n: audit.theirSharePercentage })}
            ></div>
        </div>
    </div>

    <!-- 核心指标三栏透视 -->
    <div class="metrics-grid">
        <!-- 1. 信诺双向履约 -->
        <div class="metric-box">
            <div class="metric-box-title">
                <CheckCircle2 size={12} class="lvct-icon-inline" />
                {text("promisesFulfillTitle", "双向信诺履约")}
            </div>
            <div class="metric-box-content">
                <div class="metric-row">
                    <span class="ft__smaller ft__on-surface">{text("myPromiseRate", "我方履约：")}</span>
                    <span class="metric-val">{audit.myPromisesFulfilled}/{audit.myPromisesTotal} ({audit.myFulfillRate}%)</span>
                </div>
                <div class="metric-row">
                    <span class="ft__smaller ft__on-surface">{text("theirPromiseRate", "对方履约：")}</span>
                    <span class="metric-val">{audit.theirPromisesFulfilled}/{audit.theirPromisesTotal} ({audit.theirFulfillRate}%)</span>
                </div>
            </div>
        </div>

        <!-- 2. 人情往来差额 -->
        <div class="metric-box">
            <div class="metric-box-title">
                <ArrowRightLeft size={12} class="lvct-icon-inline" />
                {text("exchangesBalanceTitle", "往来对账透视")}
            </div>
            <div class="metric-box-content">
                <div class="metric-row">
                    <span class="ft__smaller ft__on-surface">{text("exchangesCountLabel", "往来流水：")}</span>
                    <span class="metric-val">{text("exchangesSettledRatio", "{s} 结清 / {o} 待结", { s: audit.settledExchangesCount, o: audit.openExchangesCount })}</span>
                </div>
                <div class="metric-row">
                    <span class="ft__smaller ft__on-surface">{text("netBalanceLabel", "净往来差额：")}</span>
                    <span class="metric-val {audit.exchangeNetBalance > 0 ? 'ft__primary' : audit.exchangeNetBalance < 0 ? 'ft__warning' : ''}">
                        {audit.exchangeNetBalance > 0 ? `+¥${audit.exchangeNetBalance}` : audit.exchangeNetBalance < 0 ? `-¥${Math.abs(audit.exchangeNetBalance)}` : "¥0 均衡"}
                    </span>
                </div>
            </div>
        </div>

        <!-- 3. 行动建议 -->
        <div class="metric-box insight-box">
            <div class="metric-box-title">
                <Scale size={12} class="lvct-icon-inline" />
                {text("reciprocityAdviceTitle", "关系互惠建议")}
            </div>
            <div class="advice-content ft__smaller">
                {audit.actionableAdvice}
            </div>
        </div>
    </div>
</div>

<style>
    .lvct-reciprocity-card {
        padding: 10px 12px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
    }

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .header-icon {
        font-size: 15px;
    }

    .header-title {
        font-weight: 600;
        font-size: 13px;
    }

    .status-badge {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 10px;
        font-weight: 500;
    }

    .status-balanced {
        background: color-mix(in srgb, #10b981 15%, transparent);
        color: #10b981;
    }

    .status-giver_heavy {
        background: color-mix(in srgb, var(--b3-theme-primary) 15%, transparent);
        color: var(--b3-theme-primary);
    }

    .status-receiver_heavy {
        background: color-mix(in srgb, var(--b3-theme-warning) 15%, transparent);
        color: var(--b3-theme-warning);
    }

    .status-nascent {
        background: var(--b3-theme-surface-lighter);
        color: var(--b3-theme-on-surface-light);
    }

    .score-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--b3-theme-primary) 10%, transparent);
        color: var(--b3-theme-primary);
    }

    /* 天平比例条 */
    .balance-bar-wrap {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .balance-labels {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10px;
        color: var(--b3-theme-on-surface-light);
    }

    .balance-track {
        height: 6px;
        border-radius: 3px;
        background: var(--b3-theme-surface-lighter);
        display: flex;
        overflow: hidden;
    }

    .segment-me {
        height: 100%;
        background: var(--b3-theme-primary);
        transition: width 0.3s ease;
    }

    .segment-them {
        height: 100%;
        background: var(--b3-theme-warning);
        transition: width 0.3s ease;
    }

    /* 三栏指标 */
    .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1.2fr;
        gap: 8px;
    }

    @media (max-width: 600px) {
        .metrics-grid {
            grid-template-columns: 1fr;
        }
    }

    .metric-box {
        padding: 6px 8px;
        background: var(--b3-theme-surface-lighter);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .metric-box-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
        display: flex;
        align-items: center;
        gap: 3px;
    }

    .metric-box-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .metric-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
    }

    .metric-val {
        font-weight: 600;
    }

    .advice-content {
        color: var(--b3-theme-on-surface);
        line-height: 1.4;
    }
</style>
