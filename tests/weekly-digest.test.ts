import assert from "node:assert/strict";
import test from "node:test";
import {
    computeISOWeekRange,
    buildWeeklyDigestMarkdown,
} from "../src/domain/weekly-digest.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { InteractionEvent } from "../src/domain/interactions.ts";
import type { FollowUpItem } from "../src/domain/followups.ts";

test("computeISOWeekRange：精确计算周一至周日闭区间与 ISO 周次", () => {
    // 2026-10-28 是周三
    const range1 = computeISOWeekRange("2026-10-28");
    assert.equal(range1.from, "2026-10-26", "周一应为 2026-10-26");
    assert.equal(range1.to, "2026-11-01", "周日应为 2026-11-01");
    assert.equal(range1.year, 2026);
    assert.equal(range1.weekLabel, "2026-W44");

    // 跨年周测试：2026-01-01 是周四，属于 2026-W01
    const range2 = computeISOWeekRange("2026-01-01");
    assert.equal(range2.from, "2025-12-29");
    assert.equal(range2.to, "2026-01-04");
    assert.equal(range2.weekLabel, "2026-W01");
});

test("buildWeeklyDigestMarkdown：指标统计、按人聚合双链与待办任务复选框", () => {
    const weekRange = computeISOWeekRange("2026-10-28");

    const mockContacts: ContactSummary[] = [
        {
            docId: "doc-1",
            itemId: "item-1",
            name: "张三",
            phone: "13800000001",
            email: "zhangsan@example.com",
            wechat: "zhangsan",
            website: "",
            birthday: "",
            isLunar: false,
            group: "核心业务伙伴",
            tags: ["重要"],
            relatedItemIds: [],
            profile: {
                affiliations: {
                    state: "known",
                    value: {
                        work: [{ orgName: "腾讯", title: "高级架构师" }],
                        education: [],
                        family: [],
                        unspecified: [],
                    },
                },
            },
        },
        {
            docId: "doc-2",
            itemId: "item-2",
            name: "李四",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "",
            tags: [],
            relatedItemIds: [],
        },
    ];

    const mockEvents: InteractionEvent[] = [
        {
            id: "ev-1",
            personDocId: "doc-1",
            occurredAt: 1730073600000,
            localDate: "2026-10-27",
            source: "manual",
            note: "交流 AI Agent 与本地知识库结合方案",
        },
        {
            id: "ev-2",
            personDocId: "doc-1",
            occurredAt: 1730160000000,
            localDate: "2026-10-28",
            source: "diary",
            note: "确认技术选型",
        },
        {
            id: "ev-3-out-of-range",
            personDocId: "doc-2",
            occurredAt: 1729000000000,
            localDate: "2026-10-15",
            source: "manual",
            note: "上周的互动，不应进入本周统计",
        },
    ];

    const mockFollowUps: FollowUpItem[] = [
        {
            id: "fu-1",
            personDocId: "doc-1",
            title: "同步架构评审初稿",
            dueDate: "2026-10-30",
            status: "open",
        },
    ];

    const md = buildWeeklyDigestMarkdown({
        weekRange,
        events: mockEvents,
        contacts: mockContacts,
        upcomingFollowUps: mockFollowUps,
    });

    // 断言周报包含关键板块与语法
    assert(md.includes("# 2026-W44 人脉交往周报（10-26 ~ 11-01）"), "标题应包含周数与日期范围");
    assert(md.includes("共记录 **2** 次交往"), "统计应仅计入本周 2 次交往");
    assert(md.includes("覆盖 **1** 位联系人"), "覆盖联系人数正确");
    assert(md.includes("### [张三](siyuan://blocks/doc-1)（腾讯 · 高级架构师）"), "应生成正确的思源块双链与职务");
    assert(md.includes("交流 AI Agent 与本地知识库结合方案"), "应渲染互动备注");
    assert(!md.includes("上周的互动"), "区间外互动已被排除");
    assert(md.includes("- [ ] [2026-10-30] 同步架构评审初稿（(( doc-1 '张三' ))）"), "应生成任务复选框与人物反链");
});
