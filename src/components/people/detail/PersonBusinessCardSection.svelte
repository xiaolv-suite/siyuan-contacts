<script lang="ts">
    import { CreditCard, Maximize2, Upload, Trash2 } from "@lucide/svelte";

    let {
        businessCardUrl,
        cardSaving = false,
        cardError = "",
        copyFieldError = "",
        onUpload,
        onDelete,
        onViewLarge,
    }: {
        businessCardUrl: string;
        cardSaving?: boolean;
        cardError?: string;
        copyFieldError?: string;
        onUpload: (file: File) => void;
        onDelete: () => void;
        onViewLarge: () => void;
    } = $props();

    let cardFileInput: HTMLInputElement | null = $state(null);

    function handleFileChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (file) {
            onUpload(file);
            input.value = "";
        }
    }
</script>

<section class="lvct-detail__section lvct-detail__business-card-section">
    <div class="lvct-detail__fields-header fn__flex" style="align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div class="fn__flex" style="align-items: center; gap: 6px;">
            <CreditCard size={14} style="color: var(--lv-brand, #ea580c);" />
            <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: var(--lvct-text-1);">实体纸质名片</h4>
        </div>
        {#if businessCardUrl}
            <div class="fn__flex" style="align-items: center; gap: 6px;">
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small font-size-11"
                    style="padding: 2px 7px;"
                    onclick={onViewLarge}
                >
                    <Maximize2 size={12} /> 查看大图
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small font-size-11"
                    style="padding: 2px 7px;"
                    onclick={() => cardFileInput?.click()}
                    disabled={cardSaving}
                >
                    <Upload size={12} /> 更换
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small font-size-11 lvct-text-danger"
                    style="padding: 2px 7px;"
                    onclick={onDelete}
                    disabled={cardSaving}
                    aria-label="删除名片图片"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        {/if}
    </div>

    <input
        type="file"
        accept="image/*"
        style="display: none;"
        bind:this={cardFileInput}
        onchange={handleFileChange}
    />

    {#if cardError}
        <div class="ft__smaller lvct-text-danger" style="margin-bottom: 6px;">{cardError}</div>
    {/if}

    {#if businessCardUrl}
        <div class="lvct-card-preview-container">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="lvct-card-preview-box"
                onclick={onViewLarge}
                title="点击放大查看名片大图"
            >
                <img src={businessCardUrl} alt="纸质名片" class="lvct-card-preview-img" />
                <div class="lvct-card-preview-overlay">
                    <Maximize2 size={16} />
                    <span>点击放大查看名片</span>
                </div>
            </div>
        </div>
    {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="lvct-card-upload-dropzone"
            onclick={() => cardFileInput?.click()}
            title="点击选择名片照片上传"
        >
            <div class="lvct-card-upload-inner">
                <CreditCard size={14} style="color: var(--lvct-text-3);" />
                <span class="lvct-card-upload-title" style="margin: 0; font-size: 12px;">上传纸质名片照片</span>
                <span class="lvct-card-upload-desc" style="font-size: 11px;">（支持 PNG/JPG/WebP 高清压缩查阅）</span>
            </div>
        </div>
    {/if}
    {#if copyFieldError}
        <p class="b3-label b3-label--error ft__smaller" style="margin: 8px 0 0;">{copyFieldError}</p>
    {/if}
</section>
