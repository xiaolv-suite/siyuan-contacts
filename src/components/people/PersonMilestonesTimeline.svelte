<script lang="ts">
    import {
        filterMilestonesByType,
        groupMilestonesByYear,
        buildMilestonesDocumentMarkdown,
        type MilestoneEvent,
        type MilestoneType,
    } from "../../domain/timeline-milestones.ts";
    import type { ContactSummary } from "../../domain/person.ts";
    import { translateText } from "../../domain/translation";
    import { copyPlainText } from "../../shared/clipboard";
    import { onDestroy } from "svelte";
    import {
        Flag,
        Calendar,
        ExternalLink,
        FileText,
        Copy,
        Check,
    } from "@lucide/svelte";

    let {
        person,
        milestones = [],
        onCreateDoc,
        onOpenDoc,
        i18n,
    }: {
        person?: ContactSummary;
        milestones: MilestoneEvent[];
        onCreateDoc?: (person: ContactSummary, milestones: readonly MilestoneEvent[]) => Promise<{ docId: string; hpath: string } | null>;
        onOpenDoc?: (docId: string) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let activeTypeFilter: MilestoneType | "all" = $state("all");
    let creatingDoc = $state(false);
    let createdDoc = $state<{ docId: string; hpath: string } | null>(null);
    let createError = $state("");
    let copied = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | null = null;

    onDestroy(() => {
        if (copyTimer) clearTimeout(copyTimer);
    });

    async function handleCopyMarkdown() {
        if (!person || milestones.length === 0) return;
        try {
            const md = buildMilestonesDocumentMarkdown(person, milestones);
            await copyPlainText(md);
            copied = true;
            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                copied = false;
            }, 2000);
        } catch (err: unknown) {
            createError = err instanceof Error ? err.message : String(err);
        }
    }

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

    async function handleCreateDoc() {
        if (!person || !onCreateDoc || creatingDoc) return;
        creatingDoc = true;
        createError = "";
        try {
            const res = await onCreateDoc(person, milestones);
            if (res) {
                createdDoc = res;
            } else {
                createError = text("milestonesDocFail", "未能生成编年史文档，请检查笔记本配置");
            }
        } catch (err: unknown) {
            createError = err instanceof Error ? err.message : String(err);
        } finally {
            creatingDoc = false;
        }
    }
</script>

<div class="lvct-milestones-timeline">
    <!-- 筛选工具栏与文档沉淀操作 -->
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
                    {tab.key === "all" ? text("milestoneTabAll", tab.label)
                        : tab.key === "stage_advance" ? text("milestoneTabStageAdvance", tab.label)
                        : tab.key === "promise_fulfilled" ? text("milestoneTabPromiseFulfilled", tab.label)
                        : tab.key === "anniversary" ? text("milestoneTabAnniversary", tab.label)
                        : tab.key === "first_contact" ? text("milestoneTabFirstContact", tab.label)
                        : text("milestoneTabExchange", tab.label)}
                </button>
            {/each}
        </div>

        <div class="milestones-actions" style="margin-left: auto; display: flex; align-items: center; gap: 6px;">
            {#if person && milestones.length > 0}
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small"
                    onclick={handleCopyMarkdown}
                    title={text("milestonesCopyTip", "将交往编年史 Markdown 全文复制到剪贴板")}
                >
                    {#if copied}
                        <Check size={13} class="lvct-text-success" style="margin-right: 3px;" />
                        <span class="lvct-text-success">{text("milestonesCopied", "已复制全文 ✓")}</span>
                    {:else}
                        <Copy size={13} style="margin-right: 3px;" />
                        <span>{text("milestonesCopyBtn", "复制全文")}</span>
                    {/if}
                </button>
            {/if}

            {#if onCreateDoc && person}
                {#if createdDoc}
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small ft__primary"
                        onclick={() => onOpenDoc?.(createdDoc!.docId)}
                        title={text("milestonesDocOpenTip", "在主编辑器中打开编年史文档")}
                    >
                        <ExternalLink size={13} style="margin-right: 3px;" />
                        <span>{text("milestonesDocOpenBtn", "打开编年史文档 ↗")}</span>
                    </button>
                {:else}
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small"
                        disabled={creatingDoc || milestones.length === 0}
                        onclick={handleCreateDoc}
                        title={text("milestonesDocCreateTip", "将交往里程碑全量沉淀为思源实体文档")}
                    >
                        <FileText size={13} style="margin-right: 3px;" />
                        <span>{creatingDoc ? text("milestonesDocCreating", "正在生成…") : text("milestonesDocCreateBtn", "沉淀为编年史文档")}</span>
                    </button>
                {/if}
            {/if}
        </div>
    </div>

    {#if createError}
        <div class="b3-label b3-label--error ft__smaller" style="margin: 4px 0;">
            {createError}
        </div>
    {/if}
    {#if createdDoc}
        <div class="b3-label b3-label--success ft__smaller" style="margin: 4px 0;">
            {text("milestonesDocSuccess", "已生成编年史文档：")}{createdDoc.hpath}
        </div>
    {/if}

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
        border-bottom: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
    }

    .filter-pills-group {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .filter-pill {
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        background: transparent;
        font-size: 11px;
        padding: 3px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        color: var(--lvct-text-2);
        transition: all var(--lvct-dur-fast) var(--lvct-ease);
    }

    .filter-pill.is-active {
        background: var(--lv-brand-soft);
        border-color: var(--lv-brand);
        color: var(--lv-brand);
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
        font-weight: 700;
        padding: 2px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lv-data-amber-soft, rgba(217, 119, 6, 0.12));
        color: var(--lv-data-amber, #d97706);
        font-variant-numeric: tabular-nums;
    }

    .year-line {
        flex: 1;
        height: 1px;
        background: var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
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
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        z-index: 1;
    }

    .rail-icon-node.stage_advance {
        border-color: var(--b3-theme-primary);
        background: var(--b3-theme-primary-lightest, rgba(0, 120, 212, 0.15));
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
        background: var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        margin-top: 2px;
    }

    .event-card {
        flex: 1;
        padding: 10px 14px;
        border-radius: var(--lv-r-md, 12px);
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        box-shadow: 0 1px 4px rgba(28, 24, 21, 0.03);
        display: flex;
        flex-direction: column;
        gap: 4px;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(28, 24, 21, 0.06);
        }
    }

    .card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .event-date {
        font-size: 11px;
        color: var(--lvct-text-3);
        display: flex;
        align-items: center;
        font-variant-numeric: tabular-nums;
    }

    .event-badge {
        font-size: 10px;
        padding: 2px 7px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lvct-bg-app);
        border: 1px solid var(--lvct-border-subtle);
        color: var(--lvct-text-2);
        font-weight: 500;
    }

    .event-badge.stage_advance {
        background: var(--lv-brand-soft);
        border-color: var(--lv-brand);
        color: var(--lv-brand);
        font-weight: 600;
    }

    .event-badge.promise_fulfilled {
        background: var(--lv-data-amber-soft, rgba(217, 119, 6, 0.12));
        border-color: var(--lv-data-amber, #d97706);
        color: var(--lv-data-amber, #d97706);
        font-weight: 700;
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
