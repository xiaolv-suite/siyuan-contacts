<script lang="ts">
    import { ChevronDown, ChevronRight } from "@lucide/svelte";
    import type { CommonOrgBackground, CommonOrgPeer } from "../../../domain/org-membership";

    const DEFAULT_PREVIEW_PEERS = 2;

    let {
        commonOrgs = [],
        commonOrgsLoading = false,
        commonOrgsFailed = false,
        onReload,
        onOpenOrganization,
        onNavigatePeer,
        text = (_k: string, fb: string) => fb,
    }: {
        commonOrgs: CommonOrgBackground[];
        commonOrgsLoading?: boolean;
        commonOrgsFailed?: boolean;
        onReload: () => void;
        onOpenOrganization?: (orgDocId: string) => void;
        onNavigatePeer: (peer: CommonOrgPeer) => void;
        text?: (key: string, fallback: string) => string;
    } = $props();

    let expanded = $state(false);

    const totalPeers = $derived(commonOrgs.reduce((sum, entry) => sum + entry.peers.length, 0));
    const hasOverflow = $derived(totalPeers > DEFAULT_PREVIEW_PEERS || commonOrgs.length > 2);

    const visibleOrgs = $derived.by(() => {
        if (expanded || !hasOverflow) return commonOrgs;
        let remaining = DEFAULT_PREVIEW_PEERS;
        const sliced: CommonOrgBackground[] = [];
        for (const entry of commonOrgs) {
            if (remaining <= 0) break;
            const take = entry.peers.slice(0, remaining);
            if (take.length > 0) {
                sliced.push({ ...entry, peers: take });
                remaining -= take.length;
            }
        }
        return sliced;
    });
</script>

{#if commonOrgsLoading}
    <p class="ft__smaller ft__on-surface" role="status">正在读取背景信息…</p>
{/if}

{#if commonOrgs.length > 0 || commonOrgsFailed}
    <section class="lvct-detail__section lvct-org-common-section">
        <div class="fn__flex" style="align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
            <div class="fn__flex" style="align-items: center; gap: 6px;">
                <h4 style="margin: 0;">{text("orgCommonTitle", "共同背景")}</h4>
                {#if totalPeers > 0}
                    <span class="lvct-chip lvct-chip--neutral" style="font-size: 11px; padding: 1px 6px;">{totalPeers} 人</span>
                {/if}
            </div>
            <div class="fn__flex" style="align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="ft__smaller ft__on-surface">{text("orgCommonNote", "依据为组织成员记录；加入时间未知者只标「同组织」，不推断同期。")}</span>
                {#if hasOverflow}
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small lvct-org-common__toggle"
                        aria-expanded={expanded}
                        onclick={() => (expanded = !expanded)}
                    >
                        {#if expanded}
                            <ChevronDown size={13} /> 收起共同背景
                        {:else}
                            <ChevronRight size={13} /> 展开全部 ({totalPeers})
                        {/if}
                    </button>
                {/if}
            </div>
        </div>
        {#if commonOrgsFailed}
            <p class="ft__smaller ft__on-surface" role="alert">{text("orgCommonFailed", "共同背景读取失败。")}</p>
            <button type="button" class="b3-button b3-button--outline" onclick={onReload}>重新读取共同背景</button>
        {:else}
            <div class="lvct-org-common-list" class:lvct-org-common-list--preview={!expanded && hasOverflow}>
                {#each visibleOrgs as entry (entry.orgDocId)}
                    {@const isFamilyOrg = entry.orgName?.trim() === "家庭"}
                    {@const fullEntry = commonOrgs.find((o) => o.orgDocId === entry.orgDocId) ?? entry}
                    <div class="lvct-org-common">
                        <div class="lvct-org-common__head">
                            <div class="lvct-org-common__title-group">
                                <span class="lvct-org-common__badge-icon">{isFamilyOrg ? "家" : "组"}</span>
                                <b>{entry.orgName}</b>
                                <span class="lvct-chip lvct-bucket--stale">{fullEntry.peers.length} 人</span>
                            </div>
                            {#if onOpenOrganization}
                                <button class="b3-button b3-button--text lvct-org-common__open-org" onclick={() => onOpenOrganization?.(entry.orgDocId)}>{text("routeOpenOrganization", "查看组织")}</button>
                            {/if}
                        </div>
                        <div class="lvct-org-common__peers">
                            {#each entry.peers as peer (peer.docId)}
                                {@const isUnknownOverlap = peer.overlapText === "同在该组织（加入时间未知）"}
                                {@const subLabel = isFamilyOrg && isUnknownOverlap ? "家庭成员" : isUnknownOverlap ? "同组织成员（加入时间未知）" : peer.overlapText}
                                <div class="lvct-org-common__peer">
                                    <span class="lvct-org-common__avatar">{(peer.name || "?").trim().slice(0, 1)}</span>
                                    <div class="lvct-org-common__peer-info">
                                        <div class="lvct-org-common__peer-top">
                                            <span class="lvct-org-common__peer-name">{peer.name}</span>
                                            <span class="lvct-chip {peer.samePeriod ? "lvct-bucket--today" : "lvct-bucket--stale"}">
                                                {isFamilyOrg ? "家人" : peer.samePeriod ? text("orgCommonSamePeriod", "同期") : text("orgCommonSameOrg", "同组织")}
                                            </span>
                                        </div>
                                        <span class="ft__smaller ft__on-surface lvct-org-common__peer-sub" title={peer.overlapText}>{subLabel}</span>
                                    </div>
                                    {#if peer.contact}
                                        <button type="button" class="b3-button b3-button--text lvct-org-common__peer-btn"
                                            onclick={() => onNavigatePeer(peer)}>{text("orgCommonOpen", "查看详情")}</button>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
            {#if hasOverflow && !expanded}
                <div style="margin-top: 6px; display: flex; justify-content: flex-end;">
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small lvct-org-common__expand-btn"
                        onclick={() => (expanded = true)}
                    >
                        还有 {totalPeers - visibleOrgs.reduce((s, o) => s + o.peers.length, 0)} 位共同背景联系人，点击展开全部
                    </button>
                </div>
            {/if}
        {/if}
    </section>
{/if}
