<script lang="ts">
    import {
        computeNetworkHubsSummary,
    } from "../../domain/network-hubs.ts";
    import type { ContactSummary } from "../../domain/person.ts";
    import type { PersonGraph } from "../../domain/graph.ts";
    import { translateText } from "../../domain/translation";
    import {
        Network,
        ExternalLink,
        Crosshair,
        ArrowRightLeft,
        Users,
        Compass,
    } from "@lucide/svelte";

    let {
        people,
        graph,
        onClose,
        onLocatePerson,
        onOpenPerson,
        i18n,
    }: {
        people: readonly ContactSummary[];
        graph: PersonGraph;
        onClose: () => void;
        onLocatePerson: (docId: string) => void;
        onOpenPerson?: (docId: string) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let activeTab: "bridges" | "hubs" = $state("bridges");
    let searchQuery = $state("");

    const summary = $derived(
        computeNetworkHubsSummary(people, graph)
    );

    const displayedItems = $derived.by(() => {
        const raw = activeTab === "bridges" ? summary.bridgeConnectors : summary.topHubs;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return raw;
        return raw.filter((item) =>
            item.person.name.toLowerCase().includes(q) ||
            item.person.group.toLowerCase().includes(q) ||
            item.bridgedGroups.some((g) => g.toLowerCase().includes(q))
        );
    });
</script>

<div class="lvct-network-hubs">
    <!-- 顶部网络拓扑指标 -->
    <div class="hubs-metrics-bar">
        <div class="metric-card">
            <span class="metric-title">{text("netHubsTotalNodes", "网络总节点")}</span>
            <span class="metric-number ft__primary">{summary.totalNodes}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("netHubsTotalEdges", "人际连接总数")}</span>
            <span class="metric-number" style="color: var(--b3-theme-secondary);">{summary.totalEdges}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("netHubsBridgeCount", "跨圈引荐桥梁")}</span>
            <span class="metric-number ft__warning">{summary.bridgeConnectors.length}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("netHubsDensity", "网络连接密度")}</span>
            <span class="metric-number ft__smaller" style="font-weight: 700; color: var(--b3-theme-on-surface-light);">
                {(summary.density * 100).toFixed(1)}%
            </span>
        </div>
    </div>

    <!-- 选项卡与检索栏 -->
    <div class="hubs-toolbar">
        <div class="hubs-tabs">
            <button
                type="button"
                class="tab-btn {activeTab === 'bridges' ? 'is-active' : ''}"
                onclick={() => activeTab = 'bridges'}
            >
                <ArrowRightLeft size={13} style="margin-right: 4px;" />
                {text("netTabBridges", "跨圈层桥梁人 ({n})", { n: summary.bridgeConnectors.length })}
            </button>
            <button
                type="button"
                class="tab-btn {activeTab === 'hubs' ? 'is-active' : ''}"
                onclick={() => activeTab = 'hubs'}
            >
                <Network size={13} style="margin-right: 4px;" />
                {text("netTabHubs", "超级连接者 ({n})", { n: summary.topHubs.length })}
            </button>
        </div>

        <div class="search-box">
            <input
                class="b3-text-field"
                type="search"
                bind:value={searchQuery}
                placeholder={text("netSearchPlaceholder", "搜索人物或圈层名称…")}
            />
        </div>
    </div>

    <!-- 列表展示 -->
    <div class="hubs-list-wrap">
        {#if displayedItems.length === 0}
            <div class="empty-state ft__smaller ft__on-surface-variant">
                {activeTab === "bridges"
                    ? text("noBridgesFound", "当前人脉网络中暂未发现跨越多个群组的桥梁人物。为联系人分配不同分组并建立关联即可自动挖掘。")
                    : text("noHubsFound", "网络中暂无人脉连接。在联系人详情中添加相关人以形成连接。")}
            </div>
        {:else}
            <div class="hubs-grid">
                {#each displayedItems as item (item.docId)}
                    <div class="hub-card">
                        <div class="card-top">
                            <div class="person-info">
                                <div class="avatar-circle">
                                    {item.person.name.slice(0, 1)}
                                </div>
                                <div class="name-meta">
                                    <div class="name-row">
                                        <span class="person-name">{item.person.name}</span>
                                        {#if item.person.group}
                                            <span class="group-tag">{item.person.group}</span>
                                        {/if}
                                    </div>
                                    <span class="degree-badge ft__smaller">
                                        <Users size={11} class="lvct-icon-inline" />
                                        {text("connectionsCount", "连接 {n} 人", { n: item.degree })}
                                    </span>
                                </div>
                            </div>

                            {#if activeTab === "bridges"}
                                <span class="bridge-score-badge" title={text("bridgeScoreTip", "跨界引荐综合得分")}>
                                    <Compass size={11} class="lvct-icon-inline" />
                                    {text("bridgeScoreLabel", "跨界指数: {score}", { score: item.bridgeScore })}
                                </span>
                            {/if}
                        </div>

                        <!-- 跨越圈层标签条 -->
                        {#if item.bridgedGroups.length >= 2}
                            <div class="bridged-groups-section">
                                <span class="section-label ft__smaller ft__on-surface">
                                    {text("bridgedGroupsLabel", "横跨圈层：")}
                                </span>
                                <div class="circles-row">
                                    {#each item.bridgedGroups as grp, idx}
                                        {#if idx > 0}
                                            <span class="arrow-sep">↔</span>
                                        {/if}
                                        <span class="circle-chip">{grp}</span>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <div class="card-bottom-actions">
                            <button
                                type="button"
                                class="b3-button b3-button--outline btn-action"
                                onclick={() => {
                                    onLocatePerson(item.docId);
                                    onClose();
                                }}
                            >
                                <Crosshair size={12} class="lvct-icon-inline" />
                                {text("locateCanvas", "画布定位")}
                            </button>

                            {#if onOpenPerson}
                                <button
                                    type="button"
                                    class="b3-button b3-button--text btn-action"
                                    onclick={() => {
                                        onOpenPerson(item.docId);
                                        onClose();
                                    }}
                                >
                                    <ExternalLink size={12} class="lvct-icon-inline" />
                                    {text("viewProfile", "查看画像 ↗")}
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .lvct-network-hubs {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 80vh;
    }

    .hubs-metrics-bar {
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
        .hubs-metrics-bar {
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
        color: var(--lvct-text-1);
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
    }

    .hubs-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .hubs-tabs {
        display: flex;
        gap: 6px;
    }

    .tab-btn {
        border: 1px solid var(--lvct-color-border-200);
        background: transparent;
        font-size: 11px;
        padding: 4px 12px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        color: var(--lvct-text-2);
        display: inline-flex;
        align-items: center;
        transition: all var(--lvct-dur-fast) var(--lvct-ease);
    }

    .tab-btn.is-active {
        background: var(--lv-brand-soft);
        color: var(--lv-brand, #ea580c);
        border-color: var(--lv-brand, #ea580c);
        font-weight: 600;
    }

    .search-box input {
        font-size: 11px;
        padding: 4px 12px;
        width: 180px;
        border-radius: var(--lv-r-pill, 9999px);
        border: 1px solid var(--lvct-color-border-200);
    }

    .hubs-list-wrap {
        flex: 1;
        overflow-y: auto;
        min-height: 240px;
    }

    .hubs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 10px;
    }

    .hub-card {
        padding: 12px 14px;
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 16px);
        background: var(--lvct-bg-surface);
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

    .card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
    }

    .person-info {
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
        flex-shrink: 0;
    }

    .name-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .name-row {
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
        padding: 2px 7px;
        border-radius: var(--lv-r-pill, 9999px);
        background: color-mix(in srgb, var(--lvct-text-1) 8%, transparent);
        color: var(--lvct-text-2);
        font-weight: 500;
    }

    .degree-badge {
        color: var(--lvct-text-3);
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-variant-numeric: tabular-nums;
    }

    .bridge-score-badge {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lv-data-amber-soft, rgba(217, 119, 6, 0.12));
        color: var(--lv-data-amber, #d97706);
        font-weight: 700;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-variant-numeric: tabular-nums;
    }

    .bridged-groups-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: var(--lvct-bg-app);
        padding: 8px 10px;
        border-radius: var(--lvct-r-md, 12px);
    }

    .circles-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
    }

    .circle-chip {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        font-weight: 500;
    }

    .arrow-sep {
        font-size: 10px;
        color: var(--b3-theme-on-surface-light);
    }

    .card-bottom-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        border-top: 1px dashed var(--b3-border-color);
        padding-top: 6px;
        margin-top: 2px;
    }

    .btn-action {
        font-size: 11px;
        padding: 2px 8px;
    }

    .empty-state {
        text-align: center;
        padding: 40px 16px;
        color: var(--b3-theme-on-surface-light);
    }
</style>
