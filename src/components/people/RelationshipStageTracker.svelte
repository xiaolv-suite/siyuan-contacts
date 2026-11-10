<script lang="ts">
    import {
        getStageMeta,
        LIFECYCLE_STAGES,
        type PersonLifecycleRecord,
        type RelationshipStageKey,
    } from "../../domain/lifecycle-stage.ts";
    import { translateText } from "../../domain/translation";
    import { toLocalDateKey } from "../../domain/date-key.ts";
    import {
        Milestone,
        ChevronDown,
        ChevronRight,
        Calendar,
        Edit2,
    } from "@lucide/svelte";

    let {
        record,
        onUpdateStage,
        i18n,
    }: {
        record: PersonLifecycleRecord;
        onUpdateStage: (stage: RelationshipStageKey, dateStr?: string, note?: string) => Promise<unknown>;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let editing = $state(false);
    let historyExpanded = $state(false);
    // svelte-ignore state_referenced_locally
    let selectedStage: RelationshipStageKey = $state(record.currentStage || "acquaintance");
    let transitionDate = $state(toLocalDateKey(new Date()));
    let transitionNote = $state("");
    let saving = $state(false);
    let errorText = $state("");

    $effect(() => {
        selectedStage = record.currentStage || "acquaintance";
    });

    const currentMeta = $derived(getStageMeta(record.currentStage));

    async function handleSave() {
        saving = true;
        errorText = "";
        try {
            await onUpdateStage(selectedStage, transitionDate, transitionNote);
            transitionNote = "";
            editing = false;
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            saving = false;
        }
    }
</script>

<div class="lvct-stage-tracker b3-card">
    <div class="lvct-stage-tracker__header">
        <div class="fn__flex" style="align-items: center; gap: 8px;">
            <Milestone size={18} class="ft__primary" />
            <span class="ft__on-surface font-weight-bold" style="font-size: 14px;">
                {text("stageTrackerTitle", "交往生命周期阶段")}
            </span>
            <span class="stage-current-chip">
                {currentMeta.icon} {currentMeta.shortLabel}
            </span>
        </div>
        {#if !editing}
            <button
                type="button"
                class="b3-button b3-button--text b3-button--small"
                onclick={() => { editing = true; errorText = ""; }}
            >
                <Edit2 size={13} style="margin-right: 4px;" />
                {text("stageTrackerChangeBtn", "推进/变更阶段")}
            </button>
        {/if}
    </div>

    <!-- 阶段演进横向步骤条 -->
    <div class="lvct-stage-steps">
        {#each LIFECYCLE_STAGES as stage, idx (stage.key)}
            {@const isCurrent = stage.key === record.currentStage}
            {@const isDormant = stage.key === "dormant"}
            <div
                class="stage-step-pill"
                class:active={isCurrent}
                class:dormant={isDormant}
                title={stage.description}
            >
                <span class="step-num">{idx + 1}</span>
                <span class="step-icon">{stage.icon}</span>
                <span class="step-name">{stage.shortLabel}</span>
                {#if isCurrent}
                    <span class="current-dot"></span>
                {/if}
            </div>
            {#if idx < LIFECYCLE_STAGES.length - 1}
                <div class="stage-step-line" class:dormant-line={isDormant || LIFECYCLE_STAGES[idx + 1].key === "dormant"}></div>
            {/if}
        {/each}
    </div>

    <!-- 当前阶段指导建议卡片 -->
    <div class="stage-guideline-box">
        <div class="guideline-main">
            <span class="guideline-icon">{currentMeta.icon}</span>
            <div class="guideline-text">
                <span class="guideline-label">{currentMeta.label}</span>
                <p class="guideline-desc">{currentMeta.description}</p>
            </div>
        </div>
        <div class="guideline-cadence">
            <span class="cadence-title">{text("stageCadenceHint", "建议联络节奏：")}</span>
            <span class="cadence-val">~{currentMeta.suggestedCadenceDays} {text("stageDays", "天")}</span>
        </div>
    </div>

    <!-- 变更阶段展开表单 -->
    {#if editing}
        <div class="stage-edit-form">
            <div class="form-row">
                <span class="form-label">{text("stageSelectTarget", "目标阶段")}:</span>
                <div class="stage-pills-select">
                    {#each LIFECYCLE_STAGES as s (s.key)}
                        <button
                            type="button"
                            class="stage-select-btn {selectedStage === s.key ? 'is-selected' : ''}"
                            onclick={() => selectedStage = s.key}
                        >
                            {s.icon} {s.shortLabel}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="form-row">
                <span class="form-label">{text("stageTransitionDate", "变迁日期")}:</span>
                <input class="b3-text-field" type="date" bind:value={transitionDate} />
            </div>

            <div class="form-row">
                <span class="form-label">{text("stageTransitionNote", "阶段备忘")}:</span>
                <input
                    class="b3-text-field fn__flex-1"
                    type="text"
                    bind:value={transitionNote}
                    placeholder={text("stageNotePlaceholder", "如：完成联合立项评审，正式进入紧密合作期")}
                />
            </div>

            {#if errorText}
                <div class="b3-label b3-label--error ft__smaller" style="margin-bottom: 6px;">
                    {errorText}
                </div>
            {/if}

            <div class="form-actions">
                <button
                    type="button"
                    class="b3-button b3-button--cancel b3-button--small"
                    onclick={() => { editing = false; errorText = ""; }}
                    disabled={saving}
                >
                    {text("commonCancel", "取消")}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--small"
                    onclick={handleSave}
                    disabled={saving}
                >
                    {saving ? text("commonSaving", "保存中…") : text("commonSave", "确认变迁")}
                </button>
            </div>
        </div>
    {/if}

    <!-- 历程时间线（折叠展开） -->
    {#if record.history && record.history.length > 0}
        <div class="stage-history-section">
            <button
                type="button"
                class="history-toggle-btn"
                onclick={() => historyExpanded = !historyExpanded}
            >
                {#if historyExpanded}
                    <ChevronDown size={13} style="margin-right: 4px;" />
                {:else}
                    <ChevronRight size={13} style="margin-right: 4px;" />
                {/if}
                <span>{text("stageHistoryTitle", "阶段变迁历史")} ({record.history.length})</span>
            </button>

            {#if historyExpanded}
                <div class="history-timeline">
                    {#each record.history as h, idx (idx)}
                        {@const meta = getStageMeta(h.stage)}
                        <div class="history-item">
                            <span class="history-date">
                                <Calendar size={11} style="margin-right: 2px;" />
                                {h.changedAt}
                            </span>
                            <span class="history-badge">
                                {meta.icon} {meta.shortLabel}
                            </span>
                            {#if h.note}
                                <span class="history-note">{h.note}</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .lvct-stage-tracker {
        margin: 14px 0;
        padding: 12px 14px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-theme-surface-lighter);
        border-radius: var(--b3-border-radius-b);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .lvct-stage-tracker__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .stage-current-chip {
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 10px;
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #ea580c);
        font-weight: 600;
    }

    .lvct-stage-steps {
        display: flex;
        align-items: center;
        width: 100%;
        overflow-x: auto;
        padding: 4px 0;
    }

    .stage-step-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        border-radius: 6px;
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        flex-shrink: 0;
        position: relative;
    }

    .stage-step-pill.active {
        border-color: var(--lv-brand, #ea580c);
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #ea580c);
        font-weight: 600;
    }

    .stage-step-pill.dormant {
        opacity: 0.85;
    }

    .step-num {
        font-size: 10px;
        width: 15px;
        height: 15px;
        line-height: 15px;
        text-align: center;
        border-radius: 50%;
        background: var(--b3-theme-surface-lighter);
        color: var(--b3-theme-on-surface-light);
    }

    .stage-step-pill.active .step-num {
        background: var(--b3-theme-primary);
        color: var(--lvct-on-accent);
    }

    .current-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--b3-theme-primary);
    }

    .stage-step-line {
        flex: 1;
        min-width: 10px;
        height: 2px;
        background: var(--b3-border-color);
        margin: 0 4px;
    }

    .stage-guideline-box {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--b3-theme-background);
        border-radius: 6px;
        border: 1px solid var(--b3-border-color);
        gap: 12px;
    }

    .guideline-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .guideline-icon {
        font-size: 20px;
        flex-shrink: 0;
    }

    .guideline-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .guideline-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
    }

    .guideline-desc {
        font-size: 11px;
        color: var(--lvct-text-3);
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .guideline-cadence {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
        font-size: 11px;
    }

    .cadence-title {
        color: var(--b3-theme-on-surface-light);
    }

    .cadence-val {
        font-weight: 600;
        color: var(--b3-theme-primary);
    }

    .stage-edit-form {
        padding: 10px 12px;
        background: var(--b3-theme-background);
        border: 1px dashed var(--b3-theme-primary-light);
        border-radius: 6px;
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

    .stage-pills-select {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .stage-select-btn {
        border: 1px solid var(--b3-border-color);
        background: transparent;
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--b3-theme-on-surface);
        transition: all 0.15s ease;
    }

    .stage-select-btn.is-selected {
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        border-color: var(--lv-brand, #ea580c);
        color: var(--lv-brand, #ea580c);
        font-weight: 600;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
    }

    .stage-history-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .history-toggle-btn {
        display: flex;
        align-items: center;
        background: transparent;
        border: none;
        padding: 0;
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        cursor: pointer;
    }

    .history-timeline {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-left: 12px;
        border-left: 2px solid var(--b3-theme-surface-lighter);
        margin-left: 4px;
    }

    .history-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
    }

    .history-date {
        color: var(--b3-theme-on-surface-light);
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .history-badge {
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        font-size: 10px;
        font-weight: 600;
        flex-shrink: 0;
    }

    .history-note {
        color: var(--b3-theme-on-surface);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
