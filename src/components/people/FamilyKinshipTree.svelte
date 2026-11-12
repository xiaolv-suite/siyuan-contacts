<script lang="ts">
    import {
        groupKinshipByRole,
        newKinshipMemberId,
        type KinshipMemberItem,
        type KinshipRole,
    } from "../../domain/kinship.ts";
    import { translateText } from "../../domain/translation";
    import {
        Heart,
        Plus,
        Users,
        Handshake,
        Baby,
        House,
        X,
    } from "@lucide/svelte";

    let {
        personDocId,
        items = [],
        onAddMember,
        onRemoveMember,
        onOpenDoc,
        i18n,
    }: {
        personDocId: string;
        items: KinshipMemberItem[];
        onAddMember: (item: KinshipMemberItem) => Promise<unknown>;
        onRemoveMember: (memberId: string) => Promise<unknown>;
        onOpenDoc?: (docId: string) => void;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    let adding = $state(false);
    let newRole: KinshipRole = $state("spouse");
    let newName = $state("");
    let newLabel = $state("");
    let newBirth = $state("");
    let newNote = $state("");
    let saving = $state(false);
    let removingId: string | null = $state(null);
    let errorText = $state("");

    const grouped = $derived(groupKinshipByRole(items));

    async function handleAdd() {
        if (saving || removingId) return;
        const nameTrimmed = newName.trim();
        if (!nameTrimmed) {
            errorText = "亲属姓名不能为空";
            return;
        }

        saving = true;
        errorText = "";
        try {
            const member: KinshipMemberItem = {
                id: newKinshipMemberId(),
                personDocId,
                role: newRole,
                name: nameTrimmed,
                ...(newLabel.trim() ? { relationLabel: newLabel.trim() } : {}),
                ...(newBirth.trim() ? { birthYearOrDate: newBirth.trim() } : {}),
                ...(newNote.trim() ? { note: newNote.trim() } : {}),
                createdAt: Date.now(),
            };
            await onAddMember(member);
            newName = "";
            newLabel = "";
            newBirth = "";
            newNote = "";
            adding = false;
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            saving = false;
        }
    }

    async function handleRemove(memberId: string) {
        if (saving || removingId) return;
        removingId = memberId;
        errorText = "";
        try {
            await onRemoveMember(memberId);
        } catch (err: unknown) {
            errorText = err instanceof Error ? err.message : String(err);
        } finally {
            removingId = null;
        }
    }

    const ROLE_LABELS: Record<KinshipRole, { title: string; defaultLabel: string }> = {
        parent: { title: "长辈 / 父母", defaultLabel: "父亲" },
        spouse: { title: "伴侣 / 配偶", defaultLabel: "妻子" },
        sibling: { title: "同辈 / 手足", defaultLabel: "兄弟" },
        child: { title: "晚辈 / 子女", defaultLabel: "孩子" },
        relative: { title: "其他亲属", defaultLabel: "亲戚" },
    };
</script>

<div class="lvct-kinship-tree" role="region" aria-label="家庭与亲属关系树谱">
    <div class="lvct-kinship-tree__header fn__flex">
        <span class="lvct-kinship-tree__title">
            <Heart size={14} strokeWidth={1.6} class="lvct-icon-inline" style="color: #e11d48;" />
            <b>{text("kinshipTreeTitle", "家庭与亲属树谱")}</b>
            <span class="ft__smaller ft__on-surface">（{items.length} 位亲属成员）</span>
        </span>
        {#if !adding}
            <button
                type="button"
                class="b3-button b3-button--text b3-button--small lvct-kinship-tree__add-btn"
                onclick={() => { adding = true; errorText = ""; }}
            >
                <Plus size={12} strokeWidth={1.6} class="lvct-icon-inline" /> {text("kinshipAddBtn", "添加亲属")}
            </button>
        {/if}
    </div>

    <!-- 亲属层级卡片展示 -->
    <div class="lvct-kinship-tree__groups">
        <!-- 1. 长辈 -->
        {#if grouped.parent.length > 0}
            <div class="lvct-kinship-tree__group">
                <span class="lvct-kinship-tree__group-label">
                    <Users size={13} strokeWidth={1.6} class="lvct-icon-inline" />
                    <span>{ROLE_LABELS.parent.title}</span>
                </span>
                <div class="lvct-kinship-tree__cards">
                    {#each grouped.parent as m (m.id)}
                        <div class="lvct-kinship-tree__card">
                            <span class="lvct-chip lvct-chip--tag font-size-11">{m.relationLabel || "长辈"}</span>
                            {#if m.linkedDocId && onOpenDoc}
                                <button type="button" class="b3-button b3-button--text lvct-kinship-tree__name" onclick={() => onOpenDoc?.(m.linkedDocId!)}>
                                    {m.name} ↗
                                </button>
                            {:else}
                                <b class="lvct-kinship-tree__name">{m.name}</b>
                            {/if}
                            {#if m.birthYearOrDate}<span class="ft__smaller ft__on-surface">（{m.birthYearOrDate}）</span>{/if}
                            {#if m.note}<span class="lvct-kinship-tree__note" title={m.note}>· {m.note}</span>{/if}
                            <button
                                type="button"
                                class="lvct-kinship-tree__remove"
                                disabled={saving || removingId === m.id}
                                onclick={() => void handleRemove(m.id)}
                                title="移除亲属"
                                aria-label={`移除亲属 ${m.name}`}
                            >
                                <X size={11} strokeWidth={1.6} />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- 2. 配偶伴侣 -->
        {#if grouped.spouse.length > 0}
            <div class="lvct-kinship-tree__group">
                <span class="lvct-kinship-tree__group-label">
                    <Heart size={13} strokeWidth={1.6} class="lvct-icon-inline" style="color: var(--lvct-group-family, #e11d48);" />
                    <span>{ROLE_LABELS.spouse.title}</span>
                </span>
                <div class="lvct-kinship-tree__cards">
                    {#each grouped.spouse as m (m.id)}
                        <div class="lvct-kinship-tree__card lvct-kinship-tree__card--spouse">
                            <span class="lvct-chip lvct-chip--tag font-size-11">{m.relationLabel || "配偶"}</span>
                            {#if m.linkedDocId && onOpenDoc}
                                <button type="button" class="b3-button b3-button--text lvct-kinship-tree__name" onclick={() => onOpenDoc?.(m.linkedDocId!)}>
                                    {m.name} ↗
                                </button>
                            {:else}
                                <b class="lvct-kinship-tree__name">{m.name}</b>
                            {/if}
                            {#if m.birthYearOrDate}<span class="ft__smaller ft__on-surface">（{m.birthYearOrDate}）</span>{/if}
                            {#if m.note}<span class="lvct-kinship-tree__note" title={m.note}>· {m.note}</span>{/if}
                            <button
                                type="button"
                                class="lvct-kinship-tree__remove"
                                disabled={saving || removingId === m.id}
                                onclick={() => void handleRemove(m.id)}
                                title="移除亲属"
                                aria-label={`移除亲属 ${m.name}`}
                            >
                                <X size={11} strokeWidth={1.6} />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- 3. 同辈 -->
        {#if grouped.sibling.length > 0}
            <div class="lvct-kinship-tree__group">
                <span class="lvct-kinship-tree__group-label">
                    <Handshake size={13} strokeWidth={1.6} class="lvct-icon-inline" />
                    <span>{ROLE_LABELS.sibling.title}</span>
                </span>
                <div class="lvct-kinship-tree__cards">
                    {#each grouped.sibling as m (m.id)}
                        <div class="lvct-kinship-tree__card">
                            <span class="lvct-chip lvct-chip--tag font-size-11">{m.relationLabel || "手足"}</span>
                            {#if m.linkedDocId && onOpenDoc}
                                <button type="button" class="b3-button b3-button--text lvct-kinship-tree__name" onclick={() => onOpenDoc?.(m.linkedDocId!)}>
                                    {m.name} ↗
                                </button>
                            {:else}
                                <b class="lvct-kinship-tree__name">{m.name}</b>
                            {/if}
                            {#if m.birthYearOrDate}<span class="ft__smaller ft__on-surface">（{m.birthYearOrDate}）</span>{/if}
                            {#if m.note}<span class="lvct-kinship-tree__note" title={m.note}>· {m.note}</span>{/if}
                            <button
                                type="button"
                                class="lvct-kinship-tree__remove"
                                disabled={saving || removingId === m.id}
                                onclick={() => void handleRemove(m.id)}
                                title="移除亲属"
                                aria-label={`移除亲属 ${m.name}`}
                            >
                                <X size={11} strokeWidth={1.6} />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- 4. 子女晚辈 -->
        {#if grouped.child.length > 0}
            <div class="lvct-kinship-tree__group">
                <span class="lvct-kinship-tree__group-label">
                    <Baby size={13} strokeWidth={1.6} class="lvct-icon-inline" style="color: var(--lv-data-amber, #d97706);" />
                    <span>{ROLE_LABELS.child.title}</span>
                </span>
                <div class="lvct-kinship-tree__cards">
                    {#each grouped.child as m (m.id)}
                        <div class="lvct-kinship-tree__card lvct-kinship-tree__card--child">
                            <span class="lvct-chip lvct-chip--tag font-size-11">{m.relationLabel || "子女"}</span>
                            {#if m.linkedDocId && onOpenDoc}
                                <button type="button" class="b3-button b3-button--text lvct-kinship-tree__name" onclick={() => onOpenDoc?.(m.linkedDocId!)}>
                                    {m.name} ↗
                                </button>
                            {:else}
                                <b class="lvct-kinship-tree__name">{m.name}</b>
                            {/if}
                            {#if m.birthYearOrDate}<span class="ft__smaller ft__on-surface">（{m.birthYearOrDate}）</span>{/if}
                            {#if m.note}<span class="lvct-kinship-tree__note" title={m.note}>· {m.note}</span>{/if}
                            <button
                                type="button"
                                class="lvct-kinship-tree__remove"
                                disabled={saving || removingId === m.id}
                                onclick={() => void handleRemove(m.id)}
                                title="移除亲属"
                                aria-label={`移除亲属 ${m.name}`}
                            >
                                <X size={11} strokeWidth={1.6} />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- 5. 其他亲属 -->
        {#if grouped.relative.length > 0}
            <div class="lvct-kinship-tree__group">
                <span class="lvct-kinship-tree__group-label">
                    <House size={13} strokeWidth={1.6} class="lvct-icon-inline" />
                    <span>{ROLE_LABELS.relative.title}</span>
                </span>
                <div class="lvct-kinship-tree__cards">
                    {#each grouped.relative as m (m.id)}
                        <div class="lvct-kinship-tree__card">
                            <span class="lvct-chip lvct-chip--tag font-size-11">{m.relationLabel || "亲属"}</span>
                            <b class="lvct-kinship-tree__name">{m.name}</b>
                            {#if m.note}<span class="lvct-kinship-tree__note" title={m.note}>· {m.note}</span>{/if}
                            <button
                                type="button"
                                class="lvct-kinship-tree__remove"
                                disabled={saving || removingId === m.id}
                                onclick={() => void handleRemove(m.id)}
                                title="移除亲属"
                                aria-label={`移除亲属 ${m.name}`}
                            >
                                <X size={11} strokeWidth={1.6} />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if items.length === 0 && !adding}
            <div class="lvct-kinship-tree__empty ft__smaller ft__on-surface">
                暂未登记家庭与亲属。可点击上方「添加亲属」记录配偶、子女、父母等重要家属信息。
            </div>
        {/if}
    </div>

    <!-- 录入表单 -->
    {#if adding}
        <div class="lvct-kinship-tree__form fn__flex">
            <select class="b3-select" bind:value={newRole} disabled={saving}>
                <option value="spouse">伴侣 / 配偶</option>
                <option value="child">子女 / 晚辈</option>
                <option value="parent">父母 / 长辈</option>
                <option value="sibling">兄弟 / 手足</option>
                <option value="relative">其他亲戚</option>
            </select>
            <input
                type="text"
                class="b3-text-field"
                placeholder="具体称谓（如：妻子/儿子/岳母）"
                bind:value={newLabel}
                disabled={saving}
                style="width: 140px;"
            />
            <input
                type="text"
                class="b3-text-field"
                placeholder="姓名 *"
                bind:value={newName}
                disabled={saving}
                style="width: 110px;"
            />
            <input
                type="text"
                class="b3-text-field"
                placeholder="出生年/生日（可选）"
                bind:value={newBirth}
                disabled={saving}
                style="width: 130px;"
            />
            <input
                type="text"
                class="b3-text-field"
                placeholder="备忘/忌口（可选）"
                bind:value={newNote}
                disabled={saving}
                style="flex: 1; min-width: 120px;"
            />
            <button
                type="button"
                class="b3-button b3-button--outline"
                disabled={saving}
                onclick={handleAdd}
            >
                {saving ? "保存中…" : "保存"}
            </button>
            <button
                type="button"
                class="b3-button b3-button--cancel"
                disabled={saving}
                onclick={() => { adding = false; errorText = ""; }}
            >
                取消
            </button>
        </div>
    {/if}

    {#if errorText}
        <div class="ft__smaller lvct-text-danger" style="margin-top: 4px;">{errorText}</div>
    {/if}
</div>
