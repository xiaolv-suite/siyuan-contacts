/**
 * 人脉网络核心枢纽与跨界桥梁人分析引擎（E-55）：
 * 纯函数图算法，基于人脉拓扑结构挖掘超级连接者（Super-Connectors）与跨圈层桥梁人（Bridge Connectors）。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */
import type { ContactSummary } from "./person.ts";
import type { PersonGraph } from "./graph.ts";
import { extractNormalizedRegion } from "./region.ts";

export interface NetworkHubItem {
    docId: string;
    person: ContactSummary;
    degree: number;
    bridgedGroups: string[];
    bridgedCities: string[];
    isBridge: boolean;
    bridgeScore: number;
    connectedPersonDocIds: string[];
}

export interface NetworkHubsSummary {
    totalNodes: number;
    totalEdges: number;
    density: number; // 0–1 网络连接紧密度
    topHubs: NetworkHubItem[]; // 按连接度降序
    bridgeConnectors: NetworkHubItem[]; // 跨圈层引荐人（连接 ≥2 个不同分组），按桥梁评分降序
    isolatedCount: number;
}

/**
 * 纯函数：计算人脉网络枢纽与跨圈层引荐桥梁人
 */
export function computeNetworkHubsSummary(
    people: readonly ContactSummary[],
    graph: PersonGraph,
): NetworkHubsSummary {
    const peopleByDocId = new Map(people.map((p) => [p.docId, p]));
    const itemToDoc = new Map(people.map((p) => [p.itemId, p.docId]));

    // 构建显式人际关系邻接表
    const neighbors = new Map<string, Set<string>>();
    for (const p of people) {
        neighbors.set(p.docId, new Set<string>());
    }

    // 从 graph.edges 或直接从 people.relatedItemIds 提取
    for (const p of people) {
        for (const relItemId of p.relatedItemIds) {
            const targetDocId = itemToDoc.get(relItemId);
            if (targetDocId && targetDocId !== p.docId && peopleByDocId.has(targetDocId)) {
                neighbors.get(p.docId)?.add(targetDocId);
                neighbors.get(targetDocId)?.add(p.docId);
            }
        }
    }

    // 辅助纳入图上的已解析 related 边（防遗漏）
    for (const edge of graph.edges) {
        if (edge.kind && edge.kind !== "related") continue;
        if (edge.source !== edge.target && peopleByDocId.has(edge.source) && peopleByDocId.has(edge.target)) {
            neighbors.get(edge.source)?.add(edge.target);
            neighbors.get(edge.target)?.add(edge.source);
        }
    }

    const hubItems: NetworkHubItem[] = [];
    let isolatedCount = 0;

    for (const person of people) {
        const neighborIds = Array.from(neighbors.get(person.docId) ?? []);
        const degree = neighborIds.length;

        if (degree === 0) {
            isolatedCount += 1;
            continue;
        }

        const neighborPeople = neighborIds
            .map((id) => peopleByDocId.get(id))
            .filter((p): p is ContactSummary => Boolean(p));

        // 统计邻居覆盖的分组（排除空串）
        const groupSet = new Set<string>();
        if (person.group.trim()) groupSet.add(person.group.trim());
        for (const np of neighborPeople) {
            if (np.group.trim()) groupSet.add(np.group.trim());
        }
        const bridgedGroups = Array.from(groupSet);

        // 统计邻居覆盖的城市
        const citySet = new Set<string>();
        const ownCity = extractNormalizedRegion(person).city;
        if (ownCity && ownCity !== "未知") citySet.add(ownCity);
        for (const np of neighborPeople) {
            const c = extractNormalizedRegion(np).city;
            if (c && c !== "未知") citySet.add(c);
        }
        const bridgedCities = Array.from(citySet);

        // 跨圈层判定：自身 + 邻居覆盖至少 2 个不同分组
        const isBridge = bridgedGroups.length >= 2;
        // 桥梁得分：度数 * 覆盖圈层数 + 跨地域奖励分
        const bridgeScore = degree * bridgedGroups.length + (bridgedCities.length >= 2 ? 10 : 0);

        hubItems.push({
            docId: person.docId,
            person,
            degree,
            bridgedGroups,
            bridgedCities,
            isBridge,
            bridgeScore,
            connectedPersonDocIds: neighborIds,
        });
    }

    // 1. 超级连接者（Top Hubs）：按度数降序，同度数按姓名排序
    const topHubs = [...hubItems].sort((a, b) => {
        if (b.degree !== a.degree) return b.degree - a.degree;
        return a.person.name.localeCompare(b.person.name, "zh-CN");
    });

    // 2. 跨界桥梁人（Bridge Connectors）：仅收纳 isBridge 为 true 的人选，按 bridgeScore 降序
    const bridgeConnectors = hubItems
        .filter((item) => item.isBridge)
        .sort((a, b) => {
            if (b.bridgeScore !== a.bridgeScore) return b.bridgeScore - a.bridgeScore;
            if (b.bridgedGroups.length !== a.bridgedGroups.length) {
                return b.bridgedGroups.length - a.bridgedGroups.length;
            }
            return a.person.name.localeCompare(b.person.name, "zh-CN");
        });

    // 3. 图密度计算
    const totalNodes = people.length;
    let actualEdges = 0;
    for (const set of neighbors.values()) {
        actualEdges += set.size;
    }
    const totalEdges = Math.round(actualEdges / 2);

    const maxEdges = (totalNodes * (totalNodes - 1)) / 2;
    const density = maxEdges > 0 ? Number((totalEdges / maxEdges).toFixed(4)) : 0;

    return {
        totalNodes,
        totalEdges,
        density,
        topHubs: topHubs.slice(0, 15),
        bridgeConnectors: bridgeConnectors.slice(0, 15),
        isolatedCount,
    };
}
