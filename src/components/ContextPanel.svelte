<script lang="ts">
    import { Maximize2, ChevronRight, Star, Phone, MessageSquare, Cake, Sparkles, Copy, Check } from "@lucide/svelte";
    import type { ContactSummary } from "../domain/person";
    import type { ContactsPluginFacade } from "../types";
    import { translateText } from "../domain/translation";
    import { computeRelationshipHealth, heatLevelColorClass, type PersonCadence } from "../domain/cadence";
    import { isPersonStarred } from "../domain/preferences";
    import type { ViewPreferences } from "../domain/preferences";
    import { maskPhone, maskWechat } from "../domain/privacy-mask.ts";
    import { copyPlainText } from "../shared/clipboard.ts";
    import type { InteractionType } from "../domain/interactions.ts";

    let {
        facade,
        i18n,
        preferences,
        person = null,
        people = [],
        onSelectPerson,
        onOpenDetail,
        onClose,
        onRecordSuccess,
    }: {
        facade: ContactsPluginFacade;
        i18n?: Readonly<Record<string, string>>;
        preferences: ViewPreferences;
        person: ContactSummary | null;
        people?: readonly ContactSummary[];
        onSelectPerson?: (person: ContactSummary) => void;
        onOpenDetail: (person: ContactSummary) => void;
        onClose: () => void;
        onRecordSuccess?: () => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let quickNote = $state("");
    let quickBusy = $state(false);
    let quickError = $state("");
    let selectedType = $state<InteractionType>("meeting");
    let copiedPhone = $state(false);
    let copiedWechat = $state(false);
    let searchQuery = $state("");
    let recentInteractions = $state<Array<{ eventId: string; date: string; content: string }>>([]);
    let loadingInteractions = $state(false);
    let personCadence = $state<PersonCadence | null>(null);
    let globalEvents = $state<Array<{ id: string; personDocId: string; personName: string; date: string; note: string; type: string }>>([]);
    let loadingGlobal = $state(false);
    const isMasked = $derived(Boolean(preferences?.privacyShieldEnabled));

    const switcherCandidates = $derived.by(() => {
        if (!searchQuery.trim()) return people.slice(0, 12);
        const q = searchQuery.trim().toLowerCase();
        return people.filter((p) => p.name.toLowerCase().includes(q) || (p.group && p.group.toLowerCase().includes(q))).slice(0, 12);
    });

    // 关系温度求值：按人物真实节奏（无独立配置时回退全局久未联系天数）与暂停态计算
    const health = $derived.by(() => {
        if (!person) return { level: "unknown" as const, score: 0 };
        const first = recentInteractions[0];
        const lastTime = first?.date ? new Date(first.date.replace(/-/g, "/")).getTime() : undefined;
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
                recentInteractions = (ins?.timeline || []).slice(0, 4).map((item) => ({
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

    // 未选中人物时，加载全库最近的互动动态流
    $effect(() => {
        if (person || !facade.loadInteractionEvents) return;
        loadingGlobal = true;
        facade.loadInteractionEvents().then((events) => {
            const map = new Map(people.map((p) => [p.docId, p.name]));
            const valid = [...events]
                .sort((a, b) => (b.occurredAt ?? 0) - (a.occurredAt ?? 0))
                .slice(0, 5)
                .map((e) => ({
                    id: e.id,
                    personDocId: e.personDocId,
                    personName: map.get(e.personDocId) || "联系人",
                    date: e.localDate,
                    note: e.note || "常规交往记录",
                    type: e.type || "meeting",
                }));
            globalEvents = valid;
        }).catch(() => {
            globalEvents = [];
        }).finally(() => {
            loadingGlobal = false;
        });
    });

    async function handleCopy(val: string, kind: "phone" | "wechat") {
        if (!val) return;
        try {
            await copyPlainText(val);
            if (kind === "phone") {
                copiedPhone = true;
                setTimeout(() => (copiedPhone = false), 1500);
            } else {
                copiedWechat = true;
                setTimeout(() => (copiedWechat = false), 1500);
            }
        } catch (err) {
            console.warn("[LvContacts] 侧栏复制联系方式失败", err);
        }
    }

    async function handleQuickRecord() {
        if (!person?.docId || !quickNote.trim() || quickBusy) return;
        quickBusy = true;
        quickError = "";
        try {
            await facade.recordInteraction(person.docId, quickNote.trim(), selectedType);
            quickNote = "";
            onRecordSuccess?.();
            const ins = await facade.loadPersonInsights?.(person.docId);
            recentInteractions = (ins?.timeline || []).slice(0, 4).map((item) => ({
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

<aside class="lvct-context-panel" aria-label={text("contextPanelAria", "联系人伴随速览与速记面板")}>
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
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    <h3 class="lvct-context-panel__title">{person ? person.name : text("contextPanelOverview", "人脉速览与动态")}</h3>
                    <span class="lvct-context-panel__badge">{person ? "伴随速览" : "人脉脉搏"}</span>
                </div>
                <span class="lvct-context-panel__sub">{person ? (person.group || "未分组") : "即点即看的侧边副驾驶"}</span>
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
        <!-- 快速人物切换与搜索条 -->
        {#if people.length > 0 && onSelectPerson}
            <div class="lvct-context-panel__search-row">
                <input
                    class="b3-text-field fn__block font-size-11"
                    style="border-radius: 9999px; padding: 3px 10px; height: 26px;"
                    type="search"
                    placeholder="快速切人…"
                    bind:value={searchQuery}
                    aria-label="快速切换速览联系人"
                />
            </div>
            <div class="lvct-context-panel__switcher" role="group" aria-label={text("contextQuickSwitchAria", "切换速览联系人")}>
                {#each switcherCandidates as item (item.docId)}
                    <button
                        type="button"
                        class="lvct-context-panel__switch-chip"
                        class:is-active={person?.docId === item.docId}
                        onclick={() => onSelectPerson(item)}
                        title={`在右侧速览 ${item.name}`}
                    >
                        {item.name}
                    </button>
                {/each}
            </div>
        {/if}

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
                            <div class="lvct-context-card__meta-item">
                                <span class="lvct-context-card__meta">
                                    <Phone size={12} strokeWidth={1.6} class="lvct-icon-inline" /> {isMasked ? maskPhone(person.phone) : person.phone}
                                </span>
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small lvct-context-card__copy-btn"
                                    onclick={() => handleCopy(person.phone, "phone")}
                                    title="复制电话号码"
                                >
                                    {#if copiedPhone}
                                        <Check size={11} color="#059669" />
                                    {:else}
                                        <Copy size={11} />
                                    {/if}
                                </button>
                            </div>
                        {/if}
                        {#if person.wechat}
                            <div class="lvct-context-card__meta-item">
                                <span class="lvct-context-card__meta">
                                    <MessageSquare size={12} strokeWidth={1.6} class="lvct-icon-inline" /> {isMasked ? maskWechat(person.wechat) : person.wechat}
                                </span>
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small lvct-context-card__copy-btn"
                                    onclick={() => handleCopy(person.wechat, "wechat")}
                                    title="复制微信号"
                                >
                                    {#if copiedWechat}
                                        <Check size={11} color="#059669" />
                                    {:else}
                                        <Copy size={11} />
                                    {/if}
                                </button>
                            </div>
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
                <div class="lvct-context-panel__section-header">
                    <span class="lvct-context-panel__section-title">{text("quickRecordTitle", "随手记一笔互动")}</span>
                    <div class="lvct-context-quick__type-selector">
                        <button
                            type="button"
                            class="lvct-context-quick__type-chip"
                            class:is-active={selectedType === "meeting"}
                            onclick={() => (selectedType = "meeting")}
                            title="会面"
                        >🤝</button>
                        <button
                            type="button"
                            class="lvct-context-quick__type-chip"
                            class:is-active={selectedType === "call"}
                            onclick={() => (selectedType = "call")}
                            title="电话"
                        >📞</button>
                        <button
                            type="button"
                            class="lvct-context-quick__type-chip"
                            class:is-active={selectedType === "message"}
                            onclick={() => (selectedType = "message")}
                            title="微信/消息"
                        >💬</button>
                        <button
                            type="button"
                            class="lvct-context-quick__type-chip"
                            class:is-active={selectedType === "meal"}
                            onclick={() => (selectedType = "meal")}
                            title="聚餐"
                        >🍽️</button>
                    </div>
                </div>
                <div class="lvct-context-quick__input-box">
                    <input
                        class="b3-text-field fn__block"
                        type="text"
                        placeholder="记录交流内容、随想或下一步…"
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
                        {quickBusy ? "记录中…" : "记录"}
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
                    <button type="button" class="b3-button b3-button--text b3-button--small font-size-11" onclick={() => onOpenDetail(person)}>查看全部 &gt;</button>
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
                    <Sparkles size={14} strokeWidth={1.6} class="lvct-icon-inline" /> {text("viewFullDossier", "展开完整交往档案与关系图 ↗")}
                </button>
            </div>
        {:else}
            <!-- 未选人时的全局交往动态与聚焦 -->
            <div class="lvct-context-panel__section">
                <div class="lvct-context-panel__section-header">
                    <span class="lvct-context-panel__section-title">⏱️ 全库最新交往动态</span>
                </div>
                {#if loadingGlobal}
                    <p class="ft__smaller ft__on-surface">正在读取最新动态…</p>
                {:else if globalEvents.length === 0}
                    <p class="ft__smaller ft__on-surface" style="line-height: 1.6; margin-top: 6px;">
                        暂无交往动态。在左侧名册中点击任意联系人，此处将即时呈现其完整画像、电话微信与时间线。
                    </p>
                {:else}
                    <ul class="lvct-context-timeline">
                        {#each globalEvents as event (event.id)}
                            {@const matched = people.find((p) => p.docId === event.personDocId)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
                            <li
                                class="lvct-context-timeline__item lvct-context-timeline__item--clickable"
                                role="button"
                                tabindex="0"
                                onclick={() => { if (matched && onSelectPerson) onSelectPerson(matched); }}
                                title={`点击在侧栏速览 ${event.personName}`}
                            >
                                <span class="lvct-context-timeline__dot"></span>
                                <div class="lvct-context-timeline__content">
                                    <div class="fn__flex" style="align-items: center; justify-content: space-between;">
                                        <b class="font-size-11 lvct-text-accent">{event.personName}</b>
                                        <span class="lvct-context-timeline__date">{event.date}</span>
                                    </div>
                                    <p class="lvct-context-timeline__text">{event.note}</p>
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>

            <!-- 使用指导小卡 -->
            <div class="lvct-context-panel__section">
                <span class="lvct-context-panel__section-title">💡 伴随速览小贴士</span>
                <p class="ft__smaller ft__on-surface" style="line-height: 1.6; margin-top: 6px;">
                    侧栏开启时，名册中的联系人点击即伴随速览，无需等待弹窗遮挡；随手记互动、查电话、看温度更加自如。
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
        padding: 12px 14px;
        border-bottom: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
        background: var(--lvct-bg-surface, #ffffff);
    }

    .lvct-context-panel__title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .lvct-context-panel__icon-badge {
        width: 26px;
        height: 26px;
        border-radius: 9999px;
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #EA580C);
        display: grid;
        place-items: center;
        font-weight: 700;
        font-size: 12px;
        flex-shrink: 0;
    }

    .lvct-context-panel__title-text {
        min-width: 0;
    }

    .lvct-context-panel__title {
        margin: 0;
        font-size: 13.5px;
        font-weight: 650;
        line-height: 1.2;
        color: var(--lvct-text-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .lvct-context-panel__badge {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 9999px;
        background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
        color: var(--lv-brand, #EA580C);
        font-weight: 600;
    }

    .lvct-context-panel__sub {
        font-size: 10.5px;
        color: var(--lvct-text-3);
    }

    .lvct-context-panel__header-actions {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .lvct-context-panel__icon-btn {
        padding: 3px;
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
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .lvct-context-panel__search-row {
        margin-bottom: -4px;
    }

    .lvct-context-panel__switcher {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        padding-bottom: 2px;
    }

    .lvct-context-panel__switch-chip {
        border: 1px solid var(--lvct-border-subtle, rgba(44, 28, 16, 0.1));
        background: var(--lvct-bg-surface, #ffffff);
        color: var(--lvct-text-2);
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
            border-color: var(--lv-brand, #EA580C);
            color: var(--lvct-text-1);
        }

        &.is-active {
            background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
            border-color: var(--lv-brand, #EA580C);
            color: var(--lv-brand, #EA580C);
            font-weight: 600;
        }
    }

    .lvct-context-panel__section {
        background: var(--lvct-bg-surface, #ffffff);
        border-radius: 10px;
        padding: 10px 12px;
        box-shadow: 0 1px 3px rgba(28, 24, 21, 0.03);
    }

    .lvct-context-panel__section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
    }

    .lvct-context-panel__section-title {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--lvct-text-2);
    }

    .lvct-context-card__row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .lvct-context-card__avatar {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: var(--lvct-brand-gradient);
        color: var(--lvct-on-accent);
        font-weight: 700;
        font-size: 15px;
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
        font-size: 14px;
        color: var(--lvct-text-1);
    }

    .lvct-context-card__meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
    }

    .lvct-context-card__meta {
        font-size: 11px;
        color: var(--lvct-text-3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .lvct-context-card__copy-btn {
        padding: 1px 3px;
        border-radius: 4px;
        color: var(--lvct-text-3);
        min-height: 18px;

        &:hover {
            color: var(--lv-brand, #EA580C);
        }
    }

    .lvct-context-card__heat-line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px solid var(--lvct-color-border-200, rgba(44, 28, 16, 0.05));
    }

    .lvct-context-card__bday {
        font-size: 10.5px;
        color: var(--lv-data-amber, #D97706);
    }

    .lvct-context-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
        padding-top: 4px;
    }

    .lvct-context-quick__type-selector {
        display: flex;
        gap: 3px;
    }

    .lvct-context-quick__type-chip {
        border: 1px solid var(--lvct-border-subtle, rgba(44, 28, 16, 0.1));
        background: transparent;
        border-radius: 6px;
        padding: 1px 5px;
        font-size: 11px;
        cursor: pointer;

        &.is-active {
            background: var(--lv-brand-soft, rgba(234, 88, 12, 0.12));
            border-color: var(--lv-brand, #EA580C);
        }
    }

    .lvct-context-quick__input-box {
        display: flex;
        gap: 6px;
        margin-top: 6px;

        input {
            flex: 1;
            font-size: 11.5px;
            border-radius: 9999px;
            padding: 3px 10px;
        }

        button {
            border-radius: 9999px;
            padding: 3px 10px;
            font-size: 11.5px;
            white-space: nowrap;
        }
    }

    .lvct-context-timeline {
        list-style: none;
        padding: 0;
        margin: 4px 0 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .lvct-context-timeline__item {
        display: flex;
        gap: 7px;
        align-items: flex-start;

        &--clickable {
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 6px;
            margin-inline: -6px;
            transition: background 0.12s ease;

            &:hover {
                background: var(--lvct-bg-hover, rgba(0, 0, 0, 0.03));
            }
        }
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
        font-size: 11.5px;
        color: var(--lvct-text-1);
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .lvct-context-empty {
        margin: 4px 0;
    }

    .lvct-text-accent {
        color: var(--lv-brand, #ea580c);
    }
</style>
