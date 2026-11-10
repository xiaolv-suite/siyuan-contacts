<script lang="ts">
    import {
        buildTidyPlan,
        type TidyPlanItem,
    } from "../../domain/unorganized-tidy.ts";
    import type { ContactSummary } from "../../domain/person.ts";
    import { profileText } from "../../domain/people-profiles.ts";
    import { translateText } from "../../domain/translation";
    import { Sparkles, Check, Plus } from "@lucide/svelte";

    let {
        people,
        availableGroups = [],
        onSaveBatch,
        onClose,
        i18n,
    }: {
        people: readonly ContactSummary[];
        availableGroups?: readonly string[];
        onSaveBatch: (updates: Array<{ itemId: string; group?: string; tags?: string[] }>) => Promise<void>;
        onClose: () => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    const plan = $derived(buildTidyPlan(people, availableGroups));

    // 每人的当前采纳草稿 { [itemId]: { group: string, tags: string[] } }
    let drafts = $state<Record<string, { group: string; tags: string[] }>>({});
    let busy = $state(false);
    let errorText = $state("");

    function getDraft(item: TidyPlanItem): { group: string; tags: string[] } {
        return drafts[item.person.itemId] || {
            group: item.currentGroup,
            tags: [...item.currentTags],
        };
    }

    function adoptGroup(itemId: string, group: string) {
        const cur = drafts[itemId] || { group: "", tags: [] };
        drafts = { ...drafts, [itemId]: { ...cur, group } };
    }

    function toggleTag(itemId: string, tag: string) {
        const cur = drafts[itemId] || { group: "", tags: [] };
        const has = cur.tags.includes(tag);
        const nextTags = has ? cur.tags.filter((t) => t !== tag) : [...cur.tags, tag];
        drafts = { ...drafts, [itemId]: { ...cur, tags: nextTags } };
    }

    function adoptAllForPerson(item: TidyPlanItem) {
        const cur = drafts[item.person.itemId] || { group: item.currentGroup, tags: [...item.currentTags] };
        const group = item.isMissingGroup && item.suggestedGroup ? item.suggestedGroup : cur.group;
        const tags = item.isMissingTags && item.suggestedTags.length > 0
            ? Array.from(new Set([...cur.tags, ...item.suggestedTags]))
            : cur.tags;
        drafts = { ...drafts, [item.person.itemId]: { group, tags } };
    }

    function adoptAllBatch() {
        const next: Record<string, { group: string; tags: string[] }> = { ...drafts };
        for (const item of plan) {
            const cur = next[item.person.itemId] || { group: item.currentGroup, tags: [...item.currentTags] };
            const group = item.isMissingGroup && item.suggestedGroup ? item.suggestedGroup : cur.group;
            const tags = item.isMissingTags && item.suggestedTags.length > 0
                ? Array.from(new Set([...cur.tags, ...item.suggestedTags]))
                : cur.tags;
            next[item.person.itemId] = { group, tags };
        }
        drafts = next;
    }

    const changedUpdates = $derived.by(() => {
        const updates: Array<{ itemId: string; group?: string; tags?: string[] }> = [];
        for (const item of plan) {
            const d = drafts[item.person.itemId];
            if (!d) continue;
            const groupChanged = d.group !== item.currentGroup && Boolean(d.group);
            const tagsChanged = JSON.stringify(d.tags) !== JSON.stringify(item.currentTags);
            if (groupChanged || tagsChanged) {
                updates.push({
                    itemId: item.person.itemId,
                    ...(groupChanged ? { group: d.group } : {}),
                    ...(tagsChanged ? { tags: d.tags } : {}),
                });
            }
        }
        return updates;
    });

    async function handleApply() {
        if (busy || changedUpdates.length === 0) return;
        busy = true;
        errorText = "";
        try {
            await onSaveBatch(changedUpdates);
            onClose();
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            busy = false;
        }
    }
</script>

<div class="lvct-tidy-drawer">
    <div class="tidy-header-bar">
        <div class="header-info">
            <span class="header-icon">🧹</span>
            <div class="header-text">
                <span class="header-sub ft__smaller ft__on-surface">
                    {text("tidyFoundCount", "共发现 {n} 位缺少分组或画像标签的联系人", { n: plan.length })}
                </span>
            </div>
        </div>

        {#if plan.length > 0}
            <button
                type="button"
                class="b3-button b3-button--outline btn-adopt-all"
                onclick={adoptAllBatch}
                disabled={busy}
            >
                <Sparkles size={13} class="lvct-icon-inline" />
                {text("adoptAllBatchBtn", "⚡ 一键采纳全部推荐")}
            </button>
        {/if}
    </div>

    {#if errorText}
        <div class="lvct-form__error" role="alert">{errorText}</div>
    {/if}

    <div class="tidy-content-list">
        {#if plan.length === 0}
            <div class="empty-state ft__smaller ft__on-surface-variant">
                {text("tidyAllClear", "太棒了！全库人脉已全部安顿完毕，无任何缺少分组或标签的混乱条目。")}
            </div>
        {:else}
            {#each plan as item (item.person.itemId)}
                {@const d = getDraft(item)}
                {@const isFullyAdopted = (!item.isMissingGroup || d.group === item.suggestedGroup) && (!item.isMissingTags || item.suggestedTags.every((st) => d.tags.includes(st)))}
                {@const rawWork = (item.person as any).company || (item.person.profile ? profileText(item.person.profile, "work") : "")}
                {@const workStr = rawWork !== "未填写" && rawWork !== "尚未核实" && rawWork !== "组织归属尚未核实" ? rawWork : ""}
                <div class="tidy-item-card">
                    <div class="card-left">
                        <div class="avatar-sm" data-group={d.group || item.currentGroup || "未分组"}>
                            {item.person.name.slice(0, 1)}
                        </div>
                        <div class="person-meta">
                            <div class="name-line">
                                <span class="person-name">{item.person.name}</span>
                                {#if d.group}
                                    <span class="lvct-chip lvct-chip--group font-size-11">{d.group}</span>
                                {:else}
                                    <span class="lvct-chip lvct-chip--dashed font-size-11">{text("noGroup", "待定分组")}</span>
                                {/if}
                            </div>
                            <div class="work-line ft__smaller ft__on-surface">
                                {workStr || text("noWorkAffiliation", "暂无履历背景")}
                            </div>
                        </div>
                    </div>

                    <div class="card-suggestions">
                        <!-- 建议分组 -->
                        {#if item.isMissingGroup && item.suggestedGroup}
                            <div class="suggestion-row">
                                <span class="sugg-label ft__smaller">{text("suggGroupLabel", "推荐分组：")}</span>
                                <button
                                    type="button"
                                    class="b3-chip sugg-chip {d.group === item.suggestedGroup ? 'is-adopted' : ''}"
                                    onclick={() => adoptGroup(item.person.itemId, item.suggestedGroup)}
                                >
                                    {#if d.group === item.suggestedGroup}<Check size={11} class="lvct-icon-inline" />{:else}<Plus size={11} class="lvct-icon-inline" />{/if}
                                    {item.suggestedGroup}
                                </button>
                            </div>
                        {/if}

                        <!-- 建议标签 -->
                        {#if item.isMissingTags && item.suggestedTags.length > 0}
                            <div class="suggestion-row">
                                <span class="sugg-label ft__smaller">{text("suggTagsLabel", "推荐标签：")}</span>
                                <div class="tags-pill-wrap">
                                    {#each item.suggestedTags as stag}
                                        {@const isTagged = d.tags.includes(stag)}
                                        <button
                                            type="button"
                                            class="b3-chip sugg-tag-chip {isTagged ? 'is-adopted' : ''}"
                                            onclick={() => toggleTag(item.person.itemId, stag)}
                                        >
                                            {#if isTagged}<Check size={10} class="lvct-icon-inline" />{:else}<Plus size={10} class="lvct-icon-inline" />{/if}
                                            {stag}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>

                    <div class="card-right-action">
                        <button
                            type="button"
                            class="b3-button b3-button--text b3-button--small btn-adopt-person"
                            class:b3-button--primary={isFullyAdopted}
                            onclick={() => adoptAllForPerson(item)}
                            title={text("adoptPersonTip", "采纳该联系人的全部推荐信息")}
                        >
                            {#if isFullyAdopted}
                                <Check size={12} class="lvct-icon-inline" /> 已采纳
                            {:else}
                                {text("adoptSingle", "全部采纳")}
                            {/if}
                        </button>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    <div class="tidy-footer-actions">
        <span class="footer-counter ft__smaller ft__on-surface">
            {text("readyToApplyCount", "已就绪待更新：{n} 人", { n: changedUpdates.length })}
        </span>
        <span style="flex: 1"></span>
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
            class="b3-button b3-button--text btn-apply-batch"
            onclick={handleApply}
            disabled={busy || changedUpdates.length === 0}
        >
            {busy ? text("saving", "保存中…") : text("applyAndSaveBatch", "应用并批量保存 ({n})", { n: changedUpdates.length })}
        </button>
    </div>
</div>

<style>
    .lvct-tidy-drawer {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 340px;
        max-width: 680px;
        max-height: 80vh;
    }

    .tidy-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--b3-border-color);
        padding-bottom: 8px;
    }

    .header-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .header-icon {
        font-size: 18px;
    }

    .header-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .btn-adopt-all {
        font-size: 11px;
        padding: 4px 12px;
        font-weight: 600;
        border-radius: var(--lv-r-pill, 9999px);
    }

    .tidy-content-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 220px;
        max-height: 55vh;
        padding-right: 4px;
    }

    .tidy-item-card {
        padding: 10px 14px;
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 16px);
        background: var(--lvct-bg-surface);
        box-shadow: var(--lvct-shadow-1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: var(--lvct-shadow-2);
        }
    }

    .card-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 160px;
    }

    .avatar-sm {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--b3-theme-surface-lighter);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 13px;
        flex-shrink: 0;
    }

    .person-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .name-line {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .person-name {
        font-weight: 600;
        font-size: 13px;
    }

    .card-suggestions {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 220px;
    }

    .suggestion-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .sugg-label {
        color: var(--b3-theme-on-surface-light);
        flex-shrink: 0;
    }

    .sugg-chip,
    .sugg-tag-chip {
        font-size: 11px;
        padding: 2px 9px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: var(--b3-theme-surface-lighter);
        border: 1px solid var(--b3-border-color);
        transition: all 0.15s ease;
    }

    .sugg-chip.is-adopted,
    .sugg-tag-chip.is-adopted {
        background: color-mix(in srgb, var(--b3-theme-primary) 15%, transparent);
        color: var(--b3-theme-primary);
        border-color: var(--b3-theme-primary);
        font-weight: 600;
    }

    .tags-pill-wrap {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
    }

    .card-right-action {
        flex-shrink: 0;
    }

    .btn-adopt-person {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: var(--lv-r-pill, 9999px);
    }

    .tidy-footer-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        border-top: 1px solid var(--b3-border-color);
        padding-top: 10px;
        margin-top: 4px;

        .b3-button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }

    .btn-apply-batch {
        font-weight: 600;
    }

    .empty-state {
        text-align: center;
        padding: 40px 16px;
        color: var(--b3-theme-on-surface-light);
    }
</style>
