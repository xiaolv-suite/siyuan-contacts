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
            <Scale size={14} strokeWidth={1.6} class="lvct-icon-inline header-icon" style="color: var(--lvct-accent, var(--b3-theme-primary));" />
            <span class="header-title">{text("reciprocityCardTitle", "交往互惠与双向平衡")}</span>
            <span class="status-badge status-{audit.balanceStatus}">{audit.statusLabel}</span>
        </div>

        <div class="header-right">
            <span class="score-pill">
                <HeartHandshake size={13} strokeWidth={1.6} class="lvct-icon-inline" />
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
                <CheckCircle2 size={12} strokeWidth={1.6} class="lvct-icon-inline" />
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
                <ArrowRightLeft size={12} strokeWidth={1.6} class="lvct-icon-inline" />
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
                <Scale size={12} strokeWidth={1.6} class="lvct-icon-inline" />
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
        padding: 14px 16px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: 0 2px 10px rgba(28, 24, 21, 0.04);
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(28, 24, 21, 0.06);
        }
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
        color: var(--lvct-text-1);
    }

    .status-badge {
        font-size: 10px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        background: transparent;
        border: 1px solid var(--lvct-color-border-200);
        font-weight: 600;
        font-variant-numeric: tabular-nums;

        &::before {
            content: "";
            display: inline-block;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: currentColor;
            forced-color-adjust: none;
        }

        &.status-balanced {
            color: var(--lvct-success);
            border-color: color-mix(in srgb, var(--lvct-success) 30%, transparent);
        }

        &.status-giver_heavy {
            color: var(--lv-brand);
            border-color: color-mix(in srgb, var(--lv-brand) 30%, transparent);
        }

        &.status-receiver_heavy {
            color: var(--lv-data-amber);
            border-color: color-mix(in srgb, var(--lv-data-amber) 30%, transparent);
        }

        &.status-nascent {
            color: var(--lvct-text-3);
            border-color: var(--lvct-border-subtle);
        }
    }

    .score-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lv-data-amber-soft, rgba(217, 119, 6, 0.12));
        color: var(--lv-data-amber, #d97706);
        border: 1px solid color-mix(in srgb, var(--lv-data-amber) 25%, transparent);
        font-variant-numeric: tabular-nums;
    }

    /* 天平比例条 */
    .balance-bar-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .balance-labels {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10.5px;
        color: var(--lvct-text-3);
        font-variant-numeric: tabular-nums;
    }

    .balance-track {
        height: 7px;
        border-radius: var(--lv-r-pill, 9999px);
        background: color-mix(in srgb, var(--lvct-text-1) 8%, transparent);
        display: flex;
        overflow: hidden;
    }

    .segment-me {
        height: 100%;
        background: var(--lv-brand, #ea580c);
        transition: width var(--lvct-dur-base) var(--lvct-ease);
    }

    .segment-them {
        height: 100%;
        background: var(--lv-data-amber, #d97706);
        transition: width var(--lvct-dur-base) var(--lvct-ease);
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
        padding: 8px 10px;
        background: var(--lvct-bg-app);
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 12px);
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
        font-variant-numeric: tabular-nums;
    }

    .advice-content {
        color: var(--b3-theme-on-surface);
        line-height: 1.4;
    }
</style>
