import assert from "node:assert/strict";
import test from "node:test";
import {
    computeSocialRadar,
    getRadarGridRings,
    type SocialRadarInput,
} from "../src/domain/social-radar.ts";
import type { ContactSummary } from "../src/domain/person.ts";

test("computeSocialRadar：六维指标汇算与核心伙伴层级评级", () => {
    const person: ContactSummary = {
        docId: "doc-radar-1",
        itemId: "item-radar-1",
        name: "高管张总",
        phone: "13800001111",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "核心伙伴",
        tags: [],
        relatedItemIds: ["item-rel-1", "item-rel-2", "item-rel-3", "item-rel-4"], // 4个相关人
    };

    const input: SocialRadarInput = {
        person,
        lastContactDays: 3, // 3天前联系（活跃度满分 100）
        totalInteractions: 12, // 12次互动（频度满分 100）
        facts: [
            { id: "f1", text: "喜好高尔夫", category: "preference", createdAt: 1000 },
            { id: "f2", text: "毕业于清华", category: "background", createdAt: 1000 },
            { id: "f3", text: "主张长期主义", category: "quote", createdAt: 1000 },
            { id: "f4", text: "近期拜访深圳", category: "fact", createdAt: 1000 },
        ],
        topics: [
            { id: "t1", text: "讨论半导体合作", createdAt: 1000 },
        ],
        followUps: [
            { id: "fu1", personDocId: "doc-radar-1", title: "发送提案", dueDate: "2026-10-25", status: "done" },
        ],
        coAttendanceCount: 3, // 3次共同出席
        projectCount: 1, // 1个合作项目
    };

    const assessment = computeSocialRadar(input);

    assert.equal(assessment.metrics.recency, 100, "3天内活跃度应为 100");
    assert.equal(assessment.metrics.frequency, 100, "12次互动频度应为 100");
    assert.equal(assessment.metrics.connectivity, 80, "4个相关人连接度应为 80");
    assert.equal(assessment.metrics.memoryDepth, 80, "5条事实+谈资记忆度应为 80");
    assert.equal(assessment.metrics.coOccurrence, 100, "4项共同交集应为 100");
    assert(assessment.overallScore >= 80, "综合得分应高于 80");
    assert.equal(assessment.tier, "core_partner", "应评级为核心伙伴");
    assert.equal(assessment.tierLabel, "核心伙伴");

    // 检查 SVG 多边形点
    const points = assessment.polygonPoints.split(" ");
    assert.equal(points.length, 6, "六维雷达应有 6 个多边形顶点");

    // 检查背景网格环
    const rings = getRadarGridRings();
    assert.equal(rings.length, 4, "应生成 4 层背景刻度环（25%, 50%, 75%, 100%）");
});

test("computeSocialRadar：无记录联系人评级为沉睡人脉", () => {
    const freshPerson: ContactSummary = {
        docId: "doc-fresh",
        itemId: "item-fresh",
        name: "新联系人",
        phone: "",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "",
        tags: [],
        relatedItemIds: [],
    };

    const assessment = computeSocialRadar({ person: freshPerson });
    assert(assessment.overallScore < 30);
    assert.equal(assessment.tier, "dormant");
    assert.equal(assessment.tierLabel, "沉睡人脉");
});
