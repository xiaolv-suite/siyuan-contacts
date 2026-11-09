<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { ContactsPluginFacade } from "../../types";
    import type { ExchangesSummary, ExchangeRecordWithPerson } from "../../domain/exchanges-summary.ts";
    import { formatExchangeAmount } from "../../domain/exchanges-summary.ts";
    import { translateText } from "../../domain/translation";
    import { toLocalDateKey } from "../../domain/interactions.ts";
    import ViewState from "../ViewState.svelte";
    import { requestErrorMessage } from "../../shared/error-presenter";
    import { CheckCircle2, FileText } from "@lucide/svelte";

    let {
        facade,
        i18n,
        onClose,
        onOpenPerson,
    }: {
        facade: ContactsPluginFacade;
        i18n?: Readonly<Record<string, string>>;
        onClose: () => void;
        onOpenPerson?: (docId: string) => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let summary = $state<ExchangesSummary | null>(null);
    let loading = $state(true);
    let errorText = $state("");
    let statusFilter = $state<"all" | "open" | "settled">("all");
    let kindFilter = $state<"all" | "item" | "money" | "favor">("all");
    let creatingDoc = $state(false);
    let createdDocInfo = $state<{ docId: string; hpath: string; count: number } | null>(null);
    let busyRecordId = $state("");
    let alive = true;

    onDestroy(() => { alive = false; });

    async function loadData() {
        if (!facade.loadExchangesSummary) return;
        loading = true;
        errorText = "";
        try {
            const res = await facade.loadExchangesSummary();
            if (alive) summary = res;
        } catch (err) {
            if (alive) errorText = requestErrorMessage(err);
        } finally {
            if (alive) loading = false;
        }
    }

    onMount(() => {
        void loadData();
    });

    const filteredRecords = $derived.by<ExchangeRecordWithPerson[]>(() => {
        if (!summary) return [];
        return summary.records.filter((r) => {
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            if (kindFilter !== "all" && r.kind !== kindFilter) return false;
            return true;
        });
    });

    async function toggleRecordStatus(record: ExchangeRecordWithPerson) {
        if (!facade.changePersonExchangeStatus || Boolean(busyRecordId)) return;
        busyRecordId = record.id;
        const nextStatus = record.status === "open" ? "settled" : "open";
        const today = toLocalDateKey(new Date());
        try {
            await facade.changePersonExchangeStatus(
                record.id,
                nextStatus,
                nextStatus === "settled" ? today : "",
                { updatedAt: record.updatedAt }
            );
            await loadData();
        } catch (err) {
            errorText = requestErrorMessage(err);
        } finally {
            busyRecordId = "";
        }
    }

    async function handleCreateLedgerDoc() {
        if (!facade.createExchangesLedgerDoc || creatingDoc) return;
        creatingDoc = true;
        try {
            const res = await facade.createExchangesLedgerDoc();
            if (alive) {
                if (res) createdDocInfo = res;
                else errorText = text("ledgerDocFailed", "生成账簿文档失败，请检查笔记本设置");
            }
        } catch (err) {
            if (alive) errorText = requestErrorMessage(err);
        } finally {
            if (alive) creatingDoc = false;
        }
    }
</script>

<div class="lvct-exchanges-hub" role="region" aria-label="人情礼尚往来大账本">
    {#if loading}
        <ViewState compact loading title="正在读取全库人情往来记录…" />
    {:else if errorText}
        <ViewState compact error title="读取人情账本失败" description={errorText}>
            <button type="button" class="b3-button b3-button--outline" onclick={loadData}>重试</button>
        </ViewState>
    {:else if summary}
        <!-- 顶部指标大盘 -->
        <div class="lvct-exchanges-hub__stats-grid">
            <div class="lvct-exchanges-hub__stat-card">
                <span class="lvct-exchanges-hub__stat-num">{summary.totalRecords}</span>
                <span class="lvct-exchanges-hub__stat-label">往来总笔数</span>
            </div>
            <div class="lvct-exchanges-hub__stat-card lvct-exchanges-hub__stat-card--warn">
                <span class="lvct-exchanges-hub__stat-num">{summary.openCount}</span>
                <span class="lvct-exchanges-hub__stat-label">待处理/待答谢</span>
            </div>
            <div class="lvct-exchanges-hub__stat-card lvct-exchanges-hub__stat-card--success">
                <span class="lvct-exchanges-hub__stat-num">{summary.settledCount}</span>
                <span class="lvct-exchanges-hub__stat-label">已结清/已答谢</span>
            </div>
            <div class="lvct-exchanges-hub__stat-card">
                <span class="lvct-exchanges-hub__stat-num">🎁 {summary.byKind.item}</span>
                <span class="lvct-exchanges-hub__stat-label">礼品 · 款项 {summary.byKind.money} · 人情 {summary.byKind.favor}</span>
            </div>
        </div>

        {#if createdDocInfo}
            <div class="lvct-exchanges-hub__notice fn__flex" role="status">
                <span>🧧 <b>人情账簿文档</b> 已成功生成至 <code>{createdDocInfo.hpath}</code></span>
                <button
                    type="button"
                    class="b3-button b3-button--small b3-button--text"
                    style="color: var(--b3-theme-primary);"
                    onclick={() => {
                        facade.openPersonDoc?.(createdDocInfo!.docId);
                    }}
                >
                    在主编辑器打开 ↗
                </button>
            </div>
        {/if}

        {#if summary.moneySummary.byCurrency?.length}
            <div class="fn__flex" style="gap: 8px; flex-wrap: wrap;" aria-label="按币种统计，不做汇率换算">
                {#each summary.moneySummary.byCurrency as total (total.currency)}
                    <span class="lvct-chip lvct-chip--tag">{total.currency} · 收到 {formatExchangeAmount(total.receivableTotal, total.currency, 2)} · 送出 {formatExchangeAmount(total.payableTotal, total.currency, 2)}</span>
                {/each}
            </div>
        {/if}

        <!-- 筛选与控制条 -->
        <div class="lvct-exchanges-hub__filter-bar fn__flex">
            <div class="fn__flex" style="gap: 6px; align-items: center; flex-wrap: wrap;">
                <span class="ft__smaller ft__on-surface">状态：</span>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={statusFilter === "all"}
                    onclick={() => (statusFilter = "all")}
                >全部 ({summary.totalRecords})</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={statusFilter === "open"}
                    onclick={() => (statusFilter = "open")}
                >待处理 ({summary.openCount})</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={statusFilter === "settled"}
                    onclick={() => (statusFilter = "settled")}
                >已结清 ({summary.settledCount})</button>
            </div>

            <div class="fn__flex" style="gap: 6px; align-items: center; flex-wrap: wrap;">
                <span class="ft__smaller ft__on-surface">类别：</span>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={kindFilter === "all"}
                    onclick={() => (kindFilter = "all")}
                >全部</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={kindFilter === "item"}
                    onclick={() => (kindFilter = "item")}
                >🎁 礼品 ({summary.byKind.item})</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={kindFilter === "money"}
                    onclick={() => (kindFilter = "money")}
                >💰 款项 ({summary.byKind.money})</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={kindFilter === "favor"}
                    onclick={() => (kindFilter = "favor")}
                >🤝 人情 ({summary.byKind.favor})</button>
            </div>
        </div>

        <!-- 往来记录明细清单 -->
        <div class="lvct-exchanges-hub__list">
            {#if filteredRecords.length === 0}
                <ViewState compact title="无匹配往来记录" description="当前筛选条件下没有往来记录。" />
            {:else}
                {#each filteredRecords as r (r.id)}
                    <div class="lvct-exchanges-hub__row fn__flex">
                        <div class="lvct-exchanges-hub__row-date">
                            <span>{r.occurredOn}</span>
                            <small class="ft__smaller ft__on-surface">{r.direction === "receivable" ? "🎁 收到" : "📤 送出"}</small>
                        </div>
                        <div class="lvct-exchanges-hub__row-main">
                            <div class="fn__flex" style="gap: 6px; align-items: center;">
                                <button
                                    type="button"
                                    class="b3-button b3-button--text lvct-exchanges-hub__person-link"
                                    onclick={() => onOpenPerson?.(r.personDocId)}
                                    title="查看联系人画像"
                                >
                                    {r.personName}
                                </button>
                                <b class="lvct-exchanges-hub__desc">{r.description}</b>
                                {#if r.amount}
                                    <span class="lvct-chip lvct-chip--tag">{formatExchangeAmount(r.amount, r.currency)}</span>
                                {/if}
                            </div>
                            {#if r.note}
                                <p class="lvct-exchanges-hub__note">{r.note}</p>
                            {/if}
                        </div>
                        <div class="lvct-exchanges-hub__row-actions">
                            <button
                                type="button"
                                class="b3-button b3-button--small"
                                style="border-radius: var(--lv-r-pill, 9999px);"
                                class:b3-button--outline={r.status === "open"}
                                class:b3-button--text={r.status === "settled"}
                                disabled={Boolean(busyRecordId)}
                                onclick={() => void toggleRecordStatus(r)}
                                title={r.status === "open" ? "标记为已结清/已答谢" : "重新设为待处理"}
                            >
                                {#if r.status === "open"}
                                    ✓ 标为已结清
                                {:else if r.status === "settled"}
                                    <CheckCircle2 size={12} class="lvct-text-success lvct-icon-inline" /> 已结清
                                {:else}
                                    已取消
                                {/if}
                            </button>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

        <!-- 底部操作栏 -->
        <div class="lvct-exchanges-hub__footer fn__flex">
            {#if facade.createExchangesLedgerDoc}
                <button
                    type="button"
                    class="b3-button b3-button--outline"
                    onclick={handleCreateLedgerDoc}
                    disabled={creatingDoc || summary.totalRecords === 0}
                    title="在当前笔记本生成 Markdown 格式的完整人情大账簿笔记"
                >
                    <FileText size={13} class="lvct-icon-inline" /> {creatingDoc ? "账簿生成中…" : "沉淀为思源账簿文档 ↗"}
                </button>
            {/if}
            <button type="button" class="b3-button b3-button--cancel" onclick={onClose}>关闭</button>
        </div>
    {/if}
</div>
