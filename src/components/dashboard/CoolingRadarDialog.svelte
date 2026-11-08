<script lang="ts">
    import type { ContactsPluginFacade } from "../../types";
    import {
        filterCoolingRadarItems,
        type CoolingContactItem,
        type CoolingRadarFilterType,
    } from "../../domain/cooling-radar.ts";
    import { heatLevelColorClass } from "../../domain/cadence.ts";
    import { translateText } from "../../domain/translation";
    import ViewState from "../ViewState.svelte";
    import { onDestroy } from "svelte";
    import {
        Search,
        ExternalLink,
        Star,
        Snowflake,
        Wind,
        Clock,
    } from "@lucide/svelte";

    let {
        facade,
        onClose,
        onOpenPerson,
        i18n,
    }: {
        facade: ContactsPluginFacade;
        onClose: () => void;
        onOpenPerson: (docId: string) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let alive = true;
    let loading = $state(true);
    let items = $state<CoolingContactItem[]>([]);
    let searchQuery = $state("");
    let filterType: CoolingRadarFilterType = $state("all");

    $effect(() => {
        if (!facade.loadCoolingRadarSummary) {
            loading = false;
            return;
        }
        void facade.loadCoolingRadarSummary().then((res) => {
            if (alive) items = res.items;
        }).catch(() => {
            if (alive) items = [];
        }).finally(() => {
            if (alive) loading = false;
        });
    });

    onDestroy(() => {
        alive = false;
    });

    const filteredItems = $derived(
        filterCoolingRadarItems(items, searchQuery, filterType)
    );

    const totalCooling = $derived(items.length);
    const starredCount = $derived(items.filter((i) => i.isStarred).length);
    const coldCount = $derived(items.filter((i) => i.health.level === "cold").length);
    const coolCount = $derived(items.filter((i) => i.health.level === "cool").length);
    const unknownCount = $derived(items.filter((i) => i.health.level === "unknown").length);

    function getLevelLabel(level: string, overdueDays: number): string {
        switch (level) {
            case "cold":
                return text("coolingLevelColdLabel", "渐冻 · 逾期 {n} 天", { n: overdueDays });
            case "cool":
                return text("coolingLevelCoolLabel", "微凉 · 逾期 {n} 天", { n: overdueDays });
            case "unknown":
                return text("coolingLevelUnknownLabel", "从未联系");
            default:
                return "";
        }
    }
</script>

<div class="lvct-cooling-radar">
    <!-- 顶部指标概览栏 -->
    <div class="cooling-metrics-bar">
        <div class="metric-card">
            <span class="metric-title">{text("coolingTotalTitle", "需破冰人脉")}</span>
            <span class="metric-number ft__primary">{totalCooling}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("coolingStarredTitle", "星标重点降温")}</span>
            <span class="metric-number ft__warning" style="display: inline-flex; align-items: center; gap: 4px;">
                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                {starredCount}
            </span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("coolingColdTitle", "渐冻深度疏远")}</span>
            <span class="metric-number ft__error" style="display: inline-flex; align-items: center; gap: 4px;">
                <Snowflake size={16} />
                {coldCount}
            </span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("coolingCoolTitle", "微凉轻度逾期")}</span>
            <span class="metric-number" style="color: var(--b3-theme-primary); display: inline-flex; align-items: center; gap: 4px;">
                <Wind size={16} />
                {coolCount}
            </span>
        </div>
    </div>

    <!-- 搜索与筛选工具栏 -->
    <div class="cooling-toolbar">
        <div class="search-input-box">
            <span class="search-icon"><Search size={14} /></span>
            <input
                class="b3-text-field fn__block"
                type="search"
                bind:value={searchQuery}
                placeholder={text("coolingSearchPlaceholder", "搜索联系人姓名、机构职位、标签或分组…")}
            />
        </div>

        <div class="filter-pills">
            <button
                type="button"
                class="filter-pill {filterType === 'all' ? 'is-active' : ''}"
                onclick={() => filterType = 'all'}
            >
                {text("coolingFilterAll", "全部需破冰 ({n})", { n: totalCooling })}
            </button>
            <button
                type="button"
                class="filter-pill {filterType === 'starred' ? 'is-active' : ''}"
                onclick={() => filterType = 'starred'}
            >
                <Star size={12} fill={filterType === 'starred' ? '#f59e0b' : 'none'} color="#f59e0b" style="margin-right: 2px;" />
                {text("coolingFilterStarred", "星标重点 ({n})", { n: starredCount })}
            </button>
            <button
                type="button"
                class="filter-pill {filterType === 'cold' ? 'is-active' : ''}"
                onclick={() => filterType = 'cold'}
            >
                <Snowflake size={12} style="margin-right: 2px;" />
                {text("coolingFilterCold", "渐冻 ({n})", { n: coldCount })}
            </button>
            <button
                type="button"
                class="filter-pill {filterType === 'cool' ? 'is-active' : ''}"
                onclick={() => filterType = 'cool'}
            >
                <Wind size={12} style="margin-right: 2px;" />
                {text("coolingFilterCool", "微凉 ({n})", { n: coolCount })}
            </button>
            {#if unknownCount > 0}
                <button
                    type="button"
                    class="filter-pill {filterType === 'unknown' ? 'is-active' : ''}"
                    onclick={() => filterType = 'unknown'}
                >
                    {text("coolingFilterUnknown", "从未联系 ({n})", { n: unknownCount })}
                </button>
            {/if}
        </div>
    </div>

    <!-- 降温候选卡片列表 -->
    <div class="cooling-content">
        {#if loading}
            <ViewState compact loading title={text("coolingLoading", "正在读取全库联系人交往节奏与温度分布…")} />
        {:else if filteredItems.length === 0}
            <ViewState
                compact
                icon="check"
                title={searchQuery || filterType !== "all"
                    ? text("coolingNoMatch", "未找到符合当前筛选条件的降温联系人。")
                    : text("coolingEmptyAll", "太棒了！当前没有任何降温中的联系人，人脉交往温度保持十分活跃。")}
            />
        {:else}
            <div class="cooling-cards-grid">
                {#each filteredItems as item (item.person.docId)}
                    <div class="cooling-card {item.isStarred ? 'is-starred' : ''}">
                        <div class="cooling-card-head">
                            <div class="person-identity">
                                <div class="avatar-circle">
                                    {item.person.name.slice(0, 1)}
                                    {#if item.isStarred}
                                        <span class="star-badge" title={text("starredPerson", "星标联系人")}>⭐</span>
                                    {/if}
                                </div>
                                <div class="name-box">
                                    <div class="name-line">
                                        <span class="person-name">{item.person.name}</span>
                                        {#if item.person.group}
                                            <span class="group-tag">{item.person.group}</span>
                                        {/if}
                                    </div>
                                    <div class="org-line ft__smaller ft__on-surface">
                                        {item.primaryOrgAndTitle || text("noAffiliation", "暂未维护职位")}
                                    </div>
                                </div>
                            </div>

                            <span class="heat-badge {heatLevelColorClass(item.health.level)}">
                                {#if item.health.level === 'cold'}
                                    <Snowflake size={11} class="lvct-icon-inline" />
                                {:else if item.health.level === 'cool'}
                                    <Wind size={11} class="lvct-icon-inline" />
                                {/if}
                                {getLevelLabel(item.health.level, item.overdueDays)}
                            </span>
                        </div>

                        <div class="cooling-card-body">
                            <div class="rhythm-info">
                                <span class="rhythm-item">
                                    <Clock size={12} class="lvct-icon-inline" />
                                    {text("cadenceRhythmTip", "目标节奏：每 {days} 天", { days: item.cadenceDays })}
                                </span>
                                <span class="rhythm-item">
                                    {item.lastInteractionDate
                                        ? text("lastInteractionDateTip", "上次互动：{date}（已过 {days} 天）", { date: item.lastInteractionDate, days: item.health.elapsedDays ?? 0 })
                                        : text("neverInteractedTip", "从未记录过交往互动")}
                                </span>
                            </div>

                            {#if item.person.tags && item.person.tags.length > 0}
                                <div class="tags-row">
                                    {#each item.person.tags.slice(0, 3) as tag}
                                        <span class="lvct-chip lvct-chip--tag">#{tag}</span>
                                    {/each}
                                    {#if item.person.tags.length > 3}
                                        <span class="ft__smaller ft__on-surface">+{item.person.tags.length - 3}</span>
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <div class="cooling-card-actions">
                            <button
                                type="button"
                                class="b3-button b3-button--text btn-open-person"
                                onclick={() => {
                                    onOpenPerson?.(item.person.docId);
                                    onClose?.();
                                }}
                            >
                                <ExternalLink size={12} class="lvct-icon-inline" />
                                {text("coolingViewProfile", "查看画像 ↗")}
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .lvct-cooling-radar {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 80vh;
    }

    .cooling-metrics-bar {
        display: flex;
        align-items: stretch;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: 0 2px 10px rgba(28, 24, 21, 0.04);
        padding: 12px 16px;
        gap: 0;
    }

    @media (max-width: 640px) {
        .cooling-metrics-bar {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            padding: 8px;
            gap: 8px;
        }
        .metric-card {
            padding: 6px 10px;
            &:not(:last-child)::after {
                display: none;
            }
        }
    }

    .metric-card {
        flex: 1;
        padding: 4px 16px;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 2px;
        position: relative;

        &:not(:last-child)::after {
            content: "";
            position: absolute;
            right: 0;
            top: 15%;
            bottom: 15%;
            width: 1px;
            background: var(--lvct-border-subtle);
        }
    }

    .metric-title {
        font-size: 11px;
        color: var(--lvct-text-3);
        font-weight: 500;
    }

    .metric-number {
        font-size: 24px;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
    }

    .cooling-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .search-input-box {
        flex: 1;
        min-width: 240px;
        position: relative;
    }

    .search-input-box .search-icon {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--b3-theme-on-surface-light);
        pointer-events: none;
    }

    .search-input-box input {
        padding-left: 28px;
        border-radius: var(--lv-r-pill, 9999px);
    }

    .filter-pills {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .filter-pill {
        border: 1px solid var(--lvct-border-subtle);
        background: transparent;
        font-size: 11px;
        padding: 3px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        color: var(--lvct-text-2);
        display: inline-flex;
        align-items: center;
        transition: all var(--lvct-dur-fast) var(--lvct-ease);
    }

    .filter-pill.is-active {
        background: var(--lv-brand);
        color: var(--lvct-on-accent);
        border-color: var(--lv-brand);
        font-weight: 600;
    }

    .cooling-content {
        flex: 1;
        overflow-y: auto;
        min-height: 240px;
        padding-right: 4px;
    }

    .cooling-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
        gap: 10px;
    }

    .cooling-card {
        padding: 12px 14px;
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 16px);
        background: var(--lvct-bg-surface);
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: var(--lvct-shadow-1);
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease), border-color var(--lvct-dur-fast) var(--lvct-ease);
    }

    .cooling-card:hover {
        transform: translateY(-1px);
        box-shadow: var(--lvct-shadow-2);
    }

    .cooling-card.is-starred {
        border-left: 3px solid var(--lv-data-amber, #d97706);
    }

    .cooling-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
    }

    .person-identity {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .avatar-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--b3-theme-surface-lighter);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 13px;
        position: relative;
        flex-shrink: 0;
    }

    .star-badge {
        position: absolute;
        bottom: -2px;
        right: -4px;
        font-size: 10px;
        line-height: 1;
    }

    .name-line {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .person-name {
        font-weight: 600;
        font-size: 13px;
    }

    .group-tag {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        background: var(--b3-theme-surface-lighter);
        color: var(--b3-theme-on-surface-light);
    }

    .org-line {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        margin-top: 1px;
    }

    .heat-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }

    .cooling-card-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .rhythm-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
    }

    .rhythm-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
    }

    .cooling-card-actions {
        display: flex;
        justify-content: flex-end;
        border-top: 1px dashed var(--b3-border-color);
        padding-top: 6px;
        margin-top: 2px;
    }

    .btn-open-person {
        font-size: 11px;
        padding: 2px 8px;
    }
</style>
