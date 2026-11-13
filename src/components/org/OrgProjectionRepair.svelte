<script lang="ts">
    import { requestErrorMessage } from "../../shared/error-presenter";
    import { onDestroy, tick } from "svelte";
    import { FileCheck, RefreshCw, Wrench, AlertCircle } from "@lucide/svelte";
    import type { ContactsPluginFacade } from "../../types";
    import type { OrgProjectionPreview, OrgProjectionRepairResult } from "../../services/org-projections";
    import { translateText } from "../../domain/translation";
    import { subscribeDataChanged } from "../../libs/data-events";
    import { useCloseGuard } from "../close-guard";

    let { facade, i18n, onBusyChange = () => {} }: {
        facade: ContactsPluginFacade;
        i18n?: Readonly<Record<string, string>>;
        onBusyChange?: (busy: boolean) => void;
    } = $props();
    const text = $derived.by(() => (key: string, fallback: string) => translateText(i18n, key, fallback));
    let busy = $state(false);
    let repairingKey = $state<string | null>(null);
    let preview = $state<OrgProjectionPreview | null>(null);
    let results = $state<Record<string, OrgProjectionRepairResult>>({});
    let errorText = $state("");
    let stale = $state(false);
    let visibleCount = $state(20);
    let summaryElement: HTMLElement | undefined = $state();
    let alive = true;
    let generation = 0;
    const visibleTargets = $derived(preview?.targets.slice(0, visibleCount) ?? []);

    const projectionStats = $derived.by(() => {
        if (!preview) return { total: 0, unchanged: 0, pending: 0, abnormal: 0 };
        let unchanged = 0;
        let pending = 0;
        let abnormal = 0;
        for (const t of preview.targets) {
            const st: string = results[t.retryKey]?.status ?? t.state;
            if (st === "unchanged" || st === "applied") unchanged += 1;
            else if (st === "missing" || st === "different" || t.checkpointPending) pending += 1;
            else if (st === "failed" || st === "unknown") abnormal += 1;
            else pending += 1;
        }
        return { total: preview.targets.length, unchanged, pending, abnormal };
    });

    useCloseGuard({ busy: () => busy, dirty: () => false });
    $effect(() => { onBusyChange(busy); });
    const unsubscribe = subscribeDataChanged(() => { if (preview) stale = true; });
    onDestroy(() => { alive = false; generation += 1; unsubscribe(); onBusyChange(false); });

    async function loadPreview(): Promise<void> {
        if (busy || repairingKey || !facade.previewOrganizationProjections) return;
        const request = ++generation;
        busy = true;
        errorText = "";
        try {
            const next = await facade.previewOrganizationProjections();
            if (!alive || request !== generation) return;
            preview = next;
            results = {};
            stale = false;
            visibleCount = 20;
            await tick();
            if (alive && request === generation) summaryElement?.focus();
        } catch (error) {
            if (alive && request === generation) { errorText = requestErrorMessage(error); stale = true; }
        } finally { if (alive && request === generation) busy = false; }
    }

    async function repair(retryKey: string): Promise<void> {
        if (busy || stale || !preview || repairingKey || !facade.repairOrganizationProjection) return;
        const request = ++generation;
        repairingKey = retryKey;
        busy = true;
        errorText = "";
        try {
            const result = await facade.repairOrganizationProjection(preview, retryKey);
            if (!alive || request !== generation) return;
            results = { ...results, [retryKey]: result };
            if (result.status === "failed" || result.status === "unknown") stale = true;
        } catch (error) {
            if (alive && request === generation) { errorText = requestErrorMessage(error); stale = true; }
        } finally {
            if (alive) {
                repairingKey = null;
                if (request === generation) {
                    busy = false;
                    await tick();
                    if (alive && request === generation) summaryElement?.focus();
                }
            }
        }
    }

    function stateMeta(state: string): { label: string; tone: "success" | "warning" | "error" | "neutral" } {
        if (state === "applied") return { label: text("orgProjectionApplied", "已核实修复"), tone: "success" };
        if (state === "unchanged") return { label: text("orgProjectionUnchanged", "一致"), tone: "success" };
        if (state === "missing") return { label: text("orgProjectionMissing", "缺失"), tone: "warning" };
        if (state === "different") return { label: text("orgProjectionDifferent", "不同"), tone: "warning" };
        if (state === "failed") return { label: text("orgProjectionFailed", "失败"), tone: "error" };
        return { label: text("orgProjectionUnknown", "未知，需重新核对"), tone: "neutral" };
    }
