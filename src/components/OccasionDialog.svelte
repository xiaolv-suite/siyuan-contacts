<script lang="ts">
    /** E-30 群体活动与场合实体向导对话框 */
    import { toLocalDateKey } from "../domain/interactions";
    import { translateText } from "../domain/translation";
    import { requestErrorMessage } from "../shared/error-presenter";
    import type { ContactSummary } from "../domain/person";
    import type { OccasionAttendee, OccasionType } from "../domain/occasion-cluster";
    import type { CreateOccasionInput } from "../services/occasions";
    import { Plus, X, Users } from "@lucide/svelte";

    let {
        i18n,
        people = [],
        initialDocId = "",
        onSave,
        onClose,
    }: {
        i18n?: Readonly<Record<string, string>>;
        people?: readonly ContactSummary[];
        initialDocId?: string;
        onSave: (input: CreateOccasionInput) => Promise<void>;
        onClose: () => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let title = $state("");
    let type = $state<OccasionType>("meeting");
    let date = $state(toLocalDateKey(new Date()));
    let place = $state("");
    // svelte-ignore state_referenced_locally — 仅在对话框实例化时取初值，后续由用户输入驱动
    let sourceDocId = $state(initialDocId);
    let syncDocumentBlock = $state(true);
    let note = $state("");
    let deriveInteractions = $state(true);

    let selectedAttendees = $state<OccasionAttendee[]>([]);
    let attendeeSearch = $state("");
    let submitting = $state(false);
    let errorText = $state("");

    const availablePeople = $derived(
        people.filter((p) => {
            if (selectedAttendees.some((a) => a.personDocId === p.docId)) return false;
            if (!attendeeSearch.trim()) return true;
            return p.name.toLowerCase().includes(attendeeSearch.trim().toLowerCase());
        }),
    );

    function addAttendee(p: ContactSummary) {
        if (submitting || selectedAttendees.some((a) => a.personDocId === p.docId)) return;
        selectedAttendees = [...selectedAttendees, { personDocId: p.docId, name: p.name, role: "guest" }];
        attendeeSearch = "";
    }

    function removeAttendee(docId: string) {
        if (submitting) return;
        selectedAttendees = selectedAttendees.filter((a) => a.personDocId !== docId);
    }

    async function handleSave() {
        if (submitting) return;
        if (!title.trim()) {
            errorText = text("occErrNoTitle", "请输入活动标题");
            return;
        }
        if (selectedAttendees.length === 0) {
            errorText = text("occErrNoAttendees", "请至少选择 1 位参与联系人");
            return;
        }
        submitting = true;
        errorText = "";
        try {
            await onSave({
                title: title.trim(),
                type,
                date,
                place: place.trim() || undefined,
                attendees: selectedAttendees,
                note: note.trim() || undefined,
                deriveInteractions,
                sourceDocId: sourceDocId.trim() || undefined,
                syncDocumentBlock: Boolean(sourceDocId.trim()) && syncDocumentBlock,
            });
            onClose();
        } catch (error) {
            errorText = requestErrorMessage(error);
        } finally {
            submitting = false;
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            void handleSave();
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lvct-occ-dialog" onkeydown={handleKeydown}>
    <header class="lvct-occ-dialog__head">
        <h3 id="lvct-occ-title" class="lvct-occ-dialog__title">{text("occDialogTitle", "记录群体活动与场合")}</h3>
        <p class="ft__smaller ft__on-surface" style="margin-top: 0;">
            {text("occDialogDesc", "统一记录多人参加的会议、聚餐、婚礼等活动；保存后自动为每位参与者生成互动时间线并标记同场同行。")}
        </p>
    </header>

    <div class="lvct-occ-dialog__body">
        <div class="lvct-occ-dialog__row">
            <label for="lvct-occ-input-title" class="lvct-occ-dialog__label">{text("occFieldTitle", "活动标题 *")}</label>
            <input
                id="lvct-occ-input-title"
                class="b3-text-field fn__flex-1"
                type="text"
                placeholder={text("occTitlePlaceholder", "如：项目季度评审会、晓明婚礼、周五部门聚餐")}
                bind:value={title}
                disabled={submitting}
            />
        </div>

        <div class="lvct-occ-dialog__grid">
            <div>
                <label for="lvct-occ-select-type" class="lvct-occ-dialog__label">{text("occFieldType", "活动类型")}</label>
                <select id="lvct-occ-select-type" class="b3-select fn__block" bind:value={type} disabled={submitting}>
                    <option value="meeting">{text("occTypeMeeting", "工作会议")}</option>
                    <option value="meal">{text("occTypeMeal", "聚餐吃饭")}</option>
                    <option value="wedding">{text("occTypeWedding", "婚礼宴请")}</option>
                    <option value="party">{text("occTypeParty", "聚会活动")}</option>
                    <option value="trip">{text("occTypeTrip", "同行出游")}</option>
                    <option value="conference">{text("occTypeConference", "讲座论坛")}</option>
                    <option value="other">{text("occTypeOther", "其他活动")}</option>
                </select>
            </div>
            <div>
                <label for="lvct-occ-input-date" class="lvct-occ-dialog__label">{text("occFieldDate", "发生日期 *")}</label>
                <input
                    id="lvct-occ-input-date"
                    class="b3-text-field fn__block"
                    type="date"
                    bind:value={date}
                    disabled={submitting}
                />
            </div>
        </div>

        <div class="lvct-occ-dialog__row">
            <label for="lvct-occ-input-place" class="lvct-occ-dialog__label">{text("occFieldPlace", "活动地点")}</label>
            <input
                id="lvct-occ-input-place"
                class="b3-text-field fn__flex-1"
                type="text"
                placeholder={text("occPlacePlaceholder", "如：公司 3 号会议室、西贝餐厅")}
                bind:value={place}
                disabled={submitting}
            />
        </div>

        <div class="lvct-occ-dialog__section">
            <div class="lvct-occ-dialog__section-head">
                <span class="lvct-occ-dialog__label" style="display: inline-flex; align-items: center; gap: 5px;">
                    <Users size={13} strokeWidth={1.6} class="ft__primary" />
                    <span>{text("occFieldAttendees", "参与联系人 *")}（{selectedAttendees.length} 人）</span>
                </span>
            </div>
            {#if selectedAttendees.length > 0}
                <div class="lvct-occ-dialog__chips">
                    {#each selectedAttendees as attendee (attendee.personDocId)}
                        <span class="lvct-chip lvct-occ-attendee-chip">
                            <span class="lvct-occ-attendee-dot"></span>
                            <span class="lvct-occ-attendee-name">{attendee.name}</span>
                            <button
                                type="button"
                                class="lvct-occ-attendee-remove-btn"
                                onclick={() => removeAttendee(attendee.personDocId)}
                                disabled={submitting}
                                aria-label={text("occRemoveAttendee", "移除参与人")}
                                title={text("occRemoveAttendee", "移除参与人")}
                            >
                                <X size={11} strokeWidth={1.6} />
                            </button>
                        </span>
                    {/each}
                </div>
            {/if}
            <div class="lvct-occ-dialog__picker">
                <input
                    class="b3-text-field fn__block"
                    type="text"
                    placeholder={text("occSearchPeoplePlaceholder", "搜索联系人姓名加入活动…")}
                    bind:value={attendeeSearch}
                    disabled={submitting}
                />
                {#if attendeeSearch.trim()}
                    <ul class="lvct-occ-dialog__candidates" role="listbox">
                        {#each availablePeople.slice(0, 8) as candidate (candidate.docId)}
                            <li>
                                <button
                                    type="button"
                                    class="b3-button b3-button--text fn__block lvct-occ-candidate-btn"
                                    onclick={() => addAttendee(candidate)}
                                >
                                    <Plus size={12} strokeWidth={1.6} />
                                    <span>{candidate.name}</span>
                                    {#if candidate.group}<span class="ft__smaller ft__on-surface">（{candidate.group}）</span>{/if}
                                </button>
                            </li>
                        {/each}
                        {#if availablePeople.length === 0}
                            <li class="ft__smaller ft__on-surface" style="padding: 6px 8px;">{text("occNoMatchingPeople", "未找到匹配联系人")}</li>
                        {/if}
                    </ul>
                {/if}
            </div>
        </div>

        <div class="lvct-occ-dialog__row">
            <label class="b3-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" bind:checked={deriveInteractions} disabled={submitting} />
                <span>{text("occDeriveCheckbox", "自动为所有参与者生成互动时间线并标记同场出席")}</span>
            </label>
        </div>

        <div class="lvct-occ-dialog__row">
            <label for="lvct-occ-input-source" class="lvct-occ-dialog__label">{text("occFieldSourceDoc", "关联思源笔记文档 ID（可选）")}</label>
            <input
                id="lvct-occ-input-source"
                class="b3-text-field fn__block"
                type="text"
                placeholder={text("occSourceDocPlaceholder", "如 20261020120000-xxxxxxx，支持在笔记正文插入人脉双链摘要块")}
                bind:value={sourceDocId}
                disabled={submitting}
            />
        </div>

        {#if sourceDocId.trim()}
            <div class="lvct-occ-dialog__row">
                <label class="b3-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" bind:checked={syncDocumentBlock} disabled={submitting} />
                    <span>{text("occSyncBlockCheckbox", "在关联思源笔记中同步插入/更新受控人脉双链摘要块")}</span>
                </label>
            </div>
        {/if}

        <div class="lvct-occ-dialog__row">
            <label for="lvct-occ-input-note" class="lvct-occ-dialog__label">{text("occFieldNote", "活动备注")}</label>
            <textarea
                id="lvct-occ-input-note"
                class="b3-text-field fn__block"
                rows="2"
                placeholder={text("occNotePlaceholder", "记录会议结论、讨论焦点或随手备忘…")}
                bind:value={note}
                disabled={submitting}
            ></textarea>
        </div>

        {#if errorText}
            <p class="lvct-form__error" role="alert">{errorText}</p>
        {/if}
    </div>

    <footer class="lvct-occ-dialog__footer">
        <button type="button" class="b3-button b3-button--outline" style="border-radius: var(--lv-r-pill, 9999px);" onclick={onClose} disabled={submitting}>{text("cancel", "取消")}</button>
        <button type="button" class="b3-button b3-button--primary" style="border-radius: var(--lv-r-pill, 9999px);" onclick={handleSave} disabled={submitting}>
            {submitting ? text("occSaving", "保存中…") : text("occSaveBtn", "保存活动")}
        </button>
    </footer>
</div>

<style>
.lvct-occ-dialog {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.lvct-occ-dialog__head {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.lvct-occ-dialog__title {
    display: none;
}
.lvct-occ-dialog__body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.lvct-occ-dialog__row {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.lvct-occ-dialog__label {
    font-size: 12px;
    font-weight: 600;
    color: var(--b3-theme-on-surface);
}
.lvct-occ-dialog__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.lvct-occ-dialog__section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    background: var(--b3-theme-background-light, rgba(0, 0, 0, 0.02));
    border: 1px solid var(--lvct-border-subtle);
    border-radius: var(--lvct-r-card, 12px);
    box-shadow: 0 1px 3px rgba(28, 24, 21, 0.02);
}
.lvct-occ-dialog__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.lvct-occ-attendee-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: var(--lv-r-pill, 9999px);
    background: var(--b3-theme-surface, #ffffff);
    border: 1px solid var(--lvct-border-subtle);
    font-size: 11.5px;
    color: var(--b3-theme-on-background);
    box-shadow: 0 1px 2px rgba(28, 24, 21, 0.03);
}
.lvct-occ-attendee-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--lv-brand, #ea580c);
    forced-color-adjust: none;
}
.lvct-occ-attendee-remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: var(--b3-theme-on-surface-light, #888);
    padding: 2px;
    cursor: pointer;
    border-radius: var(--lv-r-pill, 9999px);
    opacity: 0.65;
    transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}
.lvct-occ-attendee-remove-btn:hover {
    opacity: 1;
    color: var(--b3-theme-error, #ef4444);
    background: rgba(239, 68, 68, 0.08);
}
.lvct-occ-dialog__picker {
    position: relative;
}
.lvct-occ-dialog__candidates {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 10;
    background: var(--b3-theme-surface);
    border: 1px solid var(--lvct-border-subtle);
    border-radius: var(--lvct-r-card, 12px);
    box-shadow: 0 8px 24px rgba(28, 24, 21, 0.12);
    list-style: none;
    margin: 4px 0 0 0;
    padding: 4px;
    max-height: 200px;
    overflow-y: auto;
}
.lvct-occ-candidate-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    border-radius: var(--lvct-r-sm, 6px);
    font-size: 12px;
}
.lvct-occ-dialog__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
}
.lvct-occ-dialog__footer button {
    border-radius: var(--lv-r-pill, 9999px);
}
@media (max-width: 480px) {
    .lvct-occ-dialog__grid {
        grid-template-columns: 1fr;
        gap: 8px;
    }
}
</style>
