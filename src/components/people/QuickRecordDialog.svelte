<script lang="ts">
    /**
     * 文档档案条快捷记互动弹窗：无需跳转人脉主界面，在人物文档直接记录交往事实。
     */
    import type { Plugin } from "siyuan";
    import type { ContactSummary } from "../../domain/person";
    import {
        INTERACTION_TYPES,
        INTERACTION_TYPE_LABELS,
        toLocalDateKey,
        type InteractionType,
    } from "../../domain/interactions";
    import { recordInteraction } from "../../data/interactions";
    import { syncInteractionDocSection } from "../../services/doc-section";
    import { translateText } from "../../domain/translation";
    import { requestErrorMessage } from "../../shared/error-presenter";
    import { onMount } from "svelte";

    let {
        plugin,
        person,
        i18n,
        onSaved,
        onClose,
    }: {
        plugin: Plugin;
        person: ContactSummary;
        i18n?: Readonly<Record<string, string>>;
        onSaved?: () => void;
        onClose: () => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string) => translateText(i18n, key, fallback));

    let type = $state<InteractionType>("meeting");
    let date = $state(toLocalDateKey(new Date()));
    let note = $state("");
    let busy = $state(false);
    let errorMessage = $state("");
    let textareaEl: HTMLTextAreaElement | undefined = $state();

    onMount(() => {
        textareaEl?.focus();
    });

    async function handleSave() {
        if (busy) return;
        busy = true;
        errorMessage = "";
        try {
            const targetDate = date || toLocalDateKey();
            const occurredAt = new Date(`${targetDate}T12:00:00`).getTime();
            await recordInteraction(plugin, {
                personDocId: person.docId,
                note: note.trim() || undefined,
                type,
                occurredAt,
                source: "manual",
            });
            void syncInteractionDocSection(plugin, person.docId).catch(() => {});
            onSaved?.();
            onClose();
        } catch (err) {
            errorMessage = requestErrorMessage(err);
        } finally {
            busy = false;
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            void handleSave();
        } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="b3-dialog__content lvct-quick-record-dialog" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
    {#if errorMessage}
        <div class="b3-snackbar__content b3-snackbar--error" role="alert" style="margin: 0;">
            {errorMessage}
        </div>
    {/if}

    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <label class="lvct-form__item" style="margin: 0;">
            <span class="ft__smaller ft__on-surface" style="margin-bottom: 4px; display: block;">{text("dialogDate", "互动日期")}</span>
            <input
                class="b3-text-field"
                type="date"
                style="width: 140px;"
                bind:value={date}
                disabled={busy}
            />
        </label>
        <div class="lvct-form__item fn__flex-1" style="margin: 0;">
            <span class="ft__smaller ft__on-surface" style="margin-bottom: 4px; display: block;">{text("dialogType", "互动类型")}</span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                {#each INTERACTION_TYPES as itype}
                    <button
                        type="button"
                        class="b3-chip font-size-11"
                        class:b3-chip--primary={type === itype}
                        disabled={busy}
                        onclick={() => (type = itype)}
                    >
                        {INTERACTION_TYPE_LABELS[itype].icon} {INTERACTION_TYPE_LABELS[itype].label}
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <div class="lvct-form__item" style="margin: 0;">
        <span class="ft__smaller ft__on-surface" style="margin-bottom: 4px; display: block;">{text("dialogNote", "互动详情与备注")}</span>
        <textarea
            bind:this={textareaEl}
            class="b3-text-field fn__block"
            rows="4"
            placeholder={text("dialogNotePlaceholder", "记录这次交流的核心事实、沟通要点或约定事项…")}
            bind:value={note}
            disabled={busy}
        ></textarea>
        <span class="ft__smaller ft__on-surface" style="margin-top: 4px; display: block; opacity: 0.7;">支持按 Ctrl+Enter 快捷保存，Esc 快速关闭</span>
    </div>

    <div class="fn__flex" style="justify-content: flex-end; gap: 8px; margin-top: 4px;">
        <button
            type="button"
            class="b3-button b3-button--cancel"
            disabled={busy}
            onclick={onClose}
        >{text("commonCancel", "取消")}</button>
        <button
            type="button"
            class="b3-button b3-button--text"
            disabled={busy}
            onclick={handleSave}
        >{busy ? text("commonSaving", "保存中…") : text("commonSave", "保存互动")}</button>
    </div>
</div>
