<script lang="ts">
    /** 联系人卡片（列表默认视图） */
    import type { ContactSummary } from "../../domain/person";
    import { formatBirthdayDisplay, nextBirthday } from "../../domain/occasions";
    import { formatRelativeInteraction } from "../../domain/format";
    import { computeRelationshipHealth, heatLevelColorClass } from "../../domain/cadence";
    import { ExternalLink, Phone, MessageCircle, Mail, Clock3, Network, Star, MessageSquarePlus, Cake } from "@lucide/svelte";
    import PersonProfileSummary from "./PersonProfileSummary.svelte";
    import { copyPlainText } from "../../shared/clipboard";
    import { onDestroy } from "svelte";

    let {
        person,
        onOpen,
        selected = false,
        active = false,
        onToggleSelected,
        onOpenPersonDoc,
        onOpenGraphPerson,
        onOpenActivity,
        starred = false,
        onToggleStarred,
        recent,
        recentUnknown = false,
        orgLine = "",
        cadenceDays = 30,
        cadencePaused = false,
        compact = false,
    }: {
        person: ContactSummary;
        onOpen: (person: ContactSummary) => void;
        selected?: boolean;
        active?: boolean;
        onToggleSelected?: (selected: boolean) => void;
        onOpenPersonDoc?: (docId: string) => void;
        onOpenGraphPerson?: (docId: string) => void;
        onOpenActivity?: (person: ContactSummary) => void;
        starred?: boolean;
        onToggleStarred?: (starred: boolean) => void;
        recent?: { occurredAt: number; localDate: string; count?: number };
        recentUnknown?: boolean;
        /** B12：单位显示串（组织名 · 部门，来自成员索引投影） */
        orgLine?: string;
        cadenceDays?: number;
        cadencePaused?: boolean;
        compact?: boolean;
    } = $props();

    function telHref(phone: string): string {
        return `tel:${phone}`;
    }

    function mailHref(email: string): string {
        return `mailto:${email}`;
    }

    const birthday = $derived(nextBirthday(person.birthday, person.isLunar));
    const recentLabel = $derived.by(() => {
        if (recentUnknown) return "最近互动待核实";
        if (!recent) return "暂无互动";
        const today = new Date();
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const then = new Date(`${recent.localDate}T00:00:00`).getTime();
        return formatRelativeInteraction(Math.round((day - then) / 86400000));
    });
    const health = $derived(computeRelationshipHealth({
        cadenceDays,
        lastInteractionTime: recent?.occurredAt,
        paused: cadencePaused,
    }));

    let alive = true;
    let copyingWechat = false;
    let wechatCopied = $state(false);
    let wechatTimer: ReturnType<typeof setTimeout> | null = null;
    let copyingEmail = false;
    let emailCopied = $state(false);
    let emailTimer: ReturnType<typeof setTimeout> | null = null;

    async function copyWechat(event: Event): Promise<void> {
        event.stopPropagation();
        if (!person.wechat || copyingWechat || !alive) return;
        copyingWechat = true;
        try {
            await copyPlainText(person.wechat);
            if (!alive) return;
            wechatCopied = true;
            if (wechatTimer) clearTimeout(wechatTimer);
            wechatTimer = setTimeout(() => {
                if (alive) wechatCopied = false;
            }, 1500);
        } finally {
            copyingWechat = false;
        }
    }

    async function copyEmail(event: Event): Promise<void> {
        event.stopPropagation();
        if (!person.email || copyingEmail || !alive) return;
        copyingEmail = true;
        try {
            await copyPlainText(person.email);
            if (!alive) return;
            emailCopied = true;
            if (emailTimer) clearTimeout(emailTimer);
            emailTimer = setTimeout(() => {
                if (alive) emailCopied = false;
            }, 1500);
        } finally {
            copyingEmail = false;
        }
    }

    onDestroy(() => {
        alive = false;
        if (wechatTimer) clearTimeout(wechatTimer);
        if (emailTimer) clearTimeout(emailTimer);
    });
