import assert from "node:assert/strict";
import test from "node:test";
import {
    addReviewDays,
    findGlobalOnThisDay,
    formatMemoryIcebreakerText,
    groupByMonth,
    inDateRange,
    onThisDay,
} from "../src/domain/date-review.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { InteractionEvent } from "../src/domain/interactions.ts";

interface Entry { localDate: string; note: string }

const entry = (localDate: string, note: string): Entry => ({ localDate, note });

test("日期范围：闭区间端点、跨年区间、非法端点视为不限制", () => {
    assert.equal(inDateRange("2026-12-31", "2026-12-01", "2026-12-31"), true, "to 端点应命中");
    assert.equal(inDateRange("2026-12-01", "2026-12-01", "2026-12-31"), true, "from 端点应命中");
    assert.equal(inDateRange("2027-01-01", "2026-12-28", "2027-01-03"), true, "跨年区间应命中");
    assert.equal(inDateRange("2026-12-27", "2026-12-28", "2027-01-03"), false, "下界之外应排除");
    assert.equal(inDateRange("2027-01-04", "2026-12-28", "2027-01-03"), false, "上界之外应排除");
    assert.equal(inDateRange("2020-01-01", "", "2026-06-30"), true, "空 from 不限制");
    assert.equal(inDateRange("2030-01-01", "bogus", ""), true, "非法 from 视为不限制");
    assert.equal(inDateRange("2026-02-31", "", ""), false, "不存在的互动日期不应被范围放行");
});

test("非法日期不会生成月份或历史今天投影", () => {
    const groups = groupByMonth([entry("2026-02-31", "坏日期"), entry("2026-09-28", "正常")]);
    assert.deepEqual(groups.map((group) => group.month), ["2026-09"]);
    assert.deepEqual(onThisDay([entry("2025-09-28", "正常"), entry("2025-02-31", "坏日期")], "2026-09-28").map((item) => item.note), ["正常"]);
});

test("按月分组：组序沿用输入（倒序），跨年分组，空月份不生成，计数正确", () => {
    const groups = groupByMonth([
        entry("2027-01-02", "跨年"),
        entry("2026-12-31", "年末"),
        entry("2026-12-28", "月初前"),
        entry("2026-11-05", "十一月"),
    ]);
    assert.deepEqual(groups.map((group) => group.month), ["2027-01", "2026-12", "2026-11"]);
    assert.deepEqual(groups.map((group) => group.label), ["2027年1月", "2026年12月", "2026年11月"]);
    assert.equal(groups[1].items.length, 2);
    assert.equal(groupByMonth([]).length, 0);
    // 输入中不含事件的月份（如 2026-10）不出现
    assert.equal(groups.some((group) => group.month === "2026-10"), false);
});

test("历史上的今天：月日匹配且早于今天，按年份倒序，当年今天不计入", () => {
    const items = [
        entry("2026-09-28", "今年今天"),
        entry("2025-09-28", "去年今天"),
        entry("2024-09-28", "前年今天"),
        entry("2025-09-27", "昨天月日不同"),
        entry("2025-10-28", "下月同日"),
    ];
    const result = onThisDay(items, "2026-09-28");
    assert.deepEqual(result.map((item) => item.localDate), ["2025-09-28", "2024-09-28"]);
    assert.deepEqual(onThisDay(items, "bogus"), []);
});

test("findGlobalOnThisDay：跨人物聚合历史上的今天，过滤墓碑与当年，年数排序与破冰语生成", () => {
    const mockPeople: ContactSummary[] = [
        {
            docId: "doc-1",
            itemId: "item-1",
            name: "张总",
            phone: "13800000001",
            relatedItemIds: [],
        },
        {
            docId: "doc-2",
            itemId: "item-2",
            name: "李教授",
            phone: "13800000002",
            relatedItemIds: [],
        },
    ];

    const mockEvents: InteractionEvent[] = [
        {
            id: "evt-1",
            personDocId: "doc-1",
            occurredAt: 1730073600000,
            localDate: "2025-10-28",
            source: "manual",
            note: "在南山科技园交流出海战略",
        },
        {
            id: "evt-2",
            personDocId: "doc-2",
            occurredAt: 1698451200000,
            localDate: "2023-10-28",
            source: "manual",
            note: "探讨学术成果产业化转化",
        },
        {
            id: "evt-3-deleted",
            personDocId: "doc-1",
            occurredAt: 1730073600000,
            localDate: "2025-10-28",
            source: "manual",
            note: "已删除的备忘",
        },
        {
            id: "evt-4-today",
            personDocId: "doc-1",
            occurredAt: 1761609600000,
            localDate: "2026-10-28",
            source: "manual",
            note: "今天刚记的互动，不属于往昔时光",
        },
        {
            id: "evt-5-diff-day",
            personDocId: "doc-1",
            occurredAt: 1729987200000,
            localDate: "2025-10-27",
            source: "manual",
            note: "昨天发生的",
        },
    ];

    const memories = findGlobalOnThisDay(mockEvents, mockPeople, "2026-10-28", 10, ["evt-3-deleted"]);
    assert.equal(memories.length, 2, "应提取出 2 条往年今天的记忆");
    // 排序：1 年前优先于 3 年前
    assert.equal(memories[0].eventId, "evt-1");
    assert.equal(memories[0].yearsAgo, 1);
    assert.equal(memories[0].personName, "张总");
    assert.equal(memories[0].localDate, "2025-10-28");

    assert.equal(memories[1].eventId, "evt-2");
    assert.equal(memories[1].yearsAgo, 3);
    assert.equal(memories[1].personName, "李教授");
    assert.equal(memories[1].localDate, "2023-10-28");

    // 破冰文本测试
    const icebreaker1 = formatMemoryIcebreakerText(memories[0]);
    assert.equal(icebreaker1, "刚好 1 年前的今天（2025-10-28），我们曾交流：在南山科技园交流出海战略");

    // 无备注破冰文本回退
    const emptyNoteMemory = { ...memories[0], note: "" };
    assert.equal(formatMemoryIcebreakerText(emptyNoteMemory), "刚好 1 年前的今天（2025-10-28），曾与你有过互动交集，特此问候！");
});
