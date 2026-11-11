<script lang="ts">
    /**
     * 文档档案条快捷记互动弹窗：无需跳转人脉主界面，在人物文档直接记录交往事实。
     */
    import type { Plugin } from "siyuan";
    import type { ContactSummary } from "../../domain/person";
    import {
        INTERACTION_TYPES,
        INTERACTION_TYPE_LABELS,
        toLocalDateKey,
        type InteractionType,
    } from "../../domain/interactions";
    import { recordInteractionWithResult, deleteInteraction } from "../../data/interactions";
    import { syncInteractionDocSection, loadPersonFactsFromDoc, savePersonFactsToDoc } from "../../services/doc-section";
    import type { FactCategory, PersonFactItem } from "../../domain/doc-section";
    import { appendInteractionToDailyNote, removeDailyNoteInteractionByEventId } from "../../services/diary";
    import { translateText } from "../../domain/translation";
    import { requestErrorMessage } from "../../shared/error-presenter";
    import { emitDataChanged } from "../../libs/data-events";
    import { logCheckinEventSafely } from "../../libs/ecosystem-bridge-kit";
    import { lvNotify, lvActivity, lvLaunchpad } from "../../libs/lv-notice-kit";
    import type { ContactsSettings } from "../../domain/model";
    import { onMount } from "svelte";

    let {
        plugin,
        person,
        i18n,
        onSaved,
        onClose,
    }: {
        plugin: Plugin;
        person: ContactSummary;
        i18n?: Readonly<Record<string, string>>;
        onSaved?: () => void;
        onClose: () => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string) => translateText(i18n, key, fallback));

    let type = $state<InteractionType>("meeting");
    let date = $state(toLocalDateKey(new Date()));
    const todayStr = toLocalDateKey(new Date());
    const yesterdayStr = toLocalDateKey(new Date(Date.now() - 86400000));
    const dayBeforeYesterdayStr = toLocalDateKey(new Date(Date.now() - 86400000 * 2));
    let note = $state("");
    let syncToDailyNote = $state(true);
    let saveAsFact = $state(false);
    let factCategory = $state<FactCategory>("quote");
    let busy = $state(false);
    let interactionRecorded = $state(false);
    let factRecorded = $state(false);
    let savedFactId = $state<string | null>(null);
    let errorMessage = $state("");
    let textareaEl: HTMLTextAreaElement | undefined = $state();

    onMount(() => {
        textareaEl?.focus();
    });

    /** Mobile Spec v1 专项 3：互动记录常用快捷模板 chips */
    function applyQuickInteractionChip(itype: InteractionType, chipNote: string) {
        lvLaunchpad.haptic(8);
        type = itype;
        note = chipNote;
        if (!date) date = todayStr;
        textareaEl?.focus();
    }

    async function handleSave() {
        if (busy) return;
        busy = true;
        errorMessage = "";
        try {
            const targetDate = date || toLocalDateKey();
            const occurredAt = new Date(`${targetDate}T12:00:00`).getTime();
            if (!interactionRecorded) {
                const res = await recordInteractionWithResult(plugin, {
                    personDocId: person.docId,
                    note: note.trim() || undefined,
                    type,
                    occurredAt,
                    source: "manual",
                });
                interactionRecorded = true;
                const eventId = res.event?.id || res.store.events[res.store.events.length - 1]?.id;

                const actionLabel = type === "call" ? "电话沟通"
                    : type === "message" ? "线上交流"
                    : type === "email" ? "邮件联络"
                    : type === "meal" ? "聚餐商谈"
                    : "线下会面";
                lvActivity.record({
                    source: "人脉",
                    category: "contact",
                    title: `与 ${person.name} ${actionLabel}`,
                    detail: note.trim() || undefined,
                    linkBlockId: person.docId,
                });

                let appendDiaryPromise: Promise<unknown> | null = null;

                const pluginSettings = (plugin as Plugin & { settings?: ContactsSettings }).settings;
                if (syncToDailyNote && pluginSettings?.notebookId) {
                    appendDiaryPromise = appendInteractionToDailyNote(pluginSettings.notebookId, {
                        eventId,
                        personDocId: person.docId,
                        personName: person.name,
                        localDate: targetDate,
                        type,
                        note: note.trim() || undefined,
                        occurredAt,
                    });
                    appendDiaryPromise.catch(() => {});
                }

                // 标准库 v1.6.0：capsule 不承载动作按钮，撤销确认改由紧凑卡片承载
                lvNotify.card({
                    source: "小驴人脉",
                    message: `已记录与「${person.name}」的互动`,
                    level: "success",
                    duration: 5000,
                    actions: eventId ? [
                        {
                            label: "撤销",
                            primary: true,
                            onClick: async () => {
                                try {
                                    await deleteInteraction(plugin, eventId, person.docId);
                                    void syncInteractionDocSection(plugin, person.docId).catch(() => {});
                                    if (appendDiaryPromise) {
                                        await appendDiaryPromise.catch(() => {});
                                    }
                                    await removeDailyNoteInteractionByEventId(eventId).catch(() => {});
                                    if (savedFactId) {
                                        try {
                                            const existing = await loadPersonFactsFromDoc(person.docId);
                                            await savePersonFactsToDoc(person.docId, existing.filter((f) => f.id !== savedFactId));
                                        } catch (factErr) {
                                            console.warn("[LvContacts] 撤销回滚事实段异常", factErr);
                                        }
                                    }
                                    emitDataChanged({ topics: ["people"], docIds: [person.docId] });
                                    lvNotify.capsule({
                                        source: "小驴人脉",
                                        message: `已撤销与「${person.name}」的互动记录`,
                                        level: "info",
                                    });
                                } catch (err) {
                                    lvNotify.card({
                                        source: "小驴人脉",
                                        title: "撤销失败",
                                        message: `未能撤销互动记录：${err instanceof Error ? err.message : String(err)}`,
                                        level: "error",
                                    });
                                }
                            },
                        },
                    ] : undefined,
                });

                if (pluginSettings?.checkinItemId) {
                    void logCheckinEventSafely({
                        itemId: pluginSettings.checkinItemId,
                        value: 1,
                        externalRef: `contacts:${person.docId}:${targetDate}:${occurredAt}`,
                        note: note.trim() ? `与联系人互动：${note.trim()}` : "与联系人互动跟进",
                    }).catch(() => {});
                }
                emitDataChanged({ topics: ["people"], docIds: [person.docId] });
                void syncInteractionDocSection(plugin, person.docId).catch(() => {});
            }

            if (saveAsFact && !factRecorded && note.trim() && person?.docId) {
                try {
                    const existing = await loadPersonFactsFromDoc(person.docId);
                    const newFact: PersonFactItem = {
                        id: `fact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        text: note.trim(),
                        category: factCategory,
                        date: targetDate,
                    };
                    await savePersonFactsToDoc(person.docId, [newFact, ...existing]);
                    savedFactId = newFact.id;
                    factRecorded = true;
                    emitDataChanged({ topics: ["people"], docIds: [person.docId] });
                    await syncInteractionDocSection(plugin, person.docId).catch(() => {});
                } catch (e) {
                    onSaved?.();
                    errorMessage = `互动已记录，但写入人物事实段未完成（可再次点击保存重试事实段）：${requestErrorMessage(e)}`;
                    return;
                }
            }
            onSaved?.();
            onClose();
        } catch (err) {
            errorMessage = requestErrorMessage(err);
        } finally {
            busy = false;
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (busy) return;
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            void handleSave();
        } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="b3-dialog__content lvct-quick-record-dialog" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
    {#if errorMessage}
        <div class="b3-snackbar__content b3-snackbar--error" role="alert" style="margin: 0;">
            {errorMessage}
        </div>
    {/if}

    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <label class="lvct-form__item" style="margin: 0;">
            <span class="ft__smaller ft__on-surface" style="margin-bottom: 4px; display: block;">{text("dialogDate", "互动日期")}</span>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <input
                    class="b3-text-field"
                    type="date"
                    style="width: 135px; border-radius: var(--lv-r-pill, 9999px);"
                    bind:value={date}
                    disabled={busy}
                />
                <div style="display: flex; gap: 3px; align-items: center;">
                    <button type="button" class="b3-chip font-size-11" style="border-radius: var(--lv-r-pill, 9999px);" class:b3-chip--primary={date === todayStr} disabled={busy} onclick={() => (date = todayStr)}>今天</button>
                    <button type="button" class="b3-chip font-size-11" style="border-radius: var(--lv-r-pill, 9999px);" class:b3-chip--primary={date === yesterdayStr} disabled={busy} onclick={() => (date = yesterdayStr)}>昨天</button>
                    <button type="button" class="b3-chip font-size-11" style="border-radius: var(--lv-r-pill, 9999px);" class:b3-chip--primary={date === dayBeforeYesterdayStr} disabled={busy} onclick={() => (date = dayBeforeYesterdayStr)}>前天</button>
                </div>
            </div>
        </label>
        <div class="lvct-form__item fn__flex-1" style="margin: 0;">
            <span class="ft__smaller ft__on-surface" style="margin-bottom: 4px; display: block;">{text("dialogType", "互动类型")}</span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                {#each INTERACTION_TYPES as itype}
                    <button
                        type="button"
                        class="b3-chip font-size-11"
                        style="border-radius: var(--lv-r-pill, 9999px);"
                        class:b3-chip--primary={type === itype}
                        disabled={busy}
                        onclick={() => (type = itype)}
                    >
                        {INTERACTION_TYPE_LABELS[itype].icon} {INTERACTION_TYPE_LABELS[itype].label}
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <div class="lvct-form__item" style="margin: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span class="ft__smaller ft__on-surface">{text("dialogNote", "互动详情与备注")}</span>
            <!-- Mobile Spec v1 专项 3：常用快捷模板 chips -->
            <div class="lvct-quick-template-chips" role="group" aria-label="快捷模板" style="display: flex; gap: 4px; flex-wrap: wrap;">
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    style="border-radius: var(--lv-r-pill, 9999px); cursor: pointer; touch-action: manipulation; padding: 1px 8px;"
                    disabled={busy}
                    onclick={() => applyQuickInteractionChip("call", "电话联络 30 分钟")}
                >📞 电话 30m</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    style="border-radius: var(--lv-r-pill, 9999px); cursor: pointer; touch-action: manipulation; padding: 1px 8px;"
                    disabled={busy}
                    onclick={() => applyQuickInteractionChip("message", "微信互动")}
                >💬 微信互动</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    style="border-radius: var(--lv-r-pill, 9999px); cursor: pointer; touch-action: manipulation; padding: 1px 8px;"
                    disabled={busy}
                    onclick={() => applyQuickInteractionChip("meeting", "见面交流")}
                >🤝 见面交流</button>
            </div>
        </div>
        <textarea
            bind:this={textareaEl}
            class="b3-text-field fn__block"
            style="border-radius: var(--lvct-r-card, 12px);"
            rows="4"
            placeholder={text("dialogNotePlaceholder", "记录这次交流的核心事实、沟通要点或约定事项…")}
            bind:value={note}
            disabled={busy}
        ></textarea>
        <span class="ft__smaller ft__on-surface" style="margin-top: 4px; display: block; opacity: 0.7;">支持按 Ctrl+Enter 快捷保存，Esc 快速关闭</span>
    </div>

    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--lvct-text-2); margin-top: -4px;">
        <input type="checkbox" bind:checked={syncToDailyNote} disabled={busy} />
        <span>同步写入思源当日日记文档（带人物双链）</span>
    </label>

    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: -6px;">
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--lvct-text-2);">
            <input type="checkbox" bind:checked={saveAsFact} disabled={busy} />
            <span>💡 同时沉淀为社交画像事实（提炼观点与关键备忘）</span>
        </label>
        {#if saveAsFact}
            <div style="display: flex; gap: 4px; padding-left: 20px; flex-wrap: wrap;">
                <button type="button" class="b3-chip font-size-11" style="border-radius: var(--lv-r-pill, 9999px);" class:b3-chip--primary={factCategory === "quote"} disabled={busy} onclick={() => (factCategory = "quote")}>💡 观点见解</button>
                <button type="button" class="b3-chip font-size-11" style="border-radius: var(--lv-r-pill, 9999px);" class:b3-chip--primary={factCategory === "preference"} disabled={busy} onclick={() => (factCategory = "preference")}>❤️ 喜好忌口</button>
                <button type="button" class="b3-chip font-size-11" style="border-radius: var(--lv-r-pill, 9999px);" class:b3-chip--primary={factCategory === "background"} disabled={busy} onclick={() => (factCategory = "background")}>💼 背景经历</button>
                <button type="button" class="b3-chip font-size-11" style="border-radius: var(--lv-r-pill, 9999px);" class:b3-chip--primary={factCategory === "fact"} disabled={busy} onclick={() => (factCategory = "fact")}>📌 关键事实</button>
            </div>
        {/if}
    </div>

    <div class="fn__flex dialog-actions" style="justify-content: flex-end; gap: 8px; margin-top: 4px;">
        <button
            type="button"
            class="b3-button b3-button--cancel"
            style="border-radius: var(--lv-r-pill, 9999px);"
            disabled={busy}
            onclick={onClose}
        >{text("commonCancel", "取消")}</button>
        <button
            type="button"
            class="b3-button b3-button--text"
            style="border-radius: var(--lv-r-pill, 9999px);"
            disabled={busy}
            onclick={handleSave}
        >{busy ? text("commonSaving", "保存中…") : text("commonSave", "保存互动")}</button>
    </div>
</div>

<style>
    .lvct-quick-record-dialog {
        background: var(--lvct-bg-surface);
        border-radius: var(--lvct-r-card, 16px);

        input[type="date"] {
            border-radius: var(--lv-r-pill, 9999px);
        }

        .b3-chip {
            border-radius: var(--lv-r-pill, 9999px);
        }

        .b3-button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }
</style>
