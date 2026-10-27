import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverPotentialConnections } from "../src/domain/connections-discovery.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { InteractionEvent } from "../src/domain/interactions.ts";

function makePerson(docId: string, itemId: string, name: string, options: Partial<ContactSummary> = {}): ContactSummary {
    return {
        docId,
        itemId,
        name,
        isSelf: false,
        relatedItemIds: [],
        ...options,
    };
}

test("discoverPotentialConnections：从同场活动挖掘未建链的潜在人脉", () => {
    const p1 = makePerson("doc1", "item1", "张三");
    const p2 = makePerson("doc2", "item2", "李四");
    const p3 = makePerson("doc3", "item3", "王五");

    const events: InteractionEvent[] = [
        // 活动 1：张三、李四共同出席
        { id: "e1", personDocId: "doc1", occurredAt: 1000, localDate: "2026-10-26", externalRef: "meal-dinner-01", type: "meal" },
        { id: "e2", personDocId: "doc2", occurredAt: 1000, localDate: "2026-10-26", externalRef: "meal-dinner-01", type: "meal" },
        // 活动 2：张三、李四再次共同出席
        { id: "e3", personDocId: "doc1", occurredAt: 2000, localDate: "2026-10-27", externalRef: "meeting-conf-01", type: "meeting" },
        { id: "e4", personDocId: "doc2", occurredAt: 2000, localDate: "2026-10-27", externalRef: "meeting-conf-01", type: "meeting" },
        // 王五单独活动
        { id: "e5", personDocId: "doc3", occurredAt: 3000, localDate: "2026-10-27", externalRef: "call-01", type: "call" },
    ];

    const results = discoverPotentialConnections([p1, p2, p3], events);
    assert.equal(results.length, 1);
    assert.equal(results[0].personA.name, "张三");
    assert.equal(results[0].personB.name, "李四");
    assert.equal(results[0].coAttendanceCount, 2);
    assert.equal(results[0].score, 6); // 2 * 3 = 6
    assert.ok(results[0].reasons[0].includes("共同出席 2 次活动"));
});

test("discoverPotentialConnections：排除已建立正式双向关联的人物对", () => {
    // 张三与李四已经建立关系
    const p1 = makePerson("doc1", "item1", "张三", { relatedItemIds: ["item2"] });
    const p2 = makePerson("doc2", "item2", "李四", { relatedItemIds: ["item1"] });

    const events: InteractionEvent[] = [
        { id: "e1", personDocId: "doc1", occurredAt: 1000, localDate: "2026-10-26", externalRef: "meal-01" },
        { id: "e2", personDocId: "doc2", occurredAt: 1000, localDate: "2026-10-26", externalRef: "meal-01" },
    ];

    const results = discoverPotentialConnections([p1, p2], events);
    assert.equal(results.length, 0, "已建链人物不应重复推荐");
});

test("discoverPotentialConnections：支持从共同所属机构挖掘潜在关联", () => {
    const p1 = makePerson("doc1", "item1", "张三", {
        profile: {
            affiliations: {
                state: "known",
                value: {
                    work: [{ orgName: "腾讯科技", orgDocId: "org-tencent" }],
                },
            },
        },
    });
    const p2 = makePerson("doc2", "item2", "李四", {
        profile: {
            affiliations: {
                state: "known",
                value: {
                    work: [{ orgName: "腾讯科技", orgDocId: "org-tencent" }],
                },
            },
        },
    });

    const results = discoverPotentialConnections([p1, p2], []);
    assert.equal(results.length, 1);
    assert.equal(results[0].commonOrgs[0], "腾讯科技");
    assert.equal(results[0].score, 2); // 1 * 2 = 2
    assert.ok(results[0].reasons[0].includes("共同从属：腾讯科技"));
});

test("discoverPotentialConnections：排除本人档案", () => {
    const me = makePerson("doc-me", "item-me", "我自己", { isSelf: true });
    const p1 = makePerson("doc1", "item1", "张三");

    const events: InteractionEvent[] = [
        { id: "e1", personDocId: "doc-me", occurredAt: 1000, localDate: "2026-10-26", externalRef: "meal-01" },
        { id: "e2", personDocId: "doc1", occurredAt: 1000, localDate: "2026-10-26", externalRef: "meal-01" },
    ];

    const results = discoverPotentialConnections([me, p1], events);
    assert.equal(results.length, 0, "本人不应与联系人生成内部潜在关联推荐");
});
