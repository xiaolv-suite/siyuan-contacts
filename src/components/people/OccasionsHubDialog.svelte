<script lang="ts">
    import type { OccasionEntity, OccasionType } from "../../domain/occasion-cluster.ts";
    import {
        OCCASION_TYPE_LABELS,
        filterOccasions,
    } from "../../domain/occasion-cluster.ts";
    import type { ContactSummary } from "../../domain/person.ts";
    import { translateText } from "../../domain/translation.ts";
    import ViewState from "../ViewState.svelte";
    import { confirmDialog } from "../../libs/confirm-dialog.ts";
    import { onDestroy } from "svelte";
    import {
        Search,
        Plus,
        Calendar,
        MapPin,
        Users,
        Trash2,
        FileText,
        Sparkles,
    } from "@lucide/svelte";

    let {
        onListOccasions,
        onDeleteOccasion,
        onOpenOccasionDialog,
        onOpenPerson,
        onOpenPeople,
        onOpenDoc,
        onClose,
        i18n,
    }: {
        people?: readonly ContactSummary[];
        onListOccasions?: () => Promise<OccasionEntity[]>;
        onDeleteOccasion?: (occasionId: string) => Promise<void>;
        onOpenOccasionDialog?: () => void;
        onOpenPerson?: (docId: string) => void;
        onOpenPeople?: (filter: { memberDocIds?: readonly string[]; label?: string }) => void;
        onOpenDoc?: (docId: string) => void;
        onClose: () => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let alive = true;
    let loading = $state(true);
    let occasions = $state<OccasionEntity[]>([]);
    let searchQuery = $state("");
    let typeFilter = $state<OccasionType | "all">("all");
    let deletingId = $state<string | null>(null);
    let errorText = $state("");

    async function loadData() {
        if (!onListOccasions) {
            loading = false;
            return;
        }
        loading = true;
        try {
            const list = await onListOccasions();
            if (alive) {
                occasions = [...(list || [])].sort((a, b) => b.date.localeCompare(a.date));
            }
        } catch (e: unknown) {
            if (alive) errorText = e instanceof Error ? e.message : String(e);
        } finally {
            if (alive) loading = false;
        }
    }

    $effect(() => {
        void loadData();
    });

    onDestroy(() => {
        alive = false;
    });

    const filteredOccasions = $derived(
        filterOccasions(occasions, searchQuery, typeFilter)
    );

    const totalAttendees = $derived(
        occasions.reduce((acc, o) => acc + o.attendees.length, 0)
    );

    const currentYear = new Date().getFullYear();
    const thisYearCount = $derived(
        occasions.filter((o) => o.date.startsWith(String(currentYear))).length
    );

    const linkedDocCount = $derived(
        occasions.filter((o) => Boolean(o.sourceDocId)).length
    );

    async function handleDelete(occasion: OccasionEntity) {
        if (!onDeleteOccasion || deletingId) return;
        const confirmed = await confirmDialog({
            title: text("confirmDeleteOccasionTitle", "删除群体活动记录"),
            message: text("confirmDeleteOccasionDesc", "确认删除群体活动「{title}」吗？已为各参与者生成的个人互动时间线将保留，主笔记中的同步块将被自动清理。", { title: occasion.title }),
        });
        if (!confirmed) return;

        deletingId = occasion.id;
        errorText = "";
        try {
            await onDeleteOccasion(occasion.id);
            occasions = occasions.filter((o) => o.id !== occasion.id);
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            deletingId = null;
        }
    }

    function handleHighlightAttendees(occasion: OccasionEntity) {
        if (!onOpenPeople || occasion.attendees.length === 0) return;
        const memberDocIds = occasion.attendees.map((a) => a.personDocId);
        onOpenPeople({
            memberDocIds,
            label: text("highlightAttendeesLabel", "群体活动 · {title}（{n}人）", { title: occasion.title, n: memberDocIds.length }),
        });
    }
</script>

<div class="lvct-occasions-hub">
    <!-- 指标概览条 -->
    <div class="occ-metrics-bar">
        <div class="metric-card">
            <span class="metric-title">{text("occTotalCount", "群体活动总数")}</span>
            <span class="metric-number ft__primary">{occasions.length}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("occTotalAttendees", "累计参与人次")}</span>
            <span class="metric-number ft__success">{totalAttendees}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("occThisYearCount", "本年活动场次")}</span>
            <span class="metric-number ft__warning">{thisYearCount}</span>
        </div>
        <div class="metric-card">
            <span class="metric-title">{text("occLinkedDocCount", "关联笔记沉淀")}</span>
            <span class="metric-number ft__info">{linkedDocCount}</span>
        </div>
    </div>

    <!-- 工具与筛选栏 -->
    <div class="occ-toolbar">
        <div class="search-input-box">
            <span class="search-icon"><Search size={14} /></span>
            <input
                class="b3-text-field fn__block"
                type="search"
                bind:value={searchQuery}
                placeholder={text("occSearchPlaceholder", "搜索活动标题、地点、随行参与人或备忘…")}
            />
        </div>

        <div class="filter-controls">
            <select
                class="b3-select font-size-12"
                bind:value={typeFilter}
                aria-label={text("occFilterTypeAria", "按活动类型筛选")}
            >
                <option value="all">{text("occAllTypes", "全部类型")}</option>
                <option value="meeting">💼 {OCCASION_TYPE_LABELS.meeting.label}</option>
                <option value="meal">🍲 {OCCASION_TYPE_LABELS.meal.label}</option>
                <option value="wedding">💍 {OCCASION_TYPE_LABELS.wedding.label}</option>
                <option value="party">🍻 {OCCASION_TYPE_LABELS.party.label}</option>
                <option value="trip">✈️ {OCCASION_TYPE_LABELS.trip.label}</option>
                <option value="conference">🎙️ {OCCASION_TYPE_LABELS.conference.label}</option>
                <option value="other">🎉 {OCCASION_TYPE_LABELS.other.label}</option>
            </select>

            {#if onOpenOccasionDialog}
                <button
                    type="button"
                    class="b3-button b3-button--primary btn-new-occasion"
                    onclick={onOpenOccasionDialog}
                    title={text("newOccasionBtnTip", "录入包含多位联系人的群体活动")}
                >
                    <Plus size={14} style="margin-right: 2px;" />
                    {text("newOccasionBtn", "记录新活动")}
                </button>
            {/if}
        </div>
    </div>

    {#if errorText}
        <div class="b3-snackbar--error" style="padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 8px;">
            {errorText}
        </div>
    {/if}

    <!-- 活动卡片列表 -->
    <div class="occ-content-list">
        {#if loading}
            <ViewState compact loading title={text("occLoading", "正在读取群体活动与场合大事记…")} />
        {:else if filteredOccasions.length === 0}
            <ViewState
                compact
                icon="calendar"
                title={searchQuery || typeFilter !== "all"
                    ? text("occNoMatch", "未找到符合当前筛选条件的活动记录。")
                    : text("occEmptyAll", "尚未记录任何群体活动或重要聚会。")}
                description={searchQuery || typeFilter !== "all" ? undefined : text("occEmptyDesc", "统一记录多人参加的会议、聚餐、婚礼等活动；系统将自动为每位参与者生成互动时间线并沉淀同场同行伙伴关系。")}
            >
                {#if onOpenOccasionDialog && !searchQuery && typeFilter === "all"}
                    <button type="button" class="b3-button b3-button--outline" onclick={onOpenOccasionDialog}>
                        <Plus size={13} style="margin-right: 2px;" /> {text("newOccasionBtn", "记录新活动")}
                    </button>
                {/if}
            </ViewState>
        {:else}
            <div class="occ-cards-grid">
                {#each filteredOccasions as occasion (occasion.id)}
                    {@const typeMeta = OCCASION_TYPE_LABELS[occasion.type] || OCCASION_TYPE_LABELS.other}
                    <div class="occ-card">
                        <div class="occ-card-top">
                            <div class="occ-card-meta-line">
                                <span class="occ-date-badge font-bold">
                                    <Calendar size={12} class="lvct-icon-inline" /> {occasion.date}{occasion.endDate ? ` ~ ${occasion.endDate}` : ""}
                                </span>
                                <span class="occ-type-tag">
                                    {typeMeta.icon} {typeMeta.label}
                                </span>
                                {#if occasion.place}
                                    <span class="occ-place-tag">
                                        <MapPin size={11} class="lvct-icon-inline" /> {occasion.place}
                                    </span>
                                {/if}
                            </div>

                            <button
                                type="button"
                                class="b3-button b3-button--text b3-button--small btn-del-occ"
                                onclick={() => void handleDelete(occasion)}
                                disabled={Boolean(deletingId)}
                                title={text("deleteOccasionTip", "删除此条活动记录")}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>

                        <div class="occ-card-body">
                            <h4 class="occ-title">{occasion.title}</h4>
                            {#if occasion.note}
                                <p class="occ-note">
                                    💬 “{occasion.note}”
                                </p>
                            {/if}
                        </div>

                        <!-- 参会人员列表与名册高亮联动 -->
                        <div class="occ-attendees-bar">
                            <div class="occ-attendees-left">
                                <span class="attendees-label ft__smaller ft__on-surface-light">
                                    <Users size={12} class="lvct-icon-inline" />
                                    {text("occAttendeesCount", "参会好友（{n}人）：", { n: occasion.attendees.length })}
                                </span>
                                <div class="attendee-chips">
                                    {#each occasion.attendees as attendee (attendee.personDocId)}
                                        <button
                                            type="button"
                                            class="attendee-chip"
                                            onclick={() => onOpenPerson?.(attendee.personDocId)}
                                            title={text("viewPersonProfileTip", "查看 {name} 画像", { name: attendee.name })}
                                        >
                                            <span class="attendee-avatar">{attendee.name.slice(0, 1)}</span>
                                            <span class="attendee-name">{attendee.name}</span>
                                            {#if attendee.role === "host"}
                                                <small class="role-badge">{text("occRoleHost", "主客")}</small>
                                            {/if}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <div class="occ-card-actions">
                                {#if occasion.sourceDocId && onOpenDoc}
                                    <button
                                        type="button"
                                        class="b3-button b3-button--outline b3-button--small btn-open-note"
                                        onclick={() => onOpenDoc(occasion.sourceDocId!)}
                                        title={text("openLinkedNoteTip", "打开关联的思源笔记文档")}
                                    >
                                        <FileText size={12} class="lvct-icon-inline" /> {text("openLinkedNote", "来源笔记")}
                                    </button>
                                {/if}

                                {#if onOpenPeople && occasion.attendees.length > 0}
                                    <button
                                        type="button"
                                        class="b3-button b3-button--outline b3-button--small btn-highlight-people"
                                        onclick={() => handleHighlightAttendees(occasion)}
                                        title={text("highlightInRosterTip", "在联系人名册中筛选并高亮这些参与者")}
                                    >
                                        <Sparkles size={12} class="lvct-icon-inline" /> {text("highlightInRoster", "名册下钻")}
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- 底部栏 -->
    <div class="occ-footer">
        <span class="ft__smaller ft__on-surface-light">
            {text("occFooterHint", "记录共同活动将自动在关系图谱中强化人物之间的共同经历与潜在连接。")}
        </span>
        <button type="button" class="b3-button b3-button--cancel" onclick={onClose}>
            {text("close", "关闭")}
        </button>
    </div>
</div>

<style>
    .lvct-occasions-hub {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 80vh;
    }

    .occ-metrics-bar {
        display: flex;
        gap: 12px;
    }

    @media (max-width: 640px) {
        .occ-metrics-bar {
            flex-wrap: wrap;
        }
        .metric-card {
            min-width: calc(50% - 6px);
        }
    }

    .metric-card {
        flex: 1;
        padding: var(--lvct-sp-2, 8px) var(--lvct-sp-3, 12px);
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: var(--lv-r-sm, 8px);
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .metric-title {
        font-size: var(--lvct-fs-micro, 12px);
        color: var(--b3-theme-on-surface-light);
    }

    .metric-number {
        font-size: 18px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }

    .occ-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
    }

    .search-input-box {
        position: relative;
        flex: 1;
        min-width: 220px;
    }

    .search-input-box input {
        padding-left: 28px;
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

    .btn-new-occasion {
        white-space: nowrap;
        font-size: 12px;
        padding: 4px 10px;
    }

    .occ-content-list {
        overflow-y: auto;
        padding-right: 4px;
        min-height: 240px;
        max-height: 58vh;
    }

    .occ-cards-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .occ-card {
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 8px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border-color 0.15s ease;
    }

    .occ-card:hover {
        border-color: var(--b3-theme-primary-light);
    }

    .occ-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .occ-card-meta-line {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .occ-date-badge {
        font-size: 12px;
        color: var(--b3-theme-primary);
        background: var(--b3-theme-primary-lightest, var(--b3-theme-primary-light, rgba(66, 133, 244, 0.12)));
        padding: 2px 8px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .occ-type-tag, .occ-place-tag {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }

    .btn-del-occ {
        padding: 2px;
        color: var(--b3-theme-on-surface-light);
        opacity: 0.6;
        transition: opacity 0.15s ease;
    }

    .btn-del-occ:hover {
        opacity: 1;
        color: var(--lvct-danger, #ef4444);
    }

    .occ-card-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .occ-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
        word-break: break-word;
        overflow-wrap: break-word;
    }

    .occ-note {
        margin: 0;
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        font-style: italic;
        line-height: 1.5;
    }

    .occ-attendees-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding-top: 6px;
        border-top: 1px dashed var(--b3-border-color);
    }

    .occ-attendees-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        flex: 1;
    }

    .attendee-chips {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .attendee-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        padding: 2px 6px;
        border-radius: 999px;
        cursor: pointer;
        transition: border-color 0.15s ease;
    }

    .attendee-chip:hover {
        border-color: var(--b3-theme-primary);
    }

    .attendee-avatar {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--b3-theme-surface-lighter);
        color: var(--b3-theme-on-surface);
        font-size: 10px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .attendee-name {
        font-size: 11px;
        color: var(--b3-theme-on-surface);
    }

    .role-badge {
        font-size: 9px;
        color: var(--lv-brand, #ea580c);
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.1));
        padding: 0 4px;
        border-radius: 2px;
    }

    .occ-card-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .occ-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 8px;
        border-top: 1px solid var(--b3-border-color);
        margin-top: 4px;
    }
</style>
