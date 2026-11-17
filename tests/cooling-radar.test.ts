import assert from "node:assert/strict";
import test from "node:test";
import {
    buildCoolingRadarItems,
    computeUrgencyScore,
    filterCoolingRadarItems,
    type CoolingContactItem,
} from "../src/domain/cooling-radar.ts";
import type { ContactSummary } from "../src/domain/person.ts";

function makeContact(docId: string, name: string, overrides: Partial<ContactSummary> = {}): ContactSummary {
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
        group: "投资人",
        tags: ["重要合作伙伴"],
        relatedItemIds: [],
        ...overrides,
    };
}

test("computeUrgencyScore：星标、降温深度与逾期天数加权逻辑正确", () => {
    // 星标 + 渐冻 (100 + 50 + 30 = 180)
    const s1 = computeUrgencyScore(
        { level: "cold", score: 0, elapsedDays: 60, cadenceDays: 30, overdue: true, overdueDays: 30 },
        true,
    );
    assert.equal(s1, 180);

    // 非星标 + 渐冻 (50 + 30 = 80)
    const s2 = computeUrgencyScore(
        { level: "cold", score: 0, elapsedDays: 60, cadenceDays: 30, overdue: true, overdueDays: 30 },
        false,
    );
    assert.equal(s2, 80);

    // 非星标 + 微凉 (20 + 10 = 30)
    const s3 = computeUrgencyScore(
        { level: "cool", score: 30, elapsedDays: 40, cadenceDays: 30, overdue: true, overdueDays: 10 },
        false,
    );
    assert.equal(s3, 30);
});

test("buildCoolingRadarItems：排除温热常温与已暂停，智能收纳微凉、渐冻与从未联系并精准排序", () => {
    const nowTime = 1700000000000;
    const dayMs = 86400 * 1000;

    const p1 = makeContact("doc-hot", "温热小王");
    const p2 = makeContact("doc-warm", "常温老张");
    const p3 = makeContact("doc-cool", "微凉李总");
    const p4 = makeContact("doc-cold", "渐冻钱总");
    const p5 = makeContact("doc-paused", "暂停周总");
    const p6 = makeContact("doc-starred-cool", "星标微凉赵总");
    const p7 = makeContact("doc-unknown", "从未联系孙总");

    const recentInteractions: Record<string, { occurredAt: number; localDate?: string }> = {
        "doc-hot": { occurredAt: nowTime - 5 * dayMs, localDate: "2023-11-09" }, // ratio 5/30 = 0.16 -> hot
        "doc-warm": { occurredAt: nowTime - 25 * dayMs, localDate: "2023-10-20" }, // ratio 25/30 = 0.83 -> warm
        "doc-cool": { occurredAt: nowTime - 40 * dayMs, localDate: "2023-10-05" }, // ratio 40/30 = 1.33 -> cool (overdue 10)
        "doc-cold": { occurredAt: nowTime - 90 * dayMs, localDate: "2023-08-16" }, // ratio 90/30 = 3.0 -> cold (overdue 60)
        "doc-paused": { occurredAt: nowTime - 120 * dayMs, localDate: "2023-07-17" },
        "doc-starred-cool": { occurredAt: nowTime - 45 * dayMs, localDate: "2023-09-30" }, // ratio 45/30 = 1.5 -> cool (overdue 15)
        // doc-unknown 没有互动记录
    };

    const cadences = {
        "doc-paused": { days: 30, paused: true },
    };

    const starredDocIds = new Set(["doc-starred-cool"]);

    const items = buildCoolingRadarItems({
        people: [p1, p2, p3, p4, p5, p6, p7],
        recentInteractions,
        cadences,
        starredDocIds,
        defaultCadenceDays: 30,
        nowTime,
    });

    // 应该收纳：doc-starred-cool, doc-cold, doc-cool, doc-unknown
    assert.equal(items.length, 4);
    assert.deepEqual(items.map((i) => i.person.docId), [
        "doc-starred-cool", // 星标首位加权 (score: 100 + 20 + 15 = 135)
        "doc-cold",         // 渐冻深度逾期 (score: 50 + 60 = 110)
        "doc-cool",         // 微凉轻度逾期 (score: 20 + 10 = 30)
        "doc-unknown",      // 从未联系 (score: 10)
    ]);
});

test("filterCoolingRadarItems：支持按星标/微凉/渐冻/从未联系分维筛选与多字段检索", () => {
    const items: CoolingContactItem[] = [
        {
            person: makeContact("1", "张三", { tags: ["AI芯片", "核心合伙人"], group: "科技组" }),
            health: { level: "cool", score: 40, elapsedDays: 35, cadenceDays: 30, overdue: true, overdueDays: 5 },
            isStarred: true,
            urgencyScore: 125,
            primaryOrgAndTitle: "某算力芯片 · 联合创始人",
            lastInteractionDate: "2026-09-20",
            cadenceDays: 30,
            overdueDays: 5,
        },
        {
            person: makeContact("2", "李四", { tags: ["生物医药"], group: "医疗组" }),
            health: { level: "cold", score: 0, elapsedDays: 100, cadenceDays: 30, overdue: true, overdueDays: 70 },
            isStarred: false,
            urgencyScore: 120,
            primaryOrgAndTitle: "华大健康 · 研发总监",
            lastInteractionDate: "2026-07-10",
            cadenceDays: 30,
            overdueDays: 70,
        },
        {
            person: makeContact("3", "王五", { tags: ["新能源"], group: "科技组" }),
            health: { level: "unknown", score: 0, elapsedDays: null, cadenceDays: 30, overdue: true, overdueDays: 0 },
            isStarred: false,
            urgencyScore: 10,
            primaryOrgAndTitle: "绿能科技 · 投资经理",
            lastInteractionDate: "",
            cadenceDays: 30,
            overdueDays: 0,
        },
    ];

    // 全量
    assert.equal(filterCoolingRadarItems(items, "", "all").length, 3);

    // 仅星标
    const starredOnly = filterCoolingRadarItems(items, "", "starred");
    assert.equal(starredOnly.length, 1);
    assert.equal(starredOnly[0].person.name, "张三");

    // 仅渐冻
    const coldOnly = filterCoolingRadarItems(items, "", "cold");
    assert.equal(coldOnly.length, 1);
    assert.equal(coldOnly[0].person.name, "李四");

    // 仅微凉
    const coolOnly = filterCoolingRadarItems(items, "", "cool");
    assert.equal(coolOnly.length, 1);
    assert.equal(coolOnly[0].person.name, "张三");

    // 仅从未联系
    const unknownOnly = filterCoolingRadarItems(items, "", "unknown");
    assert.equal(unknownOnly.length, 1);
    assert.equal(unknownOnly[0].person.name, "王五");

    // 关键词检索
    assert.equal(filterCoolingRadarItems(items, "芯片", "all").length, 1);
    assert.equal(filterCoolingRadarItems(items, "生物", "all").length, 1);
    assert.equal(filterCoolingRadarItems(items, "科技组", "all").length, 2);
    assert.equal(filterCoolingRadarItems(items, "不存在", "all").length, 0);
});
