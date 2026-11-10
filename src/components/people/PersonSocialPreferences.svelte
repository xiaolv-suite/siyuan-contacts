<script lang="ts">
    import {
        groupPreferencesByCategory,
        newSocialPreferenceId,
        SOCIAL_PREFERENCE_CATEGORIES,
        type PersonSocialPreferenceItem,
        type SocialPreferenceCategory,
    } from "../../domain/social-preferences.ts";
    import { translateText } from "../../domain/translation";
    import {
        Utensils,
        Plus,
        Trash2,
        ShieldAlert,
    } from "@lucide/svelte";

    let {
        personDocId,
        items = [],
        onAdd,
        onUpdate,
        onRemove,
        i18n,
    }: {
        personDocId: string;
        items: PersonSocialPreferenceItem[];
        onAdd: (item: PersonSocialPreferenceItem) => Promise<unknown>;
        onUpdate: (prefId: string, patch: Partial<PersonSocialPreferenceItem>) => Promise<unknown>;
        onRemove: (prefId: string) => Promise<unknown>;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let adding = $state(false);
    let newCategory: SocialPreferenceCategory = $state("dietary");
    let newContent = $state("");
    let newIsTaboo = $state(false);
    let saving = $state(false);
    let togglingId: string | null = $state(null);
    let removingId: string | null = $state(null);
    let errorText = $state("");

    const grouped = $derived(groupPreferencesByCategory(items));

    $effect(() => {
        if (newCategory === "taboos") {
            newIsTaboo = true;
        }
    });

    async function handleAdd() {
        if (saving || removingId) return;
        const trimmed = newContent.trim();
        if (!trimmed) {
            errorText = text("socialPrefsContentRequired", "偏好或忌口内容不能为空");
            return;
        }

        saving = true;
        errorText = "";
        try {
            const item: PersonSocialPreferenceItem = {
                id: newSocialPreferenceId(),
                personDocId,
                category: newCategory,
                content: trimmed,
                isTaboo: newCategory === "taboos" ? true : newIsTaboo,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await onAdd(item);
            newContent = "";
            newIsTaboo = false;
            adding = false;
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            saving = false;
        }
    }

    async function handleToggleTaboo(item: PersonSocialPreferenceItem) {
        if (saving || togglingId === item.id) return;
        togglingId = item.id;
        errorText = "";
        try {
            await onUpdate(item.id, { isTaboo: !item.isTaboo });
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            togglingId = null;
        }
    }

    async function handleRemove(prefId: string) {
        if (saving || removingId === prefId) return;
        removingId = prefId;
        errorText = "";
        try {
            await onRemove(prefId);
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            removingId = null;
        }
    }
</script>

<div class="lvct-social-prefs b3-card">
    <div class="lvct-social-prefs__header">
        <div class="fn__flex" style="align-items: center; gap: 8px;">
            <Utensils size={15} strokeWidth={1.6} class="ft__primary" />
            <span class="ft__on-surface font-weight-bold" style="font-size: 14px;">
                {text("socialPrefsTitle", "社交偏好与交往忌口档案")}
            </span>
            <span class="b3-chip b3-chip--info ft__smaller">
                {items.length}
            </span>
        </div>
        {#if !adding}
            <button
                type="button"
                class="b3-button b3-button--text b3-button--small btn-add-pref"
                onclick={() => { adding = true; errorText = ""; }}
            >
                <Plus size={13} strokeWidth={1.6} style="margin-right: 4px;" />
                {text("socialPrefsAddBtn", "添加偏好/忌口")}
            </button>
        {/if}
    </div>

    <!-- 添加表单 -->
    {#if adding}
        <div class="social-prefs-form">
            <div class="form-row">
                <span class="form-label">{text("socialPrefsCategoryLabel", "档案分类")}:</span>
                <select class="b3-select fn__flex-1" bind:value={newCategory} disabled={saving}>
                    {#each SOCIAL_PREFERENCE_CATEGORIES as c (c.key)}
                        <option value={c.key}>{c.icon} {text(`socialPrefCat_${c.key}`, c.label)}</option>
                    {/each}
                </select>
            </div>

            <div class="form-row">
                <span class="form-label">{text("socialPrefsContentLabel", "偏好细节")}:</span>
                <input
                    class="b3-text-field fn__flex-1"
                    type="text"
                    bind:value={newContent}
                    placeholder={SOCIAL_PREFERENCE_CATEGORIES.find((c) => c.key === newCategory)?.placeholder}
                    disabled={saving}
                />
            </div>

            {#if newCategory !== "taboos"}
                <div class="form-row">
                    <span class="form-label"></span>
                    <label class="taboo-checkbox-label">
                        <input type="checkbox" bind:checked={newIsTaboo} disabled={saving} />
                        <span class="ft__smaller ft__error">{text("socialPrefsIsTabooLabel", "设为重要红线/严重忌口（会前重点警示）")}</span>
                    </label>
                </div>
            {/if}

            {#if errorText}
                <div class="b3-label b3-label--error ft__smaller" style="margin-bottom: 6px;">
                    {errorText}
                </div>
            {/if}

            <div class="form-actions">
                <button
                    type="button"
                    class="b3-button b3-button--cancel b3-button--small"
                    onclick={() => { adding = false; errorText = ""; }}
                    disabled={saving}
                >
                    {text("commonCancel", "取消")}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--primary b3-button--small"
                    onclick={handleAdd}
                    disabled={saving}
                >
                    {saving ? text("commonSaving", "保存中…") : text("commonSave", "保存记录")}
                </button>
            </div>
        </div>
    {/if}

    <!-- 偏好分栏展示 -->
    <div class="social-prefs-grid">
        {#if items.length === 0 && !adding}
            <div class="empty-prefs ft__smaller ft__on-surface-variant">
                {text("socialPrefsEmpty", "暂未记录该联系人的社交偏好与饮食忌口。登记海鲜过敏、咖啡偏好或谈话禁忌，会面招待更体贴周到。")}
            </div>
        {:else}
            {#each SOCIAL_PREFERENCE_CATEGORIES as cat (cat.key)}
                {@const catItems = grouped[cat.key] || []}
                {#if catItems.length > 0}
                    <div class="category-block">
                        <div class="category-header">
                            <span class="cat-icon">{cat.icon}</span>
                            <span class="cat-title">{text(`socialPrefCat_${cat.key}`, cat.label)}</span>
                            <span class="cat-count">({catItems.length})</span>
                        </div>

                        <div class="category-items">
                            {#each catItems as item (item.id)}
                                <div class="pref-card" class:is-taboo={item.isTaboo}>
                                    <div class="pref-content">
                                        {#if item.isTaboo}
                                            <span class="taboo-badge">
                                                <ShieldAlert size={12} strokeWidth={1.6} style="margin-right: 2px;" />
                                                {text("socialPrefsTabooBadge", "红线禁忌")}
                                            </span>
                                        {/if}
                                        <span class="pref-text">{item.content}</span>
                                    </div>
                                    <div class="pref-actions">
                                        {#if item.category !== "taboos"}
                                            <button
                                                type="button"
                                                class="b3-button b3-button--text b3-button--small pref-action-btn"
                                                disabled={saving || togglingId === item.id}
                                                title={item.isTaboo ? text("socialPrefsCancelTabooTip", "取消红线标记") : text("socialPrefsMarkTabooTip", "标记为红线禁忌")}
                                                onclick={() => handleToggleTaboo(item)}
                                            >
                                                {item.isTaboo ? text("socialPrefsUnmarkTaboo", "降为偏好") : text("socialPrefsMarkTaboo", "设为禁忌")}
                                            </button>
                                        {/if}
                                        <button
                                            type="button"
                                            class="b3-button b3-button--text b3-button--small pref-action-btn btn-remove-pref ft__error"
                                            disabled={saving || removingId === item.id}
                                            title={text("commonDelete", "删除")}
                                            onclick={() => handleRemove(item.id)}
                                        >
                                            <Trash2 size={12} strokeWidth={1.6} />
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/each}
        {/if}
    </div>
</div>

<style>
    .lvct-social-prefs {
        margin: 14px 0;
        padding: 14px 16px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: 0 2px 10px rgba(28, 24, 21, 0.04);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .lvct-social-prefs__header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }

    .social-prefs-form {
        padding: 10px 14px;
        background: var(--lvct-bg-app);
        border: 1px dashed var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 12px);
        display: flex;
        flex-direction: column;
        gap: 8px;

        select, input, button {
            border-radius: var(--lv-r-pill, 9999px);
        }
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

    .taboo-checkbox-label {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
    }

    .social-prefs-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .empty-prefs {
        text-align: center;
        padding: 16px 0;
    }

    .category-block {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .category-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
    }

    .cat-icon {
        font-size: 14px;
    }

    .cat-count {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        font-weight: normal;
        font-variant-numeric: tabular-nums;
    }

    .category-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .pref-card {
        padding: 8px 12px;
        border-radius: var(--lvct-r-card, 12px);
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-color-border-200);
        box-shadow: 0 1px 4px rgba(28, 24, 21, 0.03);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(28, 24, 21, 0.06);

            .btn-remove-pref {
                opacity: 0.7;
            }
        }
    }

    .pref-card.is-taboo {
        border-left: 3px solid var(--lvct-danger, #e11d48);
        background: color-mix(in srgb, var(--lvct-danger, #e11d48) 5%, var(--lvct-bg-surface));
    }

    .pref-content {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1;
    }

    .taboo-badge {
        font-size: 10px;
        padding: 1px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        background: transparent;
        border: 1px solid color-mix(in srgb, var(--lvct-danger, #e11d48) 32%, transparent);
        color: var(--lvct-danger, #e11d48);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;

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

    .pref-text {
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        line-height: 1.4;
        word-break: break-word;
    }

    .pref-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
    }

    .pref-action-btn {
        padding: 2px 8px;
        height: auto;
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        border-radius: var(--lv-r-pill, 9999px);
    }

    .btn-remove-pref {
        opacity: 0;
        border-radius: 50% !important;
        padding: 3px !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: opacity var(--lvct-dur-fast) var(--lvct-ease), color var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            opacity: 1 !important;
        }

        &:focus-visible {
            opacity: 1;
            outline: 2px solid var(--lvct-accent);
        }

        @media (hover: none), (max-width: 768px) {
            opacity: 0.7;
        }
    }
</style>
