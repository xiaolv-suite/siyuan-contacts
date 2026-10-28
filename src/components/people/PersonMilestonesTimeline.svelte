<script lang="ts">
    import {
        filterMilestonesByType,
        groupMilestonesByYear,
        type MilestoneEvent,
        type MilestoneType,
    } from "../../domain/timeline-milestones.ts";
    import { translateText } from "../../domain/translation";
    import {
        Flag,
        Calendar,
    } from "@lucide/svelte";

    let {
        milestones = [],
        i18n,
    }: {
        milestones: MilestoneEvent[];
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let activeTypeFilter: MilestoneType | "all" = $state("all");

    const filtered = $derived(filterMilestonesByType(milestones, activeTypeFilter));
    const groupedByYear = $derived(groupMilestonesByYear(filtered));
    const sortedYears = $derived(
        Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a))
    );

    const FILTER_TABS: readonly { key: MilestoneType | "all"; label: string }[] = [
        { key: "all", label: "全部里程碑" },
        { key: "stage_advance", label: "阶段演进" },
        { key: "promise_fulfilled", label: "信诺履约" },
        { key: "anniversary", label: "纪念日" },
        { key: "first_contact", label: "初识相聚" },
        { key: "exchange", label: "人情往来" },
    ];
</script>

<div class="lvct-milestones-timeline">
    <!-- 筛选工具栏 -->
    <div class="milestones-filter-bar">
        <div class="fn__flex" style="align-items: center; gap: 6px;">
            <Flag size={14} class="ft__primary" />
            <span class="ft__smaller font-weight-bold">{text("milestonesFilterTitle", "历程分类：")}</span>
        </div>
        <div class="filter-pills-group">
            {#each FILTER_TABS as tab (tab.key)}
                <button
                    type="button"
                    class="filter-pill {activeTypeFilter === tab.key ? 'is-active' : ''}"
                    onclick={() => activeTypeFilter = tab.key}
                >
                    {tab.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- 里程碑长卷主体 -->
    {#if filtered.length === 0}
        <div class="empty-milestones ft__smaller ft__on-surface-variant">
            {text("milestonesEmpty", "暂无符合筛选条件的交往历程里程碑。随着互动、阶段变迁与信诺履约的推进，这里将自动绘制成编年史故事线。")}
        </div>
    {:else}
        <div class="timeline-container">
            {#each sortedYears as year (year)}
                <div class="year-block">
                    <div class="year-header">
                        <span class="year-tag">{year}</span>
                        <div class="year-line"></div>
                    </div>

                    <div class="year-events">
                        {#each groupedByYear[year] as ev (ev.id)}
                            <div class="event-row">
                                <div class="event-rail">
                                    <div class="rail-icon-node {ev.type}">
                                        {ev.icon}
                                    </div>
                                    <div class="rail-connector"></div>
                                </div>
                                <div class="event-card {ev.type}">
                                    <div class="card-head">
                                        <span class="event-date">
                                            <Calendar size={11} style="margin-right: 3px;" />
                                            {ev.date}
                                        </span>
                                        <span class="event-badge {ev.type}">
                                            {ev.badgeLabel}
                                        </span>
                                    </div>
                                    <div class="event-title">
                                        {ev.title}
                                    </div>
                                    {#if ev.detail}
                                        <div class="event-detail">
                                            {ev.detail}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .lvct-milestones-timeline {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 4px 0;
    }

    .milestones-filter-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--b3-border-color);
    }

    .filter-pills-group {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .filter-pill {
        border: 1px solid var(--b3-border-color);
        background: transparent;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 12px;
        cursor: pointer;
        color: var(--b3-theme-on-surface);
        transition: all 0.15s ease;
    }

    .filter-pill.is-active {
        background: var(--b3-theme-primary-lightest);
        border-color: var(--b3-theme-primary);
        color: var(--b3-theme-primary);
        font-weight: 600;
    }

    .empty-milestones {
        text-align: center;
        padding: 24px 12px;
    }

    .timeline-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
    }

    .year-block {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .year-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .year-tag {
        font-size: 12px;
        font-weight: bold;
        padding: 2px 8px;
        border-radius: 10px;
        background: var(--b3-theme-surface-lighter);
        color: var(--b3-theme-on-surface);
    }

    .year-line {
        flex: 1;
        height: 1px;
        background: var(--b3-border-color);
    }

    .year-events {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-left: 6px;
    }

    .event-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        position: relative;
    }

    .event-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
        width: 24px;
    }

    .rail-icon-node {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        z-index: 1;
    }

    .rail-icon-node.stage_advance {
        border-color: var(--b3-theme-primary);
        background: var(--b3-theme-primary-lightest);
    }

    .rail-icon-node.promise_fulfilled {
        border-color: var(--b3-theme-success);
        background: var(--b3-theme-success-lightest, rgba(46, 204, 113, 0.1));
    }

    .rail-icon-node.first_contact {
        border-color: var(--b3-theme-info);
        background: var(--b3-theme-info-lightest, rgba(0, 120, 212, 0.1));
    }

    .rail-connector {
        flex: 1;
        width: 2px;
        min-height: 16px;
        background: var(--b3-border-color);
        margin-top: 2px;
    }

    .event-card {
        flex: 1;
        padding: 8px 12px;
        border-radius: 6px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        display: flex;
        flex-direction: column;
        gap: 4px;
        transition: border-color 0.15s ease;
    }

    .event-card:hover {
        border-color: var(--b3-theme-primary-light);
    }

    .card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .event-date {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        display: flex;
        align-items: center;
    }

    .event-badge {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        color: var(--b3-theme-on-surface-light);
    }

    .event-badge.stage_advance {
        background: var(--b3-theme-primary-lightest);
        border-color: var(--b3-theme-primary);
        color: var(--b3-theme-primary);
        font-weight: 600;
    }

    .event-badge.promise_fulfilled {
        background: var(--b3-theme-success-lightest, rgba(46, 204, 113, 0.1));
        border-color: var(--b3-theme-success);
        color: var(--b3-theme-success);
        font-weight: 600;
    }

    .event-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
    }

    .event-detail {
        font-size: 12px;
        color: var(--b3-theme-on-surface-variant);
        line-height: 1.4;
    }
</style>
