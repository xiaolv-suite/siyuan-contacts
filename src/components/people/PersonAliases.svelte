<script lang="ts">
    import { onDestroy, untrack } from "svelte";
    import { useCloseGuard } from "../close-guard";
    import { translateText } from "../../domain/translation";
    import type { PersonAlias } from "../../domain/person-aliases";
    import { requestErrorMessage } from "../../shared/error-presenter";
    import { X } from "@lucide/svelte";

    let {
        personDocId,
        i18n,
        onLoad,
        onAdd,
        onRemove,
        onChanged,
    }: {
        personDocId: string;
        i18n?: Readonly<Record<string, string>>;
        onLoad: (personDocId: string) => Promise<PersonAlias[]>;
        onAdd: (personDocId: string, alias: string) => Promise<PersonAlias>;
        onRemove: (id: string) => Promise<void>;
        onChanged: () => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));
    let aliases: PersonAlias[] = $state([]);
    let aliasDraft = $state("");
    let loading = $state(true);
    let busy = $state(false);
    let pendingRemoveId = $state("");
    let errorText = $state("");
    let readFailed = $state(false);
    let loadGeneration = 0;
    let personGeneration = 0;
    let alive = true;
    useCloseGuard({
        busy: () => busy,
        dirty: () => aliasDraft.trim().length > 0,
        changes: () => [text("personAliasesUnsavedDraft", "人物别名有未保存的输入")],
    });
    onDestroy(() => { alive = false; loadGeneration += 1; });

    async function load(docId = personDocId): Promise<void> {
        const generation = ++loadGeneration;
        loading = true;
        errorText = "";
        readFailed = false;
        try {
            const loaded = await onLoad(docId);
            if (!alive || generation !== loadGeneration || docId !== personDocId) return;
            if (loaded.some((alias) => alias.personDocId !== docId)) throw new Error("别名读取结果包含其他人物，未自动显示");
            aliases = loaded;
        } catch (error) {
            if (!alive || generation !== loadGeneration || docId !== personDocId) return;
            readFailed = true;
            errorText = requestErrorMessage(error);
        } finally {
            if (alive && generation === loadGeneration && docId === personDocId) loading = false;
        }
    }

    let activeDocId = "";
    $effect(() => {
        const docId = personDocId;
        if (docId === activeDocId) return;
        activeDocId = docId;
        untrack(() => {
            personGeneration += 1;
            aliases = [];
            aliasDraft = "";
            pendingRemoveId = "";
            busy = false;
            void load(docId);
        });
    });

    async function add(): Promise<void> {
        const alias = aliasDraft.trim();
        if (!alias || busy || pendingRemoveId || loading || readFailed) return;
        busy = true;
        errorText = "";
        const docId = personDocId;
        const generation = personGeneration;
        try {
            const created = await onAdd(docId, alias);
            if (!alive || generation !== personGeneration || docId !== personDocId) return;
            if (created.personDocId !== docId) throw new Error("新增别名归属不一致，请核对保存结果");
            aliases = [...aliases.filter((item) => item.id !== created.id), created].sort((left, right) => left.alias.localeCompare(right.alias, "zh-CN"));
            aliasDraft = "";
            onChanged();
        } catch (error) {
            if (!alive || generation !== personGeneration || docId !== personDocId) return;
            errorText = requestErrorMessage(error);
        } finally {
            if (alive && generation === personGeneration && docId === personDocId) busy = false;
        }
    }

    function requestRemove(id: string): void {
        if (busy || loading || readFailed || pendingRemoveId) return;
        if (!aliases.some((item) => item.id === id)) return;
        errorText = "";
        pendingRemoveId = id;
    }

    function cancelRemove(): void {
        if (busy) return;
        pendingRemoveId = "";
        errorText = "";
    }

    async function confirmRemove(): Promise<void> {
        const id = pendingRemoveId;
        if (!id || busy || loading || readFailed || !aliases.some((item) => item.id === id)) return;
        busy = true;
        errorText = "";
        const docId = personDocId;
        const generation = personGeneration;
        try {
            await onRemove(id);
            if (!alive || generation !== personGeneration || docId !== personDocId) return;
            aliases = aliases.filter((item) => item.id !== id);
            pendingRemoveId = "";
            onChanged();
        } catch (error) {
            if (!alive || generation !== personGeneration || docId !== personDocId) return;
            errorText = requestErrorMessage(error);
        } finally {
            if (alive && generation === personGeneration && docId === personDocId) busy = false;
        }
    }
</script>

