<script lang="ts">
    import type { ContactsPluginFacade } from "../../types";
    import type { ContactSummary } from "../../domain/person";
    import type { LvSearchResultItem } from "../../libs/lv-notice-kit";
    import { Search, User, Building2, MessageSquare } from "@lucide/svelte";
    import { onDestroy, onMount, tick } from "svelte";

    let {
        facade,
        people,
        onOpenPerson,
        onOpenPersonActivity,
        onOpenOrg,
        onClose,
    }: {
        facade: ContactsPluginFacade;
        people: readonly ContactSummary[];
        onOpenPerson: (person: ContactSummary) => void;
        onOpenPersonActivity: (person: ContactSummary) => void;
        onOpenOrg?: () => void;
        onClose: () => void;
    } = $props();

    let keyword = $state("");
    let loading = $state(false);
    let results = $state<LvSearchResultItem[]>([]);
    let inputEl = $state<HTMLInputElement | undefined>(undefined);
    let requestSeq = 0;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    onMount(async () => {
        await tick();
        inputEl?.focus();
    });

    onDestroy(() => {
        alive = false;
        requestSeq += 1;
        if (timer) clearTimeout(timer);
    });

    function buildLocalFallback(kw: string): LvSearchResultItem[] {
        const q = kw.trim().toLowerCase();
        if (!q) return [];
        return people
            .filter((p) =>
                p.name.toLowerCase().includes(q)
                || p.phone.includes(q)
                || p.wechat.toLowerCase().includes(q)
                || p.email.toLowerCase().includes(q)
                || p.group.toLowerCase().includes(q)
                || p.tags.some((t) => t.toLowerCase().includes(q)),
            )
            .slice(0, 15)
            .map((person) => ({
                id: `contact_${person.docId}`,
                source: "人脉",
                category: "联系人",
                title: person.name,
                snippet: [person.group, person.phone, person.wechat, ...person.tags].filter(Boolean).join(" · "),
                badge: person.group || "联系人",
                linkBlockId: person.docId,
                onClick: () => onOpenPerson(person),
            }));
    }

    async function executeSearch(q: string) {
        const trimmed = q.trim();
        const seq = ++requestSeq;
        if (!trimmed) {
            results = [];
            loading = false;
            return;
        }
        loading = true;
        try {
            let items: LvSearchResultItem[];
            if (typeof facade.searchOmniContacts === "function") {
                items = await facade.searchOmniContacts(trimmed);
            } else {
                items = buildLocalFallback(trimmed);
            }
            if (!alive || seq !== requestSeq) return;
            results = items;
        } catch {
            if (!alive || seq !== requestSeq) return;
            results = buildLocalFallback(trimmed);
        } finally {
            if (alive && seq === requestSeq) loading = false;
        }
    }

    function handleInput() {
        if (timer) clearTimeout(timer);
        const q = keyword;
        if (!q.trim()) {
            requestSeq += 1;
            results = [];
            loading = false;
            return;
        }
        timer = setTimeout(() => {
            void executeSearch(q);
        }, 120);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.isComposing || event.keyCode === 229) return;
        if (event.key === "Enter") {
            event.preventDefault();
            if (timer) clearTimeout(timer);
            void executeSearch(keyword);
        }
    }

    function handleSelectResult(item: LvSearchResultItem) {
        onClose();
        if (item.category === "联系人" && item.linkBlockId) {
            const matched = people.find((p) => p.docId === item.linkBlockId);
            if (matched) {
                onOpenPerson(matched);
                return;
            }
        }
        if (item.category === "互动记录" && item.linkBlockId) {
            const matched = people.find((p) => p.docId === item.linkBlockId);
            if (matched) {
                onOpenPersonActivity(matched);
                return;
            }
        }
        if (item.category === "组织机构") {
            if (item.linkBlockId && facade.openDoc) {
                void facade.openDoc(item.linkBlockId);
                return;
            }
            onOpenOrg?.();
            return;
        }
        void item.onClick?.();
    }
</script>

<div class="lvct-form lvct-mobile-search">
    <div class="lvct-mobile-search__bar">
        <Search size={15} strokeWidth={1.6} aria-hidden="true" />
        <input
            bind:this={inputEl}
            class="b3-text-field fn__block"
            type="search"
            aria-label="全局搜索联系人、组织与互动记录"
            placeholder="搜索姓名、分组、电话、组织或互动内容…"
            bind:value={keyword}
            oninput={handleInput}
            onkeydown={handleKeydown}
        />
    </div>

    <div class="lvct-mobile-search__results">
        {#if !keyword.trim()}
            <p class="ft__smaller ft__on-surface">输入关键词秒搜联系人档案、组织机构与历史互动记录。</p>
        {:else if loading}
            <p class="ft__smaller ft__on-surface" role="status">正在检索…</p>
        {:else if results.length === 0}
            <p class="ft__smaller ft__on-surface" role="status">未找到与「{keyword.trim()}」匹配的联系人、组织或记录。</p>
        {:else}
            {#each results as item (item.id)}
                <button
                    type="button"
                    class="lvct-mobile-search__item"
                    onclick={() => handleSelectResult(item)}
                >
                    <span class="lvct-mobile-search__icon" aria-hidden="true">
                        {#if item.category === "组织机构"}<Building2 size={14} strokeWidth={1.6} />
                        {:else if item.category === "互动记录"}<MessageSquare size={14} strokeWidth={1.6} />
                        {:else}<User size={14} strokeWidth={1.6} />{/if}
                    </span>
                    <span class="lvct-mobile-search__text">
                        <b>{item.title}</b>
                        {#if item.snippet}<small>{item.snippet}</small>{/if}
                    </span>
                    {#if item.badge}
                        <span class="lvct-chip">{item.badge}</span>
                    {/if}
                </button>
            {/each}
        {/if}
    </div>
</div>
