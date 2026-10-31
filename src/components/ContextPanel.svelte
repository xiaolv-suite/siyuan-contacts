<script lang="ts">
    import { Maximize2, ChevronRight, Star, Phone, MessageSquare, Cake, Sparkles } from "@lucide/svelte";
    import type { ContactSummary } from "../domain/person";
    import type { ContactsPluginFacade } from "../types";
    import { translateText } from "../domain/translation";
    import { computeRelationshipHealth, heatLevelColorClass, type PersonCadence } from "../domain/cadence";
    import { isPersonStarred } from "../domain/preferences";
    import type { ViewPreferences } from "../domain/preferences";
    import { maskPhone, maskWechat } from "../domain/privacy-mask.ts";

    let {
        facade,
        i18n,
        preferences,
        person = null,
        onOpenDetail,
        onClose,
        onRecordSuccess,
    }: {
        facade: ContactsPluginFacade;
        i18n?: Readonly<Record<string, string>>;
        preferences: ViewPreferences;
        person: ContactSummary | null;
        onOpenDetail: (person: ContactSummary) => void;
        onClose: () => void;
        onRecordSuccess?: () => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let quickNote = $state("");
    let quickBusy = $state(false);
    let quickError = $state("");
    let recentInteractions = $state<Array<{ eventId: string; date: string; content: string }>>([]);
    let loadingInteractions = $state(false);
    let personCadence = $state<PersonCadence | null>(null);
    const isMasked = $derived(Boolean(preferences?.privacyShieldEnabled));

    // 关系温度求值：按人物真实节奏（无独立配置时回退全局久未联系天数）与暂停态计算
    const health = $derived.by(() => {
        if (!person) return { level: "unknown" as const, score: 0 };
        const first = recentInteractions[0];
        const lastTime = first?.date ? new Date(first.date).getTime() : undefined;
        return computeRelationshipHealth({
            cadenceDays: personCadence?.days ?? (preferences?.staleThresholdDays || 30),
            lastInteractionTime: lastTime,
            paused: Boolean(personCadence?.paused),
        });
    });

    // 当上下文人物变化时加载最近互动与联系节奏
    $effect(() => {
        const docId = person?.docId;
        if (!docId) {
            recentInteractions = [];
            personCadence = null;
            return;
        }
        loadingInteractions = true;
        personCadence = null;
        facade.getPersonCadence?.(docId).then((cad) => {
            if (person?.docId === docId) personCadence = cad;
        }).catch(() => {
            if (person?.docId === docId) personCadence = null;
        });
        facade.loadPersonInsights?.(docId).then((ins) => {
            if (person?.docId === docId) {
                recentInteractions = (ins?.timeline || []).slice(0, 3).map((item) => ({
                    eventId: item.eventId,
                    date: item.localDate,
                    content: item.note || "",
                }));
            }
        }).catch(() => {
            recentInteractions = [];
        }).finally(() => {
            if (person?.docId === docId) loadingInteractions = false;
        });
    });

    async function handleQuickRecord() {
        if (!person?.docId || !quickNote.trim() || quickBusy) return;
        quickBusy = true;
        quickError = "";
        try {
            await facade.recordInteraction(person.docId, quickNote.trim(), "meeting");
            quickNote = "";
            onRecordSuccess?.();
            const ins = await facade.loadPersonInsights?.(person.docId);
            recentInteractions = (ins?.timeline || []).slice(0, 3).map((item) => ({
                eventId: item.eventId,
                date: item.localDate,
                content: item.note || "",
            }));
        } catch (err: unknown) {
            quickError = err instanceof Error ? err.message : String(err);
        } finally {
            quickBusy = false;
        }
    }
</script>

<aside class="lvct-context-panel" aria-label={text("contextPanelAria", "联系人上下文与速览面板")}>
    <!-- 头部栏 -->
    <header class="lvct-context-panel__header">
        <div class="lvct-context-panel__title-wrap">
            <span class="lvct-context-panel__icon-badge" aria-hidden="true">
                {#if person}
                    {person.name.slice(0, 1)}
                {:else}
                    <Sparkles size={14} strokeWidth={1.6} />
                {/if}
            </span>
            <div class="lvct-context-panel__title-text">
                <h3 class="lvct-context-panel__title">{person ? person.name : text("contextPanelOverview", "人脉速览与动态")}</h3>
                <span class="lvct-context-panel__sub">{person ? (person.group || "未分组") : "今日聚焦"}</span>
            </div>
        </div>
        <div class="lvct-context-panel__header-actions">
            {#if person}
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small lvct-context-panel__icon-btn"
                    title={text("openFullScreenDetail", "展开全屏深度档案")}
                    aria-label={text("openFullScreenDetail", "展开全屏深度档案")}
                    onclick={() => onOpenDetail(person)}
                >
                    <Maximize2 size={14} strokeWidth={1.6} />
                </button>
            {/if}
            <button
                type="button"
                class="b3-button b3-button--text b3-button--small lvct-context-panel__icon-btn"
                title={text("collapsePanel", "收起侧栏面板")}
                aria-label={text("collapsePanel", "收起侧栏面板")}
                onclick={onClose}
            >
                <ChevronRight size={16} strokeWidth={1.6} />
            </button>
        </div>
    </header>

    <div class="lvct-context-panel__body">
        {#if person}
            <!-- 联系人卡片画像 -->
            <div class="lvct-context-panel__section lvct-context-card">
                <div class="lvct-context-card__row">
                    <div class="lvct-context-card__avatar" data-group={person.group || "未分组"}>
                        {person.name.slice(0, 1)}
                    </div>
                    <div class="lvct-context-card__info">
                        <div class="lvct-context-card__name-line">
                            <b>{person.name}</b>
                            {#if isPersonStarred(preferences, person.docId)}
                                <Star size={13} strokeWidth={1.6} fill="#f59e0b" color="#f59e0b" />
                            {/if}
                        </div>
                        {#if person.phone}
                            <span class="lvct-context-card__meta"><Phone size={12} strokeWidth={1.6} class="lvct-icon-inline" /> {isMasked ? maskPhone(person.phone) : person.phone}</span>
                        {/if}
                        {#if person.wechat}
                            <span class="lvct-context-card__meta"><MessageSquare size={12} strokeWidth={1.6} class="lvct-icon-inline" /> {isMasked ? maskWechat(person.wechat) : person.wechat}</span>
                        {/if}
                    </div>
                </div>

                <!-- 关系温度胶囊 -->
                <div class="lvct-context-card__heat-line">
                    <span class={`lvct-heat ${heatLevelColorClass(health.level)}`} style="font-size: 11px; padding: 2px 8px; border-radius: 9999px;">
                        {health.level === "hot" ? "🔥 温热" : health.level === "warm" ? "🍃 常温" : health.level === "cool" ? "🌬️ 微凉" : health.level === "cold" ? "❄️ 渐冻" : health.level === "paused" ? "⏸️ 暂缓" : "❄️ 未联系"}
                    </span>
                    {#if person.birthday}
                        <span class="lvct-context-card__bday"><Cake size={12} strokeWidth={1.6} class="lvct-icon-inline" /> {person.birthday}</span>
                    {/if}
                </div>

                {#if person.tags && person.tags.length > 0}
                    <div class="lvct-context-card__tags">
                        {#each person.tags.slice(0, 4) as tag}
                            <span class="lvct-chip font-size-11">#{tag}</span>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- 快捷互动记录 -->
            <div class="lvct-context-panel__section lvct-context-quick">
                <span class="lvct-context-panel__section-title">{text("quickRecordTitle", "随手记一笔互动")}</span>
                <div class="lvct-context-quick__input-box">
                    <input
                        class="b3-text-field fn__block"
                        type="text"
                        placeholder="记录会面、电话或交流随想…"
                        aria-label={text("quickRecordTitle", "随手记一笔互动")}
                        bind:value={quickNote}
                        disabled={quickBusy}
                        onkeydown={(e) => {
                            if (e.key === "Enter" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
                                e.preventDefault();
                                void handleQuickRecord();
                            }
                        }}
                    />
                    <button
                        type="button"
                        class="b3-button b3-button--small b3-button--primary"
                        disabled={!quickNote.trim() || quickBusy}
                        onclick={() => void handleQuickRecord()}
                    >
                        {quickBusy ? "记录中…" : "快捷记录"}
                    </button>
                </div>
                {#if quickError}
                    <small class="ft__error" role="alert">{quickError}</small>
                {/if}
            </div>

            <!-- 最近交往动态 -->
            <div class="lvct-context-panel__section">
                <div class="lvct-context-panel__section-header">
                    <span class="lvct-context-panel__section-title">{text("recentInteractionsTitle", "近期交往时间线")}</span>
                    <button type="button" class="b3-button b3-button--text b3-button--small" onclick={() => onOpenDetail(person)}>全部</button>
                </div>
                {#if loadingInteractions}
                    <p class="ft__smaller ft__on-surface">加载交往动态…</p>
                {:else if recentInteractions.length === 0}
                    <p class="ft__smaller ft__on-surface lvct-context-empty">暂无互动记录，在上方快速记一笔吧。</p>
                {:else}
                    <ul class="lvct-context-timeline">
                        {#each recentInteractions as item (item.eventId)}
                            <li class="lvct-context-timeline__item">
                                <span class="lvct-context-timeline__dot"></span>
                                <div class="lvct-context-timeline__content">
                                    <span class="lvct-context-timeline__date">{item.date}</span>
                                    <p class="lvct-context-timeline__text">{item.content}</p>
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>

            <!-- 底部全功能大入口 -->
            <div class="lvct-context-panel__footer">
                <button
                    type="button"
                    class="b3-button b3-button--outline fn__block"
                    style="border-radius: var(--lv-r-pill, 9999px);"
                    onclick={() => onOpenDetail(person)}
                >
                    <Sparkles size={14} strokeWidth={1.6} class="lvct-icon-inline" /> {text("viewFullDossier", "进入完整交往档案")}
                </button>
            </div>
        {:else}
            <!-- 未选人时的今日大盘速览 -->
            <div class="lvct-context-panel__section">
                <span class="lvct-context-panel__section-title">💡 使用小贴士</span>
                <p class="ft__smaller ft__on-surface" style="line-height: 1.6; margin-top: 6px;">
                    在名册中点击联系人，右侧面板将即时展示其画像、关系温度与近期交往；随时在此快速记录互动或一键展开全屏档案。
                </p>
            </div>
        {/if}
    </div>
</aside>

<style lang="scss">
    .lvct-context-panel {
        display: flex;
        flex-direction: column;
        width: 330px;
        flex: 0 0 330px;
        height: 100%;
        background: var(--lvct-bg-app, #F5F3F0);
        border-left: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        overflow: hidden;
        box-sizing: border-box;
    }

    .lvct-context-panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        background: var(--lvct-bg-surface, #ffffff);
    }

    .lvct-context-panel__title-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
    }

    .lvct-context-panel__icon-badge {
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #EA580C);
        display: grid;
        place-items: center;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
    }

    .lvct-context-panel__title-text {
        min-width: 0;
    }

    .lvct-context-panel__title {
        margin: 0;
        font-size: 14px;
        font-weight: 650;
        line-height: 1.2;
        color: var(--lvct-text-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .lvct-context-panel__sub {
        font-size: 11px;
        color: var(--lvct-text-3);
    }

    .lvct-context-panel__header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .lvct-context-panel__icon-btn {
        padding: 4px;
        border-radius: 9999px;
        color: var(--lvct-text-3);

        &:hover {
            color: var(--lvct-text-1);
            background: var(--lvct-bg-hover);
        }
    }

    .lvct-context-panel__body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .lvct-context-panel__section {
        background: var(--lvct-bg-surface, #ffffff);
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 1px 4px rgba(28, 24, 21, 0.03);
    }

    .lvct-context-panel__section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .lvct-context-panel__section-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--lvct-text-2);
    }

    .lvct-context-card__row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .lvct-context-card__avatar {
        width: 38px;
        height: 38px;
        border-radius: 11px;
        background: var(--lvct-brand-gradient);
        color: #ffffff;
        font-weight: 700;
        font-size: 16px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
    }

    .lvct-context-card__info {
        flex: 1;
        min-width: 0;
    }

    .lvct-context-card__name-line {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 15px;
        color: var(--lvct-text-1);
    }

    .lvct-context-card__meta {
        display: block;
        font-size: 11px;
        color: var(--lvct-text-3);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .lvct-context-card__heat-line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
    }

    .lvct-context-card__bday {
        font-size: 11px;
        color: var(--lv-data-amber, #D97706);
    }

    .lvct-context-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 10px;
        padding-top: 6px;
    }

    .lvct-context-quick__input-box {
        display: flex;
        gap: 6px;
        margin-top: 8px;

        input {
            flex: 1;
            font-size: 12px;
            border-radius: 9999px;
            padding: 4px 12px;
        }

        button {
            border-radius: 9999px;
            padding: 4px 12px;
            font-size: 12px;
            white-space: nowrap;
        }
    }

    .lvct-context-timeline {
        list-style: none;
        padding: 0;
        margin: 6px 0 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .lvct-context-timeline__item {
        display: flex;
        gap: 8px;
        align-items: flex-start;
    }

    .lvct-context-timeline__dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--lv-brand, #EA580C);
        margin-top: 5px;
        flex-shrink: 0;
        forced-color-adjust: none;
    }

    .lvct-context-timeline__content {
        flex: 1;
        min-width: 0;
    }

    .lvct-context-timeline__date {
        font-size: 10px;
        color: var(--lvct-text-3);
        display: block;
    }

    .lvct-context-timeline__text {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--lvct-text-1);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .lvct-context-empty {
        margin: 6px 0;
    }

    .lvct-context-panel__footer {
        margin-top: auto;
        padding-top: 6px;
    }
</style>
