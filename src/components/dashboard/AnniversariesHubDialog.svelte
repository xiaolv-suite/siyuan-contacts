<script lang="ts">
    import type { ContactsPluginFacade } from "../../types";
    import type { ContactSummary } from "../../domain/person.ts";
    import {
        type AnniversaryCategory,
        type AnniversaryProjection,
        type AnniversaryItem,
        ANNIVERSARY_CATEGORY_LABELS,
    } from "../../domain/anniversaries.ts";
    import {
        generateAnniversaryGreeting,
        filterAnniversaryMilestones,
        type MilestoneWindowFilter,
        type AnniversaryHubItem,
    } from "../../domain/anniversary-milestones.ts";
    import { serializeBatchAnniversariesToIcs, buildBatchIcsFilename } from "../../domain/ical-export.ts";
    import { toLocalDateKey } from "../../domain/interactions.ts";
    import { translateText } from "../../domain/translation.ts";
    import { copyPlainText } from "../../shared/clipboard.ts";
    import ViewState from "../ViewState.svelte";
    import { onDestroy } from "svelte";
    import {
        Search,
        Copy,
        Check,
        ExternalLink,
        MessageSquarePlus,
        Download,
        Sparkles,
        Bell,
    } from "@lucide/svelte";

    let {
        facade,
        people = [],
        onClose,
        onOpenPerson,
        onLogInteraction,
        i18n,
    }: {
        facade: ContactsPluginFacade;
        people?: readonly ContactSummary[];
        onClose: () => void;
        onOpenPerson: (docId: string) => void;
        onLogInteraction?: (person: ContactSummary, noteText?: string) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let alive = true;
    let loading = $state(true);
    let rawProjections = $state<AnniversaryProjection[]>([]);
    let searchQuery = $state("");
    let windowFilter = $state<MilestoneWindowFilter>("all");
    let categoryFilter = $state<AnniversaryCategory | "all">("all");
    let copiedItemId = $state<string | null>(null);
    let copiedTimer: ReturnType<typeof setTimeout> | null = null;
    let copyErrorId = $state<string | null>(null);
    let copyErrorTimer: ReturnType<typeof setTimeout> | null = null;
    let syncedItemId = $state<string | null>(null);
    let syncedTimer: ReturnType<typeof setTimeout> | null = null;
    let exportingIcs = $state(false);

    $effect(() => {
        if (!facade.listUpcomingAnniversaries) {
            loading = false;
            return;
        }
        void facade.listUpcomingAnniversaries(90).then((res) => {
            if (alive) rawProjections = res || [];
        }).catch(() => {
            if (alive) rawProjections = [];
        }).finally(() => {
            if (alive) loading = false;
        });
    });

    onDestroy(() => {
        alive = false;
        if (copiedTimer) {
            clearTimeout(copiedTimer);
            copiedTimer = null;
        }
        if (copyErrorTimer) {
            clearTimeout(copyErrorTimer);
            copyErrorTimer = null;
        }
        if (syncedTimer) {
            clearTimeout(syncedTimer);
            syncedTimer = null;
        }
    });

    const peopleByDocId = $derived(new Map(people.map((p) => [p.docId, p])));

    const allHubItems = $derived.by(() => {
        const items: AnniversaryHubItem[] = [];
        for (const proj of rawProjections) {
            const p = peopleByDocId.get(proj.item.personDocId);
            const personName = p?.name || "好友";
            const greeting = generateAnniversaryGreeting(
                proj.item.category,
                personName,
                proj.yearsCount,
                proj.item.title,
            );
            items.push({
                id: proj.item.id,
                personDocId: proj.item.personDocId,
                personName,
                group: p?.group,
                anniversary: proj.item,
                category: proj.item.category,
                title: proj.item.title,
                daysUntil: proj.daysUntil,
                yearsCount: proj.yearsCount,
                displayDate: proj.displayDate,
                isToday: proj.daysUntil === 0,
                congratulatoryText: greeting,
            });
        }
        return items.sort((a, b) => a.daysUntil - b.daysUntil);
    });

    const filteredItems = $derived(
        filterAnniversaryMilestones(allHubItems, searchQuery, categoryFilter, windowFilter)
    );

    const todayCount = $derived(allHubItems.filter((i) => i.isToday).length);
    const weekCount = $derived(allHubItems.filter((i) => i.daysUntil <= 7).length);
    const milestoneCount = $derived(allHubItems.filter((i) => (i.yearsCount ?? 0) > 0).length);

    async function handleCopyGreeting(item: AnniversaryHubItem) {
        try {
            await copyPlainText(item.congratulatoryText);
            copiedItemId = item.id;
            copyErrorId = null;
            if (copiedTimer) clearTimeout(copiedTimer);
            copiedTimer = setTimeout(() => {
                copiedItemId = null;
            }, 2000);
        } catch (err) {
            console.warn("[LvContacts] 复制周年寄语失败", err);
            copyErrorId = item.id;
            copiedItemId = null;
            if (copyErrorTimer) clearTimeout(copyErrorTimer);
            copyErrorTimer = setTimeout(() => {
                copyErrorId = null;
            }, 2000);
        }
    }

    async function handleSyncToHome(item: AnniversaryHubItem) {
        if (!facade.syncAnniversariesToHome) return;
        try {
            const ok = await facade.syncAnniversariesToHome(item.title, item.displayDate);
            if (ok && alive) {
                syncedItemId = item.id;
                if (syncedTimer) clearTimeout(syncedTimer);
                syncedTimer = setTimeout(() => {
                    if (alive) syncedItemId = null;
                }, 2000);
            }
        } catch (err) {
            console.warn("[LvContacts] 同步到管家日程失败", err);
        }
    }

    function handleLog(item: AnniversaryHubItem) {
        const person = peopleByDocId.get(item.personDocId);
        if (!person) return;
        const defaultNote = `【${item.title}${item.yearsCount ? `第 ${item.yearsCount} 周年` : ""}】${item.congratulatoryText}`;
        if (onLogInteraction) {
            onLogInteraction(person, defaultNote);
        } else {
            onOpenPerson(item.personDocId);
        }
    }

    function handleExportIcs() {
        if (allHubItems.length === 0 || exportingIcs) return;
        exportingIcs = true;
        try {
            const peopleMap = new Map<string, { person: ContactSummary; anniversaries: AnniversaryItem[] }>();
            for (const item of allHubItems) {
                const p = peopleByDocId.get(item.personDocId);
                if (!p) continue;
                let entry = peopleMap.get(item.personDocId);
                if (!entry) {
                    entry = { person: p, anniversaries: [] };
                    peopleMap.set(item.personDocId, entry);
                }
                entry.anniversaries.push(item.anniversary);
            }
            const icsContent = serializeBatchAnniversariesToIcs(Array.from(peopleMap.values()));
            const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const todayStr = toLocalDateKey(new Date());
            a.download = buildBatchIcsFilename(text("annivExportFileLabel", "近期纪念日里程碑"), todayStr);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 0);
        } finally {
            exportingIcs = false;
        }
    }

    function getCategoryEmoji(cat: AnniversaryCategory): string {
        switch (cat) {
            case "acquaintance": return "🤝";
            case "wedding": return "💍";
            case "work": return "💼";
            case "memorial": return "🎗️";
            case "other": default: return "🎉";
        }
    }
