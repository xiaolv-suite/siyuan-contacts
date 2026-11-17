import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverPotentialConnections, discoverPersonTies } from "../src/domain/connections-discovery.ts";
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

test("discoverPersonTies：针对单个人物发掘潜在共现伙伴与一度破冰引荐人", () => {
    // 设定：当前人物为张三（doc1）
    // 赵六（doc4）与张三共同出席过聚会，且两人共同认识王五（doc3）
    const p1 = makePerson("doc1", "item1", "张三", { relatedItemIds: ["item3"] }); // 张三已关联王五
    const p2 = makePerson("doc2", "item2", "李四", { relatedItemIds: ["item1"] }); // 李四已与张三关联（排除）
    const p3 = makePerson("doc3", "item3", "王五", { relatedItemIds: ["item1", "item4"] }); // 王五关联张三和赵六
    const p4 = makePerson("doc4", "item4", "赵六", {
        relatedItemIds: ["item3"], // 赵六关联王五
        profile: {
            affiliations: {
                state: "known",
                value: {
                    work: [{ orgName: "华为技术" }],
                    education: [],
                    family: [],
                    unspecified: [],
                },
            },
        },
    });

    // 张三也在华为技术
    p1.profile = {
        affiliations: {
            state: "known",
            value: {
                work: [{ orgName: "华为技术" }],
                education: [],
                family: [],
                unspecified: [],
            },
        },
    };

    const events: InteractionEvent[] = [
        // 张三与赵六同场出席 summit-2026
        { id: "e1", personDocId: "doc1", occurredAt: 2000, localDate: "2026-10-27", externalRef: "summit-2026" },
        { id: "e2", personDocId: "doc4", occurredAt: 2000, localDate: "2026-10-27", externalRef: "summit-2026" },
    ];

    const ties = discoverPersonTies("doc1", [p1, p2, p3, p4], events);

    // 李四和王五已经与张三关联，应被排除；赵六未与张三关联，应推荐
    assert.equal(ties.length, 1);
    const rec = ties[0];
    assert.equal(rec.targetPerson.name, "赵六");
    assert.equal(rec.coAttendanceCount, 1, "同场出席 1 次");
    assert.deepEqual(rec.commonOrgs, ["华为技术"], "共同机构为华为技术");
    assert.deepEqual(rec.mutualConnectionNames, ["王五"], "共同一度好友为王五");
    // 得分：同场 3 分 + 机构 2 分 + 共同好友 2 分 = 7 分
    assert.equal(rec.score, 7);
    assert(rec.reasons.some((r) => r.includes("共同出席 1 次活动")));
    assert(rec.reasons.some((r) => r.includes("共同机构：华为技术")));
    assert(rec.reasons.some((r) => r.includes("共同好友：王五")));
});

test("discoverPersonTies & discoverPotentialConnections：接入 org-membership 共同机构且不把普通分组（如朋友）误判为共同机构", () => {
    const p1 = makePerson("doc1", "item1", "王浩然", { group: "朋友" });
    const p2 = makePerson("doc2", "item2", "林知夏", { group: "朋友" });
    const p3 = makePerson("doc3", "item3", "周予安", { group: "朋友" });

    // 仅相同分组（“朋友”）不应被误判为共同机构
    assert.equal(discoverPersonTies("doc1", [p1, p2], []).length, 0);

    // 传入 listCommonOrgBackground 形态的 knownCommonOrgs 后可准确推荐同机构伙伴
    const ties = discoverPersonTies("doc1", [p1, p2, p3], [], {
        knownCommonOrgs: [{ orgName: "远山科技", peers: [{ docId: "doc2" }] }],
    });
    assert.equal(ties.length, 1);
    assert.equal(ties[0].targetPerson.docId, "doc2");
    assert.deepEqual(ties[0].commonOrgs, ["远山科技"]);

    // 全库潜在关联支持 knownOrgMemberships 补充纯 AV 名册缺失的机构归属
    const pairs = discoverPotentialConnections([p1, p2, p3], [], {
        knownOrgMemberships: [
            { personDocId: "doc1", orgName: "远山科技" },
            { personDocId: "doc2", orgName: "远山科技" },
        ],
    });
    assert.equal(pairs.length, 1);
    assert.deepEqual(pairs[0].commonOrgs, ["远山科技"]);
});

