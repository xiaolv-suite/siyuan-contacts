<script lang="ts">
    import type { LifecycleFunnelReport } from "../../domain/lifecycle-funnel.ts";
    import { translateText } from "../../domain/translation";

    let {
        funnel,
        onOpenStagePeople,
        i18n,
    }: {
        funnel: LifecycleFunnelReport;
        onOpenStagePeople?: (label: string, itemIds: string[]) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    function getStageColor(key: string): string {
        switch (key) {
            case "acquaintance":
                return "var(--b3-theme-on-surface-light)";
            case "connection":
                return "var(--b3-theme-primary)";
            case "collaboration":
                return "var(--lvct-group-work, var(--b3-theme-primary))";
            case "close_ally":
                return "var(--lv-heat-cool, var(--b3-theme-primary))";
            case "dormant":
                return "var(--b3-theme-surface-lighter)";
            default:
                return "var(--b3-theme-primary)";
        }
    }
</script>

<div class="lvct-home__card lvct-dash__lifecycle-card">
    <div class="lvct-dash__chart-header">
        <div class="lvct-dash__chart-title-wrap">
            <span class="lvct-dash__chart-icon">🌱</span>
            <span class="lvct-dash__chart-title">{text("dashLifecycleFunnelTitle", "交往生命周期阶段")}</span>
            <span class="lvct-text-muted font-size-11">（{text("dashLifecycleMaturity", "深度合作率 {n}%", { n: funnel.healthyMaturityRate })}）</span>
        </div>
    </div>

    <!-- 漏斗阶段列表 -->
    <div class="lifecycle-funnel-list">
        {#each funnel.stages as stage (stage.key)}
            {@const color = getStageColor(stage.key)}
            <button
                type="button"
                class="lifecycle-funnel-row"
                class:is-empty={stage.count === 0}
                disabled={stage.count === 0}
                onclick={() => onOpenStagePeople?.(stage.meta.label, stage.personItemIds)}
                title={stage.count > 0 ? text("clickToFilterStage", "点击在名册中筛选 {label} 人脉", { label: stage.meta.label }) : text("emptyStageTip", "暂无此阶段联系人")}
            >
                <div class="row-left">
                    <span class="stage-icon">{stage.meta.icon}</span>
                    <span class="stage-name">{stage.meta.shortLabel}</span>
                    <span class="stage-count">({stage.count})</span>
                </div>

                <div class="row-bar-wrap">
                    <div
                        class="row-bar-fill"
                        style="width: {Math.max(stage.count > 0 ? 6 : 0, stage.percentage)}%; background: {color};"
                    ></div>
                </div>

                <div class="row-pct">
                    {stage.percentage}%
                </div>
            </button>
        {/each}
    </div>

    <!-- 阶段洞察说明 -->
    {#if funnel.keyInsight}
        <div class="lifecycle-funnel-insight ft__smaller ft__on-surface">
            <span class="insight-icon">💡</span>
            <span class="insight-text">{funnel.keyInsight}</span>
        </div>
    {/if}
</div>

<style>
    .lvct-dash__lifecycle-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .lifecycle-funnel-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .lifecycle-funnel-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 8px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        text-align: left;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), background var(--lvct-dur-fast) var(--lvct-ease), border-color var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease), color var(--lvct-dur-fast) var(--lvct-ease), opacity var(--lvct-dur-fast) var(--lvct-ease);
    }

    .lifecycle-funnel-row:not(:disabled):hover {
        background: var(--lvct-bg-hover, #f5f3f0);
        transform: translateY(-1px);
    }

    .lifecycle-funnel-row:not(:disabled):active {
        transform: translateY(1px);
    }

    .lifecycle-funnel-row.is-empty {
        opacity: 0.45;
        cursor: default;
    }

    .row-left {
        display: flex;
        align-items: center;
        gap: 5px;
        width: 84px;
        flex-shrink: 0;
        font-size: 12px;
    }

    .stage-icon {
        font-size: 13px;
        line-height: 1;
    }

    .stage-name {
        font-weight: 500;
        color: var(--lvct-text-1);
    }

    .stage-count {
        color: var(--lvct-text-3);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
    }

    .row-bar-wrap {
        flex: 1;
        height: 7px;
        background: color-mix(in srgb, var(--lvct-text-1) 8%, transparent);
        border-radius: var(--lv-r-pill, 9999px);
        overflow: hidden;
    }

    .row-bar-fill {
        height: 100%;
        border-radius: var(--lv-r-pill, 9999px);
        transition: width var(--lvct-dur-base) var(--lvct-ease);
    }

    .row-pct {
        width: 38px;
        text-align: right;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--lvct-text-2);
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
    }

    .lifecycle-funnel-insight {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 6px 10px;
        background: color-mix(in srgb, var(--b3-theme-surface-lighter) 60%, transparent);
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 12px);
        line-height: 1.45;
        margin-top: 4px;
    }

    .insight-icon {
        font-size: 12px;
        flex-shrink: 0;
    }
</style>
