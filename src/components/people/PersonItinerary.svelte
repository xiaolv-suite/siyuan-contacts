<script lang="ts">
    import {
        newItineraryId,
        newChecklistId,
        validateItineraryItem,
        filterItineraries,
        formatItineraryMarkdown,
        type PersonItineraryItem,
        type ItineraryChecklistItem,
        type ItineraryStatus,
    } from "../../domain/itineraries.ts";
    import { translateText } from "../../domain/translation";
    import { copyPlainText } from "../../shared/clipboard.ts";
    import { confirmDialog } from "../../libs/confirm-dialog";
    import { toLocalDateKey } from "../../domain/interactions.ts";
    import { onDestroy } from "svelte";
    import {
        Calendar,
        Clock,
        MapPin,
        Users,
        CheckSquare,
        Square,
        Plus,
        Trash2,
        Copy,
        Check,
        Edit3,
        FileText,
    } from "@lucide/svelte";

    let {
        personDocId,
        personName,
        items = [],
        onSave,
        onRemove,
        onToggleChecklist,
        onConvertItineraryToInteraction,
        i18n,
    }: {
        personDocId: string;
        personName: string;
        items: readonly PersonItineraryItem[];
        onSave: (item: PersonItineraryItem) => Promise<void>;
        onRemove: (itineraryId: string) => Promise<void>;
        onToggleChecklist: (itineraryId: string, checklistId: string) => Promise<void>;
        onConvertItineraryToInteraction?: (item: PersonItineraryItem) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let filterStatus: "all" | ItineraryStatus = $state("all");
    let isEditing = $state(false);
    let editingId = $state<string | null>(null);
    let busy = $state(false);
    let copyingId = $state<string | null>(null);
    let togglingChecklistId = $state<string | null>(null);
    let errorText = $state("");
    let copiedId = $state("");

    // 表单状态
    let formTitle = $state("");
    let formDate = $state(toLocalDateKey(new Date()));
    let formTime = $state("");
    let formLocation = $state("");
    let formAttendees = $state("");
    let formNote = $state("");
    let formStatus: ItineraryStatus = $state("planned");
    let formChecklists = $state<ItineraryChecklistItem[]>([]);
    let newChecklistText = $state("");

    const displayedItems = $derived(
        filterItineraries(items, filterStatus)
    );

    const plannedCount = $derived(items.filter((i) => i.status === "planned").length);
    const completedCount = $derived(items.filter((i) => i.status === "completed").length);

    function startCreate() {
        editingId = null;
        formTitle = "";
        formDate = toLocalDateKey(new Date());
        formTime = "";
        formLocation = "";
        formAttendees = "";
        formNote = "";
        formStatus = "planned";
        formChecklists = [
            { id: newChecklistId(), text: text("defaultChecklist1", "准备拜访材料/方案"), done: false },
        ];
        newChecklistText = "";
        errorText = "";
        isEditing = true;
    }

    function startEdit(item: PersonItineraryItem) {
        editingId = item.id;
        formTitle = item.title;
        formDate = item.targetDate;
        formTime = item.targetTime ?? "";
        formLocation = item.location ?? "";
        formAttendees = item.attendees ?? "";
        formNote = item.note ?? "";
        formStatus = item.status;
        formChecklists = item.checklists.map((c) => ({ ...c }));
        newChecklistText = "";
        errorText = "";
        isEditing = true;
    }

    function cancelEdit() {
        isEditing = false;
        editingId = null;
        errorText = "";
    }

    function addChecklistItem() {
        if (!newChecklistText.trim() || formChecklists.length >= 10) return;
        formChecklists = [
            ...formChecklists,
            { id: newChecklistId(), text: newChecklistText.trim(), done: false },
        ];
        newChecklistText = "";
    }

    function removeChecklistItem(id: string) {
        formChecklists = formChecklists.filter((c) => c.id !== id);
    }

    async function handleSave() {
        if (busy) return;
        const itemToValidate: Partial<PersonItineraryItem> = {
            title: formTitle,
            targetDate: formDate,
            targetTime: formTime.trim() || undefined,
            location: formLocation.trim() || undefined,
            attendees: formAttendees.trim() || undefined,
            note: formNote.trim() || undefined,
            checklists: formChecklists,
        };

        const errors = validateItineraryItem(itemToValidate);
        if (errors.length > 0) {
            errorText = errors.join("；");
            return;
        }

        busy = true;
        errorText = "";
        try {
            const item: PersonItineraryItem = {
                id: editingId || newItineraryId(),
                personDocId,
                title: formTitle.trim(),
                targetDate: formDate.trim(),
                ...(formTime.trim() ? { targetTime: formTime.trim() } : {}),
                ...(formLocation.trim() ? { location: formLocation.trim() } : {}),
                ...(formAttendees.trim() ? { attendees: formAttendees.trim() } : {}),
                checklists: formChecklists,
                ...(formNote.trim() ? { note: formNote.trim() } : {}),
                status: formStatus,
                createdAt: editingId ? (items.find((i) => i.id === editingId)?.createdAt ?? Date.now()) : Date.now(),
                updatedAt: Date.now(),
            };
            await onSave(item);
            isEditing = false;
            editingId = null;
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            busy = false;
        }
    }

    async function handleDelete(id: string) {
        if (busy) return;
        if (!(await confirmDialog({ message: text("confirmDeleteItinerary", "确定删除这条会面行程备忘吗？"), danger: true }))) return;
        busy = true;
        try {
            await onRemove(id);
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            busy = false;
        }
    }

    async function handleStatusChange(item: PersonItineraryItem, newStatus: ItineraryStatus) {
        if (busy) return;
        busy = true;
        try {
            await onSave({ ...item, status: newStatus, updatedAt: Date.now() });
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            busy = false;
        }
    }

    async function handleToggleChecklist(itineraryId: string, checklistId: string) {
        if (busy || togglingChecklistId) return;
        togglingChecklistId = checklistId;
        try {
            await onToggleChecklist(itineraryId, checklistId);
        } catch (e: unknown) {
            errorText = e instanceof Error ? e.message : String(e);
        } finally {
            togglingChecklistId = null;
        }
    }

    let copyTimer: ReturnType<typeof setTimeout> | null = null;

    onDestroy(() => {
        if (copyTimer) clearTimeout(copyTimer);
    });

    async function handleCopyMarkdown(item: PersonItineraryItem) {
        if (busy || copyingId) return;
        copyingId = item.id;
        try {
            const md = formatItineraryMarkdown(item, personName);
            await copyPlainText(md);
            copiedId = item.id;
            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                if (copiedId === item.id) copiedId = "";
            }, 2000);
        } catch (err) {
            console.warn("[LvContacts] 复制行程 Markdown 失败", err);
        } finally {
            copyingId = null;
        }
    }

    async function handleCompleteAndLog(item: PersonItineraryItem) {
        if (busy) return;
        if (onConvertItineraryToInteraction) {
            onConvertItineraryToInteraction(item);
        }
        await handleStatusChange(item, "completed");
    }

    function calculateDateCountdown(targetDate: string): { label: string; isPast: boolean } {
        const today = toLocalDateKey(new Date());
        if (targetDate === today) {
            return { label: text("todayMeeting", "今天"), isPast: false };
        }
        const diffMs = new Date(targetDate.replace(/-/g, "/")).getTime() - new Date(today.replace(/-/g, "/")).getTime();
        const diffDays = Math.round(diffMs / (86400 * 1000));
        if (diffDays > 0) {
            return { label: text("futureDays", "{n} 天后", { n: diffDays }), isPast: false };
        }
        return { label: text("pastDays", "已过 {n} 天", { n: Math.abs(diffDays) }), isPast: true };
    }
