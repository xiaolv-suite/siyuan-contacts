<script lang="ts">
    import type { ContactAnniversaryMilestone } from "../../domain/anniversary-milestones.ts";
    import { translateText } from "../../domain/translation";
    import { copyPlainText } from "../../shared/clipboard.ts";
    import { onDestroy } from "svelte";
    import {
        MessageSquareHeart,
        Copy,
        Check,
        Sparkles,
        PartyPopper,
    } from "@lucide/svelte";

    let {
        milestones = [],
        onApplyGreeting,
        i18n,
    }: {
        milestones: readonly ContactAnniversaryMilestone[];
        onApplyGreeting?: (greetingText: string) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let copiedIndex = $state<number | null>(null);
    let copyingIndex = $state<number | null>(null);
    let copiedTimer: ReturnType<typeof setTimeout> | null = null;

    async function handleCopy(greeting: string, index: number) {
        if (copyingIndex !== null) return;
        copyingIndex = index;
        try {
            await copyPlainText(greeting);
            copiedIndex = index;
            if (copiedTimer) clearTimeout(copiedTimer);
            copiedTimer = setTimeout(() => {
                if (copiedIndex === index) copiedIndex = null;
            }, 2000);
        } catch (err) {
            console.warn("[LvContacts] 复制里程碑寄语失败", err);
        } finally {
            copyingIndex = null;
        }
    }

    onDestroy(() => {
        if (copiedTimer) clearTimeout(copiedTimer);
    });
</script>

{#if milestones.length > 0}
    <div class="lvct-anniversary-milestone-banner" role="region" aria-label={text("annivBannerAria", "周年纪念日里程碑提醒")}>
        {#each milestones as milestone, idx (milestone.anniversary.id)}
            <div class="milestone-item {milestone.isToday ? 'is-today' : ''}">
                <div class="milestone-left">
                    <span class="celebration-icon {milestone.isToday ? 'is-today' : ''}" aria-hidden="true">
                        {#if milestone.isToday}
                            <PartyPopper size={20} strokeWidth={1.6} class="celebration-svg" style="color: var(--lv-brand, #ea580c);" />
                        {:else}
                            <Sparkles size={18} strokeWidth={1.6} class="celebration-svg" style="color: var(--lv-data-amber, #d97706);" />
                        {/if}
                    </span>
                    <div class="milestone-meta">
                        <div class="milestone-title-line">
                            <span class="milestone-title">{milestone.title}</span>
                            {#if milestone.yearsCount}
                                <span class="years-pill">{text("yearsAnnivPill", "满 {n} 周年", { n: milestone.yearsCount })}</span>
                            {/if}
                            <span class="countdown-badge {milestone.isToday ? 'is-today' : ''}">
                                {milestone.isToday ? text("todayAnnivBadge", "🎉 今天纪念日！") : text("futureAnnivBadge", "距今还有 {n} 天 ({date})", { n: milestone.daysUntil, date: milestone.displayDate })}
                            </span>
                        </div>
                        <div class="greeting-preview ft__smaller ft__on-surface">
                            <span class="preview-label">{text("congratulatoryPreview", "祝贺问候：")}</span>
                            <span class="preview-text">"{milestone.congratulatoryText}"</span>
                        </div>
                    </div>
                </div>

                <div class="milestone-actions">
                    {#if onApplyGreeting}
                        <button
                            type="button"
                            class="b3-button b3-button--outline btn-apply-greeting"
                            title={text("applyGreetingTip", "将周年问候语预填入下方互动备注草稿")}
                            onclick={() => onApplyGreeting?.(milestone.congratulatoryText)}
                        >
                            <MessageSquareHeart size={13} strokeWidth={1.6} class="lvct-icon-inline" />
                            {text("applyGreetingBtn", "填入问候")}
                        </button>
                    {/if}

                    <button
                        type="button"
                        class="b3-button b3-button--cancel btn-copy-greeting"
                        disabled={copyingIndex === idx}
                        title={text("copyGreetingTip", "复制问候语文本至剪贴板")}
                        onclick={() => handleCopy(milestone.congratulatoryText, idx)}
                    >
                        {#if copiedIndex === idx}
                            <Check size={12} strokeWidth={1.6} class="lvct-icon-inline ft__primary" />
                            <span class="ft__primary">{text("copied", "已复制 ✓")}</span>
                        {:else}
                            <Copy size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                            {text("copy", "复制")}
                        {/if}
                    </button>
                </div>
            </div>
        {/each}
    </div>
{/if}

<style>
    .lvct-anniversary-milestone-banner {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
    }

    .milestone-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 14px);
        box-shadow: var(--lvct-shadow-1);
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), background var(--lvct-dur-fast) var(--lvct-ease), border-color var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease), color var(--lvct-dur-fast) var(--lvct-ease), opacity var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            box-shadow: var(--lvct-shadow-2);
            transform: translateY(-1px);
        }
    }

    .milestone-item.is-today {
        background: color-mix(in srgb, var(--lv-brand, #ea580c) 8%, var(--lvct-bg-surface));
        border: 1px solid var(--lv-brand, #ea580c);
        box-shadow: 0 2px 8px color-mix(in srgb, var(--lv-brand, #ea580c) 16%, transparent);
    }

    .milestone-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
    }

    .celebration-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .milestone-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .milestone-title-line {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
    }

    .milestone-title {
        font-weight: 600;
        font-size: 13px;
    }

    .years-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lv-data-amber-soft, rgba(217, 119, 6, 0.14));
        color: var(--lv-data-amber, #d97706);
        border: 1px solid color-mix(in srgb, var(--lv-data-amber) 25%, transparent);
        font-variant-numeric: tabular-nums;
    }

    .countdown-badge {
        font-size: 11px;
        color: var(--lvct-text-3);
        font-variant-numeric: tabular-nums;
        display: inline-flex;
        align-items: center;
        gap: 4px;

        &::before {
            content: "";
            display: inline-block;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: currentColor;
            forced-color-adjust: none;
        }
    }

    .countdown-badge.is-today {
        font-weight: 700;
        color: var(--lv-brand, #ea580c);
    }

    .greeting-preview {
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 580px;
    }

    .preview-label {
        color: var(--b3-theme-on-surface-light);
        flex-shrink: 0;
    }

    .preview-text {
        color: var(--b3-theme-on-surface);
        font-style: italic;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .milestone-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .btn-apply-greeting,
    .btn-copy-greeting {
        font-size: 11px;
        padding: 3px 10px;
        border-radius: var(--lv-r-pill, 9999px);
    }
</style>