<section class="lvct-detail__section lvct-person-aliases">
    <h4>{text("personAliasesTitle", "称呼与别名")}</h4>
    <p class="ft__smaller ft__on-surface">{text("personAliasesHint", "别名用于识别笔记中的称呼并关联到此人；“王总”等泛称不会被接受。")}</p>
    {#if errorText}<div class="lvct-form__error" role="alert">{errorText}</div>{/if}
    {#if loading}
        <p class="ft__smaller ft__on-surface">{text("personAliasesLoading", "正在加载别名…")}</p>
    {:else if readFailed}
        <button type="button" class="b3-button b3-button--outline" onclick={() => void load()} disabled={busy}>{text("retryLoad", "重新读取")}</button>
    {:else if aliases.length > 0}
        <div class="lvct-person-aliases__list">
            {#each aliases as item (item.id)}
                <span class="lvct-person-aliases__item">
                    <span>{item.alias}</span>
                    <button
                        type="button"
                        class="b3-button b3-button--text btn-remove-alias"
                        disabled={busy || !!pendingRemoveId}
                        onclick={() => requestRemove(item.id)}
                        title={text("personAliasesRemove", "删除")}
                    >
                        <X size={11} strokeWidth={1.6} class="btn-remove-icon" />
                        <span class="btn-remove-text">{text("personAliasesRemove", "删除")}</span>
                    </button>
                </span>
                {#if pendingRemoveId === item.id}
                    <div class="lvct-person-aliases__confirm" role="group" aria-label={text("personAliasesRemoveConfirm", "确认删除别名")}>
                        <p>{text("personAliasesRemoveImpact", "将从此人物的别名列表中删除“{alias}”。此操作不可撤销。", { alias: item.alias })}</p>
                        <div class="lvct-person-aliases__confirm-actions">
                            <button type="button" class="b3-button b3-button--cancel" disabled={busy} onclick={() => void confirmRemove()}>
                                {busy ? text("personAliasesRemoving", "删除中…") : text("personAliasesConfirmRemove", "确认删除")}
                            </button>
                            <button type="button" class="b3-button b3-button--outline" disabled={busy} onclick={cancelRemove}>
                                {text("personAliasesCancelRemove", "取消")}
                            </button>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    {:else}
        <p class="ft__smaller ft__on-surface">{text("personAliasesEmpty", "还没有设置别名。")}</p>
    {/if}
    <div class="lvct-detail__record fn__flex">
        <input
            class="b3-text-field fn__flex-1"
            type="text"
            bind:value={aliasDraft}
            placeholder={text("personAliasesPlaceholder", "例如：老张、英文名")}
            aria-label={text("personAliasesInputLabel", "新增别名")}
            disabled={busy || !!pendingRemoveId}
            onkeydown={(event) => { if (event.isComposing || event.keyCode === 229) return; if (event.key === "Enter") void add(); }}
        />
        <button type="button" class="b3-button b3-button--text" disabled={busy || !!pendingRemoveId || loading || readFailed || !aliasDraft.trim()} onclick={() => void add()}>
            {busy ? text("personAliasesSaving", "保存中…") : text("personAliasesAdd", "添加")}
        </button>
    </div>
</section>

<style>
    .lvct-person-aliases__list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        margin-bottom: 8px;
    }

    .lvct-person-aliases__item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px 2px 10px;
        border-radius: var(--lv-r-pill, 9999px);
        background: var(--lvct-bg-app);
        border: 1px solid var(--lvct-color-border-200);
        font-size: 11.5px;
        color: var(--lvct-text-1);
        transition: transform var(--lvct-dur-fast) var(--lvct-ease), background var(--lvct-dur-fast) var(--lvct-ease), border-color var(--lvct-dur-fast) var(--lvct-ease), box-shadow var(--lvct-dur-fast) var(--lvct-ease), color var(--lvct-dur-fast) var(--lvct-ease), opacity var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            border-color: var(--lvct-border-subtle);

            .btn-remove-alias {
                opacity: 1;
            }
        }
    }

    .btn-remove-alias {
        padding: 0 4px !important;
        height: auto !important;
        font-size: 11px !important;
        border-radius: var(--lv-r-pill, 9999px) !important;
        opacity: 0.6;
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--lvct-text-3) !important;
        transition: opacity var(--lvct-dur-fast) var(--lvct-ease), color var(--lvct-dur-fast) var(--lvct-ease);

        &:hover {
            opacity: 1 !important;
            color: var(--lvct-danger, #e11d48) !important;
        }

        @media (hover: none), (max-width: 768px) {
            opacity: 0.8;
        }
    }

    .lvct-person-aliases__confirm {
        width: 100%;
        margin-block: 6px;
        padding: 10px 12px;
        border-radius: var(--lvct-r-card, 12px);

        button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }

    .lvct-detail__record {
        input, button {
            border-radius: var(--lv-r-pill, 9999px);
        }
    }
</style>
