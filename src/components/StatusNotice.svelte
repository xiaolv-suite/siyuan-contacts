<script lang="ts">
    import { onDestroy } from "svelte";
    import { CheckCircle2, CircleAlert, X } from "@lucide/svelte";
    import { translateText } from "../domain/translation";

    let { message, error = false, onDismiss, actionLabel, onAction, actionDisabled = false, i18n }: {
        message: string;
        error?: boolean;
        onDismiss?: () => void;
        actionLabel?: string;
        onAction?: () => void;
        actionDisabled?: boolean;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    // 2026-11-21 i18n 债务收敛：关闭按钮 aria/title 走词条（原硬编码中文）
    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let timer: ReturnType<typeof setTimeout> | undefined;
    let isHovered = $state(false);

    $effect(() => {
        clearTimeout(timer);
        if (message && !error && onDismiss && !isHovered) {
            timer = setTimeout(onDismiss, 4000);
        }
    });
    onDestroy(() => {
        clearTimeout(timer);
        isHovered = false;
    });
</script>

{#if message}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="lvct-notice"
        class:lvct-notice--error={error}
        role={error ? "alert" : "status"}
        onmouseenter={() => (isHovered = true)}
        onmouseleave={() => (isHovered = false)}
        onfocusin={() => (isHovered = true)}
        onfocusout={(event) => {
            const current = event.currentTarget as HTMLElement | null;
            if (!current?.contains(document.activeElement)) isHovered = false;
        }}
    >
        {#if error}<CircleAlert size={16} strokeWidth={1.6} />{:else}<CheckCircle2 size={16} strokeWidth={1.6} />{/if}
        <span>{message}</span>
        {#if actionLabel && onAction}<button type="button" class="lvct-notice__action" disabled={actionDisabled} aria-disabled={actionDisabled} onclick={onAction}>{actionLabel}</button>{/if}
        {#if onDismiss}
            <button
                type="button"
                class="lvct-notice__dismiss-btn"
                aria-label={text("status.dismissAria", "关闭提示")}
                title={text("status.dismissAria", "关闭提示")}
                onclick={onDismiss}
            >
                <X size={13} strokeWidth={1.6} />
            </button>
        {/if}
    </div>
{/if}
