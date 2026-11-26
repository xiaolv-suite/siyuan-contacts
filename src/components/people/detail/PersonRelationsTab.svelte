<script lang="ts">
    import { Sparkles, User } from "@lucide/svelte";
    import ViewState from "../../ViewState.svelte";
    import MiniRelationRadar from "../MiniRelationRadar.svelte";
    import PersonPicker from "../PersonPicker.svelte";
    import type { ContactSummary } from "../../../domain/person";
    import type { PersonTieRecommendation } from "../../../domain/connections-discovery";

    let {
        current,
        relatedPeople = [],
        others = [],
        candidates = [],
        relationCandidates = [],
        recommendedTies = [],
        pendingRelationProjections = [],
        othersLoading = false,
        othersError = "",
        busy = false,
        onLoadOthers,
        onNavigate,
        onOpenPersonDoc,
        onClose,
        onMutateRelation,
        onRetryProjections,
        text = (_k: string, fb: string) => fb,
    }: {
        current: ContactSummary;
        relatedPeople: ContactSummary[];
        others: ContactSummary[];
        candidates: ContactSummary[];
        relationCandidates: Array<{ id: string; label: string; subLabel?: string }>;
        recommendedTies: PersonTieRecommendation[];
        pendingRelationProjections: Array<{ docId: string; message?: string }>;
        othersLoading?: boolean;
        othersError?: string;
        busy?: boolean;
        onLoadOthers: () => void;
        onNavigate: (person: ContactSummary) => void;
        onOpenPersonDoc: (docId: string) => void;
        onClose: () => void;
        onMutateRelation: (action: "add" | "remove", target: ContactSummary) => void;
        onRetryProjections: () => void;
        text?: (key: string, fallback: string) => string;
    } = $props();

    let relationViewMode: "radar" | "list" = $state("radar");
    let relationPicker: any = $state(null);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -- tabpanel semantics are required for the tablist contract. -->
<section id="lvct-detail-panel-relations" role="tabpanel" aria-labelledby="lvct-detail-tab-relations" tabindex="0">
    <div class="fn__flex" style="align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <h4 style="margin: 0;">相关人（{relatedPeople.length}）</h4>
        {#if relatedPeople.length > 0}
            <div class="fn__flex" style="gap: 4px;">
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={relationViewMode === "radar"}
                    onclick={() => (relationViewMode = "radar")}
                >📡 关系雷达</button>
                <button
                    type="button"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={relationViewMode === "list"}
                    onclick={() => (relationViewMode = "list")}
                >📋 清单</button>
            </div>
        {/if}
    </div>
    {#if othersLoading}
        <ViewState compact loading title="正在加载相关人" />
    {:else if othersError}
        <ViewState compact error title="相关人加载失败" description={othersError}>
            <button class="b3-button b3-button--outline" onclick={onLoadOthers}>重试</button>
        </ViewState>
    {:else if relatedPeople.length === 0}
        <ViewState compact title="还没有建立关系"
            description={candidates.length > 0 ? "选择一位联系人，建立你们之间的关系。" : "先在联系人页添加其他人物，再回来建立关系。"}>
            {#if candidates.length > 0}
                <button class="b3-button b3-button--outline" onclick={() => relationPicker?.openPicker()}>选择联系人</button>
            {:else}
                <button class="b3-button b3-button--outline" onclick={onClose}>返回工作台</button>
            {/if}
        </ViewState>
    {:else}
        {#if relationViewMode === "radar"}
            <MiniRelationRadar
                {current}
                related={relatedPeople}
                onNavigate={(p) => void onNavigate(p)}
            />
        {/if}
        <div class="lvct-detail__relations">
            {#each relatedPeople as other (other.itemId)}
                <span class="lvct-detail__relation">
                    <button class="lvct-detail__relation-name" onclick={() => void onOpenPersonDoc(other.docId)}>{other.name}</button>
                    <button
                        class="lvct-detail__relation-remove"
                        title="解除关系"
                        disabled={busy}
                        onclick={() => onMutateRelation("remove", other)}
                    >×</button>
                </span>
            {/each}
        </div>
    {/if}

    {#if recommendedTies.length > 0}
        <div class="lvct-detail__recommended-ties" role="region" aria-label="潜在交集伙伴推荐">
            <div class="lvct-detail__recommended-ties-head">
                <span class="lvct-detail__recommended-ties-title">
                    <Sparkles size={13} class="lvct-icon-inline" style="color: var(--lv-brand, #ea580c);" />
                    <b>{text("detailRecommendedTiesTitle", "潜在交集伙伴（推荐建立关联）")}</b>
                </span>
                <span class="ft__smaller ft__on-surface">{text("detailRecommendedTiesSub", "基于同场活动、共同组织或共同好友推断")}</span>
            </div>
            <div class="lvct-detail__recommended-ties-grid">
                {#each recommendedTies as tie (tie.id)}
                    <div class="lvct-detail__tie-card">
                        <div class="lvct-detail__tie-info">
                            <button
                                type="button"
                                class="b3-button b3-button--text lvct-detail__tie-name"
                                onclick={() => void onNavigate(tie.targetPerson)}
                                title="查看画像"
                            >
                                <User size={13} class="lvct-icon-inline" /> {tie.targetPerson.name}
                            </button>
                            <div class="lvct-detail__tie-reasons">
                                {#each tie.reasons as reason}
                                    <span class="lvct-chip lvct-chip--tag font-size-11">{reason}</span>
                                {/each}
                            </div>
                        </div>
                        <div class="lvct-detail__tie-actions">
                            <button
                                type="button"
                                class="b3-button b3-button--small b3-button--outline lvct-detail__tie-add-btn"
                                disabled={busy}
                                onclick={() => void onMutateRelation("add", tie.targetPerson)}
                                title={text("detailAddRelationHint", "与当前人物建立正式双向关联")}
                            >
                                + {text("detailAddRelation", "建立关联")}
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <div class="lvct-detail__add fn__flex">
        <PersonPicker
            bind:this={relationPicker}
            items={relationCandidates}
            ariaLabel="选择要添加关系的联系人"
            placeholder={candidates.length === 0 ? "没有可添加的联系人" : "搜索并选择联系人…"}
            emptyText={candidates.length === 0 ? "没有可添加的联系人" : "没有匹配的联系人"}
            disabled={busy || othersLoading || !!othersError}
            onSelect={(itemId) => {
                const other = others.find((item) => item.itemId === itemId);
                if (other) onMutateRelation("add", other);
            }}
        />
    </div>
    <p class="ft__smaller ft__on-surface">关系为双向：添加后对方的「被相关人」列会自动出现你。</p>
    {#if pendingRelationProjections.length > 0}
        <div role="alert" class="lvct-form__error">
            <p>{text("relationProjectionPending", "关系事实已保存，但部分文档投影尚未核实。")}</p>
            <ul>{#each pendingRelationProjections as item (item.docId)}<li>{item.docId}：{item.message}</li>{/each}</ul>
            <button type="button" class="b3-button b3-button--outline" disabled={busy} onclick={onRetryProjections}>{text("relationProjectionRetry", "只重试未完成文档")}</button>
        </div>
    {/if}
</section>