</script>

<div class="lvct-anniv-hub">
    <!-- 顶部指标概览 -->
    <div class="anniv-metrics-bar">
        <div class="metric-card">
            <span class="metric-title">{text("annivTotalUpcoming", "近期纪念日总数")}</span>
            <span class="metric-number ft__primary">{allHubItems.length}</span>
        </div>
        <div class="metric-card" class:metric-card--highlight={todayCount > 0}>
            <span class="metric-title">{text("annivTodayCount", "今日正值纪念日")}</span>
            <span class="metric-number {todayCount > 0 ? 'ft__error' : ''}">{todayCount}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("annivWeekCount", "本周 7 天内临近")}</span>
            <span class="metric-number ft__warning">{weekCount}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("annivMilestoneCount", "满整周年里程碑")}</span>
            <span class="metric-number ft__success">{milestoneCount}</span>
        </div>
    </div>

    <!-- 工具与筛选栏 -->
    <div class="anniv-toolbar">
        <div class="search-input-box">
            <span class="search-icon"><Search size={14} /></span>
            <input
                class="b3-text-field fn__block"
                type="search"
                bind:value={searchQuery}
                placeholder={text("annivSearchPlaceholder", "搜索联系人姓名、纪念日名称或分类…")}
            />
        </div>

        <div class="filter-controls">
            <!-- 时间窗口快速切换 -->
            <div class="filter-pills">
                <button
                    type="button"
                    class="filter-pill {windowFilter === 'all' ? 'is-active' : ''}"
                    onclick={() => windowFilter = 'all'}
                >
                    {text("annivFilterAllWindow", "全部 (90天)")}
                </button>
                <button
                    type="button"
                    class="filter-pill {windowFilter === 'today' ? 'is-active' : ''}"
                    onclick={() => windowFilter = 'today'}
                >
                    {text("annivFilterToday", "今天")}
                </button>
                <button
                    type="button"
                    class="filter-pill {windowFilter === 'week' ? 'is-active' : ''}"
                    onclick={() => windowFilter = 'week'}
                >
                    {text("annivFilterWeek", "7天内")}
                </button>
                <button
                    type="button"
                    class="filter-pill {windowFilter === 'month' ? 'is-active' : ''}"
                    onclick={() => windowFilter = 'month'}
                >
                    {text("annivFilterMonth", "30天内")}
                </button>
            </div>

            <!-- 分类选择下拉 -->
            <select
                class="b3-select font-size-12"
                bind:value={categoryFilter}
                aria-label={text("annivCategorySelect", "按分类筛选")}
            >
                <option value="all">{text("annivAllCategories", "全部分类")}</option>
                <option value="acquaintance">🤝 {ANNIVERSARY_CATEGORY_LABELS.acquaintance}</option>
                <option value="wedding">💍 {ANNIVERSARY_CATEGORY_LABELS.wedding}</option>
                <option value="work">💼 {ANNIVERSARY_CATEGORY_LABELS.work}</option>
                <option value="memorial">🎗️ {ANNIVERSARY_CATEGORY_LABELS.memorial}</option>
                <option value="other">🎉 {ANNIVERSARY_CATEGORY_LABELS.other}</option>
            </select>

            <!-- 导出日历 -->
            <button
                type="button"
                class="b3-button b3-button--outline lvct-export-ics-btn"
                onclick={handleExportIcs}
                disabled={allHubItems.length === 0}
                title={text("annivExportIcsTitle", "导出近期全量纪念日到 iCalendar 日历文件 (.ics)，支持一键导入手机或日历应用")}
            >
                <Download size={13} style="margin-right: 3px;" />
                {text("annivExportIcs", "导出日历")}
            </button>
        </div>
    </div>

    <!-- 纪念日列表 -->
    <div class="anniv-content">
        {#if loading}
            <ViewState compact loading title={text("annivLoading", "正在读取全库重要纪念日与周年里程碑…")} />
        {:else if filteredItems.length === 0}
            <ViewState
                compact
                icon="calendar"
                title={searchQuery || windowFilter !== "all" || categoryFilter !== "all"
                    ? text("annivNoMatch", "未找到符合当前筛选条件的周年纪念日。")
                    : text("annivEmptyAll", "未来 90 天内暂无即将到来的周年纪念日。可在联系人详情页添加相识、入职、结婚等重要纪念日，提前备好温情问候。")}
            />
        {:else}
            <div class="anniv-grid">
                {#each filteredItems as item (item.id)}
                    {@const matchedPerson = peopleByDocId.get(item.personDocId)}
                    <div class="anniv-card {item.isToday ? 'anniv-card--today' : ''}">
                        <div class="anniv-card-top">
                            <div class="anniv-person-info">
                                <span class="anniv-avatar">
                                    {#if matchedPerson?.avatar}
                                        <img class="anniv-avatar-img" src={matchedPerson.avatar} alt={item.personName} />
                                    {:else}
                                        {item.personName.slice(0, 1)}
                                    {/if}
                                </span>
                                <div class="anniv-person-text">
                                    <div class="anniv-name-row">
                                        <button
                                            type="button"
                                            class="b3-button b3-button--text anniv-name-btn"
                                            onclick={() => onOpenPerson(item.personDocId)}
                                            title={`查看 ${item.personName} 画像`}
                                        >
                                            {item.personName}
                                        </button>
                                        {#if item.group}
                                            <span class="lvct-chip lvct-chip--group font-size-11">{item.group}</span>
                                        {/if}
                                    </div>
                                    <div class="anniv-title-row">
                                        <span class="anniv-category-tag">
                                            {getCategoryEmoji(item.category)} {ANNIVERSARY_CATEGORY_LABELS[item.category] || "纪念日"}
                                        </span>
                                        <strong class="anniv-item-title">{item.title}</strong>
                                    </div>
                                </div>
                            </div>

                            <div class="anniv-countdown-badge {item.isToday ? 'is-today' : ''}">
                                {#if item.isToday}
                                    <span class="countdown-text font-bold">🎉 今天</span>
                                {:else if item.daysUntil === 1}
                                    <span class="countdown-text">明天</span>
                                {:else}
                                    <span class="countdown-text">{item.daysUntil} 天后</span>
                                {/if}
                                <span class="countdown-date">{item.displayDate}</span>
                            </div>
                        </div>

                        {#if item.yearsCount && item.yearsCount > 0}
                            <div class="anniv-years-badge">
                                <Sparkles size={12} class="lvct-icon-inline" /> 满 {item.yearsCount} 周年纪念
                            </div>
                        {/if}

                        <!-- 个性化祝贺文案预览盒 -->
                        <div class="anniv-greeting-box">
                            <p class="greeting-text">
                                “{item.congratulatoryText}”
                            </p>
                        </div>

                        <!-- 快捷操作区 -->
                        <div class="anniv-card-actions">
                            <button
                                type="button"
                                class="b3-button b3-button--small {copiedItemId === item.id ? 'b3-button--primary' : copyErrorId === item.id ? 'b3-button--cancel' : 'b3-button--outline'}"
                                onclick={() => void handleCopyGreeting(item)}
                                title={text("annivCopyGreetingTip", "复制温情祝贺寄语到剪贴板")}
                            >
                                {#if copiedItemId === item.id}
                                    <Check size={12} style="margin-right: 2px;" /> {text("copied", "已复制")}
                                {:else if copyErrorId === item.id}
                                    {text("copyFailed", "复制失败")}
                                {:else}
                                    <Copy size={12} style="margin-right: 2px;" /> {text("annivCopyGreeting", "复制寄语")}
                                {/if}
                            </button>

                            <button
                                type="button"
                                class="b3-button b3-button--small b3-button--outline"
                                onclick={() => handleLog(item)}
                                title={text("annivLogActivityTip", "为 TA 记一笔交往记录并填入周年备忘")}
                            >
                                <MessageSquarePlus size={12} style="margin-right: 2px;" />
                                {text("annivLogActivity", "记一笔")}
                            </button>

                            {#if facade?.syncAnniversariesToHome}
                                <button
                                    type="button"
                                    class="b3-button b3-button--small b3-button--outline"
                                    onclick={() => void handleSyncToHome(item)}
                                    title="同步该纪念日到小驴管家日程提醒"
                                >
                                    {#if syncedItemId === item.id}
                                        <Check size={12} style="margin-right: 2px; color: var(--lvct-success);" /> 已同步管家
                                    {:else}
                                        <Bell size={12} style="margin-right: 2px;" /> 同步管家
                                    {/if}
                                </button>
                            {/if}

                            <button
                                type="button"
                                class="b3-button b3-button--small b3-button--text"
                                onclick={() => onOpenPerson(item.personDocId)}
                                title={text("annivViewProfile", "查看联系人详情")}
                            >
                                <ExternalLink size={12} />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div class="anniv-footer">
        <span class="ft__smaller ft__on-surface-light">
            {text("annivFooterHint", "提前备好温情问候，让每一次周年重聚都自然有度。")}
        </span>
        <button type="button" class="b3-button b3-button--cancel" onclick={onClose}>
            {text("close", "关闭")}
        </button>
    </div>
</div>

<style>
    .lvct-anniv-hub {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 80vh;
    }

    .anniv-metrics-bar {
        display: flex;
        align-items: stretch;
        background: var(--lvct-bg-surface, var(--b3-theme-surface));
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: 0 2px 10px rgba(28, 24, 21, 0.04);
        padding: 12px 16px;
        gap: 0;
    }

    .metric-card {
        flex: 1;
        padding: 4px 16px;
        background: transparent;
        border: none;
        border-radius: 0;
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
            background: var(--lvct-border-subtle, rgba(44, 28, 16, 0.08));
        }
    }

    .metric-card--highlight {
        background: color-mix(in srgb, var(--lv-data-amber, #d97706) 6%, transparent);
        border-radius: 10px;
    }

    @media (max-width: 640px) {
        .anniv-metrics-bar {
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

    .metric-title {
        font-size: 11px;
        color: var(--lvct-text-3, var(--b3-theme-on-surface-light));
        font-weight: 500;
    }

    .metric-number {
        font-size: 24px;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
    }

    .anniv-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
    }

    .search-input-box {
        position: relative;
        flex: 1;
        min-width: 200px;
    }

    .search-input-box input {
        padding-left: 28px;
        border-radius: var(--lv-r-pill, 9999px);
    }

    .search-icon {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--b3-theme-on-surface-light);
        pointer-events: none;
        display: flex;
        align-items: center;
    }

    .filter-controls {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .filter-pills {
        display: flex;
        gap: 4px;
        background: var(--lvct-bg-app, var(--b3-theme-surface));
        padding: 3px;
        border-radius: var(--lv-r-pill, 9999px);
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
    }

    .filter-pill {
        background: transparent;
        border: none;
        padding: 4px 12px;
        font-size: 11.5px;
        border-radius: var(--lv-r-pill, 9999px);
        color: var(--lvct-text-2, var(--b3-theme-on-surface));
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: all 0.15s ease;
    }

    .filter-pill.is-active {
        background: var(--lv-brand-soft, color-mix(in srgb, var(--lv-brand, #ea580c) 12%, transparent));
        color: var(--lv-brand, #ea580c);
        font-weight: 600;
    }

    .anniv-content {
        overflow-y: auto;
        padding-right: 4px;
    }

    .anniv-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
        gap: 12px;
    }

    .anniv-card {
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 16px);
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: var(--lvct-shadow-1);
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease), border-color var(--lvct-dur-fast) var(--lvct-ease);
    }

    .anniv-card:hover {
        transform: translateY(-1px);
        box-shadow: var(--lvct-shadow-2);
        border-color: color-mix(in srgb, var(--lv-brand) 30%, var(--lvct-border-subtle));
    }

    .anniv-card--today {
        border-color: var(--lv-data-amber, #d97706);
        background: var(--lv-data-amber-soft, rgba(217, 119, 6, 0.12));
    }

    .anniv-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
    }

    .anniv-person-info {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .anniv-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #ea580c);
        font-weight: 600;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
    }

    .anniv-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
    }

    .anniv-person-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .anniv-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .anniv-name-btn {
        padding: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
        cursor: pointer;
    }

    .anniv-title-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
    }

    .anniv-category-tag {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
    }

    .anniv-item-title {
        color: var(--b3-theme-on-surface);
    }

    .anniv-countdown-badge {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        padding: 4px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        flex-shrink: 0;
    }

    .anniv-countdown-badge.is-today {
        background: var(--lv-heat-cool, #f59e0b);
        color: var(--b3-theme-on-primary, #fff);
        border-color: var(--lv-heat-cool, #f59e0b);
    }

    .anniv-countdown-badge.is-today .countdown-date {
        color: rgba(255, 255, 255, 0.9);
    }

    .countdown-text {
        font-size: 12px;
    }

    .countdown-date {
        font-size: 10px;
        color: var(--b3-theme-on-surface-light);
    }

    .anniv-years-badge {
        font-size: 11px;
        color: var(--lv-data-amber, #d97706);
        background: var(--lv-data-amber-soft, rgba(217, 119, 6, 0.12));
        padding: 2px 9px;
        border-radius: var(--lv-r-pill, 9999px);
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }

    .anniv-greeting-box {
        background: var(--lvct-bg-app);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-md, 12px);
        padding: 8px 12px;
    }

    .greeting-text {
        margin: 0;
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        line-height: 1.5;
        font-style: italic;
    }

    .anniv-card-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
        margin-top: 2px;

        .b3-button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }

    .lvct-export-ics-btn {
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
        border-radius: var(--lv-r-pill, 9999px);
    }

    .anniv-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 8px;
        border-top: 1px solid var(--b3-border-color);
        margin-top: 4px;

        .b3-button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }
</style>
