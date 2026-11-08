<script lang="ts">
    import {
        newPromiseId,
        type PersonPromiseItem,
        type PromiseDirection,
        type PromiseStatus,
    } from "../../domain/promises.ts";
    import { translateText } from "../../domain/translation";
    import { toLocalDateKey } from "../../domain/date-key.ts";
    import {
        Handshake,
        Plus,
        CircleCheck,
        Calendar,
        Trash2,
        RotateCcw,
    } from "@lucide/svelte";

    let {
        personDocId,
        personName: _personName = "",
        items = [],
        onAddPromise,
        onUpdatePromise,
        onRemovePromise,
        onConvertPromiseToInteraction,
        i18n,
    }: {
        personDocId: string;
        personName?: string;
        items: PersonPromiseItem[];
        onAddPromise: (item: PersonPromiseItem) => Promise<unknown>;
        onUpdatePromise: (promiseId: string, patch: Partial<PersonPromiseItem>) => Promise<unknown>;
        onRemovePromise: (promiseId: string) => Promise<unknown>;
        onConvertPromiseToInteraction?: (promise: PersonPromiseItem) => void | Promise<void>;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let directionFilter: "all" | PromiseDirection = $state("all");
    let statusFilter: "all" | PromiseStatus = $state("all");

    let adding = $state(false);
    let newDirection: PromiseDirection = $state("i_promised");
    let newTitle = $state("");
    let newDetail = $state("");
    let newPromisedOn = $state(toLocalDateKey(new Date()));
    let newDueOn = $state("");
    let saving = $state(false);
    let busyActionId = $state<string | null>(null);
    let errorText = $state("");

    const todayStr = toLocalDateKey(new Date());

    const filteredItems = $derived(
        items.filter((item) => {
            if (directionFilter !== "all" && item.direction !== directionFilter) return false;
            if (statusFilter !== "all" && item.status !== statusFilter) return false;
            return true;
        })
    );

    const stats = $derived.by(() => {
        let iPromisedCount = 0;
        let iPromisedPending = 0;
        let theyPromisedCount = 0;
        let theyPromisedPending = 0;
        let fulfilledTotal = 0;

        for (const item of items) {
            if (item.direction === "i_promised") {
                iPromisedCount++;
                if (item.status === "pending") iPromisedPending++;
            } else {
                theyPromisedCount++;
                if (item.status === "pending") theyPromisedPending++;
            }
            if (item.status === "fulfilled") fulfilledTotal++;
        }

        const fulfillmentRate = items.length > 0 ? Math.round((fulfilledTotal / items.length) * 100) : 0;

        return {
            iPromisedCount,
            iPromisedPending,
            theyPromisedCount,
            theyPromisedPending,
            fulfilledTotal,
            fulfillmentRate,
        };
    });

    async function handleAdd() {
        if (saving || Boolean(busyActionId)) return;
        const titleTrimmed = newTitle.trim();
        if (!titleTrimmed) {
            errorText = text("promisesTitleRequired", "承诺事项标题不能为空");
            return;
        }

        saving = true;
        errorText = "";
        try {
            const item: PersonPromiseItem = {
                id: newPromiseId(),
                personDocId,
                direction: newDirection,
                title: titleTrimmed,
                ...(newDetail.trim() ? { detail: newDetail.trim() } : {}),
                promisedOn: newPromisedOn || todayStr,
                ...(newDueOn.trim() ? { dueOn: newDueOn.trim() } : {}),
                status: "pending",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await onAddPromise(item);
            newTitle = "";
            newDetail = "";
            newDueOn = "";
            adding = false;
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            saving = false;
        }
    }

    async function handleMarkFulfilled(item: PersonPromiseItem) {
        if (saving || Boolean(busyActionId)) return;
        busyActionId = item.id;
        errorText = "";
        try {
            await onUpdatePromise(item.id, {
                status: "fulfilled",
                fulfilledOn: todayStr,
            });
            if (onConvertPromiseToInteraction) {
                await onConvertPromiseToInteraction(item);
            }
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            busyActionId = null;
        }
    }

    async function handleMarkBroken(item: PersonPromiseItem) {
        if (saving || Boolean(busyActionId)) return;
        busyActionId = item.id;
        errorText = "";
        try {
            await onUpdatePromise(item.id, {
                status: "broken",
            });
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            busyActionId = null;
        }
    }

    async function handleReopen(item: PersonPromiseItem) {
        if (saving || Boolean(busyActionId)) return;
        busyActionId = item.id;
        errorText = "";
        try {
            await onUpdatePromise(item.id, {
                status: "pending",
                fulfilledOn: undefined,
            });
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            busyActionId = null;
        }
    }

    async function handleRemove(promiseId: string) {
        if (saving || Boolean(busyActionId)) return;
        busyActionId = promiseId;
        errorText = "";
        try {
            await onRemovePromise(promiseId);
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            busyActionId = null;
        }
    }
</script>

<div class="lvct-promises-ledger b3-card">
    <div class="lvct-promises-ledger__header">
        <div class="fn__flex" style="align-items: center; gap: 8px;">
            <Handshake size={18} strokeWidth={1.6} class="ft__primary" />
            <span class="ft__on-surface font-weight-bold" style="font-size: 14px;">
                {text("promisesTitle", "双向承诺与信诺履约本")}
            </span>
            <span class="b3-chip b3-chip--info ft__smaller">
                {items.length}
            </span>
        </div>
        {#if !adding}
            <button
                class="b3-button b3-button--text b3-button--small"
                onclick={() => { adding = true; errorText = ""; }}
            >
                <Plus size={14} strokeWidth={1.6} style="margin-right: 4px;" />
                {text("promisesAddBtn", "记录新信诺")}
            </button>
        {/if}
    </div>

    <!-- 概览指标行 -->
    <div class="lvct-promises-ledger__metrics">
        <div class="metric-card">
            <span class="metric-label">{text("promisesIPromised", "我承诺对方")}</span>
            <span class="metric-value">
                {stats.iPromisedCount}
                <span class="metric-sub">({stats.iPromisedPending} {text("promisesPendingSub", "待履约")})</span>
            </span>
        </div>
        <div class="metric-card">
            <span class="metric-label">{text("promisesTheyPromised", "对方承诺我")}</span>
            <span class="metric-value">
                {stats.theyPromisedCount}
                <span class="metric-sub">({stats.theyPromisedPending} {text("promisesPendingSub", "待履约")})</span>
            </span>
        </div>
        <div class="metric-card">
            <span class="metric-label">{text("promisesRate", "履约兑现率")}</span>
            <span class="metric-value ft__primary">{stats.fulfillmentRate}%</span>
        </div>
    </div>

    <!-- 筛选控制栏 -->
    <div class="lvct-promises-ledger__filters">
        <div class="filter-group">
            <button
                class="filter-pill {directionFilter === 'all' ? 'is-active' : ''}"
                onclick={() => directionFilter = 'all'}
            >
                {text("promisesFilterAllDir", "全部方向")}
            </button>
            <button
                class="filter-pill {directionFilter === 'i_promised' ? 'is-active' : ''}"
                onclick={() => directionFilter = 'i_promised'}
            >
                {text("promisesFilterIPromised", "我承诺对方")}
            </button>
            <button
                class="filter-pill {directionFilter === 'they_promised' ? 'is-active' : ''}"
                onclick={() => directionFilter = 'they_promised'}
            >
                {text("promisesFilterTheyPromised", "对方承诺我")}
            </button>
        </div>
        <div class="filter-group">
            <button
                class="filter-pill {statusFilter === 'all' ? 'is-active' : ''}"
                onclick={() => statusFilter = 'all'}
            >
                {text("promisesFilterAllStatus", "全部状态")}
            </button>
            <button
                class="filter-pill {statusFilter === 'pending' ? 'is-active' : ''}"
                onclick={() => statusFilter = 'pending'}
            >
                {text("promisesFilterPending", "待兑现")}
            </button>
            <button
                class="filter-pill {statusFilter === 'fulfilled' ? 'is-active' : ''}"
                onclick={() => statusFilter = 'fulfilled'}
            >
                {text("promisesFilterFulfilled", "已兑现")}
            </button>
        </div>
    </div>

    <!-- 添加表单 -->
    {#if adding}
        <div class="lvct-promises-form">
            <div class="form-row">
                <span class="form-label">{text("promisesFormDirection", "承诺方向")}:</span>
                <div class="direction-select-group">
                    <label class="direction-radio">
                        <input type="radio" bind:group={newDirection} value="i_promised" />
                        <span>{text("promisesIPromised", "我承诺对方")}</span>
                    </label>
                    <label class="direction-radio">
                        <input type="radio" bind:group={newDirection} value="they_promised" />
                        <span>{text("promisesTheyPromised", "对方承诺我")}</span>
                    </label>
                </div>
            </div>

            <div class="form-row">
                <span class="form-label">{text("promisesFormTitle", "事项标题")}:</span>
                <input
                    class="b3-text-field fn__flex-1"
                    type="text"
                    bind:value={newTitle}
                    placeholder={newDirection === "i_promised" ? "例如：下周引荐人工智能领域专家朋友" : "例如：答应下周寄送签名新书"}
                />
            </div>

            <div class="form-row">
                <span class="form-label">{text("promisesFormDates", "约定日期")}:</span>
                <div class="fn__flex fn__flex-1" style="gap: 8px;">
                    <div class="date-field">
                        <span class="sub-label">{text("promisesPromisedOn", "许诺日")}:</span>
                        <input class="b3-text-field" type="date" bind:value={newPromisedOn} />
                    </div>
                    <div class="date-field">
                        <span class="sub-label">{text("promisesDueOn", "目标兑现日")}:</span>
                        <input class="b3-text-field" type="date" bind:value={newDueOn} />
                    </div>
                </div>
            </div>

            <div class="form-row">
                <span class="form-label">{text("promisesFormDetail", "备注细节")}:</span>
                <textarea
                    class="b3-text-field fn__flex-1"
                    rows="2"
                    bind:value={newDetail}
                    placeholder={text("promisesDetailPlaceholder", "约定背景、具体要求或联系细节...")}
                ></textarea>
            </div>

            {#if errorText}
                <div class="b3-label b3-label--error ft__smaller" style="margin-bottom: 8px;">
                    {errorText}
                </div>
            {/if}

            <div class="form-actions">
                <button
                    class="b3-button b3-button--cancel b3-button--small"
                    onclick={() => { adding = false; errorText = ""; }}
                    disabled={saving}
                >
                    {text("common.cancel", "取消")}
                </button>
                <button
                    class="b3-button b3-button--small"
                    onclick={handleAdd}
                    disabled={saving}
                >
                    {saving ? text("common.saving", "保存中...") : text("common.save", "保存信诺")}
                </button>
            </div>
        </div>
    {/if}

    <!-- 承诺清单 -->
    <div class="lvct-promises-list">
        {#if filteredItems.length === 0}
            <div class="empty-state ft__smaller ft__on-surface-variant">
                {items.length === 0
                    ? text("promisesEmptyPrompt", "暂无与该联系人的互信与承诺记录，点击右上角记录一份约定。")
                    : text("promisesFilteredEmpty", "没有匹配当前筛选条件的承诺条目。")}
            </div>
        {:else}
            {#each filteredItems as item (item.id)}
                {@const isOverdue = item.status === "pending" && item.dueOn && item.dueOn < todayStr}
                <div class="promise-item-card {item.status}">
                    <div class="item-head">
                        <div class="item-tags">
                            <span class="direction-tag {item.direction}">
                                {item.direction === "i_promised"
                                    ? text("promisesTagIPromised", "我承")
                                    : text("promisesTagTheyPromised", "彼承")}
                            </span>
                            <span class="title-text">{item.title}</span>
                        </div>
                        <div class="item-status-tag {item.status} {isOverdue ? 'overdue' : ''}">
                            {#if item.status === "pending"}
                                {isOverdue ? text("promisesStatusOverdue", "已逾期") : text("promisesStatusPending", "待履约")}
                            {:else if item.status === "fulfilled"}
                                {text("promisesStatusFulfilled", "已兑现")}
                            {:else}
                                {text("promisesStatusBroken", "已失效")}
                            {/if}
                        </div>
                    </div>

                    {#if item.detail}
                        <div class="item-detail">{item.detail}</div>
                    {/if}

                    <div class="item-foot">
                        <div class="item-dates">
                            <span class="date-chunk" title={text("promisesPromisedOn", "许诺日")}>
                                <Calendar size={12} strokeWidth={1.6} style="margin-right: 2px;" />
                                {item.promisedOn}
                            </span>
                            {#if item.dueOn}
                                <span class="date-chunk {isOverdue ? 'ft__error font-weight-bold' : ''}" title={text("promisesDueOn", "目标兑现日")}>
                                    → {item.dueOn}
                                </span>
                            {/if}
                            {#if item.fulfilledOn}
                                <span class="date-chunk ft__success" title={text("promisesFulfilledOn", "实际兑现日")}>
                                    ✓ {item.fulfilledOn}
                                </span>
                            {/if}
                        </div>

                        <div class="item-actions">
                            {#if item.status === "pending"}
                                <button
                                    class="b3-button b3-button--text b3-button--small ft__success action-btn"
                                    disabled={Boolean(busyActionId) || saving}
                                    onclick={() => handleMarkFulfilled(item)}
                                    title={text("promisesMarkFulfilledTip", "兑现履约")}
                                >
                                    <CircleCheck size={14} strokeWidth={1.6} style="margin-right: 2px;" />
                                    {busyActionId === item.id ? "…" : text("promisesMarkFulfilled", "兑现")}
                                </button>
                                <button
                                    class="b3-button b3-button--text b3-button--small ft__secondary action-btn"
                                    disabled={Boolean(busyActionId) || saving}
                                    onclick={() => handleMarkBroken(item)}
                                    title={text("promisesMarkBrokenTip", "取消/落空")}
                                >
                                    {text("promisesMarkBroken", "失效")}
                                </button>
                            {:else}
                                <button
                                    class="b3-button b3-button--text b3-button--small ft__secondary action-btn"
                                    disabled={Boolean(busyActionId) || saving}
                                    onclick={() => handleReopen(item)}
                                    title={text("promisesReopenTip", "重开履约")}
                                >
                                    <RotateCcw size={12} strokeWidth={1.6} style="margin-right: 2px;" />
                                    {busyActionId === item.id ? "…" : text("promisesReopen", "重开")}
                                </button>
                            {/if}
                            <button
                                class="b3-button b3-button--text b3-button--small ft__error action-btn"
                                disabled={Boolean(busyActionId) || saving}
                                onclick={() => handleRemove(item.id)}
                                title={text("common.delete", "删除")}
                            >
                                <Trash2 size={12} strokeWidth={1.6} />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .lvct-promises-ledger {
        margin: 14px 0;
        padding: 14px 16px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: var(--lvct-shadow-1);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .lvct-promises-ledger__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .lvct-promises-ledger__metrics {
        display: flex;
        align-items: stretch;
        padding: 10px 14px;
        background: var(--lvct-bg-app);
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 14px);
        gap: 0;
    }

    .metric-card {
        flex: 1;
        padding: 4px 12px;
        background: transparent;
        border: none;
        border-radius: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        position: relative;

        &:not(:last-child)::after {
            content: "";
            position: absolute;
            right: 0;
            top: 15%;
            height: 70%;
            width: 1px;
            background: color-mix(in srgb, var(--lvct-color-border-200) 80%, transparent);
        }
    }

    .metric-label {
        font-size: 11px;
        color: var(--lvct-text-3);
        font-weight: 500;
    }

    .metric-value {
        font-size: 16px;
        font-weight: 700;
        color: var(--lvct-text-1);
        font-variant-numeric: tabular-nums;
        display: flex;
        align-items: baseline;
        gap: 4px;
    }

    .metric-sub {
        font-size: 11px;
        font-weight: normal;
        color: var(--b3-theme-on-surface-light);
    }

    .lvct-promises-ledger__filters {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
    }

    .filter-group {
        display: flex;
        gap: 4px;
    }

    .filter-pill {
        border: 1px solid var(--lvct-border-subtle);
        background: transparent;
        color: var(--lvct-text-2);
        font-size: 11px;
        padding: 3px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        transition: all var(--lvct-dur-fast) var(--lvct-ease);
    }

    .filter-pill.is-active {
        background: var(--lv-brand-soft);
        border-color: var(--lv-brand);
        color: var(--lv-brand);
        font-weight: 600;
    }

    .lvct-promises-form {
        padding: 10px 14px;
        background: var(--lvct-bg-app);
        border: 1px dashed color-mix(in srgb, var(--lv-brand) 36%, transparent);
        border-radius: var(--lvct-r-md, 12px);
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .form-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .form-label {
        width: 70px;
        font-size: 12px;
        color: var(--b3-theme-on-surface-light);
        flex-shrink: 0;
    }

    .direction-select-group {
        display: flex;
        gap: 16px;
    }

    .direction-radio {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        cursor: pointer;
    }

    .date-field {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
    }

    .sub-label {
        color: var(--b3-theme-on-surface-light);
        flex-shrink: 0;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;

        button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }

    .action-btn {
        border-radius: var(--lv-r-pill, 9999px) !important;
    }

    .lvct-promises-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .empty-state {
        text-align: center;
        padding: 16px 0;
    }

    .promise-item-card {
        padding: 10px 14px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-md, 12px);
        box-shadow: var(--lvct-shadow-1);
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: var(--lvct-shadow-2);
        }
    }

    .promise-item-card.fulfilled {
        opacity: 0.9;
        border-left: 3px solid var(--lvct-success, #16a34a);
    }

    .promise-item-card.pending {
        border-left: 3px solid var(--lv-brand, #ea580c);
    }

    .promise-item-card.broken {
        opacity: 0.6;
        border-left: 3px solid var(--b3-theme-on-surface-light);
    }

    .item-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .item-tags {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    .direction-tag {
        font-size: 10px;
        font-weight: 600;
        padding: 1px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        flex-shrink: 0;
    }

    .direction-tag.i_promised {
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #ea580c);
    }

    .direction-tag.they_promised {
        background: var(--lvct-info-soft, rgba(2, 132, 199, 0.12));
        color: var(--lvct-info, #0284c7);
    }

    .title-text {
        font-size: 13px;
        font-weight: 500;
        color: var(--b3-theme-on-surface);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .item-status-tag {
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        background: transparent;
        border: 1px solid var(--lvct-color-border-200);
        flex-shrink: 0;

        &::before {
            content: "";
            display: inline-block;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: currentColor;
            forced-color-adjust: none;
        }

        &.pending {
            color: var(--lv-brand, #ea580c);
            border-color: color-mix(in srgb, var(--lv-brand) 30%, transparent);
        }

        &.pending.overdue {
            color: var(--lvct-danger, #eb4d4b);
            border-color: color-mix(in srgb, var(--lvct-danger) 32%, transparent);
            font-weight: 600;
        }

        &.fulfilled {
            color: var(--lvct-success);
            border-color: color-mix(in srgb, var(--lvct-success) 30%, transparent);
        }

        &.broken {
            color: var(--lvct-text-3);
            border-color: var(--lvct-border-subtle);
        }
    }

    .item-detail {
        font-size: 12px;
        color: var(--lvct-text-3);
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
    }

    .item-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 2px;
    }

    .item-dates {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
    }

    .date-chunk {
        display: flex;
        align-items: center;
    }

    .item-actions {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .action-btn {
        padding: 2px 6px;
        height: auto;
        font-size: 11px;
        display: flex;
        align-items: center;
    }
</style>
