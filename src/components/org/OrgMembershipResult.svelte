<script lang="ts">
    import type { OrgMembershipWriteReport } from "../../services/org-member-writes";
    import { translateText } from "../../domain/translation";
    import { tick, onDestroy } from "svelte";
    import { CheckCircle2, AlertCircle, FileText } from "@lucide/svelte";

    let { report, i18n }: { report: OrgMembershipWriteReport | null; i18n?: Readonly<Record<string, string>> } = $props();
    const pending = $derived(report?.projections.filter((projection) => projection.status === "unknown" || projection.status === "failed") ?? []);
    const text = $derived.by(() => (key: string, fallback: string) => translateText(i18n, key, fallback));
    let resultElement: HTMLElement | undefined = $state();
    let alive = true;
    let focusRequest = 0;
    onDestroy(() => { alive = false; focusRequest += 1; });
    $effect(() => {
        const request = ++focusRequest;
        if (report) void tick().then(() => { if (alive && request === focusRequest) resultElement?.focus(); });
    });
</script>

{#if report}
    <div
        class="lvct-org-membership-result"
        class:lvct-org-membership-result--success={pending.length === 0}
        class:lvct-org-membership-result--pending={pending.length > 0}
        bind:this={resultElement}
        tabindex="-1"
        role="status"
        aria-live="polite"
    >
        <div class="lvct-org-membership-result__header">
            {#if pending.length === 0}
                <CheckCircle2 size={16} strokeWidth={1.6} class="ft__primary" />
            {:else}
                <AlertCircle size={16} strokeWidth={1.6} style="color: #f59e0b;" />
            {/if}
            <div class="lvct-org-membership-result__text">
                <span class="lvct-org-membership-result__fact">{text("orgMembershipFactSaved", "成员事实已保存并核实。")}</span>
                <span class="lvct-org-membership-result__links-status">
                    {#if pending.length === 0}
                        {text("orgMembershipLinksVerified", "双方双链已核实。")}
                    {:else}
                        {text("orgMembershipLinksPending", "部分双链尚未核实，成员事实已保留。请到设置 → 数据与字段 → 组织成员双链，核对并只修复段落。")}
                    {/if}
                </span>
            </div>
        </div>
        {#if pending.length}
            <details class="lvct-org-membership-result__details">
                <summary class="lvct-org-membership-result__summary">
                    <FileText size={12} strokeWidth={1.6} />
                    <span>{text("orgMembershipPendingDetails", "查看待核实文档")}</span>
                </summary>
                <div class="lvct-org-membership-result__pending-list">
                    {#each pending as projection (projection.retryKey)}
                        <div class="lvct-org-membership-result__pending-item">
                            <div class="lvct-org-membership-result__item-row">
                                <code>{projection.docId}</code>
                                <span
                                    class="lvct-org-membership-result__status-tag"
                                    class:lvct-org-membership-result__status-tag--failed={projection.status === "failed"}
                                    class:lvct-org-membership-result__status-tag--unknown={projection.status !== "failed"}
                                >
                                    {projection.status === "failed" ? text("orgProjectionFailed", "失败") : text("orgProjectionUnknown", "未知，需重新核对")}
                                </span>
                            </div>
                            {#if projection.message}
                                <p class="lvct-org-membership-result__item-msg">{projection.message}</p>
                            {/if}
                        </div>
                    {/each}
                </div>
            </details>
        {/if}
    </div>
{/if}

<style>
    .lvct-org-membership-result {
        box-sizing: border-box;
        padding: 12px 14px;
        margin: 10px 0;
        background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.02));
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 12px);
        box-shadow: 0 1px 3px rgba(28, 24, 21, 0.02);
        font-size: 12px;
        line-height: 1.5;
    }
    .lvct-org-membership-result--success {
        border-color: color-mix(in srgb, var(--b3-theme-primary, #4285f4) 25%, var(--lvct-border-subtle));
    }
    .lvct-org-membership-result--pending {
        border-color: color-mix(in srgb, #f59e0b 30%, var(--lvct-border-subtle));
    }
    .lvct-org-membership-result__header {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }
    .lvct-org-membership-result__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
    }
    .lvct-org-membership-result__fact {
        font-weight: 600;
        color: var(--b3-theme-on-background);
    }
    .lvct-org-membership-result__links-status {
        color: var(--b3-theme-on-surface);
    }
    .lvct-org-membership-result__details {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed var(--lvct-border-subtle);
    }
    .lvct-org-membership-result__summary {
        cursor: pointer;
        user-select: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--b3-theme-primary, #4285f4);
        font-weight: 500;
    }
    .lvct-org-membership-result__pending-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 6px;
    }
    .lvct-org-membership-result__pending-item {
        padding: 6px 8px;
        border-radius: 8px;
        background: var(--b3-theme-surface, #ffffff);
        border: 1px solid var(--lvct-border-subtle);
    }
    .lvct-org-membership-result__item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
    }
    .lvct-org-membership-result__item-row code {
        font-size: 11px;
    }
    .lvct-org-membership-result__status-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 6px;
        border-radius: var(--lv-r-pill, 9999px);
        font-size: 10px;
        font-weight: 500;
    }
    .lvct-org-membership-result__status-tag::before {
        content: "";
        display: inline-block;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: currentColor;
        forced-color-adjust: none;
    }
    .lvct-org-membership-result__status-tag--failed {
        color: var(--b3-theme-error, #ef4444);
        background: rgba(239, 68, 68, 0.08);
    }
    .lvct-org-membership-result__status-tag--unknown {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.08);
    }
    .lvct-org-membership-result__item-msg {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light, #888);
        margin: 2px 0 0;
    }
</style>
