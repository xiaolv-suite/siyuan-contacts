/**
 * 潜在人脉关联挖掘算法引擎（Potential Connections Discovery）。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */
import type { ContactSummary } from "./person.ts";
import type { InteractionEvent } from "./interactions.ts";
import { occasionKey } from "./interactions.ts";

export interface PotentialConnection {
    id: string; // 唯一对 ID，如 "p1::p2"
    personA: ContactSummary;
    personB: ContactSummary;
    score: number; // 亲密度与共现权重分
    coAttendanceCount: number; // 共同出席活动次数
    commonOrgs: string[]; // 共同组织/机构名称
    reasons: string[]; // 推荐理由列表
}

export interface DiscoverConnectionsOptions {
    minScore?: number; // 最低门槛分数，默认 2
    maxResults?: number; // 最大返回推荐数，默认 20
    /** 可选传入来自 org-membership.json 的已知组织归属列表，补齐纯 AV 名册缺失的机构关联 */
    knownOrgMemberships?: readonly { personDocId: string; orgName: string }[];
}

/**
 * 挖掘全库中频繁产生交集（同场出席或同属机构）但尚未登记为正式关联人的人物对。
 */
export function discoverPotentialConnections(
    people: readonly ContactSummary[],
    events: readonly InteractionEvent[] = [],
    options: DiscoverConnectionsOptions = {},
): PotentialConnection[] {
    const minScore = options.minScore ?? 2;
    const maxResults = options.maxResults ?? 20;

    const peopleByDocId = new Map(people.map((p) => [p.docId, p]));
    const itemToDoc = new Map(people.map((p) => [p.itemId, p.docId]));

    // 1. 提取所有已存在的正式双向关系（避免重复推荐）
    const existingRelated = new Set<string>();
    for (const p of people) {
        for (const relItemId of p.relatedItemIds) {
            const otherDocId = itemToDoc.get(relItemId);
            if (otherDocId && otherDocId !== p.docId) {
                const key = [p.docId, otherDocId].sort().join("::");
                existingRelated.add(key);
            }
        }
    }

    // 2. 聚合同场活动出席事实
    const occasionParticipants = new Map<string, Set<string>>();
    for (const event of events) {
        if (!peopleByDocId.has(event.personDocId)) continue;
        const key = occasionKey(event);
        if (!key) continue;
        let set = occasionParticipants.get(key);
        if (!set) {
            set = new Set<string>();
            occasionParticipants.set(key, set);
        }
        set.add(event.personDocId);
    }

    const coCounts = new Map<string, number>();
    for (const participants of occasionParticipants.values()) {
        if (participants.size < 2) continue;
        const list = Array.from(participants).sort();
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const pairKey = `${list[i]}::${list[j]}`;
                coCounts.set(pairKey, (coCounts.get(pairKey) ?? 0) + 1);
            }
        }
    }

    // 3. 聚合共同组织
    const personOrgs = new Map<string, Set<string>>();
    for (const p of people) {
        const orgs = new Set<string>();
        if (p.profile?.affiliations.state === "known") {
            const all = [
                ...(p.profile.affiliations.value.work || []),
                ...(p.profile.affiliations.value.education || []),
                ...(p.profile.affiliations.value.unspecified || []),
            ];
            for (const item of all) {
                if (item.orgName?.trim()) orgs.add(item.orgName.trim());
            }
        }
        const raw = p as unknown as Record<string, unknown>;
        if (typeof raw.organization === "string" && raw.organization.trim()) orgs.add(raw.organization.trim());
        if (typeof raw.company === "string" && raw.company.trim()) orgs.add(raw.company.trim());
        if (typeof raw.school === "string" && raw.school.trim()) orgs.add(raw.school.trim());
        personOrgs.set(p.docId, orgs);
    }
    if (options.knownOrgMemberships) {
        for (const m of options.knownOrgMemberships) {
            if (!m.personDocId || !m.orgName?.trim()) continue;
            const set = personOrgs.get(m.personDocId);
            if (set) set.add(m.orgName.trim());
        }
    }

    // 4. 遍历所有候选人对并打分
    const candidates = new Map<string, { coCount: number; orgs: Set<string> }>();

    // 4.1 来自同场的候选
    for (const [pairKey, count] of coCounts) {
        let entry = candidates.get(pairKey);
        if (!entry) {
            entry = { coCount: 0, orgs: new Set() };
            candidates.set(pairKey, entry);
        }
        entry.coCount = count;
    }

    // 4.2 来自组织的候选
    const peopleList = people.filter((p) => !p.isSelf);
    for (let i = 0; i < peopleList.length; i++) {
        const p1 = peopleList[i];
        const orgs1 = personOrgs.get(p1.docId);
        if (!orgs1 || orgs1.size === 0) continue;

        for (let j = i + 1; j < peopleList.length; j++) {
            const p2 = peopleList[j];
            const orgs2 = personOrgs.get(p2.docId);
            if (!orgs2 || orgs2.size === 0) continue;

            const common: string[] = [];
            for (const o of orgs1) {
                if (orgs2.has(o)) common.push(o);
            }

            if (common.length > 0) {
                const pairKey = [p1.docId, p2.docId].sort().join("::");
                let entry = candidates.get(pairKey);
                if (!entry) {
                    entry = { coCount: 0, orgs: new Set() };
                    candidates.set(pairKey, entry);
                }
                for (const o of common) entry.orgs.add(o);
            }
        }
    }

    // 5. 过滤与组装结果
    const results: PotentialConnection[] = [];
    for (const [pairKey, data] of candidates) {
        // 排除已建链
        if (existingRelated.has(pairKey)) continue;

        const [docIdA, docIdB] = pairKey.split("::");
        const personA = peopleByDocId.get(docIdA);
        const personB = peopleByDocId.get(docIdB);
        if (!personA || !personB) continue;
        if (personA.isSelf || personB.isSelf) continue;

        const commonOrgs = Array.from(data.orgs).sort();
        // 评分公式：同场一次计 3 分，同组织一个计 2 分
        const score = data.coCount * 3 + commonOrgs.length * 2;
        if (score < minScore) continue;

        const reasons: string[] = [];
        if (data.coCount > 0) {
            reasons.push(`共同出席 ${data.coCount} 次活动`);
        }
        if (commonOrgs.length > 0) {
            reasons.push(`共同从属：${commonOrgs.join("、")}`);
        }

        results.push({
            id: pairKey,
            personA,
            personB,
            score,
            coAttendanceCount: data.coCount,
            commonOrgs,
            reasons,
        });
    }

    // 按得分从高到低排序，截取前 maxResults
    results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return results.slice(0, maxResults);
}

