<script lang="ts">
    import type { ContactsPluginFacade } from "../../types";
    import {
        filterPreMeetingDossiers,
        type ContactPreMeetingDossier,
    } from "../../domain/pre-meeting-hub.ts";
    import { profileText } from "../../domain/people-profiles.ts";
    import { translateText } from "../../domain/translation";
    import ViewState from "../ViewState.svelte";
    import { onDestroy } from "svelte";
    import {
        ShieldAlert,
        Search,
        ExternalLink,
        Utensils,
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
    let allDossiers = $state<ContactPreMeetingDossier[]>([]);
    let searchQuery = $state("");
    let filterType: "all" | "taboo_only" | "promise_only" = $state("all");

    $effect(() => {
        if (!facade.loadAllPreMeetingDossiers) {
            loading = false;
            return;
        }
        void facade.loadAllPreMeetingDossiers().then((res) => {
            if (alive) allDossiers = res;
        }).catch(() => {
            if (alive) allDossiers = [];
        }).finally(() => {
            if (alive) loading = false;
        });
    });

    onDestroy(() => {
        alive = false;
    });

    // 默认优先展示具有实际偏好、忌口、承诺或谈资的人物
    const activeDossiers = $derived(
        allDossiers.filter((d) =>
            d.taboos.length > 0 ||
            d.normalPreferences.length > 0 ||
            d.pendingPromises.length > 0 ||
            d.topics.length > 0
        )
    );

    const filteredDossiers = $derived(
        filterPreMeetingDossiers(activeDossiers, searchQuery, filterType)
    );

    const totalTaboos = $derived(
        allDossiers.reduce((acc, d) => acc + d.taboos.length, 0)
    );

    const totalPendingPromises = $derived(
        allDossiers.reduce((acc, d) => acc + d.pendingPromises.length, 0)
    );
</script>

<div class="lvct-premeeting-hub">
    <!-- 顶部概览与指标 -->
    <div class="premeeting-metrics-bar">
        <div class="metric-card">
            <span class="metric-title">{text("preMeetingTotalContacts", "备忘覆盖人脉")}</span>
            <span class="metric-number ft__primary">{activeDossiers.length}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("preMeetingTotalTaboos", "全库红线忌口")}</span>
            <span class="metric-number ft__error">{totalTaboos}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("preMeetingPendingPromises", "待履约信诺")}</span>
            <span class="metric-number ft__warning">{totalPendingPromises}</span>
        </div>
    </div>

    <!-- 搜索与筛选工具栏 -->
    <div class="premeeting-toolbar">
        <div class="search-input-box">
            <span class="search-icon"><Search size={14} /></span>
            <input
                class="b3-text-field fn__block"
                type="search"
                bind:value={searchQuery}
                placeholder={text("preMeetingSearchPlaceholder", "搜索联系人姓名、公司、标签、忌口或约定事项…")}
            />
        </div>

        <div class="filter-pills">
            <button
                type="button"
                class="filter-pill {filterType === 'all' ? 'is-active' : ''}"
                onclick={() => filterType = 'all'}
            >
                {text("preMeetingFilterAll", "全部备忘")}
            </button>
            <button
                type="button"
                class="filter-pill {filterType === 'taboo_only' ? 'is-active' : ''}"
                onclick={() => filterType = 'taboo_only'}
            >
                <ShieldAlert size={12} style="margin-right: 2px;" />
                {text("preMeetingFilterTaboo", "仅看红线雷区")}
            </button>
            <button
                type="button"
                class="filter-pill {filterType === 'promise_only' ? 'is-active' : ''}"
                onclick={() => filterType = 'promise_only'}
            >
                {text("preMeetingFilterPromise", "仅看待办承诺")}
            </button>
        </div>
    </div>

    <!-- 档案卡片列表 -->
    <div class="premeeting-content">
        {#if loading}
            <ViewState compact loading title={text("preMeetingLoading", "正在读取全库偏好与会前备忘…")} />
        {:else if filteredDossiers.length === 0}
            <ViewState
                compact
                icon="inbox"
                title={searchQuery || filterType !== "all"
                    ? text("preMeetingNoMatch", "未找到符合当前筛选条件的会前备忘。")
                    : text("preMeetingEmptyAll", "当前名册中尚未登记任何饮食忌口、敏感雷区或会面备忘。在联系人详情页添加偏好，外出赴约更得心应手。")}
            />
        {:else}
            <div class="dossiers-grid">
                {#each filteredDossiers as d (d.person.docId)}
                    {@const orgText = profileText(d.person.profile, "work")}
                    <div class="dossier-card b3-card" class:has-alert={d.hasUrgentAlerts}>
                        <div class="dossier-head">
                            <div class="person-info">
                                <span class="person-name">{d.person.name}</span>
                                {#if d.person.group}
                                    <span class="b3-chip font-size-11">{d.person.group}</span>
                                {/if}
                                {#if orgText && orgText !== "未填写" && orgText !== "尚未核实" && orgText !== "组织归属尚未核实"}
                                    <span class="person-company">· {orgText}</span>
                                {/if}
                            </div>
                            <div class="dossier-actions">
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small open-person-btn"
                                    onclick={() => {
                                        onClose?.();
                                        onOpenPerson?.(d.person.docId);
                                    }}
                                    title={text("preMeetingOpenPersonTip", "在人脉详情视窗中查看完整画像")}
                                >
                                    <ExternalLink size={12} style="margin-right: 2px;" />
                                    <span>{text("preMeetingOpenPerson", "查看画像")}</span>
                                </button>
                            </div>
                        </div>

                        <!-- 忌口与红线雷区 -->
                        {#if d.taboos.length > 0}
                            <div class="dossier-section">
                                <span class="section-label ft__error">
                                    <ShieldAlert size={12} style="margin-right: 3px;" />
                                    {text("preMeetingTaboosLabel", "红线禁忌与严重忌口")}
                                </span>
                                <div class="chips-flow">
                                    {#each d.taboos as taboo (taboo.id)}
                                        <span class="taboo-chip">
                                            {taboo.content}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- 普通偏好 -->
                        {#if d.normalPreferences.length > 0}
                            <div class="dossier-section">
                                <span class="section-label">
                                    <Utensils size={12} style="margin-right: 3px;" />
                                    {text("preMeetingPrefsLabel", "饮食与习惯偏好")}
                                </span>
                                <div class="chips-flow">
                                    {#each d.normalPreferences as pref (pref.id)}
                                        <span class="pref-chip">
                                            {pref.content}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- 待兑现约定 -->
                        {#if d.pendingPromises.length > 0}
                            <div class="dossier-section">
                                <span class="section-label ft__warning">
                                    {text("preMeetingPromisesLabel", "待兑现承诺约定")}
                                </span>
                                <div class="promises-list">
                                    {#each d.pendingPromises as p (p.id)}
                                        <div class="promise-row">
                                            <span class="promise-tag {p.direction}">
                                                {p.direction === "i_promised" ? "我承" : "彼承"}
                                            </span>
                                            <span class="promise-text">{p.title}</span>
                                            {#if p.dueOn}
                                                <span class="promise-due">({p.dueOn})</span>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- 会面谈资备忘 -->
                        {#if d.topics.length > 0}
                            <div class="dossier-section">
                                <span class="section-label">
                                    {text("preMeetingTopicsLabel", "谈资备忘")}
                                </span>
                                <div class="topics-list">
                                    {#each d.topics as t (t.id)}
                                        <div class="topic-row">
                                            📌 {t.text}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .lvct-premeeting-hub {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 80vh;
    }

    .premeeting-metrics-bar {
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
        .premeeting-metrics-bar {
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

    .premeeting-toolbar {
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
    }

    .filter-pill {
        border: 1px solid var(--lvct-border-subtle);
        background: transparent;
        font-size: 11px;
        padding: 3px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        display: flex;
        align-items: center;
        color: var(--lvct-text-2);
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), background var(--lvct-dur-fast) var(--lvct-ease), border-color var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease), color var(--lvct-dur-fast) var(--lvct-ease), opacity var(--lvct-dur-fast) var(--lvct-ease);
    }

    .filter-pill.is-active {
        background: var(--lv-brand-soft);
        border-color: var(--lv-brand);
        color: var(--lv-brand);
        font-weight: 600;
    }

    .premeeting-content {
        overflow-y: auto;
        padding-right: 4px;
        max-height: 58vh;
    }

    .dossiers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
        gap: 12px;
    }

    .dossier-card {
        padding: 12px 14px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: var(--lvct-shadow-1);
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: var(--lvct-shadow-2);
        }
    }

    .dossier-card.has-alert {
        border-left: 3px solid var(--lvct-danger, #e11d48);
    }

    .dossier-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--b3-border-color);
    }

    .person-info {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    .person-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
    }

    .person-company {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .open-person-btn {
        padding: 1px 4px;
        font-size: 11px;
        display: flex;
        align-items: center;
    }

    .dossier-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .section-label {
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        color: var(--b3-theme-on-surface-light);
    }

    .chips-flow {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }

    .taboo-chip {
        font-size: 11px;
        padding: 2px 9px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lvct-danger-soft, rgba(235, 77, 75, 0.1));
        color: var(--lvct-danger, #dc2626);
        border: 1px solid color-mix(in srgb, var(--lvct-danger, #dc2626) 28%, transparent);
        font-weight: 500;
    }

    .pref-chip {
        font-size: 11px;
        padding: 2px 9px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        color: var(--b3-theme-on-surface);
    }

    .promises-list, .topics-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
    }

    .promise-row {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--b3-theme-on-surface);
    }

    .promise-tag {
        font-size: 10px;
        padding: 1px 7px;
        border-radius: var(--lv-r-pill, 9999px);
        flex-shrink: 0;
        font-weight: 600;
    }

    .promise-tag.i_promised {
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #ea580c);
    }

    .promise-tag.they_promised {
        background: var(--lvct-info-soft, rgba(2, 132, 199, 0.12));
        color: var(--lvct-info, #0284c7);
    }

    .promise-due {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
    }

    .topic-row {
        color: var(--b3-theme-on-surface);
        line-height: 1.4;
    }
</style>