</script>

<div class="lvct-itinerary-section">
    <div class="lvct-itinerary-header">
        <div class="header-left">
            <Calendar size={15} strokeWidth={1.6} class="lvct-icon-inline header-icon" style="color: var(--lv-brand, #ea580c);" />
            <span class="header-title">{text("itinerarySectionTitle", "会客拜访行程与行前准备")}</span>
            {#if plannedCount > 0}
                <span class="badge-planned">{text("itineraryPlannedBadge", "{n} 待赴约", { n: plannedCount })}</span>
            {/if}
        </div>

        <div class="header-actions">
            {#if !isEditing}
                <button
                    type="button"
                    class="b3-button b3-button--outline btn-add-itinerary"
                    onclick={startCreate}
                >
                    <Plus size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                    {text("addItineraryBtn", "＋ 规划会面行程")}
                </button>
            {/if}
        </div>
    </div>

    <!-- 过滤器药丸栏 -->
    <div class="itinerary-toolbar">
        <div class="filter-pills">
            <button
                type="button"
                class="filter-pill {filterStatus === 'all' ? 'is-active' : ''}"
                onclick={() => filterStatus = 'all'}
            >
                {text("itineraryFilterAll", "全部 ({n})", { n: items.length })}
            </button>
            <button
                type="button"
                class="filter-pill {filterStatus === 'planned' ? 'is-active' : ''}"
                onclick={() => filterStatus = 'planned'}
            >
                {text("itineraryFilterPlanned", "待赴约 ({n})", { n: plannedCount })}
            </button>
            <button
                type="button"
                class="filter-pill {filterStatus === 'completed' ? 'is-active' : ''}"
                onclick={() => filterStatus = 'completed'}
            >
                {text("itineraryFilterCompleted", "已履约 ({n})", { n: completedCount })}
            </button>
        </div>
    </div>

    {#if errorText}
        <div class="lvct-form__error" role="alert">{errorText}</div>
    {/if}

    <!-- 行程创建/编辑内联表单 -->
    {#if isEditing}
        <div class="itinerary-form-card">
            <div class="form-title">
                {editingId ? text("editItineraryTitle", "编辑会面拜访行程") : text("createItineraryTitle", "规划新的会客拜访行程")}
            </div>

            <div class="form-row">
                <input
                    class="b3-text-field fn__block input-title"
                    type="text"
                    bind:value={formTitle}
                    placeholder={text("itineraryTitlePlaceholder", "会面主题（如：探讨下半年联合项目立项）*")}
                    disabled={busy}
                />
            </div>

            <div class="form-grid-2">
                <div class="form-field">
                    <span class="ft__smaller ft__on-surface">{text("itineraryDateLabel", "会见日期 *")}</span>
                    <input
                        class="b3-text-field fn__block"
                        type="date"
                        bind:value={formDate}
                        disabled={busy}
                    />
                </div>
                <div class="form-field">
                    <span class="ft__smaller ft__on-surface">{text("itineraryTimeLabel", "拟定时间 (可选)")}</span>
                    <input
                        class="b3-text-field fn__block"
                        type="time"
                        bind:value={formTime}
                        placeholder="HH:mm"
                        disabled={busy}
                    />
                </div>
            </div>

            <div class="form-grid-2">
                <div class="form-field">
                    <span class="ft__smaller ft__on-surface">{text("itineraryLocationLabel", "会面地点")}</span>
                    <input
                        class="b3-text-field fn__block"
                        type="text"
                        bind:value={formLocation}
                        placeholder={text("itineraryLocationPlaceholder", "如：科技园某咖啡厅或会议室")}
                        disabled={busy}
                    />
                </div>
                <div class="form-field">
                    <span class="ft__smaller ft__on-surface">{text("itineraryAttendeesLabel", "随行或共同参会人")}</span>
                    <input
                        class="b3-text-field fn__block"
                        type="text"
                        bind:value={formAttendees}
                        placeholder={text("itineraryAttendeesPlaceholder", "如：张总、王工")}
                        disabled={busy}
                    />
                </div>
            </div>

            <!-- 行前准备核对清单 -->
            <div class="checklist-section">
                <span class="checklist-title ft__smaller ft__on-surface">{text("itineraryChecklistSection", "行前准备核对清单（资料/样品/伴手礼）：")}</span>
                <div class="checklist-items">
                    {#each formChecklists as chk (chk.id)}
                        <div class="checklist-item-edit">
                            <input
                                class="b3-text-field fn__flex-1"
                                type="text"
                                bind:value={chk.text}
                                placeholder={text("checklistTextPlaceholder", "待准备事项…")}
                                disabled={busy}
                            />
                            <button
                                type="button"
                                class="btn-icon ft__error"
                                title={text("deleteChecklist", "删除此检查项")}
                                onclick={() => removeChecklistItem(chk.id)}
                            >
                                <Trash2 size={12} strokeWidth={1.6} />
                            </button>
                        </div>
                    {/each}
                </div>

                {#if formChecklists.length < 10}
                    <div class="add-checklist-row">
                        <input
                            class="b3-text-field fn__flex-1"
                            type="text"
                            bind:value={newChecklistText}
                            placeholder={text("newChecklistPlaceholder", "添加准备项（如：携带商业计划书 BP）")}
                            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                            disabled={busy}
                        />
                        <button
                            type="button"
                            class="b3-button b3-button--outline"
                            onclick={addChecklistItem}
                            disabled={busy || !newChecklistText.trim()}
                        >
                            <Plus size={12} strokeWidth={1.6} />
                        </button>
                    </div>
                {/if}
            </div>

            <div class="form-row">
                <textarea
                    class="b3-text-field fn__block"
                    rows="2"
                    bind:value={formNote}
                    placeholder={text("itineraryNotePlaceholder", "补充备忘事项与会谈注意要点…")}
                    disabled={busy}
                ></textarea>
            </div>

            <div class="form-actions">
                <span style="flex: 1"></span>
                <button
                    type="button"
                    class="b3-button b3-button--cancel"
                    onclick={cancelEdit}
                    disabled={busy}
                >
                    {text("cancel", "取消")}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--text"
                    onclick={handleSave}
                    disabled={busy}
                >
                    {busy ? text("saving", "保存中…") : text("saveItinerary", "保存行程")}
                </button>
            </div>
        </div>
    {/if}

    <!-- 行程清单列表 -->
    <div class="itinerary-list">
        {#if displayedItems.length === 0 && !isEditing}
            <div class="empty-state ft__smaller ft__on-surface-variant">
                {text("noItineraries", "暂无安排的会面拜访行程。点击上方「规划会面行程」制定下次见面备忘。")}
            </div>
        {:else}
            {#each displayedItems as item (item.id)}
                {@const countdown = calculateDateCountdown(item.targetDate)}
                <div class="itinerary-card status-{item.status}">
                    <div class="card-head">
                        <div class="head-left">
                            <span class="item-title">{item.title}</span>
                            <span class="status-badge status-badge--{item.status}">
                                {#if item.status === 'planned'}
                                    {text("statusPlanned", "待赴约")}
                                {:else if item.status === 'completed'}
                                    {text("statusCompleted", "已履约")}
                                {:else}
                                    {text("statusCancelled", "已取消")}
                                {/if}
                            </span>
                        </div>

                        <div class="head-right">
                            <span class="countdown-badge {countdown.isPast && item.status === 'planned' ? 'is-overdue' : ''}">
                                {countdown.label}
                            </span>
                        </div>
                    </div>

                    <div class="card-meta">
                        <span class="meta-item">
                            <Calendar size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                            {item.targetDate}
                            {#if item.targetTime}
                                <Clock size={11} strokeWidth={1.6} class="lvct-icon-inline" style="margin-left: 4px;" />
                                {item.targetTime}
                            {/if}
                        </span>
                        {#if item.location}
                            <span class="meta-item">
                                <MapPin size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                                {item.location}
                            </span>
                        {/if}
                        {#if item.attendees}
                            <span class="meta-item">
                                <Users size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                                {item.attendees}
                            </span>
                        {/if}
                    </div>

                    <!-- 核对清单 -->
                    {#if item.checklists.length > 0}
                        <div class="card-checklists">
                            <div class="checklist-header ft__smaller ft__on-surface">
                                {text("checklistHeader", "行前核验准备：")}
                            </div>
                            <div class="checklist-grid">
                                {#each item.checklists as chk}
                                    <button
                                        type="button"
                                        class="checklist-chip {chk.done ? 'is-done' : ''}"
                                        disabled={busy || togglingChecklistId === chk.id}
                                        onclick={() => handleToggleChecklist(item.id, chk.id)}
                                        title={text("toggleChecklistTip", "点击切换准备状态")}
                                    >
                                        {#if chk.done}
                                            <CheckSquare size={13} strokeWidth={1.6} class="chk-icon is-done" />
                                        {:else}
                                            <Square size={13} strokeWidth={1.6} class="chk-icon" />
                                        {/if}
                                        <span class="chk-text">{chk.text}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if item.note}
                        <div class="card-note ft__smaller ft__on-surface">
                            <FileText size={11} strokeWidth={1.6} class="lvct-icon-inline" />
                            {item.note}
                        </div>
                    {/if}

                    <!-- 操作栏 -->
                    <div class="card-actions">
                        {#if item.status === 'planned'}
                            <button
                                type="button"
                                class="b3-button b3-button--outline btn-action ft__primary"
                                disabled={busy}
                                onclick={() => handleCompleteAndLog(item)}
                                title={text("completeAndLogTip", "标记为已完成并填入交往互动草稿")}
                            >
                                <Check size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                                {text("completeAndLogBtn", "履约并记互动")}
                            </button>
                        {/if}

                        <button
                            type="button"
                            class="b3-button b3-button--cancel btn-action"
                            disabled={busy || copyingId === item.id}
                            onclick={() => handleCopyMarkdown(item)}
                            title={text("copyMarkdownTip", "复制行程单 Markdown 文本")}
                        >
                            {#if copiedId === item.id}
                                <Check size={12} strokeWidth={1.6} class="lvct-icon-inline ft__primary" />
                                <span class="ft__primary">{text("copied", "已复制 ✓")}</span>
                            {:else}
                                <Copy size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                                {text("copyMarkdownBtn", "复制行程")}
                            {/if}
                        </button>

                        <button
                            type="button"
                            class="b3-button b3-button--cancel btn-action"
                            disabled={busy}
                            onclick={() => startEdit(item)}
                        >
                            <Edit3 size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                            {text("edit", "编辑")}
                        </button>

                        <button
                            type="button"
                            class="b3-button b3-button--cancel btn-action ft__error"
                            disabled={busy}
                            onclick={() => handleDelete(item.id)}
                        >
                            <Trash2 size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                            {text("delete", "删除")}
                        </button>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .lvct-itinerary-section {
        margin-top: 14px;
        padding: 14px 16px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: 0 2px 10px rgba(28, 24, 21, 0.04);
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .lvct-itinerary-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .header-icon {
        font-size: 15px;
    }

    .header-title {
        font-weight: 600;
        font-size: 13px;
        color: var(--lvct-text-1);
    }

    .badge-planned {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lv-brand-soft);
        color: var(--lv-brand, #ea580c);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }

    .btn-add-itinerary {
        font-size: 11px;
        padding: 2px 10px;
        border-radius: var(--lv-r-pill, 9999px) !important;
    }

    .itinerary-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .filter-pills {
        display: flex;
        gap: 6px;
    }

    .filter-pill {
        border: 1px solid var(--lvct-border-subtle);
        background: transparent;
        font-size: 11px;
        padding: 3px 12px;
        border-radius: var(--lv-r-pill, 9999px);
        cursor: pointer;
        color: var(--lvct-text-2);
        transition: all var(--lvct-dur-fast) var(--lvct-ease);
    }

    .filter-pill.is-active {
        background: var(--lv-brand-soft);
        color: var(--lv-brand, #ea580c);
        border-color: var(--lv-brand, #ea580c);
        font-weight: 600;
    }

    /* 内联表单 */
    .itinerary-form-card {
        padding: 12px 14px;
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 14px);
        background: var(--lvct-bg-app);
        display: flex;
        flex-direction: column;
        gap: 8px;

        input, button {
            border-radius: var(--lv-r-pill, 9999px);
        }

        textarea {
            border-radius: var(--lvct-r-card, 10px);
        }
    }

    .form-title {
        font-weight: 600;
        font-size: 12px;
    }

    .form-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;

        @media (max-width: 560px) {
            grid-template-columns: 1fr;
        }
    }

    .form-field {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .checklist-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 2px;
    }

    .checklist-items {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .checklist-item-edit {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .add-checklist-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
    }

    .btn-icon {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
    }

    .btn-icon:hover {
        opacity: 1;
    }

    .form-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
    }

    /* 卡片列表 */
    .itinerary-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .itinerary-card {
        padding: 12px 14px;
        border: 1px solid var(--lvct-color-border-200);
        border-radius: var(--lvct-r-card, 14px);
        box-shadow: 0 1px 4px rgba(28, 24, 21, 0.03);
        background: var(--lvct-bg-surface);
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(28, 24, 21, 0.06);
        }
    }

    .itinerary-card.status-planned {
        border-left: 3px solid var(--lv-brand, #ea580c);
    }

    .itinerary-card.status-completed {
        border-left: 3px solid var(--lvct-success, #16a34a);
        opacity: 0.9;
    }

    .itinerary-card.status-cancelled {
        border-left: 3px solid var(--lvct-text-3);
        opacity: 0.65;
    }

    .card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .head-left {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .item-title {
        font-weight: 600;
        font-size: 13px;
    }

    .status-badge {
        font-size: 10px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 8px;
        border-radius: var(--lv-r-pill, 9999px);
        background: transparent;
        border: 1px solid var(--lvct-color-border-200);
        font-weight: 600;
    }

    .status-badge::before {
        content: "";
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        forced-color-adjust: none;
    }

    .status-badge--planned {
        color: var(--lv-brand, #ea580c);
        border-color: color-mix(in srgb, var(--lv-brand) 30%, transparent);
    }

    .status-badge--completed {
        color: var(--lvct-success);
        border-color: color-mix(in srgb, var(--lvct-success) 30%, transparent);
    }

    .status-badge--cancelled {
        color: var(--lvct-text-3);
        border-color: var(--lvct-border-subtle);
    }

    .countdown-badge {
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        font-variant-numeric: tabular-nums;
    }

    .countdown-badge.is-overdue {
        color: var(--b3-theme-error);
        font-weight: 600;
    }

    .card-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 11px;
        color: var(--b3-theme-on-surface-light);
        font-variant-numeric: tabular-nums;
    }

    .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-variant-numeric: tabular-nums;
    }

    .card-checklists {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 2px;
    }

    .checklist-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .checklist-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--b3-theme-surface-lighter);
        border: 1px solid var(--b3-border-color);
        font-size: 11px;
        cursor: pointer;
        color: var(--b3-theme-on-surface);
        transition: all 0.15s ease;
    }

    .checklist-chip.is-done {
        text-decoration: line-through;
        opacity: 0.7;
    }

    .chk-icon.is-done {
        color: var(--lvct-success);
    }

    .card-note {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--b3-theme-on-surface-light);
        background: var(--b3-theme-surface-lighter);
        padding: 4px 8px;
        border-radius: var(--lvct-r-card, 10px);
    }

    .card-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 4px;
        border-top: 1px dashed var(--b3-border-color);
        padding-top: 6px;
    }

    .btn-action {
        font-size: 11px;
        padding: 3px 10px;
        border-radius: var(--lv-r-pill, 9999px);
    }

    .empty-state {
        text-align: center;
        padding: 24px 12px;
        color: var(--b3-theme-on-surface-light);
    }
</style>