export interface PersonTieRecommendation {
    id: string; // 对方 docId
    targetPerson: ContactSummary;
    score: number;
    coAttendanceCount: number;
    commonOrgs: string[];
    mutualConnectionNames: string[];
    reasons: string[];
}

export interface DiscoverPersonTiesOptions {
    minScore?: number; // 默认 1
    maxResults?: number; // 默认 6
    /** 可选传入已知共同出席列表（如 PersonInsights.coAttendance） */
    knownCoAttendance?: readonly { otherDocId: string; count: number }[];
    /** 可选传入已知共同组织背景（如 listCommonOrgBackground） */
    knownCommonOrgs?: readonly { orgName: string; peers: readonly { docId: string }[] }[];
}

/**
 * 针对单个具体联系人（currentPersonDocId）发掘潜在关联伙伴与一度破冰引荐。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 */
export function discoverPersonTies(
    currentPersonDocId: string,
    people: readonly ContactSummary[],
    events: readonly InteractionEvent[] = [],
    options: DiscoverPersonTiesOptions = {},
): PersonTieRecommendation[] {
    if (!currentPersonDocId) return [];
    const minScore = options.minScore ?? 1;
    const maxResults = options.maxResults ?? 6;

    const peopleByDocId = new Map(people.map((p) => [p.docId, p]));
    const itemToDoc = new Map(people.map((p) => [p.itemId, p.docId]));
    const currentPerson = peopleByDocId.get(currentPersonDocId);
    if (!currentPerson) return [];

    // 1. 已建立的直接关联 docId 集合（排除自身与已有相关人）
    const excludedDocIds = new Set<string>([currentPersonDocId]);
    const currentRelatedDocIds = new Set<string>();
    for (const relItemId of currentPerson.relatedItemIds) {
        const otherDocId = itemToDoc.get(relItemId);
        if (otherDocId) {
            excludedDocIds.add(otherDocId);
            currentRelatedDocIds.add(otherDocId);
        }
    }

    // 2. 聚合同场活动出席事实
    const occasionParticipants = new Map<string, Set<string>>();
    for (const event of events) {
        if (!peopleByDocId.has(event.personDocId)) continue;
        const key = occasionKey(event);
        if (!key) continue;
        let set = occasionParticipants.get(key);
        if (!set) {
            set = new Set<string>();
            occasionParticipants.set(key, set);
        }
        set.add(event.personDocId);
    }

    const coCounts = new Map<string, number>();
    for (const participants of occasionParticipants.values()) {
        if (!participants.has(currentPersonDocId) || participants.size < 2) continue;
        for (const docId of participants) {
            if (docId === currentPersonDocId) continue;
            coCounts.set(docId, (coCounts.get(docId) ?? 0) + 1);
        }
    }

    if (options.knownCoAttendance) {
        for (const item of options.knownCoAttendance) {
            if (item.otherDocId && item.count > 0) {
                coCounts.set(item.otherDocId, Math.max(coCounts.get(item.otherDocId) ?? 0, item.count));
            }
        }
    }

    // 3. 提取组织信息
    const extractOrgs = (p: ContactSummary): Set<string> => {
        const orgs = new Set<string>();
        if (p.profile?.affiliations.state === "known") {
            const all = [
                ...(p.profile.affiliations.value.work || []),
                ...(p.profile.affiliations.value.education || []),
                ...(p.profile.affiliations.value.unspecified || []),
            ];
            for (const item of all) {
                if (item.orgName?.trim()) orgs.add(item.orgName.trim());
            }
        }
        const raw = p as unknown as Record<string, unknown>;
        if (typeof raw.organization === "string" && raw.organization.trim()) orgs.add(raw.organization.trim());
        if (typeof raw.company === "string" && raw.company.trim()) orgs.add(raw.company.trim());
        if (typeof raw.school === "string" && raw.school.trim()) orgs.add(raw.school.trim());
        const grp = p.group?.trim();
        if (grp && !/^(?:家人|亲属|亲戚|朋友|好友|同事|同学|校友|客户|战略客户|合作伙伴|熟人|其他|未分组|默认)$/i.test(grp)) {
            orgs.add(grp);
        }
        return orgs;
    };

    const currentOrgs = extractOrgs(currentPerson);
    const knownPeerOrgs = new Map<string, Set<string>>();
    if (options.knownCommonOrgs) {
        for (const group of options.knownCommonOrgs) {
            const orgName = group.orgName?.trim();
            if (!orgName) continue;
            for (const peer of group.peers) {
                if (!peer.docId) continue;
                let set = knownPeerOrgs.get(peer.docId);
                if (!set) {
                    set = new Set<string>();
                    knownPeerOrgs.set(peer.docId, set);
                }
                set.add(orgName);
            }
        }
    }

    // 4. 评估全库其他非本人联系人
    const recommendations: PersonTieRecommendation[] = [];

    for (const other of people) {
        if (excludedDocIds.has(other.docId) || other.isSelf) continue;

        const coCount = coCounts.get(other.docId) ?? 0;

        // 共同组织
        const otherOrgs = extractOrgs(other);
        const commonOrgSet = new Set<string>();
        for (const o of currentOrgs) {
            if (otherOrgs.has(o)) commonOrgSet.add(o);
        }
        const extraPeerOrgs = knownPeerOrgs.get(other.docId);
        if (extraPeerOrgs) {
            for (const o of extraPeerOrgs) commonOrgSet.add(o);
        }
        const commonOrgs = [...commonOrgSet].sort();

        // 共同一度好友（Mutual Connections）
        const mutualConnectionNames: string[] = [];
        for (const relItemId of other.relatedItemIds) {
            const mutualDocId = itemToDoc.get(relItemId);
            if (mutualDocId && currentRelatedDocIds.has(mutualDocId)) {
                const mutualPerson = peopleByDocId.get(mutualDocId);
                if (mutualPerson?.name && !mutualConnectionNames.includes(mutualPerson.name)) {
                    mutualConnectionNames.push(mutualPerson.name.trim());
                }
            }
        }
        mutualConnectionNames.sort();

        // 评分公式：同场一次 3 分，同组织一个 2 分，共同好友一个 2 分
        const score = coCount * 3 + commonOrgs.length * 2 + mutualConnectionNames.length * 2;
        if (score < minScore) continue;

        const reasons: string[] = [];
        if (coCount > 0) {
            reasons.push(`共同出席 ${coCount} 次活动`);
        }
        if (commonOrgs.length > 0) {
            reasons.push(`共同机构：${commonOrgs.join("、")}`);
        }
        if (mutualConnectionNames.length > 0) {
            reasons.push(`共同好友：${mutualConnectionNames.join("、")}`);
        }

        recommendations.push({
            id: other.docId,
            targetPerson: other,
            score,
            coAttendanceCount: coCount,
            commonOrgs,
            mutualConnectionNames,
            reasons,
        });
    }

    recommendations.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return recommendations.slice(0, maxResults);
}
