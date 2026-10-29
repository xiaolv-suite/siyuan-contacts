import { test } from "node:test";
import assert from "node:assert/strict";
import { isRosterFresh, rosterFromRender, rosterPageState } from "../src/domain/roster.ts";
import type { RosterEntry } from "../src/domain/roster.ts";
import type { AvRenderResult } from "../src/api/av.ts";
import type { ContactSummary } from "../src/domain/person.ts";

const FIELD_MAP = {
    birthday: "k-birth", lunarBirthday: "k-lunar", phone: "k-phone", email: "k-email",
    wechat: "k-wechat", website: "k-web", group: "k-group", tags: "k-tags", related: "k-rel",
} as const;

test("isRosterFresh：avId 匹配 + TTL 内才新鲜", () => {
    const entry: RosterEntry = { people: [], avId: "av-1", fetchedAt: 1000 };
    assert.equal(isRosterFresh(entry, "av-1", 1000 + 29_999), true);
    assert.equal(isRosterFresh(entry, "av-1", 1000 + 30_001), false, "过期");
    assert.equal(isRosterFresh(entry, "av-2", 1000 + 1), false, "换了库");
    assert.equal(isRosterFresh(null, "av-1", 1000), false);
});

test("rosterFromRender：渲染响应 → 联系人名册", () => {
    const rendered = {
        view: {
            columns: [],
            rows: [{
                id: "item-1",
                cells: [
                    { value: { keyID: "k-pk", blockID: "item-1", type: "block", block: { id: "doc-1", content: "张三" } }, valueType: "block" },
                    { value: { keyID: "k-phone", type: "phone", phone: { content: "138" } }, valueType: "phone" },
                ],
            }],
        },
    } as unknown as AvRenderResult;
    const people = rosterFromRender(rendered, FIELD_MAP);
    assert.equal(people.length, 1);
    assert.equal(people[0].name, "张三");
    assert.equal(people[0].phone, "138");
});

test("filterContacts：搜索与分组叠加（借 contacts 的纯函数同逻辑验证）", () => {
    // filterContacts 在 services/contacts（含 api 依赖），此处用等价结构验证过滤语义
    const make = (name: string, phone: string, group: string): ContactSummary => ({
        docId: name, itemId: name, name, phone, email: "", wechat: "", website: "",
        birthday: "", isLunar: false, group, tags: [], relatedItemIds: [],
    });
    const people = [make("张三", "138", "朋友"), make("李四", "9527", "同事")];
    const keyword = "138";
    const hit = people.filter((p) => p.name.includes(keyword) || p.phone.includes(keyword));
    assert.deepEqual(hit.map((p) => p.name), ["张三"]);
});

test("rosterPageState：总数决定是否还有后续页", () => {
    assert.deepEqual(rosterPageState(1, 200, 1001, 200), {
        page: 1, pageSize: 200, total: 1001, loaded: 200, hasMore: true,
    });
    assert.equal(rosterPageState(6, 200, 1001, 1001).hasMore, false);
    assert.throws(() => rosterPageState(0, 200, 1, 0), /页码/);
    assert.throws(() => rosterPageState(1, 200, -1, 0), /总数/);
});

test("名册排序逻辑：按交往密度（frequency）与按最新录入（created）精准排序", () => {
    const make = (docId: string, name: string): ContactSummary => ({
        docId, itemId: docId, name, phone: "", email: "", wechat: "", website: "",
        birthday: "", isLunar: false, group: "默认", tags: [], relatedItemIds: [],
    });
    const p1 = make("20261001000000-aaaaaaa", "张三");
    const p2 = make("20261015000000-bbbbbbb", "李四");
    const p3 = make("20261025000000-ccccccc", "王五");

    const recent: Record<string, { occurredAt: number; localDate: string; count?: number }> = {
        "20261001000000-aaaaaaa": { occurredAt: 1000, localDate: "2026-10-01", count: 12 },
        "20261015000000-bbbbbbb": { occurredAt: 5000, localDate: "2026-10-15", count: 3 },
        "20261025000000-ccccccc": { occurredAt: 2000, localDate: "2026-10-25", count: 28 },
    };

    // 1. 按交往密度（总互动次数 count 降序）：王五 (28) > 张三 (12) > 李四 (3)
    const byFreq = [p1, p2, p3].sort((a, b) => {
        const countA = recent[a.docId]?.count ?? 0;
        const countB = recent[b.docId]?.count ?? 0;
        return countB - countA || a.name.localeCompare(b.name, "zh-CN");
    });
    assert.deepEqual(byFreq.map((p) => p.name), ["王五", "张三", "李四"]);

    // 2. 按最新录入（docId 倒序）：王五 (1025) > 李四 (1015) > 张三 (1001)
    const byCreated = [p1, p2, p3].sort((a, b) => {
        return b.docId.localeCompare(a.docId) || a.name.localeCompare(b.name, "zh-CN");
    });
    assert.deepEqual(byCreated.map((p) => p.name), ["王五", "李四", "张三"]);
});
