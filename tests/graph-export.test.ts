import assert from "node:assert/strict";
import test from "node:test";
import {
    pathSegments,
    renderGraphResultMarkdown,
    renderGraphSnapshotMarkdown,
} from "../src/domain/graph-export.ts";
import { buildGraphQuerySnapshot } from "../src/domain/graph-query.ts";
import type { GraphQuery, GraphSources } from "../src/domain/graph-query.ts";
import type { GraphResultExportInput } from "../src/domain/graph-export.ts";

const base: GraphResultExportInput = {
    kind: "path",
    centerName: "甲",
    compareName: "乙",
    pathNames: ["甲", "共同人物", "乙"],
    resultNames: [],
    nodeCount: 236,
    edgeCount: 418,
    truncated: false,
    filters: { search: "", group: "", isolatedOnly: false },
    generatedAt: "2026-09-28 15:00",
};

test("链式分段：相邻人物组成关系段，单元素无段", () => {
    assert.deepEqual(pathSegments([]), []);
    assert.deepEqual(pathSegments(["甲"]), []);
    assert.deepEqual(pathSegments(["甲", "丙", "乙"]), [
        { from: "甲", to: "丙" },
        { from: "丙", to: "乙" },
    ]);
});

test("路径导出：总结段数、链式行、图规模与范围免责齐全，相同输入一致", () => {
    const first = renderGraphResultMarkdown(base);
    assert.equal(first, renderGraphResultMarkdown(base), "相同输入应产出一致内容");
    assert(first.includes("查询：最短路径（甲 → 乙）"), "查询行缺失");
    assert(first.includes("之间为 2 段关系（当前图内）"), "段数总结错误");
    assert(first.includes("- 甲 — 共同人物 — 乙"), "路径链缺失");
    assert(first.includes("节点 236 · 边 418"), "图规模缺失");
    assert(first.includes("筛选：无"), "筛选缺省文本缺失");
    assert(first.includes("不代表现实社交关系、引荐意愿或关系强弱"), "范围免责缺失");
});

test("无路径：给兜底文案与清除筛选指引，而非报错；同点给同一人物结论", () => {
    const noPath = renderGraphResultMarkdown({ ...base, pathNames: [] });
    assert(noPath.includes("当前图内未找到 甲 与 乙 的连接"), "无路径兜底缺失");
    assert(noPath.includes("可清除筛选后重试"), "清除筛选指引缺失");
    const same = renderGraphResultMarkdown({ ...base, pathNames: ["甲"] });
    assert(same.includes("为同一人物"), "同点结论缺失");
});

test("共同联系人/二度/直接：结果人物列出，筛选条件写入", () => {
    const common = renderGraphResultMarkdown({
        ...base,
        kind: "common",
        pathNames: [],
        resultNames: ["丙", "丁"],
        filters: { search: "陈", group: "同事", isolatedOnly: true },
        truncated: true,
    });
    assert(common.includes("查询：共同联系人（甲 与 乙）"));
    assert(common.includes("有 2 位共同联系人（当前图内）"));
    assert(common.includes("- 丙") && common.includes("- 丁"));
    assert(common.includes("搜索「陈」；分组「同事」；仅看无关系"), "筛选条件缺失");
    assert(common.includes("已按关系数截断至 800"), "截断标注缺失");
    const second = renderGraphResultMarkdown({ ...base, kind: "second", pathNames: [], resultNames: ["丙"] });
    assert(second.includes("二度联系人有 1 人"), "二度总结错误");
    const direct = renderGraphResultMarkdown({ ...base, kind: "direct", pathNames: [], resultNames: ["丙"] });
    assert(direct.includes("直接关系有 1 人"), "直接总结错误");
});

