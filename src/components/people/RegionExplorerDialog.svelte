<script lang="ts">
    /**
     * 城市/地域人脉探索与出差助手对话框 (RegionExplorerDialog)
     * 帮助用户按城市热度探索人脉分布、计划出差行程、发现周边省市联系人、并一键导出出差拜访清单。
     */
    import type { ContactSummary } from "../../domain/person.ts";
    import {
        groupContactsByRegion,
        findNearbyOrSameProvinceCities,
        filterContactsByRegion,
    } from "../../domain/region.ts";
    import { profileText } from "../../domain/people-profiles.ts";
    import { copyPlainText } from "../../shared/clipboard.ts";
    import { toLocalDateKey } from "../../domain/interactions.ts";
    import { extractCityOrganizations } from "../../domain/city-topic.ts";
    import { onDestroy, untrack } from "svelte";
    import { MapPin, Search, Copy, Check, Filter, Compass, Briefcase, Phone, FileText, ExternalLink, Sparkles } from "@lucide/svelte";
    import { syncCityTopicDocument, createTripItineraryDoc } from "../../services/city-topic";
    import { safeDocTitleFromHPath } from "../../libs/lv-notice-kit";

    let {
        contacts = [],
        notebookId,
        initialCity = "",
        onApplyRegionFilter,
        onClose,
        onOpenDoc,
    }: {
        contacts: readonly ContactSummary[];
        notebookId?: string;
        initialCity?: string;
        i18n?: Readonly<Record<string, string>>;
        onApplyRegionFilter: (region: string) => void;
        onClose: () => void;
        onOpenDoc?: (docId: string) => void;
    } = $props();

    let alive = true;

    // 搜索关键词
    let citySearch = $state("");
    // 当前选中的城市（默认为传入城市、人数最多的城市或首个城市）
    let selectedCity = $state<string>(untrack(() => initialCity.trim()));
    // 复制成功的提示状态与并发防连发锁
    let copyingVisitList = $state(false);
    let copySuccess = $state(false);
    let copyError = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | null = null;
    let copyErrorTimer: ReturnType<typeof setTimeout> | null = null;
    let syncingDoc = $state(false);
    let syncDocSuccess = $state(false);
    let syncDocTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSyncedDocId = $state("");
    let creatingTripDoc = $state(false);
    let lastTripDocId = $state("");
    let lastTripDocPath = $state("");

    function handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            if (currentContacts.length > 0) {
                if (notebookId && !creatingTripDoc) {
                    void handleCreateTripDoc();
                } else if (!copyingVisitList) {
                    void handleCopyVisitList();
                }
            }
        }
    }

    async function handleCreateTripDoc() {
        if (!notebookId || !selectedCity || currentContacts.length === 0 || creatingTripDoc) return;
        creatingTripDoc = true;
        try {
            const res = await createTripItineraryDoc(notebookId, {
                city: selectedCity,
                context: tripContext,
                contacts: currentContacts,
                date: toLocalDateKey(),
            });
            if (!alive) return;
            if (res?.docId) {
                lastTripDocId = res.docId;
                lastTripDocPath = res.hpath;
            }
        } finally {
            if (alive) {
                creatingTripDoc = false;
            }
        }
    }

    async function handleSyncCityDoc() {
        if (!notebookId || !selectedCity || selectedCity === "未知" || currentContacts.length === 0 || syncingDoc) return;
        syncingDoc = true;
        try {
            const organizations = extractCityOrganizations(currentContacts);

            const res = await syncCityTopicDocument({
                notebookId,
                city: selectedCity,
                contacts: currentContacts,
                organizations,
            });
            if (!alive) return;
            if (res?.docId) {
                lastSyncedDocId = res.docId;
                syncDocSuccess = true;
                if (syncDocTimer) clearTimeout(syncDocTimer);
                syncDocTimer = setTimeout(() => {
                    if (alive) syncDocSuccess = false;
                }, 3000);
            }
        } finally {
            if (alive) {
                syncingDoc = false;
            }
        }
    }

    // 按地域分组统计
    const regionGroups = $derived.by(() => groupContactsByRegion(contacts));

    // 热门快捷城市列表
    const hotCities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "南京", "武汉"];

    // 过滤后的城市列表
    const filteredRegionGroups = $derived.by(() => {
        const query = citySearch.trim().toLowerCase();
        if (!query) return regionGroups;
        return regionGroups.filter(
            (group) =>
                group.city.toLowerCase().includes(query) ||
                (group.province && group.province.toLowerCase().includes(query))
        );
    });

    // 默认选中第一个城市
    $effect(() => {
        if (!selectedCity && regionGroups.length > 0) {
            // 优先选已知城市而非“未知”
            const firstKnown = regionGroups.find((g) => g.city !== "未知");
            selectedCity = firstKnown ? firstKnown.city : regionGroups[0].city;
        }
    });

    // 当前选中的城市分组详情
    const currentGroup = $derived.by(() => {
        return regionGroups.find((g) => g.city === selectedCity) ?? null;
    });

    // 当前选中的城市联系人列表
    const currentContacts = $derived.by(() => {
        if (!selectedCity) return [];
        return filterContactsByRegion(contacts, selectedCity);
    });

    // 周边及同省关联城市
    const nearbyCities = $derived.by(() => {
        if (!selectedCity || selectedCity === "未知") return [];
        const candidateNames = findNearbyOrSameProvinceCities(selectedCity);
        // 只保留通讯录中确实存在联系人的城市
        return regionGroups.filter((g) => g.city !== selectedCity && candidateNames.includes(g.city));
    });

    // 未知/未录入地区的数量
    const unknownCount = $derived.by(() => {
        const g = regionGroups.find((item) => item.city === "未知");
        return g ? g.count : 0;
    });

    type TripContext = "general" | "business" | "travel" | "transit";
    let tripContext = $state<TripContext>("general");

    const TRIP_CONTEXTS: { id: TripContext; label: string; icon: string; titlePrefix: string }[] = [
        { id: "general", label: "全部探访", icon: "📍", titlePrefix: "城市人脉探访备忘" },
        { id: "business", label: "商务出差", icon: "💼", titlePrefix: "出差人脉拜访清单" },
        { id: "travel", label: "度假出游", icon: "✈️", titlePrefix: "出游好友小聚备忘" },
        { id: "transit", label: "顺路途经", icon: "🚗", titlePrefix: "顺路探望联络清单" },
    ];

    // 复制行程探访备忘录为 Markdown 格式
    async function handleCopyVisitList() {
        if (copyingVisitList || currentContacts.length === 0) return;
        copyingVisitList = true;
        try {
            const cityName = selectedCity || "未知地区";
            const currentCtx = TRIP_CONTEXTS.find((c) => c.id === tripContext) ?? TRIP_CONTEXTS[0];
            const lines: string[] = [
                `# ${currentCtx.icon} ${currentCtx.titlePrefix} - ${cityName} (共 ${currentContacts.length} 人)`,
                `> 行程类型：${currentCtx.label} · 生成日期：${toLocalDateKey()}`,
                "",
            ];

            for (const person of currentContacts) {
                const workText = profileText(person.profile, "work");
                const orgStr = workText && workText !== "未填写" && workText !== "尚未核实" ? ` | ${workText}` : "";

                const contactParts: string[] = [];
                if (person.phone) contactParts.push(`电话: ${person.phone}`);
                if (person.wechat) contactParts.push(`微信: ${person.wechat}`);
                if (person.email) contactParts.push(`邮箱: ${person.email}`);
                const contactStr = contactParts.length > 0 ? ` (${contactParts.join(", ")})` : "";

                const rel = profileText(person.profile, "relationship");
                const relStr = rel && rel !== "未填写" && rel !== "尚未核实" ? ` [${rel}]` : "";

                lines.push(`- **${person.name}**${relStr}${orgStr}${contactStr}`);
            }

            const textContent = lines.join("\n");
            await copyPlainText(textContent);
            if (!alive) return;
            copySuccess = true;
            copyError = false;
            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                if (alive) copySuccess = false;
            }, 2000);
        } catch (err) {
            console.warn("[LvContacts] 复制探访备忘失败", err);
            if (!alive) return;
            copyError = true;
            copySuccess = false;
            if (copyErrorTimer) clearTimeout(copyErrorTimer);
            copyErrorTimer = setTimeout(() => {
                if (alive) copyError = false;
            }, 2000);
        } finally {
            if (alive) {
                copyingVisitList = false;
            }
        }
    }

    onDestroy(() => {
        alive = false;
        if (copyTimer) clearTimeout(copyTimer);
        if (copyErrorTimer) clearTimeout(copyErrorTimer);
        if (syncDocTimer) clearTimeout(syncDocTimer);
    });

    function handleApplyAndClose(city: string) {
        onApplyRegionFilter(city);
        onClose();
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lvct-region-dialog" onkeydown={handleKeydown}>
    <!-- 顶部状态栏与目的地速搜 -->
    <div class="lvct-region-dialog__header">
        <div class="lvct-region-dialog__header-left">
            <Compass size={18} strokeWidth={1.6} class="lvct-region-dialog__header-icon" />
            <div>
                <p class="lvct-region-dialog__subtitle">出差出游、假期旅行、顺路途经，随时发现同城与周边好友，一键生成探访备忘录</p>
            </div>
        </div>
        <div class="lvct-region-dialog__header-search">
            <div class="b3-form__icon">
                <Search size={14} strokeWidth={1.6} class="b3-form__icon-icon" />
                <input
                    type="search"
                    class="b3-text-field b3-text-field--small"
                    placeholder="搜索城市、省份或大区..."
                    aria-label="搜索城市、省份或大区"
                    bind:value={citySearch}
                />
            </div>
        </div>
    </div>

    <!-- 热门城市快捷 Chips -->
    <div class="lvct-region-dialog__quick-chips">
        <span class="lvct-region-dialog__chips-label">常去与聚居城市：</span>
        {#each hotCities as hot}
            {@const group = regionGroups.find((g) => g.city === hot)}
            <button
                type="button"
                class="b3-chip lvct-region-dialog__chip-pill"
                class:b3-chip--primary={selectedCity === hot}
                onclick={() => (selectedCity = hot)}
            >
                {hot}{#if group} ({group.count}){/if}
            </button>
        {/each}
        {#if unknownCount > 0}
            <button
                type="button"
                class="b3-chip b3-chip--dashed lvct-region-dialog__chip-pill"
                class:b3-chip--primary={selectedCity === "未知"}
                onclick={() => (selectedCity = "未知")}
                title="查看尚未录入地址或城市的联系人"
            >
                未填写地区 ({unknownCount})
            </button>
        {/if}
    </div>

    <!-- 主体：左侧城市列表 + 右侧人脉清单与行程卡片 -->
    <div class="lvct-region-dialog__body">
        <!-- 左侧：城市热度排行 -->
        <div class="lvct-region-dialog__sidebar">
            <div class="lvct-region-dialog__sidebar-header">
                <span>全部城市 ({filteredRegionGroups.length})</span>
                <span class="lvct-text-muted">共 {contacts.length} 人</span>
            </div>
            <div class="lvct-region-dialog__city-list">
                {#if filteredRegionGroups.length === 0}
                    <div class="lvct-empty-tip">未找到匹配的城市</div>
                {:else}
                    {#each filteredRegionGroups as group (group.city)}
                        <button
                            type="button"
                            class="lvct-region-dialog__city-item"
                            class:lvct-region-dialog__city-item--active={selectedCity === group.city}
                            onclick={() => (selectedCity = group.city)}
                        >
                            <div class="lvct-region-dialog__city-info">
                                <span class="lvct-region-dialog__city-name">{group.city}</span>
                                {#if group.province && group.province !== group.city}
                                    <span class="lvct-region-dialog__city-meta">{group.province}</span>
                                {/if}
                            </div>
                            <span class="lvct-chip font-size-10 lvct-region-dialog__city-count">{group.count} 人</span>
                        </button>
                    {/each}
                {/if}
            </div>
        </div>

        <!-- 右侧：当前城市人脉清单 -->
        <div class="lvct-region-dialog__main">
            {#if !selectedCity}
                <div class="lvct-empty-state">
                    <MapPin size={40} strokeWidth={1.6} class="lvct-empty-state__icon" />
                    <p>请在左侧选择一个城市查看联系人</p>
                </div>
            {:else}
                <!-- 城市头部与出差操作 -->
                <div class="lvct-region-dialog__target-header">
                    <div>
                        <div class="lvct-region-dialog__target-title">
                            <MapPin size={18} strokeWidth={1.6} class="lvct-text-primary" />
                            <h4>{selectedCity}</h4>
                            <span class="b3-badge b3-badge--primary lvct-region-dialog__count-badge">{currentContacts.length} 位联系人</span>
                            {#if currentGroup?.province && currentGroup.province !== selectedCity}
                                <span class="lvct-text-muted font-size-12">（所属省份：{currentGroup.province}）</span>
                            {/if}
                        </div>
                        <!-- 周边联动提示 -->
                        {#if nearbyCities.length > 0}
                            <div class="lvct-region-dialog__nearby">
                                <span class="lvct-region-dialog__nearby-label" style="display: inline-flex; align-items: center;"><MapPin size={12} strokeWidth={1.6} class="lvct-icon-inline" /> 同省及周边人脉：</span>
                                {#each nearbyCities as near (near.city)}
                                    <button
                                        type="button"
                                        class="b3-chip font-size-11 lvct-region-dialog__chip-pill"
                                        onclick={() => (selectedCity = near.city)}
                                        title={`切换到周边城市 ${near.city}`}
                                    >
                                        {near.city} <b>{near.count}</b>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- 操作按钮组 -->
                    <div class="lvct-region-dialog__actions">
                        {#if notebookId && selectedCity && selectedCity !== "未知" && currentContacts.length > 0}
                            <button
                                type="button"
                                class="b3-button b3-button--outline b3-button--small"
                                onclick={handleSyncCityDoc}
                                disabled={syncingDoc}
                                title={`在思源中生成或受控更新《${selectedCity}》文档（仅更新人脉受控区，保留手写攻略与生活记录）`}
                            >
                                {#if syncDocSuccess}
                                    <Check size={14} strokeWidth={1.6} class="lvct-text-success" /> 已同步《{selectedCity}》文档
                                {:else}
                                    <FileText size={14} strokeWidth={1.6} /> {syncingDoc ? "正在同步…" : `同步《${selectedCity}》文档`}
                                {/if}
                            </button>
                        {/if}
                        {#if lastSyncedDocId && onOpenDoc}
                            <button
                                type="button"
                                class="b3-button b3-button--text b3-button--small"
                                onclick={() => { onClose?.(); onOpenDoc?.(lastSyncedDocId); }}
                                title="在思源主编辑器中打开该城市实体文档，撰写美食攻略与出行随笔"
                            >
                                <ExternalLink size={13} strokeWidth={1.6} class="lvct-icon-inline" /> 打开《{selectedCity}》文档 ↗
                            </button>
                        {/if}
                        <button
                            type="button"
                            class="b3-button b3-button--outline b3-button--small"
                            onclick={() => handleApplyAndClose(selectedCity === "未知" ? "未填写" : selectedCity)}
                            title="在名册主视图中应用此地域筛选"
                        >
                            <Filter size={14} strokeWidth={1.6} /> 在名册中筛选
                        </button>
                        <button
                            type="button"
                            class="b3-button b3-button--small {copyError ? 'b3-button--cancel' : 'b3-button--outline'}"
                            onclick={handleCopyVisitList}
                            disabled={currentContacts.length === 0 || copyingVisitList}
                        >
                            {#if copySuccess}
                                <Check size={14} strokeWidth={1.6} /> 已复制探访备忘
                            {:else if copyError}
                                复制失败
                            {:else}
                                <Copy size={14} strokeWidth={1.6} /> {copyingVisitList ? "正在复制…" : "复制探访备忘"}
                            {/if}
                        </button>
                        <button
                            type="button"
                            class="b3-button b3-button--primary b3-button--small"
                            onclick={handleCreateTripDoc}
                            disabled={currentContacts.length === 0 || !notebookId || creatingTripDoc}
                            title="在当前笔记本创建出差/行程拜访实体文档"
                        >
                            <Sparkles size={14} strokeWidth={1.6} /> {creatingTripDoc ? "正在沉淀…" : "沉淀为行程文档 ↗"}
                        </button>
                        {#if lastTripDocId}
                            <button
                                type="button"
                                class="b3-button b3-button--text b3-button--small"
                                style="color: var(--lvct-success, #16a34a);"
                                onclick={() => { onClose?.(); onOpenDoc?.(lastTripDocId); }}
                                title={`打开《${safeDocTitleFromHPath(lastTripDocPath)}》`}
                            >
                                <ExternalLink size={13} strokeWidth={1.6} class="lvct-icon-inline" /> 打开行程文档 ↗
                            </button>
                        {/if}
                    </div>
                </div>

                <!-- 行程类型快速切换胶囊栏 -->
                <div class="lvct-region-dialog__trip-contexts">
                    <span class="lvct-region-dialog__trip-contexts-label">行程类型：</span>
                    {#each TRIP_CONTEXTS as ctx}
                        <button
                            type="button"
                            class="b3-chip font-size-11 lvct-region-dialog__context-chip"
                            class:b3-chip--primary={tripContext === ctx.id}
                            onclick={() => (tripContext = ctx.id)}
                            title={`切换为${ctx.label}模式`}
                        >
                            {ctx.icon} {ctx.label}
                        </button>
                    {/each}
                </div>

                <!-- 联系人列表 -->
                <div class="lvct-region-dialog__contacts-wrap">
                    {#if currentContacts.length === 0}
                        <div class="lvct-empty-tip">该城市暂无联系人</div>
                    {:else}
                        <div class="lvct-region-dialog__contacts-grid">
                            {#each currentContacts as person (person.docId)}
                                {@const workText = profileText(person.profile, "work")}
                                {@const relText = profileText(person.profile, "relationship")}
                                <div class="lvct-region-dialog__person-card">
                                    <div class="lvct-region-dialog__person-top">
                                        <div class="lvct-region-dialog__person-avatar">
                                            {person.name.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div class="lvct-region-dialog__person-basic">
                                            <div class="lvct-region-dialog__person-name-row">
                                                <strong class="lvct-region-dialog__person-name">{person.name}</strong>
                                                {#if relText && relText !== "未填写" && relText !== "尚未核实"}
                                                    <span class="b3-badge b3-badge--secondary font-size-11 lvct-region-dialog__person-rel">{relText}</span>
                                                {/if}
                                            </div>
                                            {#if workText && workText !== "未填写" && workText !== "尚未核实"}
                                                <div class="lvct-region-dialog__person-job" title={workText}>
                                                    <Briefcase size={12} strokeWidth={1.6} class="lvct-text-muted" />
                                                    <span>{workText}</span>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- 详细信息：联系方式 -->
                                    <div class="lvct-region-dialog__person-details">
                                        {#if person.phone || person.wechat}
                                            <div class="lvct-region-dialog__person-detail-row">
                                                <Phone size={12} strokeWidth={1.6} class="lvct-text-muted" />
                                                <span>{person.phone || person.wechat}</span>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .lvct-region-dialog {
        display: flex;
        flex-direction: column;
        height: 600px;
        max-height: 80vh;
        gap: 12px;
        color: var(--b3-theme-on-background);
        outline: none;
    }
    .lvct-region-dialog__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--lvct-border-subtle, var(--b3-theme-surface-lighter));
    }
    .lvct-region-dialog__header-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    :global(.lvct-region-dialog__header-icon) {
        color: var(--b3-theme-primary);
        flex-shrink: 0;
    }
    .lvct-region-dialog__subtitle {
        margin: 0;
        font-size: 12px;
        color: var(--b3-theme-on-surface);
    }
    .lvct-region-dialog__header-search {
        min-width: 220px;

        input {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }
    .lvct-region-dialog__quick-chips {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: 12px;

        .b3-chip {
            border-radius: var(--lv-r-pill, 9999px);
            font-variant-numeric: tabular-nums;
        }
    }
    .lvct-region-dialog__chip-pill {
        border-radius: var(--lv-r-pill, 9999px) !important;
        font-variant-numeric: tabular-nums;
    }
    .lvct-region-dialog__chips-label {
        color: var(--b3-theme-on-surface);
    }
    .lvct-region-dialog__body {
        display: flex;
        flex: 1;
        min-height: 0;
        gap: 0;
        border: 1px solid var(--lvct-border-subtle, var(--b3-theme-surface-lighter));
        border-radius: var(--lvct-r-card, 16px);
        overflow: hidden;
        background: var(--lvct-bg-surface, var(--b3-theme-surface));
        box-shadow: var(--lvct-shadow-card, 0 1px 4px rgba(0, 0, 0, 0.04));
    }
    /* 左侧城市列表 */
    .lvct-region-dialog__sidebar {
        width: 230px;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--lvct-border-subtle, var(--b3-theme-surface-lighter));
        background: var(--b3-theme-surface);
    }
    .lvct-region-dialog__sidebar-header {
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        background: var(--b3-theme-background);
        border-bottom: 1px solid var(--lvct-border-subtle, var(--b3-theme-surface-lighter));
        font-variant-numeric: tabular-nums;
    }
    .lvct-region-dialog__city-list {
        flex: 1;
        overflow-y: auto;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .lvct-region-dialog__city-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: var(--lvct-r-card, 10px);
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        color: inherit;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    }
    .lvct-region-dialog__city-item:hover {
        background: var(--lvct-bg-hover, rgba(0, 0, 0, 0.04));
        color: var(--lvct-text-1, var(--b3-theme-on-background));
    }
    .lvct-region-dialog__city-item--active {
        background: color-mix(in srgb, var(--lv-brand, #ea580c) 12%, var(--lvct-bg-surface));
        color: var(--lv-brand, #ea580c);
        font-weight: 600;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lv-brand, #ea580c) 25%, transparent);
    }
    .lvct-region-dialog__city-info {
        display: flex;
        flex-direction: column;
    }
    .lvct-region-dialog__city-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--lvct-text-1, var(--b3-theme-on-background));
    }
    .lvct-region-dialog__city-meta {
        font-size: 11px;
        color: var(--lvct-text-3, var(--b3-theme-on-surface-light));
    }
    .lvct-region-dialog__city-count {
        padding: 1px 6px;
        border-radius: var(--lv-r-pill, 9999px) !important;
        font-variant-numeric: tabular-nums;
    }
    /* 右侧主区域 */
    .lvct-region-dialog__main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--b3-theme-background);
        padding: 14px;
    }
    .lvct-region-dialog__target-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--lvct-border-subtle, var(--b3-theme-surface-lighter));
        margin-bottom: 12px;
        gap: 12px;
    }
    .lvct-region-dialog__target-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .lvct-region-dialog__target-title h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    }
    .lvct-region-dialog__count-badge {
        border-radius: var(--lv-r-pill, 9999px) !important;
        font-variant-numeric: tabular-nums;
    }
    .lvct-region-dialog__nearby {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
        font-size: 12px;

        .b3-chip {
            border-radius: var(--lv-r-pill, 9999px);
            font-variant-numeric: tabular-nums;
        }
    }
    .lvct-region-dialog__nearby-label {
        color: var(--b3-theme-on-surface);
    }
    .lvct-region-dialog__actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
        flex-wrap: wrap;

        .b3-button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }
    .lvct-region-dialog__trip-contexts {
        display: flex;
        gap: 6px;
        align-items: center;
        padding: 0 0 10px 0;
        border-bottom: 1px solid var(--lvct-border-hairline, rgba(0,0,0,0.06));
        margin-bottom: 12px;
        flex-wrap: wrap;
    }
    .lvct-region-dialog__trip-contexts-label {
        font-size: 11px;
        color: var(--lvct-text-3, var(--b3-theme-on-surface-light));
    }
    .lvct-region-dialog__context-chip {
        border-radius: var(--lv-r-pill, 9999px) !important;
    }
    .lvct-region-dialog__contacts-wrap {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }
    .lvct-region-dialog__contacts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
        gap: 10px;
    }
    .lvct-region-dialog__person-card {
        padding: 10px 12px;
        border-radius: var(--lvct-r-card, 14px);
        background: var(--lvct-bg-surface, var(--b3-theme-surface));
        border: 1px solid var(--lvct-border-subtle, var(--b3-theme-surface-lighter));
        box-shadow: var(--lvct-shadow-card, 0 1px 3px rgba(0,0,0,0.04));
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    }
    .lvct-region-dialog__person-card:hover {
        border-color: var(--lvct-border-strong, var(--b3-theme-primary-lighter));
        transform: translateY(-1px);
        box-shadow: var(--lvct-shadow-2, 0 4px 12px rgba(0,0,0,0.06));
    }
    .lvct-region-dialog__person-top {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .lvct-region-dialog__person-avatar {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        background: linear-gradient(135deg, color-mix(in srgb, var(--lv-brand) 78%, var(--lvct-color-white)), var(--lv-brand));
        color: var(--lvct-on-accent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
        box-shadow: 0 2px 6px color-mix(in srgb, var(--lv-brand) 24%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }
    .lvct-region-dialog__person-basic {
        flex: 1;
        min-width: 0;
    }
    .lvct-region-dialog__person-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .lvct-region-dialog__person-name {
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .lvct-region-dialog__person-rel {
        border-radius: var(--lv-r-pill, 9999px) !important;
    }
    .lvct-region-dialog__person-job {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--b3-theme-on-surface);
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .lvct-region-dialog__person-details {
        font-size: 11px;
        color: var(--b3-theme-on-surface);
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 6px;
        border-top: 1px dashed var(--b3-theme-surface-lighter);
    }
    .lvct-region-dialog__person-detail-row {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .lvct-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        color: var(--b3-theme-on-surface);
        gap: 8px;
    }
    :global(.lvct-empty-state__icon) {
        opacity: 0.4;
    }
    .font-size-10 { font-size: 10px; }
    .font-size-11 { font-size: 11px; }
    .font-size-12 { font-size: 12px; }
    :global(.lvct-text-primary) { color: var(--b3-theme-primary); }
    .lvct-text-muted { color: var(--b3-theme-on-surface); }
    @media (max-width: 640px) {
        .lvct-region-dialog {
            height: auto;
            max-height: none;
        }
        .lvct-region-dialog__header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }
        .lvct-region-dialog__header-search {
            min-width: 0;
            width: 100%;
        }
        .lvct-region-dialog__body {
            flex-direction: column;
        }
        .lvct-region-dialog__sidebar {
            width: 100%;
            max-height: 150px;
            border-right: none;
            border-bottom: 1px solid var(--lvct-border-subtle, var(--b3-theme-surface-lighter));
        }
    }
</style>
