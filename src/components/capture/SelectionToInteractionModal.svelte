<script lang="ts">
    /**
     * Selection-to-Interaction 划词转互动轻量浮层
     * 桌面端：Popover (~340px 视口防溢出)
     * 移动端：底部半屏抽屉 (Bottom Sheet)
     */
    import { onMount, tick } from "svelte";
    import type { ContactSummary } from "../../domain/person.ts";
    import { type InteractionType } from "../../domain/interactions.ts";
    import {
        inferInteractionTypeFromText,
        resolvePreselectedPerson,
        searchPeopleForSelection,
    } from "../../domain/selection-resolver.ts";
    import { lvLaunchpad } from "../../libs/lv-notice-kit";
    import { Users, X } from "@lucide/svelte";

    let {
        initialText = "",
        blockId = "",
        people = [],
        isMobile = false,
        rect = null,
        onSave,
        onClose,
    }: {
        initialText?: string;
        blockId?: string;
        people: readonly ContactSummary[];
        isMobile?: boolean;
        rect?: { left: number; top: number; right: number; bottom: number; width: number; height: number } | null;
        onSave: (payload: { person: ContactSummary; note: string; type: InteractionType; blockId?: string }) => Promise<void>;
        onClose: () => void;
    } = $props();

    // svelte-ignore state_referenced_locally
    let note = $state(initialText.trim());
    // svelte-ignore state_referenced_locally
    let type = $state<InteractionType>(inferInteractionTypeFromText(initialText));
    // svelte-ignore state_referenced_locally
    let selectedPerson = $state<ContactSummary | null>(resolvePreselectedPerson(people, initialText));
    let searchQuery = $state("");
    // svelte-ignore state_referenced_locally
    let isChangingPerson = $state(!selectedPerson);
    let saving = $state(false);
    let errorMessage = $state("");

    let noteTextarea: HTMLTextAreaElement | undefined = $state();
    let searchInput: HTMLInputElement | undefined = $state();
    let popoverPanel: HTMLElement | undefined = $state();

    const filteredCandidates = $derived.by(() => {
        if (!isChangingPerson) return [];
        return searchPeopleForSelection(people, searchQuery).slice(0, 8);
    });

    const isSubmittable = $derived(
        Boolean(selectedPerson && note.trim() && !saving)
    );

    // 桌面 Popover 定位坐标计算（防视口溢出）
    let popoverStyle = $state("");

    function updatePopoverPlacement() {
        if (isMobile || !popoverPanel) return;
        const width = 340;
        const estimatedHeight = 330;
        const margin = 12;

        let left = rect ? rect.left : (window.innerWidth - width) / 2;
        let top = rect ? rect.bottom + 8 : (window.innerHeight - estimatedHeight) / 2;

        // 水平防溢出
        if (left + width > window.innerWidth - margin) {
            left = window.innerWidth - width - margin;
        }
        if (left < margin) {
            left = margin;
        }

        // 垂直防溢出：下方放不下则翻转到选区上方
        if (top + estimatedHeight > window.innerHeight - margin && rect) {
            const above = rect.top - estimatedHeight - 8;
            top = above >= margin ? above : Math.max(margin, window.innerHeight - estimatedHeight - margin);
        }

        popoverStyle = `position: fixed; left: ${Math.round(left)}px; top: ${Math.round(top)}px; width: ${width}px; z-index: 1000;`;
    }

    onMount(() => {
        updatePopoverPlacement();
        void tick().then(() => {
            if (isChangingPerson) {
                searchInput?.focus();
            } else {
                noteTextarea?.focus();
            }
        });
    });

    function selectType(newType: InteractionType) {
        lvLaunchpad.haptic(8);
        type = newType;
    }

    function choosePerson(person: ContactSummary) {
        lvLaunchpad.haptic(8);
        selectedPerson = person;
        isChangingPerson = false;
        searchQuery = "";
        void tick().then(() => noteTextarea?.focus());
    }

    function startChangePerson() {
        lvLaunchpad.haptic(6);
        isChangingPerson = true;
        searchQuery = "";
        void tick().then(() => searchInput?.focus());
    }

    async function handleSubmit() {
        if (!isSubmittable || !selectedPerson) return;
        saving = true;
        errorMessage = "";
        try {
            await onSave({
                person: selectedPerson,
                note: note.trim(),
                type,
                blockId: blockId.trim() || undefined,
            });
        } catch (err) {
            errorMessage = err instanceof Error ? err.message : String(err);
            saving = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            if (isSubmittable) void handleSubmit();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
    class="lvct-selection-backdrop lvct-dialog-mask"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
    <div
        class="lvct-selection-modal"
        class:lvct-sheet={isMobile}
        class:lvct-selection-modal--mobile={isMobile}
        style={isMobile ? "" : popoverStyle}
        bind:this={popoverPanel}
        role="dialog"
        aria-label="人脉：记一笔互动"
        aria-modal="true"
    >
        {#if isMobile}
            <div class="lvct-sheet__handle" aria-hidden="true"></div>
        {/if}

        <div class="lvct-selection-modal__head">
            <div class="lvct-selection-modal__title">
                <Users size={15} strokeWidth={1.8} class="lvct-icon-inline" />
                <b>人脉：记一笔互动</b>
            </div>
            <button
                type="button"
                class="lvct-selection-modal__close-btn"
                onclick={onClose}
                aria-label="关闭"
            ><X size={15} strokeWidth={1.8} /></button>
        </div>

        <div class="lvct-selection-modal__body">
            <!-- 目标联系人选择区 -->
            <div class="lvct-selection-modal__person-section">
                {#if selectedPerson && !isChangingPerson}
                    <div class="lvct-selection-modal__person-pill">
                        <span class="lvct-selection-modal__avatar">
                            {selectedPerson.name.slice(0, 1)}
                        </span>
                        <div class="lvct-selection-modal__person-info">
                            <b>{selectedPerson.name}</b>
                            {#if selectedPerson.group}
                                <span class="lvct-chip lvct-chip--group">{selectedPerson.group}</span>
                            {/if}
                        </div>
                        <button
                            type="button"
                            class="b3-button b3-button--text lvct-selection-modal__change-btn"
                            onclick={startChangePerson}
                        >更换</button>
                    </div>
                {:else}
                    <div class="lvct-selection-modal__search-wrap">
                        <input
                            type="search"
                            class="b3-text-field fn__block lvct-selection-modal__search-input"
                            placeholder="搜索姓名或简拼 (如 whr / lz)..."
                            aria-label="搜索联系人"
                            bind:this={searchInput}
                            bind:value={searchQuery}
                        />
                        <div class="lvct-selection-modal__candidates" role="listbox">
                            {#if filteredCandidates.length === 0}
                                <div class="lvct-selection-modal__empty-candidate ft__smaller lvct-text-muted">
                                    未找到匹配联系人
                                </div>
                            {:else}
                                {#each filteredCandidates as c (c.docId)}
                                    <button
                                        type="button"
                                        class="lvct-selection-modal__candidate-row"
                                        onclick={() => choosePerson(c)}
                                    >
                                        <span class="lvct-selection-modal__avatar-sm">{c.name.slice(0, 1)}</span>
                                        <span class="lvct-selection-modal__candidate-name">{c.name}</span>
                                        {#if c.group}
                                            <span class="lvct-chip lvct-chip--group">{c.group}</span>
                                        {/if}
                                    </button>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- 互动方式 Chips -->
            <div class="lvct-selection-modal__types" role="group" aria-label="互动方式">
                <button
                    type="button"
                    class="lvct-selection-modal__type-chip"
                    class:lvct-selection-modal__type-chip--active={type === "meeting"}
                    onclick={() => selectType("meeting")}
                >
                    <span>🤝</span> 面谈
                </button>
                <button
                    type="button"
                    class="lvct-selection-modal__type-chip"
                    class:lvct-selection-modal__type-chip--active={type === "call"}
                    onclick={() => selectType("call")}
                >
                    <span>📞</span> 电话
                </button>
                <button
                    type="button"
                    class="lvct-selection-modal__type-chip"
                    class:lvct-selection-modal__type-chip--active={type === "message"}
                    onclick={() => selectType("message")}
                >
                    <span>💬</span> 微信
                </button>
            </div>

            <!-- 互动摘要文本框 -->
            <div class="lvct-selection-modal__note-section">
                <textarea
                    class="b3-text-field fn__block lvct-selection-modal__textarea"
                    rows="3"
                    placeholder="互动摘要内容（可直接编辑）..."
                    aria-label="互动摘要内容"
                    bind:this={noteTextarea}
                    bind:value={note}
                ></textarea>
                {#if blockId}
                    <div class="lvct-selection-modal__backlink-hint ft__smaller lvct-text-muted">
                        🔗 自动附带源笔记块链接
                    </div>
                {/if}
            </div>

            {#if errorMessage}
                <div class="lvct-selection-modal__error ft__smaller lvct-text-danger">
                    {errorMessage}
                </div>
            {/if}
        </div>

        <div class="lvct-selection-modal__foot">
            <button
                type="button"
                class="b3-button b3-button--cancel lvct-selection-modal__btn"
                onclick={onClose}
                disabled={saving}
            >取消</button>
            <button
                type="button"
                class="b3-button b3-button--primary lvct-selection-modal__btn"
                disabled={!isSubmittable}
                onclick={handleSubmit}
            >
                {saving ? "记录中…" : "记入互动"}
            </button>
        </div>
    </div>
</div>