</script>

<!-- 卡片保留鼠标快捷打开；tabindex 仅用于关闭详情后恢复焦点，键盘入口是独立详情按钮。 -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
    class="lvct-person-card"
    class:lvct-person-card--active={active}
    class:lvct-person-card--compact={compact}
    tabindex="-1"
    aria-label={`${person.name}，联系人`}
    data-person-item-id={person.itemId}
    onclick={(event) => { event.currentTarget.focus({ preventScroll: true }); onOpen(person); }}
>
    {#if compact}
        <!-- 紧凑单行模式：极高密度展示 -->
        <div class="lvct-person-card__compact-row">
            {#if onToggleSelected}
                <label class="lvct-person-card__select-hit-area" onclick={(event) => event.stopPropagation()}>
                    <input
                        class="lvct-person-card__select"
                        type="checkbox"
                        aria-label={`选择 ${person.name}`}
                        checked={selected}
                        onclick={(event) => event.stopPropagation()}
                        onchange={(event) => onToggleSelected?.((event.currentTarget as HTMLInputElement).checked)}
                    />
                </label>
            {/if}
            <span class="lvct-person-card__avatar lvct-person-card__avatar--sm" data-group={person.group || "未分组"}>
                {person.name.slice(0, 1)}
            </span>
            <div class="lvct-person-card__compact-info">
                <div class="lvct-person-card__name-row">
                    <strong class="lvct-person-card__name" title={person.name}>{person.name}</strong>
                    {#if person.isSelf}<span class="lvct-chip lvct-bucket--today">本人</span>{/if}
                    {#if person.group}<span class="lvct-chip lvct-chip--group font-size-11">{person.group}</span>{/if}
                    {#if birthday}<span class="lvct-person-card__bday font-size-11" style="display: inline-flex; align-items: center;"><Cake size={11} strokeWidth={1.6} class="lvct-icon-inline" /> {birthday.daysUntil === 0 ? "今天" : `${birthday.daysUntil}天后`}</span>{/if}
                    {#if recent && health.level !== "unknown"}
                        <span class={`lvct-heat ${heatLevelColorClass(health.level)} font-size-11 lvct-person-card__heat-pill`} title={`关系温度 ${health.score}%${recent.count ? ` · 共交往 ${recent.count} 次` : ""}`}>
                            {health.level === "hot" ? "温热" : health.level === "warm" ? "常温" : health.level === "cool" ? "微凉" : health.level === "cold" ? "渐冻" : "暂停"}
                        </span>
                    {/if}
                </div>
                {#if orgLine || (person.profile && person.profile.affiliations?.state === "known")}
                    <div class="lvct-person-card__org lvct-text-muted font-size-11" title={orgLine}>
                        {orgLine || "已登记组织经历"}
                    </div>
                {/if}
            </div>
            {#if person.phone}
                <span class="lvct-person-card__compact-phone font-size-11">
                    <Phone size={11} strokeWidth={1.6} class="lvct-text-muted" />
                    <span>{person.phone}</span>
                </span>
            {/if}
            <span class="lvct-person-card__compact-actions" role="presentation" onclick={(event) => event.stopPropagation()}>
                {#if onToggleStarred}
                    <button
                        type="button"
                        class="lvct-person-card__open-doc lvct-person-card__star-btn"
                        class:lvct-person-card__star-btn--active={starred}
                        title={starred ? "取消星标" : "设为星标常用"}
                        aria-label={starred ? `取消 ${person.name} 的星标` : `将 ${person.name} 设为星标`}
                        onclick={(event) => { event.stopPropagation(); onToggleStarred?.(!starred); }}
                    >
                        <Star size={14} strokeWidth={1.6} fill={starred ? "#f59e0b" : "none"} color={starred ? "#f59e0b" : "currentColor"} />
                    </button>
                {/if}
                {#if onOpenActivity}
                    <button type="button" class="lvct-person-card__open-doc" title={`为 ${person.name} 记一笔互动`} aria-label={`为 ${person.name} 记一笔互动`} onclick={() => onOpenActivity?.(person)}><MessageSquarePlus size={14} strokeWidth={1.6} /></button>
                {/if}
                {#if onOpenGraphPerson}<button type="button" class="lvct-person-card__open-doc" title={`在关系图谱中查看 ${person.name}`} aria-label={`在关系图谱中查看 ${person.name}`} onclick={() => onOpenGraphPerson?.(person.docId)}><Network size={14} strokeWidth={1.6} /></button>{/if}
                {#if onOpenPersonDoc}<button type="button" class="lvct-person-card__open-doc" title={`打开 ${person.name} 的文档`} aria-label={`打开 ${person.name} 的文档`} onclick={() => onOpenPersonDoc(person.docId)}><ExternalLink size={14} strokeWidth={1.6} /></button>{/if}
            </span>
        </div>
    {:else}
        <!-- 舒适模式：呼吸感与完整字段展示 -->
        <div class="lvct-person-card__top">
            {#if onToggleSelected}
                <label class="lvct-person-card__select-hit-area" onclick={(event) => event.stopPropagation()}>
                    <input
                        class="lvct-person-card__select"
                        type="checkbox"
                        aria-label={`选择 ${person.name}`}
                        checked={selected}
                        onclick={(event) => event.stopPropagation()}
                        onchange={(event) => onToggleSelected?.((event.currentTarget as HTMLInputElement).checked)}
                    />
                </label>
            {/if}
            <button type="button" class="lvct-person-card__details" aria-label={`查看 ${person.name} 的详情`} onclick={(event) => { event.stopPropagation(); onOpen(person); }}>
                <span class="lvct-person-card__avatar" data-group={person.group || "未分组"}>
                    {person.name.slice(0, 1)}
                </span>
                <span class="lvct-person-card__main">
                    <span class="lvct-person-card__name" title={person.name}>
                        {person.name}
                        {#if person.isSelf}<span class="lvct-chip lvct-bucket--today">本人</span>{/if}
                    </span>
                    <span class="lvct-person-card__sub">
                        {#if birthday}{formatBirthdayDisplay(person.birthday, person.isLunar)} · {birthday.daysUntil === 0 ? "今天" : `${birthday.daysUntil} 天后`}{:else}生日未填写{/if}
                    </span>
                </span>
            </button>
            {#if onToggleStarred}
                <button
                    type="button"
                    class="lvct-person-card__open-doc lvct-person-card__star-btn"
                    class:lvct-person-card__star-btn--active={starred}
                    title={starred ? "取消星标" : "设为星标常用"}
                    aria-label={starred ? `取消 ${person.name} 的星标` : `将 ${person.name} 设为星标`}
                    onclick={(event) => { event.stopPropagation(); onToggleStarred?.(!starred); }}
                >
                    <Star size={16} strokeWidth={1.6} fill={starred ? "#f59e0b" : "none"} color={starred ? "#f59e0b" : "currentColor"} />
                </button>
            {/if}
        </div>
        {#if person.profile}<PersonProfileSummary profile={person.profile} compact hideEmpty />
        {:else if orgLine}
            <div class="lvct-person-card__org" aria-label="单位" title={orgLine}>{orgLine}</div>
        {/if}
        <div class="lvct-person-card__meta">
            {#if person.phone}<div><span aria-hidden="true"><Phone size={13} strokeWidth={1.6} /></span><a class="lvct-person-card__meta-value" href={telHref(person.phone)} onclick={(event) => event.stopPropagation()}>{person.phone}</a></div>{/if}
            {#if person.wechat}
                <div>
                    <span aria-hidden="true"><MessageCircle size={13} strokeWidth={1.6} /></span>
                    <span
                        class="lvct-person-card__meta-value"
                        class:lvct-text-success={wechatCopied}
                        role="button"
                        tabindex="0"
                        title={wechatCopied ? "微信号已复制到剪贴板" : "点击复制微信号"}
                        onclick={copyWechat}
                        onkeydown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                void copyWechat(event);
                            }
                        }}
                    >{wechatCopied ? "已复制微信号 ✓" : person.wechat}</span>
                </div>
            {/if}
            {#if person.email}
                <div>
                    <span aria-hidden="true"><Mail size={13} strokeWidth={1.6} /></span>
                    <a
                        class="lvct-person-card__meta-value"
                        class:lvct-text-success={emailCopied}
                        href={mailHref(person.email)}
                        title={emailCopied ? "邮箱已复制到剪贴板" : "点击发信（按住 Ctrl 点击复制）"}
                        onclick={(event) => {
                            event.stopPropagation();
                            if (event.ctrlKey || event.metaKey) {
                                event.preventDefault();
                                void copyEmail(event);
                            }
                        }}
                    >{emailCopied ? "已复制邮箱 ✓" : person.email}</a>
                </div>
            {/if}
            <div>
                <span aria-hidden="true"><Clock3 size={13} strokeWidth={1.6} /></span>
                <span class="lvct-person-card__meta-value">{recentLabel}</span>
                {#if recent && recent.count && recent.count > 0}
                    <span class="lvct-text-muted font-size-11" style="margin-left: 2px;">({recent.count}次)</span>
                {/if}
                {#if recent && health.level !== "unknown"}
                    <span class={`lvct-heat ${heatLevelColorClass(health.level)} font-size-11 lvct-person-card__heat-pill`} title={recent.count ? `共交往 ${recent.count} 次` : undefined}>
                        {health.level === "hot" ? "温热" : health.level === "warm" ? "常温" : health.level === "cool" ? "微凉" : health.level === "cold" ? "渐冻" : "已暂停"}
                    </span>
                {/if}
            </div>
        </div>
        {#if person.group || person.tags.length > 0 || onOpenActivity || onOpenGraphPerson || onOpenPersonDoc}
            <div class="lvct-person-card__footer">
                {#if person.group || person.tags.length > 0}
                    <div class="lvct-person-card__tags">
                        {#if person.group}<span class="lvct-chip lvct-chip--group">{person.group}</span>{/if}
                        {#each person.tags as tag (tag)}<span class="lvct-chip"># {tag}</span>{/each}
                    </div>
                {/if}
                {#if onOpenActivity || onOpenGraphPerson || onOpenPersonDoc}
                    <span class="lvct-person-card__actions" role="presentation" onclick={(event) => event.stopPropagation()}>
                        {#if onOpenActivity}
                            <button type="button" class="lvct-person-card__open-doc" title={`为 ${person.name} 记一笔互动`} aria-label={`为 ${person.name} 记一笔互动`} onclick={(event) => { event.stopPropagation(); onOpenActivity?.(person); }}><MessageSquarePlus size={15} strokeWidth={1.6} /></button>
                        {/if}
                        {#if onOpenGraphPerson}<button type="button" class="lvct-person-card__open-doc" title={`在关系图谱中查看 ${person.name}`} aria-label={`在关系图谱中查看 ${person.name}`} onclick={(event) => { event.stopPropagation(); onOpenGraphPerson?.(person.docId); }}><Network size={15} strokeWidth={1.6} /></button>{/if}
                        {#if onOpenPersonDoc}<button type="button" class="lvct-person-card__open-doc" title={`打开 ${person.name} 的文档`} aria-label={`打开 ${person.name} 的文档`} onclick={(event) => { event.stopPropagation(); onOpenPersonDoc(person.docId); }}><ExternalLink size={15} strokeWidth={1.6} /></button>{/if}
                    </span>
                {/if}
            </div>
        {/if}
    {/if}
</article>
