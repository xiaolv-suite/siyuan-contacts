import assert from "node:assert/strict";
import test from "node:test";
import {
    parseYearFromId,
    extractGraphTimeSpan,
    filterGraphByMaxYear,
    type PersonGraph,
} from "../src/domain/graph.ts";

test("parseYearFromId 与 extractGraphTimeSpan：提取年份区间", () => {
    assert.equal(parseYearFromId("20230510123000-xxxx"), 2023);
    assert.equal(parseYearFromId("20261028150000-yyyy"), 2026);
    assert.equal(parseYearFromId("invalid-id"), new Date().getFullYear());

    const graph: PersonGraph = {
        nodes: [
            { id: "20220101000000-doc1", label: "小张", group: "校友", degree: 1 },
            { id: "20240101000000-doc2", label: "老王", group: "同事", degree: 1 },
            { id: "20260101000000-doc3", label: "李总", group: "业务", degree: 0 },
        ],
        edges: [
            { source: "20220101000000-doc1", target: "20240101000000-doc2", kind: "related" },
        ],
    };

    const span = extractGraphTimeSpan(graph);
    assert.equal(span.minYear, 2022);
    assert.equal(span.maxYear, 2026);
    assert.deepEqual(span.years, [2022, 2023, 2024, 2025, 2026]);
});

test("filterGraphByMaxYear：按年份切片过滤图谱生长与边形成", () => {
    const graph: PersonGraph = {
        nodes: [
            { id: "20220101000000-doc1", label: "小张", group: "校友", degree: 2 },
            { id: "20240101000000-doc2", label: "老王", group: "同事", degree: 2 },
            { id: "20260101000000-doc3", label: "李总", group: "业务", degree: 2 },
        ],
        edges: [
            // 边 1：小张与老王，两端分别为 2022 和 2024，边在 2024 年才形成
            { source: "20220101000000-doc1", target: "20240101000000-doc2", kind: "related" },
            // 边 2：老王与李总，在 2026 年才形成
            { source: "20240101000000-doc2", target: "20260101000000-doc3", kind: "related" },
        ],
    };

    // 1. 回溯到 2022 年：只有小张 1 人，0 条边
    const g2022 = filterGraphByMaxYear(graph, 2022);
    assert.equal(g2022.nodes.length, 1);
    assert.equal(g2022.nodes[0].label, "小张");
    assert.equal(g2022.nodes[0].degree, 0, "2022 年老王尚未出现，小张度数应为 0");
    assert.equal(g2022.edges.length, 0);

    // 2. 演化到 2024 年：小张与老王出现，边 1 形成
    const g2024 = filterGraphByMaxYear(graph, 2024);
    assert.equal(g2024.nodes.length, 2);
    assert.equal(g2024.edges.length, 1);
    assert.equal(g2024.nodes[0].degree, 1);
    assert.equal(g2024.nodes[1].degree, 1);

    // 3. 演化到 2026 年（全图）：全部 3 人，2 条边
    const g2026 = filterGraphByMaxYear(graph, 2026);
    assert.equal(g2026.nodes.length, 3);
    assert.equal(g2026.edges.length, 2);
});
