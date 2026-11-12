<script lang="ts">
    import { onDestroy, untrack } from "svelte";
    import { RefreshCw, Play, ShieldAlert, CheckCircle2 } from "@lucide/svelte";
    import type { ContactsPluginFacade } from "../../types";
    import type { OrganizationOperationReport } from "../../domain/organization-operations";
    import { requestErrorMessage } from "../../shared/error-presenter";

    let { facade, refreshKey = 0, disabled = false, onRecovered, onBusyChange }: {
        facade: ContactsPluginFacade;
        refreshKey?: number;
        disabled?: boolean;
        onRecovered?: (docId: string) => void | Promise<void>;
        onBusyChange?: (busy: boolean) => void;
    } = $props();
    let reports = $state<OrganizationOperationReport[]>([]);
    let errorMessage = $state("");
    let busy = $state(false);
    let actingRequestId = $state<string | null>(null);
    let alive = true;
    let request = 0;
    onDestroy(() => { alive = false; request += 1; onBusyChange?.(false); });
    $effect(() => { onBusyChange?.(busy); });

    async function readPending(): Promise<void> {
        if (!facade.listPendingOrganizationOperations) return;
        const currentRequest = ++request;
        busy = true;
        try {
            const next = await facade.listPendingOrganizationOperations();
            if (!alive || currentRequest !== request) return;
            reports = next;
            errorMessage = "";
        } catch (error) {
            if (alive && currentRequest === request) errorMessage = requestErrorMessage(error);
        } finally {
            if (alive && currentRequest === request) busy = false;
        }
    }

    $effect(() => {
        void refreshKey;
        untrack(() => { void readPending(); });
    });

    async function act(requestId: string, resume: boolean): Promise<void> {
        if (busy || disabled || actingRequestId) return;
        const action = resume ? facade.resumeOrganizationOperation : facade.inspectOrganizationOperation;
        if (!action) return;
        const currentRequest = ++request;
        actingRequestId = requestId;
        busy = true;
        errorMessage = "";
        try {
            const result = await action.call(facade, requestId);
            if (!alive || currentRequest !== request) return;
            reports = reports.map((entry) => entry.operation.requestId === requestId ? result : entry);
            if (result.status === "complete" && result.docId) await onRecovered?.(result.docId);
        } catch (error) {
            if (alive && currentRequest === request) errorMessage = requestErrorMessage(error);
        } finally {
            if (alive) {
                actingRequestId = null;
                if (currentRequest === request) busy = false;
            }
        }
    }

    function stepInfo(state: string): { label: string; tone: "verified" | "pending" | "rejected" | "idle" } {
        if (state === "verified") return { label: "已核实", tone: "verified" };
        if (state === "pending") return { label: "发送结果未知", tone: "pending" };
        if (state === "rejected") return { label: "明确未执行", tone: "rejected" };
        return { label: "尚未发送", tone: "idle" };
    }
</script>

