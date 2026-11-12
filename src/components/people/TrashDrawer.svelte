<script lang="ts">
    import type { TrashContactEntry } from "../../domain/trash.ts";
    import { daysUntilTrashExpiration, filterTrashEntries } from "../../domain/trash.ts";
    import { translateText } from "../../domain/translation.ts";
    import { resolveAvatarUrl } from "../../shared/avatar-processor.ts";
    import ViewState from "../ViewState.svelte";
    import { confirmDialog } from "../../libs/confirm-dialog.ts";
    import { onDestroy } from "svelte";
    import { swipeDismiss } from "../../shared/swipe-dismiss.ts";
    import {
        Search,
        RotateCcw,
        Trash2,
        Clock,
        Phone,
    } from "@lucide/svelte";

    let {
        onListTrash,
        onRestoreContact,
        onEmptyTrash,
        onClose,
        onRestored,
        i18n,
    }: {
        onListTrash?: () => Promise<TrashContactEntry[]>;
        onRestoreContact?: (entryId: string) => Promise<{ docId: string; itemId: string; name: string }>;
        onEmptyTrash?: () => Promise<void>;
        onClose: () => void;
        onRestored?: () => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let alive = true;
    let loading = $state(true);
    let entries = $state<TrashContactEntry[]>([]);
    let searchQuery = $state("");
    let restoringId = $state<string | null>(null);
    let emptying = $state(false);
    let errorText = $state("");

    async function loadData() {
        if (!onListTrash) {
            loading = false;
            return;
        }
        loading = true;
        try {
            const list = await onListTrash();
            if (alive) entries = list || [];
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

    const filteredEntries = $derived(filterTrashEntries(entries, searchQuery));

    async function handleRestore(entry: TrashContactEntry) {
        if (!onRestoreContact || restoringId || emptying) return;
        restoringId = entry.id;
        errorText = "";
        try {
            await onRestoreContact(entry.id);
            entries = entries.filter((e) => e.id !== entry.id);
            if (onRestored) onRestored();
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            restoringId = null;
        }
    }

    async function handleEmpty() {
        if (!onEmptyTrash || emptying || Boolean(restoringId) || entries.length === 0) return;
        const confirmed = await confirmDialog({
            title: text("confirmEmptyTrashTitle", "清空回收站"),
            message: text("confirmEmptyTrashDesc", "确认清空回收站吗？回收站中所有联系人将被永久清除，此操作不可撤销。"),
        });
        if (!confirmed) return;

        emptying = true;
        errorText = "";
        try {
            await onEmptyTrash();
            entries = [];
            if (onRestored) onRestored();
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            emptying = false;
        }
    }

    function formatRemovedDate(timestamp: number): string {
        const d = new Date(timestamp);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
</script>

<div class="lvct-trash-drawer" use:swipeDismiss={{ onDismiss: onClose, threshold: 90 }}>
    <!-- 顶部状态栏 -->
    <div class="trash-header-bar">
        <div class="header-info">
            <span class="header-icon" aria-hidden="true">🗑️</span>
            <div class="header-text">
                <span class="header-sub ft__smaller ft__on-surface">
                    {text("trashHeaderDesc", "被删除的联系人在回收站安全缓冲 30 天，可随时一键恢复到数据库与名册中；超期自动永久清理。")}
                </span>
            </div>
        </div>

        <div class="header-actions">
            {#if entries.length > 0}
                <button
                    type="button"
                    class="b3-button b3-button--cancel btn-empty-trash"
                    onclick={handleEmpty}
                    disabled={emptying || Boolean(restoringId)}
                    title={text("emptyTrashBtnTip", "永久清空回收站内所有联系人")}
                >
                    <Trash2 size={13} class="lvct-icon-inline" />
                    {emptying ? text("emptyingTrash", "清空中…") : text("emptyTrashBtn", "清空回收站")}
                </button>
            {/if}
        </div>
    </div>

    <!-- 搜索与指标 -->
    <div class="trash-toolbar">
        <div class="search-input-box">
            <span class="search-icon"><Search size={14} /></span>
            <input
                class="b3-text-field fn__block"
                type="search"
                bind:value={searchQuery}
                placeholder={text("trashSearchPlaceholder", "搜索已删除联系人姓名、电话或分组…")}
            />
        </div>
        <span class="ft__smaller ft__on-surface-light trash-count-badge">
            {text("trashCountBadge", "回收站中：{n} 位联系人", { n: entries.length })}
        </span>
    </div>

    {#if errorText}
        <div class="b3-snackbar--error" style="padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 8px;">
            {errorText}
        </div>
    {/if}

    <!-- 列表区 -->
    <div class="trash-content-list">
        {#if loading}
            <ViewState compact loading title={text("trashLoading", "正在读取回收站列表…")} />
        {:else if filteredEntries.length === 0}
            <ViewState
                compact
                icon="check"
                title={searchQuery
                    ? text("trashNoMatch", "未找到符合搜索条件的已删除联系人。")
                    : text("trashEmptyAll", "🎉 回收站空空如也，所有联系人均在名册中安全运行。")}
                description={searchQuery ? undefined : text("trashEmptyDesc", "在名册或人物详情页删除联系人后，会在此处保留 30 天，误删随时可一键撤回。")}
            />
        {:else}
            <div class="trash-items-grid">
                {#each filteredEntries as entry (entry.id)}
                    {@const daysRemaining = daysUntilTrashExpiration(entry)}
                    <div class="trash-item-card">
                        <div class="trash-item-left">
                            <span class="trash-avatar">
                                {#if entry.snapshot.avatar}
                                    <img class="trash-avatar-img" src={resolveAvatarUrl(entry.snapshot.avatar)} alt={entry.name} />
                                {:else}
                                    {entry.name.slice(0, 1)}
                                {/if}
                            </span>
                            <div class="trash-item-main">
                                <div class="trash-item-title-row">
                                    <strong class="trash-item-name">{entry.name}</strong>
                                    {#if entry.snapshot.group}
                                        <span class="lvct-chip lvct-chip--group font-size-11">{entry.snapshot.group}</span>
                                    {/if}
                                    <span class="trash-days-pill {daysRemaining <= 3 ? 'is-urgent' : ''}">
                                        <Clock size={11} class="lvct-icon-inline" /> {text("trashDaysRemaining", "剩余 {n} 天", { n: daysRemaining })}
                                    </span>
                                </div>
                                <div class="trash-item-meta ft__smaller ft__on-surface-light">
                                    {#if entry.snapshot.phone}
                                        <span class="trash-meta-item">
                                            <Phone size={11} class="lvct-icon-inline" /> {entry.snapshot.phone}
                                        </span>
                                    {/if}
                                    <span class="trash-meta-item">
                                        {text("trashRemovedAt", "删除时间：{date}", { date: formatRemovedDate(entry.removedAt) })}
                                    </span>
                                </div>
                                {#if entry.snapshot.tags && entry.snapshot.tags.length > 0}
                                    <div class="trash-item-tags">
                                        {#each entry.snapshot.tags as tag}
                                            <span class="lvct-chip lvct-chip--tag font-size-11">#{tag}</span>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="trash-item-actions">
                            <button
                                type="button"
                                class="b3-button b3-button--outline b3-button--small btn-restore-contact"
                                onclick={() => void handleRestore(entry)}
                                disabled={Boolean(restoringId) || emptying}
                                title={text("restoreContactTip", "一键将联系人及历史数据完整恢复至数据库与名册")}
                            >
                                <RotateCcw size={12} class="lvct-icon-inline" />
                                {restoringId === entry.id ? text("restoringContact", "恢复中…") : text("restoreContactBtn", "恢复联系人")}
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- 底部操作栏 -->
    <div class="trash-footer">
        <span class="ft__smaller ft__on-surface-light">
            {text("trashFooterHint", "软删除缓冲期结束后，系统将自动彻底清理超期联系人数据。")}
        </span>
        <button type="button" class="b3-button b3-button--cancel" onclick={onClose}>
            {text("close", "关闭")}
        </button>
    </div>
</div>

<style>
    .lvct-trash-drawer {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 80vh;
    }

    .trash-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
    }

    .header-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .header-icon {
        font-size: 20px;
    }

    .header-text {
        display: flex;
        flex-direction: column;
    }

    .trash-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .search-input-box {
        position: relative;
        flex: 1;
        max-width: 320px;
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

    .trash-content-list {
        overflow-y: auto;
        padding-right: 4px;
        min-height: 220px;
        max-height: 54vh;
    }

    .trash-items-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .trash-item-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: 0 2px 8px rgba(28, 24, 21, 0.04);
        gap: 12px;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease), border-color var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(28, 24, 21, 0.08);
            border-color: color-mix(in srgb, var(--lv-brand) 30%, var(--lvct-border-subtle));
        }
    }

    .trash-item-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
    }

    .trash-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--b3-theme-surface-lighter);
        color: var(--b3-theme-on-surface);
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
    }

    .trash-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
    }

    .trash-item-main {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .trash-item-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .trash-item-name {
        font-size: 14px;
        color: var(--b3-theme-on-surface);
    }

    .trash-days-pill {
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 999px;
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.1));
        color: var(--lv-brand, #ea580c);
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }

    .trash-days-pill.is-urgent {
        background: var(--lvct-danger-soft, rgba(239, 68, 68, 0.12));
        color: var(--lvct-danger, #ef4444);
        font-weight: 600;
    }

    .trash-item-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
    }

    .trash-meta-item {
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }

    .trash-item-tags {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
    }

    .trash-item-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    .btn-restore-contact {
        white-space: nowrap;
    }

    .trash-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 8px;
        border-top: 1px solid var(--b3-border-color);
        margin-top: 4px;
    }
</style>
