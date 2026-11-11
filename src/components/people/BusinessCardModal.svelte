<script lang="ts">
    import {
        generateBusinessCardSvg,
        type CardOrientation,
        type CardTheme,
    } from "../../domain/business-card.ts";
    import type { ContactSummary } from "../../domain/person.ts";
    import { translateText } from "../../domain/translation";
    import { copyPlainText } from "../../shared/clipboard";
    import { onDestroy } from "svelte";
    import {
        Copy,
        Check,
        Download,
        LayoutTemplate,
        Palette,
    } from "@lucide/svelte";

    let {
        person,
        orgAndTitle = "",
        region = "",
        socialScore,
        tierLabel = "",
        stageLabel = "",
        onClose,
        i18n,
    }: {
        person: ContactSummary;
        orgAndTitle?: string;
        region?: string;
        socialScore?: number;
        tierLabel?: string;
        stageLabel?: string;
        onClose: () => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let theme: CardTheme = $state("brand");
    let orientation: CardOrientation = $state("horizontal");

    let copied = $state(false);
    let copying = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | null = null;
    let errorText = $state("");

    onDestroy(() => {
        if (copyTimer) clearTimeout(copyTimer);
    });

    const cardSvg = $derived(
        generateBusinessCardSvg({
            person,
            orgAndTitle,
            region,
            socialScore,
            tierLabel,
            stageLabel,
            theme,
            orientation,
        })
    );

    async function handleCopySvg() {
        if (copying) return;
        copying = true;
        try {
            await copyPlainText(cardSvg);
            copied = true;
            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                copied = false;
            }, 2000);
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            copying = false;
        }
    }

    function handleDownloadSvg() {
        const blob = new Blob([cardSvg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const name = person.name.trim() || "联系人";
        a.download = `小驴人脉_名片_${name}_${orientation}.svg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }
</script>

<div class="lvct-card-modal">
    <!-- 控制栏：版式与风格切换 -->
    <div class="card-controls-toolbar">
        <div class="control-segment">
            <span class="control-label">
                <Palette size={13} strokeWidth={1.6} style="margin-right: 4px;" />
                {text("cardThemeLabel", "主题风格：")}
            </span>
            <button
                type="button"
                class="segment-pill {theme === 'brand' ? 'is-active' : ''}"
                onclick={() => theme = 'brand'}
            >
                {text("cardThemeBrand", "品牌轻奢")}
            </button>
            <button
                type="button"
                class="segment-pill {theme === 'minimal' ? 'is-active' : ''}"
                onclick={() => theme = 'minimal'}
            >
                {text("cardThemeMinimal", "极简雅白")}
            </button>
            <button
                type="button"
                class="segment-pill {theme === 'dark' ? 'is-active' : ''}"
                onclick={() => theme = 'dark'}
            >
                {text("cardThemeDark", "曜石极夜")}
            </button>
        </div>

        <div class="control-segment">
            <span class="control-label">
                <LayoutTemplate size={13} strokeWidth={1.6} style="margin-right: 4px;" />
                {text("cardLayoutLabel", "名片版式：")}
            </span>
            <button
                type="button"
                class="segment-pill {orientation === 'horizontal' ? 'is-active' : ''}"
                onclick={() => orientation = 'horizontal'}
            >
                {text("cardLayoutHorizontal", "经典横版")}
            </button>
            <button
                type="button"
                class="segment-pill {orientation === 'vertical' ? 'is-active' : ''}"
                onclick={() => orientation = 'vertical'}
            >
                {text("cardLayoutVertical", "立式海报")}
            </button>
        </div>
    </div>

    <!-- 实时 SVG 渲染预览容器 -->
    <div class="card-preview-viewport">
        <div class="card-svg-wrapper {orientation}">
            {@html cardSvg}
        </div>
    </div>

    {#if errorText}
        <div class="b3-label b3-label--error ft__smaller" style="margin: 4px 0;">
            {errorText}
        </div>
    {/if}

    <!-- 底部操作按钮 -->
    <div class="card-modal-footer">
        <button
            type="button"
            class="b3-button b3-button--cancel"
            onclick={onClose}
        >
            {text("commonCancel", "关闭")}
        </button>
        <button
            type="button"
            class="b3-button b3-button--outline"
            disabled={copying}
            onclick={handleCopySvg}
            title={text("cardCopySvgTip", "复制标准 SVG 矢量代码")}
        >
            {#if copied}
                <Check size={14} strokeWidth={1.6} class="ft__success" style="margin-right: 4px;" />
                <span class="ft__success">{text("cardSvgCopied", "已复制 SVG 代码 ✓")}</span>
            {:else}
                <Copy size={14} strokeWidth={1.6} style="margin-right: 4px;" />
                <span>{copying ? "复制中…" : text("cardCopySvgBtn", "复制 SVG 代码")}</span>
            {/if}
        </button>
        <button
            type="button"
            class="b3-button b3-button--primary"
            onclick={handleDownloadSvg}
            title={text("cardDownloadTip", "下载高保真 SVG 矢量图文件")}
        >
            <Download size={14} strokeWidth={1.6} style="margin-right: 4px;" />
            <span>{text("cardDownloadBtn", "下载 SVG 名片")}</span>
        </button>
    </div>
</div>

<style>
    .lvct-card-modal {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 4px;
    }

    .card-controls-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
    }

    .control-segment {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .control-label {
        font-size: 12px;
        color: var(--lvct-text-3, var(--b3-theme-on-surface-light));
        display: flex;
        align-items: center;
    }

    .segment-pill {
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        background: transparent;
        font-size: 11.5px;
        padding: 4px 12px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        color: var(--lvct-text-2, var(--b3-theme-on-surface));
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    }

    .segment-pill.is-active {
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.1));
        border-color: var(--lv-brand, #ea580c);
        color: var(--lv-brand, #ea580c);
        font-weight: 600;
    }

    .card-preview-viewport {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 12px;
        background: var(--lvct-bg-app, #F5F3F0);
        border: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        border-radius: var(--lvct-r-card, 16px);
        overflow: auto;
        max-height: 520px;
        box-shadow: inset 0 2px 6px rgba(28, 24, 21, 0.03);
    }

    .card-svg-wrapper {
        display: flex;
        box-shadow: 0 8px 30px -4px rgba(28, 24, 21, 0.16), 0 2px 10px rgba(28, 24, 21, 0.06);
        border-radius: 20px;
        max-width: 100%;
    }

    .card-svg-wrapper.horizontal {
        width: 100%;
        max-width: 600px;
        aspect-ratio: 600 / 380;
        height: auto;
    }

    .card-svg-wrapper.vertical {
        width: 100%;
        max-width: 440px;
        aspect-ratio: 440 / 600;
        height: auto;
    }

    .card-svg-wrapper :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .card-modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 6px;

        button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }
</style>