{#if facade.listPendingOrganizationOperations && (reports.length || errorMessage)}
    <section class="lvct-org-recovery" aria-label="组织操作续做" aria-busy={busy}>
        <div class="lvct-org-recovery__header">
            <div class="lvct-org-recovery__title-wrap">
                <ShieldAlert size={16} strokeWidth={1.6} class="ft__primary" />
                <strong class="lvct-org-recovery__title">组织操作续做</strong>
            </div>
            <button
                type="button"
                class="b3-button b3-button--outline lvct-org-recovery__pill-btn"
                disabled={busy || disabled || !!actingRequestId}
                onclick={() => void readPending()}
            >
                <RefreshCw size={12} strokeWidth={1.6} />
                <span>{busy && !actingRequestId ? "核实中…" : "只读核实待处理操作"}</span>
            </button>
        </div>
        <p class="lvct-org-recovery__desc">重开窗口先只读核实原请求。未知结果不会再次创建或改写；继续只补尚未发送或明确拒绝的步骤。</p>
        {#if errorMessage}<p class="lvct-form__error" role="alert">{errorMessage}</p>{/if}
        {#each reports as entry (entry.operation.requestId)}
            {@const isThisActing = actingRequestId === entry.operation.requestId}
            <article class="lvct-org-recovery__entry" data-request-id={entry.operation.requestId}>
                <div class="lvct-org-recovery__entry-header">
                    <strong class="lvct-org-recovery__entry-title">
                        {entry.operation.kind === "create" ? "创建" : "改名"}：{entry.operation.name}
                    </strong>
                    {#if entry.status === "complete"}
                        <span class="lvct-org-step-tag lvct-org-step--verified">
                            <CheckCircle2 size={11} strokeWidth={1.6} />
                            已完成
                        </span>
                    {/if}
                </div>
                <div class="lvct-org-recovery__meta ft__smaller">
                    <span>请求：<code>{entry.operation.requestId}</code></span>
                    <span>文档：<code>{entry.docId || "尚未核实"}</code></span>
                </div>
                <div class="lvct-org-recovery__steps">
                    {#if entry.operation.kind === "create"}
                        {@const step = stepInfo(entry.operation.createState)}
                        <div class="lvct-org-recovery__step-row">
                            <span class="lvct-org-recovery__step-name">创建状态：</span>
                            <span class="lvct-org-step-tag lvct-org-step--{step.tone}">{step.label}</span>
                        </div>
                    {:else}
                        <div class="lvct-org-recovery__step-row">
                            <span class="lvct-org-recovery__step-name">原标题：</span>
                            <span>{entry.operation.originalName}</span>
                        </div>
                        {@const titleStep = stepInfo(entry.operation.titleState)}
                        {@const markerStep = stepInfo(entry.operation.markerState)}
                        <div class="lvct-org-recovery__step-row">
                            <span class="lvct-org-recovery__step-name">标题状态：</span>
                            <span class="lvct-org-step-tag lvct-org-step--{titleStep.tone}">{titleStep.label}</span>
                            <span class="lvct-org-recovery__step-name" style="margin-left: 8px;">标记状态：</span>
                            <span class="lvct-org-step-tag lvct-org-step--{markerStep.tone}">{markerStep.label}</span>
                        </div>
                    {/if}
                </div>
                {#if entry.message}
                    <p class="lvct-org-recovery__status-msg" role="status">{entry.message}</p>
                {/if}
                <div class="lvct-org-recovery__entry-actions">
                    <button
                        type="button"
                        class="b3-button b3-button--outline lvct-org-recovery__pill-btn"
                        disabled={busy || disabled || isThisActing}
                        onclick={() => void act(entry.operation.requestId, false)}
                    >
                        <RefreshCw size={12} strokeWidth={1.6} />
                        <span>{isThisActing ? "正在核实…" : "只读核实原请求"}</span>
                    </button>
                    {#if entry.canResume && facade.resumeOrganizationOperation}
                        <button
                            type="button"
                            class="b3-button lvct-org-recovery__pill-btn"
                            disabled={busy || disabled || isThisActing}
                            onclick={() => void act(entry.operation.requestId, true)}
                        >
                            <Play size={12} strokeWidth={1.6} />
                            <span>{isThisActing ? "正在续做…" : "继续未完成步骤"}</span>
                        </button>
                    {/if}
                </div>
            </article>
        {/each}
    </section>
{/if}

<style>
    .lvct-org-recovery {
        box-sizing: border-box;
        padding: 16px 18px;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.02));
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 12px);
        box-shadow: 0 1px 3px rgba(28, 24, 21, 0.02);
        margin-bottom: 16px;
    }
    .lvct-org-recovery__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 6px;
    }
    .lvct-org-recovery__title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .lvct-org-recovery__title {
        font-size: 14px;
        font-weight: 600;
        color: var(--b3-theme-on-background);
    }
    .lvct-org-recovery__desc {
        font-size: 12px;
        color: var(--lvct-text-3);
        line-height: 1.5;
        margin: 0 0 10px 0;
    }
    .lvct-org-recovery__entry {
        box-sizing: border-box;
        padding: 14px 16px;
        margin-top: 12px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 12px);
        box-shadow: 0 2px 8px rgba(28, 24, 21, 0.03);
        overflow-wrap: anywhere;
    }
    .lvct-org-recovery__entry-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
    }
    .lvct-org-recovery__entry-title {
        font-size: 13px;
        font-weight: 600;
    }
    .lvct-org-recovery__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        color: var(--lvct-text-3);
        margin-bottom: 8px;
    }
    .lvct-org-recovery__meta code {
        font-size: 11px;
        padding: 1px 4px;
        border-radius: 4px;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.04));
    }
    .lvct-org-recovery__steps {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 8px;
    }
    .lvct-org-recovery__step-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 12px;
    }
    .lvct-org-recovery__step-name {
        color: var(--lvct-text-3);
    }
    .lvct-org-step-tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        font-size: 11px;
        font-weight: 500;
        background: var(--b3-theme-background, rgba(0, 0, 0, 0.04));
    }
    .lvct-org-step-tag::before {
        content: "";
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        forced-color-adjust: none;
    }
    .lvct-org-step--verified {
        color: var(--b3-theme-primary);
    }
    .lvct-org-step--pending {
        color: var(--lv-data-amber);
    }
    .lvct-org-step--rejected {
        color: var(--lvct-danger);
    }
    .lvct-org-step--idle {
        color: var(--lvct-text-3);
    }
    .lvct-org-recovery__status-msg {
        font-size: 12px;
        line-height: 1.4;
        margin: 6px 0 10px;
        padding: 6px 10px;
        border-radius: 8px;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.03));
        color: var(--b3-theme-on-surface);
    }
    .lvct-org-recovery__entry-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
    }
    .lvct-org-recovery__pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: var(--lv-r-pill, 9999px) !important;
        padding: 4px 14px;
        font-size: 12px;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    }
</style>
