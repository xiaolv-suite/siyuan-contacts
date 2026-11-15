<script lang="ts">
    import { requestErrorMessage } from "../../shared/error-presenter";
    import { onDestroy, untrack } from "svelte";
    import { newExchangeRequestId } from "../../services/exchanges";
    import { useCloseGuard } from "../close-guard";
    import { ExchangeWriteUnknownError } from "../../domain/exchanges";
    import { toLocalDateKey } from "../../domain/interactions";
    import type { ExchangeDirection, ExchangeKind, ExchangeRecord, ExchangeStatus } from "../../domain/exchanges";
    import { translateText } from "../../domain/translation";
    import { confirmDialog } from "../../libs/confirm-dialog";
    import { formatExchangeAmount } from "../../domain/exchanges-summary";

    let {
        personDocId,
        reloadKey = 0,
        i18n,
        onLoad,
        onCreate,
        onChangeStatus,
        onChanged,
    }: {
        personDocId: string;
        reloadKey?: number;
        i18n?: Readonly<Record<string, string>>;
        onLoad: (personDocId: string) => Promise<ExchangeRecord[]>;
        onCreate: (input: {
            requestId: string;
            personDocId: string;
            kind: ExchangeKind;
            direction: ExchangeDirection;
            description: string;
            amount?: number;
            currency?: string;
            occurredOn: string;
            dueOn?: string;
            note?: string;
        }) => Promise<ExchangeRecord>;
        onChangeStatus: (id: string, status: ExchangeStatus, settledOn?: string, expected?: { updatedAt: number }) => Promise<ExchangeRecord>;
        onChanged?: () => void;
    } = $props();
    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let records: ExchangeRecord[] = $state([]);
    let loading = $state(true);
    let busy = $state(false);
    let errorText = $state("");
    let readFailed = $state(false);
    let saveUnknown = $state(false);
    let updatingRecordId = $state<string | null>(null);
    let requestId = newExchangeRequestId();
    let loadGeneration = 0;
    let personGeneration = 0;
    let initializedPersonDocId = "";
    let confirmedRecords: ExchangeRecord[] = [];
    let alive = true;
    let kind = $state<ExchangeKind>("money");
    let direction = $state<ExchangeDirection>("receivable");
    let description = $state("");
    let amountText = $state<string | number | undefined>("");
    let currency = $state("CNY");
    let occurredOn = $state(toLocalDateKey(new Date()));
    let dueOn = $state("");
    let note = $state("");
    let formBaseline = $state("");
    function formSignature(): string {
        return JSON.stringify({ kind, direction, description, amount: String(amountText ?? ""), currency, occurredOn, dueOn, note });
    }
    const formDisabled = $derived(busy || saveUnknown);
    const stats = $derived.by(() => {
        const byCurrency = new Map<string, { receivable: number; payable: number }>();
        let openCount = 0;
        let settledCount = 0;
        for (const r of records) {
            if (r.status === "open") {
                openCount += 1;
                if (r.kind === "money" && typeof r.amount === "number") {
                    const c = (r.currency || "CNY").trim().toUpperCase();
                    const entry = byCurrency.get(c) || { receivable: 0, payable: 0 };
                    if (r.direction === "receivable") entry.receivable += r.amount;
                    else entry.payable += r.amount;
                    byCurrency.set(c, entry);
                }
            } else if (r.status === "settled") {
                settledCount += 1;
            }
        }
        const currencies = [...byCurrency.entries()].map(([currency, amounts]) => ({
            currency,
            receivable: amounts.receivable,
            payable: amounts.payable,
            net: amounts.receivable - amounts.payable,
        }));
        const primary = currencies.find(c => c.currency === "CNY") || currencies[0] || { currency: "CNY", receivable: 0, payable: 0, net: 0 };
        return {
            primary,
            currencies,
            isMultiCurrency: currencies.length > 1,
            openCount,
            settledCount,
        };
    });
    useCloseGuard({
        busy: () => busy,
        dirty: () => saveUnknown || formSignature() !== formBaseline,
        changes: () => [saveUnknown ? text("exchangeUnknownDraft", "往来保存结果仍未知，离开不删除可能已保存的记录") : text("exchangeUnsavedDraft", "往来账本有未保存的输入")],
    });
    onDestroy(() => { alive = false; loadGeneration += 1; });

    const kindLabel = (value: ExchangeKind): string => value === "money" ? "金钱" : value === "item" ? "物品" : "人情";
    const directionLabel = (value: ExchangeDirection): string => value === "receivable" ? "对方欠我" : "我欠对方";

    async function load(docId = personDocId): Promise<void> {
        const generation = ++loadGeneration;
        loading = true;
        errorText = "";
        readFailed = false;
        try {
            const loaded = await onLoad(docId);
            if (!alive || generation !== loadGeneration || docId !== personDocId) return;
            if (loaded.some((record) => record.personDocId !== docId)) throw new Error("往来读取结果包含其他人物，未自动显示");
            const loadedById = new Map(loaded.map((record) => [record.id, record]));
            const stillPending: ExchangeRecord[] = [];
            for (const confirmed of confirmedRecords) {
                const visible = loadedById.get(confirmed.id);
                if (!visible || visible.updatedAt < confirmed.updatedAt) {
                    loadedById.set(confirmed.id, confirmed);
                    stillPending.push(confirmed);
                }
            }
            confirmedRecords = stillPending;
            records = [...loadedById.values()].sort((left, right) =>
                right.occurredOn.localeCompare(left.occurredOn) || right.updatedAt - left.updatedAt);
        } catch (error) {
            if (!alive || generation !== loadGeneration || docId !== personDocId) return;
            readFailed = true;
            errorText = requestErrorMessage(error);
        } finally {
            if (alive && generation === loadGeneration && docId === personDocId) loading = false;
        }
    }

    let lastReloadKey = untrack(() => reloadKey);
    $effect(() => {
        const nextKey = reloadKey;
        if (nextKey !== lastReloadKey) {
            lastReloadKey = nextKey;
            if (!busy && initializedPersonDocId === personDocId) {
                untrack(() => void load(personDocId));
            }
        }
    });

    $effect(() => {
        const docId = personDocId;
        // Parent data-change renders can invalidate the props getter without
        // changing the person. Preserve an in-flight confirmed write across
        // those renders; reset only when the displayed person actually changes.
        if (docId === initializedPersonDocId) return;
        initializedPersonDocId = docId;
        untrack(() => {
            personGeneration += 1;
            records = [];
            confirmedRecords = [];
            resetForm();
            busy = false;
            void load(docId);
        });
    });

    function resetForm(): void {
        description = "";
        amountText = "";
        dueOn = "";
        note = "";
        occurredOn = toLocalDateKey(new Date());
        requestId = newExchangeRequestId();
        saveUnknown = false;
        formBaseline = formSignature();
    }

    function rememberConfirmedRecord(record: ExchangeRecord): void {
        confirmedRecords = [...confirmedRecords.filter((candidate) => candidate.id !== record.id), record];
        // Keep the confirmed write visible immediately. A host storage read
        // can briefly return the previous snapshot, and a data-change refresh
        // may run between the write response and the follow-up load.
        records = [...records.filter((candidate) => candidate.id !== record.id), record].sort((left, right) =>
            right.occurredOn.localeCompare(left.occurredOn) || right.updatedAt - left.updatedAt);
    }

    async function submit(): Promise<void> {
        if (busy || loading || readFailed || !description.trim()) return;
        busy = true;
        errorText = "";
        const docId = personDocId;
        const activeRequestId = requestId;
        const generation = personGeneration;
        try {
            const amount = kind === "money" && String(amountText ?? "").trim() ? Number(amountText) : undefined;
            const created = await onCreate({
                requestId: activeRequestId,
                personDocId: docId,
                kind,
                direction,
                description: description.trim(),
                ...(amount === undefined ? {} : { amount }),
                currency: kind === "money" ? currency.trim() || "CNY" : undefined,
                occurredOn,
                dueOn,
                note: note.trim(),
            });
            if (!alive || generation !== personGeneration || docId !== personDocId || activeRequestId !== requestId) return;
            if (created.personDocId !== docId) throw new Error("往来写入返回了其他人物记录，未自动显示");
            rememberConfirmedRecord(created);
            resetForm();
            await load(docId);
            if (!alive || generation !== personGeneration || docId !== personDocId) return;
            if (!records.some((record) => record.id === created.id)) {
                records = [...records, created].sort((left, right) =>
                    right.occurredOn.localeCompare(left.occurredOn) || right.updatedAt - left.updatedAt);
            }
            // A confirmed write can become visible to the host storage reader
            // one tick later than the save response. Keep the confirmed record
            // in the list so a stale immediate read cannot make a successful
            // submission look lost; the next refresh will reconcile the rest.
            onChanged?.();
        } catch (error) {
            if (!alive || generation !== personGeneration || docId !== personDocId || activeRequestId !== requestId) return;
            saveUnknown = saveUnknown || error instanceof ExchangeWriteUnknownError;
            errorText = requestErrorMessage(error);
        } finally {
            if (alive && generation === personGeneration && docId === personDocId) busy = false;
        }
    }

    async function changeStatus(record: ExchangeRecord, status: ExchangeStatus): Promise<void> {
        if (busy || loading || readFailed || saveUnknown || updatingRecordId) return;
        updatingRecordId = record.id;
        try {
            if (status === "cancelled") {
                const confirmed = await confirmDialog({
                    title: "取消往来记录",
                    message: `确定取消「${recordLabel(record)}」吗？取消后仍保留历史记录。`,
                    confirmLabel: "确认取消",
                    cancelLabel: "保留",
                    danger: true,
                });
                if (!confirmed || !alive) return;
            }
            busy = true;
            errorText = "";
            const docId = personDocId;
            const generation = personGeneration;
            try {
                const updated = await onChangeStatus(record.id, status, status === "settled" ? toLocalDateKey(new Date()) : undefined, { updatedAt: record.updatedAt });
                if (!alive || docId !== personDocId || generation !== personGeneration) return;
                if (updated.id !== record.id || updated.personDocId !== docId) throw new Error("往来状态写入返回了其他记录，未自动显示");
                rememberConfirmedRecord(updated);
                await load(docId);
                if (!alive || docId !== personDocId || generation !== personGeneration) return;
                onChanged?.();
            } catch (error) {
                if (!alive || docId !== personDocId || generation !== personGeneration) return;
                errorText = requestErrorMessage(error);
            } finally {
                if (alive && docId === personDocId && generation === personGeneration) busy = false;
            }
        } finally {
            if (alive) updatingRecordId = null;
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            if (!busy && !loading && !readFailed && description.trim()) {
                void submit();
            }
        }
    }

    function recordLabel(record: ExchangeRecord): string {
        if (record.kind !== "money") return record.description;
        return `${record.description} · ${record.amount ?? 0} ${record.currency}`;
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="lvct-detail__section" aria-label={text("exchangeSection", "往来账本")}>
    <h4>{text("exchangeTitle", "往来账本")}{records.length ? `（${records.length}）` : ""}</h4>
    <p class="ft__smaller ft__on-surface">{text("exchangeHint", "记录金钱、物品和人情往来；结清后仍保留历史事实。")}</p>

    {#if records.length > 0}
        <div class="lvct-exchange-stats" role="region" aria-label="往来关键指标">
            <div class="lvct-exchange-stat">
                <span class="lvct-exchange-stat__label">待收回{stats.isMultiCurrency ? ` (${stats.primary.currency})` : ""}</span>
                <span class="lvct-exchange-stat__val lvct-val--receivable">{formatExchangeAmount(stats.primary.receivable, stats.primary.currency, 2)}</span>
            </div>
            <div class="lvct-exchange-stat">
                <span class="lvct-exchange-stat__label">待偿还{stats.isMultiCurrency ? ` (${stats.primary.currency})` : ""}</span>
                <span class="lvct-exchange-stat__val lvct-val--payable">{formatExchangeAmount(stats.primary.payable, stats.primary.currency, 2)}</span>
            </div>
            <div class="lvct-exchange-stat">
                <span class="lvct-exchange-stat__label">净往来{stats.isMultiCurrency ? ` (${stats.primary.currency})` : ""}</span>
                <span class="lvct-exchange-stat__val">{stats.primary.net >= 0 ? "+" : "-"}{formatExchangeAmount(Math.abs(stats.primary.net), stats.primary.currency, 2)}</span>
            </div>
            <div class="lvct-exchange-stat">
                <span class="lvct-exchange-stat__label">待办 / 已结</span>
                <span class="lvct-exchange-stat__val">{stats.openCount} / {stats.settledCount} 笔</span>
            </div>
        </div>
        {#if stats.isMultiCurrency}
            <div class="lvct-exchange-multi-currency-hint ft__smaller ft__on-surface" style="margin: -6px 0 10px; display: flex; flex-wrap: wrap; gap: 6px;">
                <span>其他币种：</span>
                {#each stats.currencies.filter(c => c.currency !== stats.primary.currency) as c}
                    <span class="lvct-chip lvct-chip--tag">
                        {c.currency}: 待收 {formatExchangeAmount(c.receivable, c.currency, 2)} · 待还 {formatExchangeAmount(c.payable, c.currency, 2)}
                    </span>
                {/each}
            </div>
        {/if}
    {/if}

    {#if errorText}<div class="lvct-form__error" role="alert">{errorText}</div>{/if}
    <div class="lvct-form__grid">
        <label class="lvct-form__item">
            <span>{text("exchangeKind", "类型")}</span>
            <select class="b3-select fn__block" style="border-radius: var(--lv-r-pill, 9999px);" bind:value={kind} disabled={formDisabled}>
                <option value="money">{text("exchangeMoney", "金钱")}</option>
                <option value="item">{text("exchangeItem", "物品")}</option>
                <option value="favor">{text("exchangeFavor", "人情")}</option>
            </select>
        </label>
        <label class="lvct-form__item">
            <span>{text("exchangeDirection", "方向")}</span>
            <select class="b3-select fn__block" style="border-radius: var(--lv-r-pill, 9999px);" bind:value={direction} disabled={formDisabled}>
                <option value="receivable">{text("exchangeReceivable", "对方欠我")}</option>
                <option value="payable">{text("exchangePayable", "我欠对方")}</option>
            </select>
        </label>
        <label class="lvct-form__item">
            <span>{text("exchangeDescription", "内容")}</span>
            <input class="b3-text-field fn__block" style="border-radius: var(--lv-r-pill, 9999px);" type="text" bind:value={description} disabled={formDisabled} placeholder={text("exchangeDescriptionPlaceholder", "如：代购机票 / 借出工具 / 帮忙介绍客户")} />
        </label>
        {#if kind === "money"}
            <label class="lvct-form__item">
                <span>{text("exchangeAmount", "金额")}</span>
                <input class="b3-text-field fn__block" style="border-radius: var(--lv-r-pill, 9999px);" type="number" inputMode="numeric" min="0" step="0.01" bind:value={amountText} disabled={formDisabled} />
                inputMode="numeric"
            </label>
            <label class="lvct-form__item">
                <span>{text("exchangeCurrency", "币种")}</span>
                <input class="b3-text-field fn__block" style="border-radius: var(--lv-r-pill, 9999px);" type="text" bind:value={currency} disabled={formDisabled} />
            </label>
        {/if}
        <label class="lvct-form__item">
            <span>{text("exchangeOccurredOn", "发生日期")}</span>
            <input class="b3-text-field fn__block" style="border-radius: var(--lv-r-pill, 9999px);" type="date" bind:value={occurredOn} disabled={formDisabled} />
        </label>
        <label class="lvct-form__item">
            <span>{text("exchangeDueOn", "到期日期（可选）")}</span>
            <input class="b3-text-field fn__block" style="border-radius: var(--lv-r-pill, 9999px);" type="date" bind:value={dueOn} disabled={formDisabled} />
        </label>
    </div>
    <label class="lvct-form__item">
        <span>{text("exchangeNote", "备注（可选）")}</span>
        <input class="b3-text-field fn__block" style="border-radius: var(--lv-r-pill, 9999px);" type="text" bind:value={note} disabled={formDisabled} />
    </label>
    <div class="lvct-form__actions">
        <button class="b3-button b3-button--text" style="border-radius: var(--lv-r-pill, 9999px);" onclick={submit} disabled={busy || loading || readFailed || !description.trim()}>
            {busy ? text("exchangeSaving", "保存中…") : saveUnknown ? text("exchangeVerifyRetry", "核实并重试本笔往来") : text("exchangeAdd", "记一笔往来")}
        </button>
    </div>

    {#if loading}
        <p class="ft__smaller ft__on-surface">{text("exchangeLoading", "正在读取往来记录…")}</p>
    {:else if readFailed}
        <button type="button" class="b3-button b3-button--outline" style="border-radius: var(--lv-r-pill, 9999px);" onclick={() => void load()} disabled={busy}>{text("retryLoad", "重新读取")}</button>
    {:else if records.length === 0}
        <p class="ft__smaller ft__on-surface">{text("exchangeEmpty", "还没有记录。")}</p>
    {:else}
        <div class="lvct-detail__timeline">
            {#each records as record (record.id)}
                <div class="lvct-detail__timeline-row lvct-exchange-row" data-direction={record.direction} data-status={record.status}>
                    <span class="lvct-exchange-date ft__on-surface">{record.occurredOn}</span>
                    <span class="lvct-detail__timeline-note lvct-exchange-desc">{recordLabel(record)}</span>
                    <span class="lvct-chip lvct-exchange-chip" class:lvct-chip--receivable={record.direction === "receivable"} class:lvct-chip--payable={record.direction === "payable"}>
                        {kindLabel(record.kind)} · {directionLabel(record.direction)}
                    </span>
                    {#if record.dueOn}<span class="ft__smaller ft__on-surface">到期 {record.dueOn}</span>{/if}
                    <span class="lvct-exchange-status ft__smaller" class:lvct-exchange-status--open={record.status === "open"} class:lvct-exchange-status--settled={record.status === "settled"}>{record.status === "open" ? "待处理" : record.status === "settled" ? `已结清${record.settledOn ? ` · ${record.settledOn}` : ""}` : "已取消"}</span>
                    {#if record.status === "open"}
                        <button class="b3-button b3-button--text lvct-exchange-btn" style="border-radius: var(--lv-r-pill, 9999px);" disabled={formDisabled || loading || readFailed || updatingRecordId === record.id} onclick={() => changeStatus(record, "settled")}>结清</button>
                        <button class="b3-button b3-button--cancel lvct-exchange-btn" style="border-radius: var(--lv-r-pill, 9999px);" disabled={formDisabled || loading || readFailed || updatingRecordId === record.id} onclick={() => changeStatus(record, "cancelled")}>取消</button>
                    {:else if record.status === "settled"}
                        <button class="b3-button b3-button--text lvct-exchange-btn" style="border-radius: var(--lv-r-pill, 9999px);" disabled={formDisabled || loading || readFailed || updatingRecordId === record.id} onclick={() => changeStatus(record, "open")}>重新打开</button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</section>

<style>
    .lvct-exchange-stats {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0;
        margin: 10px 0 14px;
        padding: 6px 0;
        background: transparent;
        border-bottom: 1px solid var(--lvct-border-subtle);
    }
    .lvct-exchange-stat {
        flex: 1 1 auto;
        min-width: 90px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0 12px;
        position: relative;
    }
    .lvct-exchange-stat:not(:last-child)::after {
        content: "";
        position: absolute;
        right: 0;
        top: 20%;
        bottom: 20%;
        width: 1px;
        background: color-mix(in srgb, var(--lvct-border-subtle) 80%, transparent);
    }
    .lvct-exchange-stat__label {
        font-size: 11px;
        color: var(--lvct-text-2);
        font-weight: 500;
    }
    .lvct-exchange-stat__val {
        font-size: 15px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: var(--lvct-text-1);
    }
    .lvct-val--receivable {
        color: var(--lvct-success, #10b981);
    }
    .lvct-val--payable {
        color: var(--lvct-accent, #ea580c);
    }
    .lvct-exchange-row {
        border-radius: var(--lvct-r-card, 12px);
        box-shadow: 0 1px 3px rgba(28, 24, 21, 0.02);
        padding: 8px 12px;
        margin-bottom: 6px;
        background: var(--lvct-bg-surface);
        border: 1px solid var(--lvct-border-subtle);
    }
    .lvct-exchange-chip {
        border-radius: var(--lv-r-pill, 9999px) !important;
    }
    .lvct-exchange-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--lvct-text-2);
        font-weight: 500;
    }
    .lvct-exchange-status::before {
        content: "";
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        forced-color-adjust: none;
    }
    .lvct-exchange-status--open {
        color: var(--lv-brand, #ea580c);
    }
    .lvct-exchange-status--settled {
        color: var(--lvct-success, #10b981);
    }
    .lvct-exchange-btn {
        opacity: 0.6;
        transition: opacity var(--lvct-dur-fast) var(--lvct-ease);
    }
    .lvct-exchange-btn:hover,
    .lvct-exchange-btn:focus-visible {
        opacity: 1;
    }
    @media (hover: none) {
        .lvct-exchange-btn {
            opacity: 1;
        }
    }
</style>