test("快照导出：与展示节点和边一致，同名按 ID 区分，特殊文本不能插入 Markdown 结构", () => {
    const person = (docId: string, itemId: string) => ({ docId, itemId, name: "同名[*]\n#伪标题", phone: "", email: "", wechat: "", website: "", birthday: "", isLunar: false, group: "", tags: [], relatedItemIds: [] as string[] });
    const first = person("a", "item-a");
    first.relatedItemIds.push("item-b");
    const sources: GraphSources = { people: [first, person("b", "item-b")], organizations: [{ docId: "org", name: "组织|[*]", archived: false,
        memberships: [{ personDocId: "a", status: "active" }, { personDocId: "a", status: "former" }] }], selfDocId: "a", status: { roster: "verified", self: "verified", organizations: "verified" }, errors: {}, revision: 3 };
    const query: GraphQuery = { mode: "relations", scope: "global", centerDocId: "", orgDocId: "", search: "", group: "", isolatedOnly: false,
        showOrgs: true, depth: "direct", focusId: "a", compareId: "b", queryMode: "path" };
    const snapshot = buildGraphQuerySnapshot(sources, query);
    const before = structuredClone(snapshot);
    const markdown = renderGraphSnapshotMarkdown(snapshot, "2026-10-04");
    assert(markdown.includes(`展示节点 ${snapshot.graph.nodes.length} / 边 ${snapshot.graph.edges.length}`));
    assert(markdown.includes("（a）") && markdown.includes("（b）"));
    assert(markdown.includes("显式人物关系（related）") && markdown.includes("组织成员（member）"));
    assert(markdown.includes("组织成员（member）·当前+历史"), "成员边导出缺少混合生命周期标签");
    assert(markdown.includes("同名\\[\\*\\] \\#伪标题"));
    assert(!markdown.includes("\n#伪标题"));
    assert.equal(markdown, renderGraphSnapshotMarkdown(snapshot, "2026-10-04"));
    assert.deepEqual(snapshot, before);
    const unknown = buildGraphQuerySnapshot({ ...sources, status: { ...sources.status, roster: "unknown" }, errors: { roster: "读失败\n#假成功" } }, query);
    const failedExport = renderGraphSnapshotMarkdown(unknown, "2026-10-04");
    assert(failedExport.includes("状态：unknown"));
    assert(failedExport.includes("来源节点 未知"));
    assert(failedExport.includes("读失败 \\#假成功"));
});

test("IDEA-08 图谱矢量导出：exportCytoscapeSvg 正确组装独立矢量 SVG", async () => {
    const cytoscape = (await import("cytoscape")).default;
    const { exportCytoscapeSvg } = await import("../src/domain/graph-image-export.ts");

    const cy = cytoscape({
        elements: [
            { data: { id: "p1", label: "张三", color: "#ea580c", kind: "person", degree: 2 } },
            { data: { id: "p2", label: "李四", color: "#10b981", kind: "person", degree: 1 } },
            { data: { id: "org1", label: "研发部", color: "#3b82f6", kind: "org", degree: 2 } },
            { data: { id: "e1", source: "p1", target: "p2", kind: "related" } },
            { data: { id: "e2", source: "p1", target: "org1", kind: "member" } },
        ],
    });
    cy.layout({ name: "grid" }).run();

    const svg = exportCytoscapeSvg(cy, { bg: "#ffffff" });
    assert.ok(svg.includes('<?xml version="1.0" encoding="UTF-8"?>'), "应输出合规 XML 声明");
    assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), "应包含 SVG 根节点与命名空间");
    assert.ok(svg.includes('<rect x='), "应包含背景矩形或组织方形节点");
    assert.ok(svg.includes('<circle cx='), "应包含人物圆形节点");
    assert.ok(svg.includes('<line x1='), "应包含连接边");
    assert.ok(svg.includes("张三") && svg.includes("李四") && svg.includes("研发部"), "应包含全部节点名称");
});

test("IDEA-08 图谱标签子网隔离：GraphQuery 支持按标签精确收窄范围", () => {
    const p1 = { docId: "p1", itemId: "i1", name: "张三", phone: "", email: "", wechat: "", website: "", birthday: "", isLunar: false, group: "商务", tags: ["合作伙伴", "VIP"], relatedItemIds: ["i2"] };
    const p2 = { docId: "p2", itemId: "i2", name: "李四", phone: "", email: "", wechat: "", website: "", birthday: "", isLunar: false, group: "技术", tags: ["开源"], relatedItemIds: ["i1"] };

    const sources: GraphSources = {
        people: [p1, p2],
        organizations: [],
        selfDocId: "p1",
        status: { roster: "verified", self: "verified", organizations: "verified" },
        errors: {},
        revision: 1,
    };

    // 不按标签收窄：包含张三和李四
    const snapAll = buildGraphQuerySnapshot(sources, {
        mode: "relations", scope: "global", centerDocId: "", orgDocId: "",
        search: "", group: "", tag: "", isolatedOnly: false, showOrgs: false,
        depth: "direct", focusId: "", compareId: "", queryMode: "common",
    });
    assert.equal(snapAll.graph.nodes.length, 2);

    // 按标签收窄为 VIP 子网：仅保留张三
    const snapVip = buildGraphQuerySnapshot(sources, {
        mode: "relations", scope: "global", centerDocId: "", orgDocId: "",
        search: "", group: "", tag: "VIP", isolatedOnly: false, showOrgs: false,
        depth: "direct", focusId: "", compareId: "", queryMode: "common",
    });
    assert.equal(snapVip.graph.nodes.length, 1);
    assert.equal(snapVip.graph.nodes[0]?.id, "p1");
});
