<script lang="ts">
    import type { ContactsPluginFacade } from "../../types";
    import type { ContactSummary } from "../../domain/person";
    import {
        INTERACTION_TYPES,
        INTERACTION_TYPE_LABELS,
        toLocalDateKey,
        type InteractionType,
    } from "../../domain/interactions";
    import PersonPicker from "../people/PersonPicker.svelte";
    import { requestErrorMessage } from "../../shared/error-presenter";
    import { FileText, Mail, MessageCircle, Phone, Users, Utensils } from "@lucide/svelte";
    import { onMount } from "svelte";

    let {
        facade,
        people,
        defaultPersonId = "",
        onSaved,
        onClose,
    }: {
        facade: ContactsPluginFacade;
        people: readonly ContactSummary[];
        defaultPersonId?: string;
        onSaved: () => void | Promise<void>;
        onClose: () => void;
    } = $props();

    // svelte-ignore state_referenced_locally
    let selectedItemId = $state(defaultPersonId);
    let type = $state<InteractionType>("meeting");
    let date = $state(toLocalDateKey(new Date()));
    const todayStr = toLocalDateKey(new Date());
    const yesterdayStr = toLocalDateKey(new Date(Date.now() - 86400000));
    let note = $state("");
    let busy = $state(false);
    let errorMessage = $state("");
    let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined);

    const pickerItems = $derived(
        people.map((person) => ({
            id: person.itemId,
            label: person.name,
            hint: [person.group, person.phone || person.email, ...person.tags].filter(Boolean).join(" · ") || undefined,
            docId: person.docId,
            itemId: person.itemId,
            keywords: [person.group, person.phone, person.email, person.wechat, ...person.tags]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
        })),
    );

    const selectedPerson = $derived(people.find((p) => p.itemId === selectedItemId) ?? null);

    onMount(() => {
        if (!selectedItemId && people.length === 1) {
            selectedItemId = people[0].itemId;
        }
    });

    function applyChip(itype: InteractionType, text: string) {
        type = itype;
        note = text;
        textareaEl?.focus();
    }

    async function handleSubmit() {
        if (busy) return;
        if (!selectedPerson) {
            errorMessage = "请先选择一位联系人";
            return;
        }
        busy = true;
        errorMessage = "";
        try {
            const targetDate = date || todayStr;
            const occurredAt = targetDate === todayStr
                ? Date.now()
                : new Date(`${targetDate}T12:00:00`).getTime();
            await facade.recordInteraction(selectedPerson.docId, note.trim() || undefined, type, { occurredAt });
            await onSaved();
            onClose();
        } catch (err) {
            errorMessage = requestErrorMessage(err);
        } finally {
            busy = false;
        }
    }

    function handleTextareaKeydown(event: KeyboardEvent) {
        if (event.isComposing || event.keyCode === 229) return;
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            void handleSubmit();
        }
    }
</script>

<div class="lvct-form lvct-mobile-quick-record">
    {#if errorMessage}
        <div class="lvct-form__error" role="alert">{errorMessage}</div>
    {/if}

    <div class="lvct-form__item">
        <span>选择联系人</span>
        <PersonPicker
            items={pickerItems}
            value={selectedItemId}
            placeholder="点击选择联系人…"
            emptyText="暂无可选联系人"
            searchText="输入姓名、分组、电话或微信筛选"
            ariaLabel="选择记录互动的联系人"
            disabled={busy}
            onSelect={(id) => {
                selectedItemId = id;
                errorMessage = "";
            }}
        />
    </div>

    <div class="lvct-form__item">
        <span>互动日期</span>
        <div class="lvct-mobile-quick-record__chips">
            <input type="date" class="b3-text-field" bind:value={date} disabled={busy} />
            <button type="button" class="b3-chip" class:b3-chip--primary={date === todayStr} disabled={busy} onclick={() => (date = todayStr)}>今天</button>
            <button type="button" class="b3-chip" class:b3-chip--primary={date === yesterdayStr} disabled={busy} onclick={() => (date = yesterdayStr)}>昨天</button>
        </div>
    </div>

    <div class="lvct-form__item">
        <span>互动方式</span>
        <div class="lvct-mobile-quick-record__chips">
            {#each INTERACTION_TYPES as itype (itype)}
                <button
                    type="button"
                    class="b3-chip"
                    class:b3-chip--primary={type === itype}
                    disabled={busy}
                    onclick={() => (type = itype)}
                >
                    {#if itype === "meeting"}<Users size={12} strokeWidth={1.6} />
                    {:else if itype === "call"}<Phone size={12} strokeWidth={1.6} />
                    {:else if itype === "message"}<MessageCircle size={12} strokeWidth={1.6} />
                    {:else if itype === "email"}<Mail size={12} strokeWidth={1.6} />
                    {:else if itype === "meal"}<Utensils size={12} strokeWidth={1.6} />
                    {:else}<FileText size={12} strokeWidth={1.6} />{/if}
                    <span>{INTERACTION_TYPE_LABELS[itype].label}</span>
                </button>
            {/each}
        </div>
    </div>

    <div class="lvct-form__item">
        <span>沟通要点（可选）</span>
        <div class="lvct-mobile-quick-record__chips" style="margin-bottom: 6px;">
            <button type="button" class="b3-chip" disabled={busy} onclick={() => applyChip("call", "电话沟通近况")}>电话沟通</button>
            <button type="button" class="b3-chip" disabled={busy} onclick={() => applyChip("message", "微信问候交流")}>微信问候</button>
            <button type="button" class="b3-chip" disabled={busy} onclick={() => applyChip("meeting", "线下见面交流")}>见面交流</button>
        </div>
        <textarea
            bind:this={textareaEl}
            class="b3-text-field fn__block"
            rows="3"
            placeholder="记下本次沟通重点、约定或备忘…"
            bind:value={note}
            disabled={busy}
            onkeydown={handleTextareaKeydown}
        ></textarea>
    </div>

    <div class="lvct-form__actions">
        <button type="button" class="b3-button b3-button--cancel" disabled={busy} onclick={onClose}>取消</button>
        <button type="button" class="b3-button b3-button--primary" disabled={busy || !selectedPerson} onclick={() => void handleSubmit()}>
            {busy ? "保存中…" : "保存互动"}
        </button>
    </div>
</div>
