<script lang="ts">
    import {
        LIFECYCLE_STAGES,
        type RelationshipStageKey,
    } from "../../domain/lifecycle-stage.ts";
    import { translateText } from "../../domain/translation";

    let {
        selectedPeopleCount,
        onConfirm,
        onClose,
        i18n,
    }: {
        selectedPeopleCount: number;
        onConfirm: (stage: RelationshipStageKey, note?: string) => Promise<void>;
        onClose: () => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let selectedStage: RelationshipStageKey = $state("connection");
    let transitionNote = $state("");
    let busy = $state(false);
    let errorText = $state("");

    async function handleConfirm() {
        if (busy) return;
        busy = true;
        errorText = "";
        try {
            await onConfirm(selectedStage, transitionNote.trim() || undefined);
            onClose();
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            busy = false;
        }
    }
</script>

<div class="lvct-batch-stage-modal" role="dialog" aria-modal="true" aria-label={text("batchStageTitle", "批量设置交往生命周期阶段")}>
    <div class="modal-intro ft__smaller ft__on-surface">
        {text("batchStageIntro", "为已选择的 {n} 位联系人统一调整交往阶段，并在每个人物档案中追加演进历史记录。", { n: selectedPeopleCount })}
    </div>

    {#if errorText}
        <div class="lvct-form__error" role="alert">{errorText}</div>
    {/if}

    <div class="stage-options-list">
        {#each LIFECYCLE_STAGES as stage (stage.key)}
            <label class="stage-option-row {selectedStage === stage.key ? 'is-selected' : ''}">
                <input
                    type="radio"
                    name="batch-lifecycle-stage"
                    value={stage.key}
                    checked={selectedStage === stage.key}
                    onchange={() => selectedStage = stage.key}
                    disabled={busy}
                />
                <span class="stage-icon">{stage.icon}</span>
                <div class="stage-text-wrap">
                    <span class="stage-label">{stage.label}</span>
                    <span class="stage-desc ft__smaller ft__on-surface">{stage.description}</span>
                </div>
            </label>
        {/each}
    </div>

    <div class="note-field-wrap">
        <span class="note-label ft__smaller ft__on-surface">
            {text("batchStageNoteLabel", "阶段变迁说明备忘（可选）：")}
        </span>
        <input
            class="b3-text-field fn__block"
            type="text"
            bind:value={transitionNote}
            placeholder={text("batchStageNotePlaceholder", "如：行业交流会结识后批量升温、联合项目推进等")}
            disabled={busy}
        />
    </div>

    <div class="modal-actions">
        <button
            type="button"
            class="b3-button b3-button--cancel"
            onclick={onClose}
            disabled={busy}
        >
            {text("cancel", "取消")}
        </button>
        <button
            type="button"
            class="b3-button b3-button--text btn-confirm"
            onclick={handleConfirm}
            disabled={busy}
        >
            {busy ? text("saving", "保存中…") : text("confirmBatchStage", "确认调整阶段")}
        </button>
    </div>
</div>

<style>
    .lvct-batch-stage-modal {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 4px;
        min-width: 320px;
        max-width: 480px;
    }

    .stage-options-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .stage-option-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 12px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: var(--lvct-r-card, 12px);
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .stage-option-row:hover {
        background: var(--b3-theme-surface-lighter);
    }

    .stage-option-row.is-selected {
        border-color: var(--b3-theme-primary);
        background: color-mix(in srgb, var(--b3-theme-primary) 8%, var(--b3-theme-surface));
    }

    .stage-icon {
        font-size: 16px;
        line-height: 1.2;
        flex-shrink: 0;
    }

    .stage-text-wrap {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .stage-label {
        font-weight: 600;
        font-size: 13px;
    }

    .stage-desc {
        line-height: 1.3;
    }

    .note-field-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;

        input {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }

    .modal-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
        border-top: 1px solid var(--b3-border-color);
        padding-top: 10px;

        button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }

    .btn-confirm {
        font-weight: 600;
    }
</style>
