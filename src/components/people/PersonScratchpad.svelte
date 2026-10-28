<script lang="ts">
    import {
        newScratchpadId,
        type PersonScratchpadItem,
        type ScratchpadColor,
    } from "../../domain/person-scratchpad.ts";
    import { translateText } from "../../domain/translation";
    import {
        StickyNote,
        Pin,
        Trash2,
        Sparkles,
        Plus,
    } from "@lucide/svelte";

    let {
        personDocId,
        items = [],
        onSave,
        onUpdate,
        onRemove,
        onConvertToInteraction,
        i18n,
    }: {
        personDocId: string;
        items: PersonScratchpadItem[];
        onSave: (item: PersonScratchpadItem) => Promise<unknown>;
        onUpdate: (noteId: string, patch: Partial<PersonScratchpadItem>) => Promise<unknown>;
        onRemove: (noteId: string) => Promise<unknown>;
        onConvertToInteraction?: (content: string) => void | Promise<void>;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let adding = $state(false);
    let newContent = $state("");
    let newColor: ScratchpadColor = $state("warm");
    let newPinned = $state(false);
    let saving = $state(false);
    let errorText = $state("");

    const COLOR_OPTIONS: readonly { key: ScratchpadColor; label: string; bg: string }[] = [
        { key: "warm", label: "暖黄", bg: "#fef3c7" },
        { key: "blue", label: "天蓝", bg: "#e0f2fe" },
        { key: "green", label: "青翠", bg: "#dcfce7" },
        { key: "purple", label: "浅紫", bg: "#f3e8ff" },
        { key: "default", label: "默认", bg: "var(--b3-theme-surface-lighter)" },
    ];

    async function handleAdd() {
        const trimmed = newContent.trim();
        if (!trimmed) {
            errorText = text("scratchpadContentRequired", "便签内容不能为空");
            return;
        }

        saving = true;
        errorText = "";
        try {
            const item: PersonScratchpadItem = {
                id: newScratchpadId(),
                personDocId,
                content: trimmed,
                pinned: newPinned,
                color: newColor,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await onSave(item);
            newContent = "";
            newPinned = false;
            adding = false;
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            saving = false;
        }
    }

    async function handleTogglePin(item: PersonScratchpadItem) {
        try {
            await onUpdate(item.id, { pinned: !item.pinned });
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        }
    }

    async function handleRemove(noteId: string) {
        try {
            await onRemove(noteId);
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        }
    }
</script>

<div class="lvct-scratchpad b3-card">
    <div class="lvct-scratchpad__header">
        <div class="fn__flex" style="align-items: center; gap: 8px;">
            <StickyNote size={18} class="ft__primary" />
            <span class="ft__on-surface font-weight-bold" style="font-size: 14px;">
                {text("scratchpadTitle", "闪念速记便签板")}
            </span>
            <span class="b3-chip b3-chip--info ft__smaller">
                {items.length}
            </span>
        </div>
        {#if !adding}
            <button
                type="button"
                class="b3-button b3-button--text b3-button--small"
                onclick={() => { adding = true; errorText = ""; }}
            >
                <Plus size={14} style="margin-right: 4px;" />
                {text("scratchpadAddBtn", "贴一张便签")}
            </button>
        {/if}
    </div>

    <!-- 添加新便签表单 -->
    {#if adding}
        <div class="scratchpad-new-card">
            <textarea
                class="b3-text-field fn__block"
                rows="3"
                bind:value={newContent}
                placeholder={text("scratchpadPlaceholder", "随手记下灵感、电话留言、临时约定或待求证细节…")}
            ></textarea>

            <div class="new-card-toolbar">
                <div class="color-picker-group">
                    {#each COLOR_OPTIONS as opt (opt.key)}
                        <button
                            type="button"
                            class="color-dot-btn {newColor === opt.key ? 'is-active' : ''}"
                            style="background-color: {opt.bg};"
                            title={opt.label}
                            onclick={() => newColor = opt.key}
                        ></button>
                    {/each}
                </div>

                <label class="pin-checkbox-label">
                    <input type="checkbox" bind:checked={newPinned} />
                    <span>{text("scratchpadPinLabel", "置顶")}</span>
                </label>

                <div class="form-actions">
                    <button
                        type="button"
                        class="b3-button b3-button--cancel b3-button--small"
                        onclick={() => { adding = false; errorText = ""; }}
                        disabled={saving}
                    >
                        {text("commonCancel", "取消")}
                    </button>
                    <button
                        type="button"
                        class="b3-button b3-button--small"
                        onclick={handleAdd}
                        disabled={saving}
                    >
                        {saving ? text("commonSaving", "保存中…") : text("scratchpadSaveBtn", "贴上便签")}
                    </button>
                </div>
            </div>

            {#if errorText}
                <div class="b3-label b3-label--error ft__smaller" style="margin-top: 4px;">
                    {errorText}
                </div>
            {/if}
        </div>
    {/if}

    <!-- 便签网格列表 -->
    <div class="scratchpad-grid">
        {#if items.length === 0 && !adding}
            <div class="empty-memo ft__smaller ft__on-surface-variant">
                {text("scratchpadEmpty", "暂无速记便签。无论是临时电话号码、灵感闪念还是下次沟通草稿，都可以贴在这里。")}
            </div>
        {:else}
            {#each items as item (item.id)}
                <div class="memo-card memo-card--{item.color} {item.pinned ? 'is-pinned' : ''}">
                    <div class="memo-head">
                        <button
                            type="button"
                            class="pin-btn {item.pinned ? 'is-pinned' : ''}"
                            title={item.pinned ? text("scratchpadUnpinTip", "取消置顶") : text("scratchpadPinTip", "置顶便签")}
                            onclick={() => handleTogglePin(item)}
                        >
                            <Pin size={13} />
                        </button>
                        <div class="memo-actions">
                            {#if onConvertToInteraction}
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small action-icon-btn ft__primary"
                                    title={text("scratchpadConvertTip", "将便签内容填入互动草稿")}
                                    onclick={() => onConvertToInteraction?.(item.content)}
                                >
                                    <Sparkles size={13} style="margin-right: 2px;" />
                                    <span>{text("scratchpadConvertBtn", "转互动")}</span>
                                </button>
                            {/if}
                            <button
                                type="button"
                                class="b3-button b3-button--text b3-button--small action-icon-btn ft__error"
                                title={text("commonDelete", "删除")}
                                onclick={() => handleRemove(item.id)}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    </div>
                    <div class="memo-body">
                        {item.content}
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .lvct-scratchpad {
        margin: 14px 0;
        padding: 12px 14px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-theme-surface-lighter);
        border-radius: var(--b3-border-radius-b);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .lvct-scratchpad__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .scratchpad-new-card {
        padding: 10px 12px;
        background: var(--b3-theme-background);
        border: 1px dashed var(--b3-theme-primary);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .new-card-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
    }

    .color-picker-group {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .color-dot-btn {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        transition: transform 0.1s ease;
    }

    .color-dot-btn.is-active {
        border-color: var(--b3-theme-primary);
        transform: scale(1.15);
    }

    .pin-checkbox-label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        cursor: pointer;
    }

    .form-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .scratchpad-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
    }

    .empty-memo {
        grid-column: 1 / -1;
        text-align: center;
        padding: 16px 0;
    }

    .memo-card {
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid var(--b3-border-color);
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
        background: var(--b3-theme-background);
        transition: box-shadow 0.15s ease, transform 0.15s ease;
    }

    .memo-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .memo-card.is-pinned {
        border-top: 3px solid var(--b3-theme-primary);
    }

    .memo-card--warm {
        background: rgba(245, 158, 11, 0.08);
        border-color: rgba(245, 158, 11, 0.25);
    }

    .memo-card--blue {
        background: rgba(2, 132, 199, 0.08);
        border-color: rgba(2, 132, 199, 0.25);
    }

    .memo-card--green {
        background: rgba(16, 185, 129, 0.08);
        border-color: rgba(16, 185, 129, 0.25);
    }

    .memo-card--purple {
        background: rgba(139, 92, 246, 0.08);
        border-color: rgba(139, 92, 246, 0.25);
    }

    .memo-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .pin-btn {
        background: transparent;
        border: none;
        padding: 2px;
        cursor: pointer;
        color: var(--b3-theme-on-surface-light);
        display: flex;
        align-items: center;
        border-radius: 4px;
    }

    .pin-btn.is-pinned {
        color: var(--b3-theme-primary);
    }

    .memo-actions {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .action-icon-btn {
        padding: 1px 4px;
        height: auto;
        font-size: 11px;
        display: flex;
        align-items: center;
    }

    .memo-body {
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
    }
</style>
