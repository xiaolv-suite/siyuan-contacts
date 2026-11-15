import assert from "node:assert/strict";
import test from "node:test";
import {
    computeNetworkHubsSummary,
    type NetworkHubItem,
} from "../src/domain/network-hubs.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { PersonGraph } from "../src/domain/graph.ts";

function makeContact(docId: string, name: string, group = "", relatedItemIds: string[] = []): ContactSummary {
    return {
        docId,
        itemId: `item-${docId}`,
        name,
        phone: "",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group,
        tags: [],
        relatedItemIds,
    };
}

test("computeNetworkHubsSummary：计算超级连接者与跨圈层引荐人", () => {
    // 构造测试人脉网络：
    // A (投资圈) 连接 B (投资圈), C (AI科技), D (高校学术) -> A 是超级桥梁人，跨 3 个圈层，度数 3
    // B (投资圈) 连接 A
    // C (AI科技) 连接 A, E (AI科技)
    // D (高校学术) 连接 A
    // E (AI科技) 连接 C
    // F (孤立人) 无连接
    const pA = makeContact("doc-A", "张总(投资/综合)", "投资人", ["item-doc-B", "item-doc-C", "item-doc-D"]);
    const pB = makeContact("doc-B", "李总(投资)", "投资人", ["item-doc-A"]);
    const pC = makeContact("doc-C", "王教授(AI科技)", "AI科技", ["item-doc-A", "item-doc-E"]);
    const pD = makeContact("doc-D", "赵院士(高校)", "高校学术", ["item-doc-A"]);
    const pE = makeContact("doc-E", "钱工程师(AI科技)", "AI科技", ["item-doc-C"]);
    const pF = makeContact("doc-F", "孙独立", "自由职业", []);

    const people = [pA, pB, pC, pD, pE, pF];
    const graph: PersonGraph = {
        nodes: people.map((p) => ({ id: p.docId, label: p.name, group: p.group, degree: 0 })),
        edges: [
            { source: "doc-A", target: "doc-B", kind: "related" },
            { source: "doc-A", target: "doc-C", kind: "related" },
            { source: "doc-A", target: "doc-D", kind: "related" },
            { source: "doc-C", target: "doc-E", kind: "related" },
        ],
    };

    const summary = computeNetworkHubsSummary(people, graph);

    // 基础计数
    assert.equal(summary.totalNodes, 6);
    assert.equal(summary.totalEdges, 4);
    assert.equal(summary.isolatedCount, 1); // pF

    // 超级连接者 (Top Hubs)
    assert.ok(summary.topHubs.length >= 2);
    assert.equal(summary.topHubs[0].person.name, "张总(投资/综合)");
    assert.equal(summary.topHubs[0].degree, 3);
    assert.equal(summary.topHubs[1].person.name, "王教授(AI科技)");
    assert.equal(summary.topHubs[1].degree, 2);

    // 跨圈层桥梁人 (Bridge Connectors)
    assert.ok(summary.bridgeConnectors.length >= 2);
    const topBridge = summary.bridgeConnectors[0];
    assert.equal(topBridge.person.name, "张总(投资/综合)");
    assert.equal(topBridge.isBridge, true);
    // 跨越圈层：投资人、AI科技、高校学术
    assert.equal(topBridge.bridgedGroups.length, 3);
    assert.ok(topBridge.bridgedGroups.includes("投资人"));
    assert.ok(topBridge.bridgedGroups.includes("AI科技"));
    assert.ok(topBridge.bridgedGroups.includes("高校学术"));
    // 桥梁得分：degree(3) * groups(3) = 9
    assert.equal(topBridge.bridgeScore >= 9, true);

    // 王教授跨 AI科技 和 投资人
    const secondBridge = summary.bridgeConnectors[1];
    assert.equal(secondBridge.person.name, "王教授(AI科技)");
    assert.equal(secondBridge.isBridge, true);
    assert.equal(secondBridge.bridgedGroups.length, 2);
});

test("computeNetworkHubsSummary：空人脉或全孤立网络安全防护", () => {
    const emptySummary = computeNetworkHubsSummary([], { nodes: [], edges: [] });
    assert.equal(emptySummary.totalNodes, 0);
    assert.equal(emptySummary.totalEdges, 0);
    assert.equal(emptySummary.density, 0);
    assert.equal(emptySummary.topHubs.length, 0);
    assert.equal(emptySummary.bridgeConnectors.length, 0);
    assert.equal(emptySummary.isolatedCount, 0);

    const isolatedOnly = [makeContact("doc-1", "孤立1"), makeContact("doc-2", "孤立2")];
    const isolatedSummary = computeNetworkHubsSummary(isolatedOnly, { nodes: [], edges: [] });
    assert.equal(isolatedSummary.totalNodes, 2);
    assert.equal(isolatedSummary.totalEdges, 0);
    assert.equal(isolatedSummary.density, 0);
    assert.equal(isolatedSummary.isolatedCount, 2);
    assert.equal(isolatedSummary.topHubs.length, 0);
    assert.equal(isolatedSummary.bridgeConnectors.length, 0);
});
