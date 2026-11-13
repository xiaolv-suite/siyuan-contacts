import assert from "node:assert/strict";
import test from "node:test";
import {
    extractMilestoneEvents,
    filterMilestonesByType,
    groupMilestonesByYear,
    type ExtractMilestonesInput,
} from "../src/domain/timeline-milestones.ts";

test("timeline-milestones domain: 综合提取初识、阶段演进、纪念日与信诺兑现", () => {
    const input: ExtractMilestonesInput = {
        timeline: [
            { id: "t2", occurredAt: 2000, localDate: "2026-10-01", note: "日常沟通" },
            { id: "t1", occurredAt: 1000, localDate: "2025-06-18", note: "咖啡馆初次碰面" },
        ],
        lifecycleHistory: [
            { stage: "collaboration", changedAt: "2026-08-01", note: "签署战略合作协议", timestamp: 1500 },
        ],
        anniversaries: [
            { id: "anniv-1", title: "相识纪念日", category: "acquaintance", date: "2025-06-18", isLunar: false },
        ],
        promises: [
            { id: "p1", direction: "they_promised", title: "交付系统原型", promisedOn: "2026-07-01", status: "fulfilled", fulfilledOn: "2026-07-20" },
            { id: "p2", direction: "i_promised", title: "未完成约定", promisedOn: "2026-08-01", status: "pending" }, // pending 不计入已达成里程碑
        ],
        exchanges: [
            { id: "ex-1", kind: "item", direction: "payable", description: "赠送定制手账", occurredOn: "2026-09-10", status: "settled" },
        ],
    };

    const events = extractMilestoneEvents(input);
    assert.equal(events.length, 5); // 初识 + 阶段 + 纪念日 + 兑现承诺 + 往来

    // 检查是否包含初识事件（取最早一条 t1）
    const firstContact = events.find((e) => e.type === "first_contact");
    assert.ok(firstContact);
    assert.equal(firstContact?.date, "2025-06-18");
    assert.equal(firstContact?.detail, "咖啡馆初次碰面");

    // 检查阶段跃迁
    const stageEvent = events.find((e) => e.type === "stage_advance");
    assert.ok(stageEvent);
    assert.equal(stageEvent?.date, "2026-08-01");
    assert.ok(stageEvent?.title.includes("共合作"));

    // 检查已履约承诺
    const prmEvent = events.find((e) => e.type === "promise_fulfilled");
    assert.ok(prmEvent);
    assert.equal(prmEvent?.date, "2026-07-20");
    assert.ok(prmEvent?.title.includes("交付系统原型"));
});

test("timeline-milestones domain: 按年份归组与按类型筛选", () => {
    const input: ExtractMilestonesInput = {
        timeline: [
            { id: "t1", occurredAt: 1000, localDate: "2024-05-01", note: "两年前初识" },
        ],
        anniversaries: [
            { id: "a1", title: "合作一周年", category: "work", date: "2025-05-01", isLunar: false },
        ],
        lifecycleHistory: [
            { stage: "close_ally", changedAt: "2026-01-10", note: "成为挚友", timestamp: 3000 },
        ],
    };

    const events = extractMilestoneEvents(input);
    const groups = groupMilestonesByYear(events);
    assert.ok(groups["2024"]);
    assert.ok(groups["2025"]);
    assert.ok(groups["2026"]);
    assert.equal(groups["2026"]?.length, 1);

    const stageOnly = filterMilestonesByType(events, "stage_advance");
    assert.equal(stageOnly.length, 1);
    assert.equal(stageOnly[0]?.type, "stage_advance");

    const all = filterMilestonesByType(events, "all");
    assert.equal(all.length, 3);
});

test("timeline-milestones domain: buildMilestonesDocumentHpath 与 Markdown 实体文档组装", async () => {
    const { buildMilestonesDocumentHpath, buildMilestonesDocumentMarkdown } = await import("../src/domain/timeline-milestones.ts");
    const hpath = buildMilestonesDocumentHpath("孙悟空/齐天大圣");
    assert.equal(hpath, "/人脉回顾/📜 人脉交往编年史 · 孙悟空_齐天大圣");

    const person = {
        docId: "doc-swk",
        itemId: "item-swk",
        name: "孙悟空",
        phone: "",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "神仙",
        tags: [],
        relatedItemIds: [],
    };

    const events = [
        {
            id: "m1",
            type: "first_contact" as const,
            date: "2024-01-01",
            title: "初次相识 · 建立连接",
            detail: "五指山下相遇",
            badgeLabel: "初识",
            icon: "🌱",
            timestamp: 1000,
        },
    ];

    const md = buildMilestonesDocumentMarkdown(person, events, "2026-10-29");
    assert.ok(md.includes("# 📜 人脉交往编年史 · 孙悟空"));
    assert.ok(md.includes("((doc-swk \"孙悟空\"))"));
    assert.ok(md.includes("## 2024 年（1 个里程碑）"));
    assert.ok(md.includes("### 🌱 2024-01-01 · 初次相识 · 建立连接"));
    assert.ok(md.includes("- **细节**：五指山下相遇"));
});