</script>

<section class="lvct-org-projection" aria-busy={busy}>
    <div class="lvct-settings__sub-heading lvct-org-projection__header">
        <div class="lvct-org-projection__title-wrap">
            <FileCheck size={16} strokeWidth={1.6} class="ft__primary" />
            <b>{text("orgProjectionTitle", "组织成员双链")}</b>
        </div>
        <button
            type="button"
            class="b3-button b3-button--outline lvct-org-projection__pill-btn"
            disabled={busy || !!repairingKey}
            onclick={loadPreview}
        >
            <RefreshCw size={12} strokeWidth={1.6} />
            <span>{busy && !repairingKey ? text("orgProjectionBusy", "核对或修复中…") : text("orgProjectionInspect", "只读核对组织双链")}</span>
        </button>
    </div>
    <p class="lvct-settings__inline-hint lvct-org-projection__hint">
        {text("orgProjectionScope", "先只读预览差异，再逐项确认。只修改插件双链段落，保留成员事实、任职历史和其他正文；归档组织不生成当前成员投影。")}
    </p>
    {#if errorText}<p class="lvct-form__error" role="alert">{errorText}</p>{/if}
    {#if preview}
        <!-- 空气感一体化指标条 -->
        <div class="lvct-org-projection__metrics-bar" role="status" aria-label="双链核对概览">
            <div class="lvct-org-projection__metric">
                <span class="lvct-org-projection__metric-label">{text("orgProjectionCount", "已核对文档")}</span>
                <span class="lvct-org-projection__metric-value">{projectionStats.total}</span>
            </div>
            <div class="lvct-org-projection__metric">
                <span class="lvct-org-projection__metric-label">一致/已核实</span>
                <span class="lvct-org-projection__metric-value lvct-org-projection__metric-val--success">{projectionStats.unchanged}</span>
            </div>
            <div class="lvct-org-projection__metric">
                <span class="lvct-org-projection__metric-label">待修复/差异</span>
                <span class="lvct-org-projection__metric-value lvct-org-projection__metric-val--warning">{projectionStats.pending}</span>
            </div>
            <div class="lvct-org-projection__metric">
                <span class="lvct-org-projection__metric-label">异常/未知</span>
                <span class="lvct-org-projection__metric-value lvct-org-projection__metric-val--abnormal">{projectionStats.abnormal}</span>
            </div>
        </div>

        <p bind:this={summaryElement} tabindex="-1" role="status" aria-live="polite" class="lvct-org-projection__summary-text">
            <span>{text("orgProjectionCount", "已核对文档数")}：<b>{preview.targets.length}</b></span>
            {#if stale}
                <span class="lvct-org-projection__stale-warning">
                    <AlertCircle size={12} strokeWidth={1.6} />
                    {text("orgProjectionStale", "来源或结果需重新核实，请重新预览")}
                </span>
            {/if}
        </p>

        <div class="lvct-org-projection__target-list">
            {#each visibleTargets as target (target.retryKey)}
                {@const currentState = results[target.retryKey]?.status ?? target.state}
                {@const meta = stateMeta(currentState)}
                {@const isThisRepairing = repairingKey === target.retryKey}
                <div class="lvct-org-projection__target">
                    <div class="lvct-org-projection__target-header">
                        <div class="lvct-org-projection__target-title-wrap">
                            <strong class="lvct-org-projection__target-name">{target.name}</strong>
                            <span class="lvct-org-projection__kind-chip">
                                {target.kind === "organization" ? text("orgProjectionOrganization", "组织") : text("orgProjectionPerson", "人物")}
                            </span>
                            <span class="lvct-org-projection__state-tag lvct-org-projection__state--{meta.tone}">
                                {meta.label}
                            </span>
                        </div>
                        {#if target.state !== "unknown" && (target.state !== "unchanged" || target.checkpointPending)}
                            <button
                                type="button"
                                class="b3-button b3-button--outline lvct-org-projection__pill-btn lvct-org-projection__action-btn"
                                disabled={busy || stale || isThisRepairing || ["applied", "unchanged"].includes(results[target.retryKey]?.status ?? "")}
                                onclick={() => repair(target.retryKey)}
                            >
                                {#if isThisRepairing}
                                    <RefreshCw size={11} strokeWidth={1.6} />
                                    <span>修复中…</span>
                                {:else}
                                    <Wrench size={11} strokeWidth={1.6} />
                                    <span>{text("orgProjectionConfirm", "确认修复或核实此段落")}</span>
                                {/if}
                            </button>
                        {/if}
                    </div>

                    <div class="lvct-org-projection__docid"><code>{target.docId}</code></div>

                    {#if target.message || results[target.retryKey]?.message}
                        <p class="lvct-org-projection__msg" role="status">
                            {results[target.retryKey]?.message ?? target.message}
                        </p>
                    {/if}

                    {#if target.state !== "unchanged" && target.state !== "unknown"}
                        <details class="lvct-org-projection__details">
                            <summary>{text("orgProjectionCompare", "查看现有与预期段落")}</summary>
                            <div class="lvct-org-projection__diff-box">
                                <p class="lvct-org-projection__diff-label">{text("orgProjectionCurrent", "现有插件段落")}</p>
                                <pre class="lvct-org-projection__text">{target.existing?.map((block) => block.markdown).join("\n") || "—"}</pre>
                                <p class="lvct-org-projection__diff-label">{text("orgProjectionExpected", "按当前成员事实生成的段落")}</p>
                                <pre class="lvct-org-projection__text">{target.markdown || text("orgProjectionRemoveEmpty", "清除此插件段落；保留其他正文")}</pre>
                            </div>
                        </details>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="lvct-org-projection__footer-actions">
            {#if visibleTargets.length < preview.targets.length}
                <button
                    type="button"
                    class="b3-button b3-button--outline lvct-org-projection__pill-btn"
                    disabled={busy || !!repairingKey}
                    onclick={() => (visibleCount += 20)}
                >
                    {text("orgProjectionMore", "显示更多核对结果")}
                </button>
            {/if}
            <button
                type="button"
                class="b3-button b3-button--cancel lvct-org-projection__pill-btn"
                disabled={busy || !!repairingKey}
                onclick={() => { preview = null; results = {}; }}
            >
                {text("orgProjectionCancel", "取消预览")}
            </button>
        </div>
    {/if}
</section>

<style>
    .lvct-org-projection {
        box-sizing: border-box;
        padding: 16px 18px;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.02));
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 12px);
        margin-top: 14px;
    }
    .lvct-org-projection__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 6px;
    }
    .lvct-org-projection__title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .lvct-org-projection__hint {
        font-size: 12px;
        color: var(--b3-theme-on-surface-light, #888);
        line-height: 1.5;
        margin: 0 0 10px 0;
    }
    /* 空气感一体化指标条 */
    .lvct-org-projection__metrics-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0;
        margin: 12px 0 14px;
        padding: 8px 0;
        background: transparent;
        border-bottom: 1px solid var(--lvct-border-subtle);
    }
    .lvct-org-projection__metric {
        flex: 1 1 auto;
        min-width: 80px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0 12px;
        position: relative;
    }
    .lvct-org-projection__metric:not(:last-child)::after {
        content: "";
        position: absolute;
        right: 0;
        top: 20%;
        bottom: 20%;
        width: 1px;
        background: color-mix(in srgb, var(--lvct-border-subtle) 80%, transparent);
    }
    .lvct-org-projection__metric-label {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light, #888);
    }
    .lvct-org-projection__metric-value {
        font-size: 18px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: var(--b3-theme-on-background);
    }
    .lvct-org-projection__metric-val--success {
        color: var(--b3-theme-primary);
    }
    .lvct-org-projection__metric-val--warning {
        color: var(--lv-data-amber);
    }
    .lvct-org-projection__metric-val--abnormal {
        color: var(--lvct-danger);
    }

    .lvct-org-projection__summary-text {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        margin: 6px 0 10px;
        color: var(--b3-theme-on-surface);
    }
    .lvct-org-projection__stale-warning {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--lv-data-amber);
        font-size: 11px;
    }

    .lvct-org-projection__target-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 10px 0;
    }
    .lvct-org-projection__target {
        box-sizing: border-box;
        padding: 12px 14px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 12px);
        box-shadow: 0 1px 4px rgba(28, 24, 21, 0.02);
        overflow-wrap: anywhere;
    }
    .lvct-org-projection__target-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
    }
    .lvct-org-projection__target-title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }
    .lvct-org-projection__target-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--b3-theme-on-background);
    }
    .lvct-org-projection__kind-chip {
        font-size: 11px;
        padding: 1px 6px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.04));
        color: var(--b3-theme-on-surface-light, #888);
    }
    .lvct-org-projection__state-tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        font-size: 11px;
        font-weight: 500;
        background: var(--b3-theme-background, rgba(0, 0, 0, 0.04));
    }
    .lvct-org-projection__state-tag::before {
        content: "";
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        forced-color-adjust: none;
    }
    .lvct-org-projection__state--success {
        color: var(--b3-theme-primary);
    }
    .lvct-org-projection__state--warning {
        color: var(--lv-data-amber);
    }
    .lvct-org-projection__state--error {
        color: var(--lvct-danger);
    }
    .lvct-org-projection__state--neutral {
        color: var(--lvct-text-3);
    }

    .lvct-org-projection__docid {
        font-size: 11px;
        color: var(--lvct-text-3);
        margin: 4px 0 6px;
    }
    .lvct-org-projection__docid code {
        padding: 1px 4px;
        border-radius: 4px;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.04));
    }
    .lvct-org-projection__msg {
        font-size: 12px;
        margin: 4px 0;
        padding: 4px 8px;
        border-radius: 6px;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.03));
        color: var(--b3-theme-on-surface);
    }
    .lvct-org-projection__details {
        margin-top: 6px;
        font-size: 12px;
    }
    .lvct-org-projection__diff-box {
        margin-top: 6px;
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.03));
    }
    .lvct-org-projection__diff-label {
        font-size: 11px;
        font-weight: 600;
        margin: 4px 0 2px;
        color: var(--lvct-text-3);
    }
    .lvct-org-projection__text {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-size: 11px;
        margin: 2px 0 6px;
        padding: 4px 6px;
        border-radius: 4px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
    }

    .lvct-org-projection__footer-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
    }
    .lvct-org-projection__pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: var(--lv-r-pill, 9999px) !important;
        padding: 4px 14px;
        font-size: 12px;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    }

    /* 桌面端悬停淡入 */
    .lvct-org-projection__action-btn {
        opacity: 0.7;
    }
    .lvct-org-projection__target:hover .lvct-org-projection__action-btn,
    .lvct-org-projection__target:focus-within .lvct-org-projection__action-btn {
        opacity: 1;
    }
    @media (hover: none) {
        .lvct-org-projection__action-btn {
            opacity: 1;
        }
    }
</style>
