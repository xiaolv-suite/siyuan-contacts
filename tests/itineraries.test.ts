import assert from "node:assert/strict";
import test from "node:test";
import {
    emptyItineraryStore,
    newItineraryId,
    newChecklistId,
    validateItineraryItem,
    normalizeItineraryStore,
    normalizeItineraryStoreForWrite,
    deriveInteractionFromItinerary,
    filterItineraries,
    formatItineraryMarkdown,
    type PersonItineraryItem,
} from "../src/domain/itineraries.ts";

const docId = "20261020120000-abcdef1";

function makeItinerary(overrides: Partial<PersonItineraryItem> = {}): PersonItineraryItem {
    return {
        id: "itn-test-1",
        personDocId: docId,
        title: "探讨战略算力芯片合作",
        targetDate: "2026-11-15",
        targetTime: "14:30",
        location: "深圳南山科技园腾讯大厦 18F",
        attendees: "李总（CTO）、王博士",
        checklists: [
            { id: "c1", text: "携带产品样机与测试数据", done: true },
            { id: "c2", text: "打印商业合作方案（双份）", done: false },
        ],
        note: "重点关注散热性能指标与量产交付周期",
        status: "planned",
        createdAt: 1000,
        updatedAt: 1000,
        ...overrides,
    };
}

test("validateItineraryItem：有效性与字符上限校验", () => {
    assert.deepEqual(validateItineraryItem(makeItinerary()), []);

    // 缺标题
    assert.match(validateItineraryItem({ title: "" })[0], /行程主题不能为空/);

    // 标题超长
    assert.match(validateItineraryItem({ title: "a".repeat(101) })[0], /不能超过 100 字符/);

    // 格式错误日期
    assert.match(validateItineraryItem({ title: "正常", targetDate: "2026/11/15" })[0], /必须为 YYYY-MM-DD 格式/);

    // 格式错误时间
    assert.match(validateItineraryItem({ title: "正常", targetDate: "2026-11-15", targetTime: "2:30pm" })[0], /格式必须为 HH:mm/);
});

test("normalizeItineraryStore & normalizeItineraryStoreForWrite：容错读取与严格写校验", () => {
    // 容错读取
    assert.deepEqual(normalizeItineraryStore(null), emptyItineraryStore());
    assert.deepEqual(normalizeItineraryStore({ schemaVersion: 2 }), emptyItineraryStore());

    const item = makeItinerary();
    const validStore = {
        schemaVersion: 1,
        itineraries: {
            [docId]: [item],
        },
    };
    const normalized = normalizeItineraryStore(validStore);
    assert.equal(normalized.itineraries[docId]?.length, 1);
    assert.equal(normalized.itineraries[docId][0].title, "探讨战略算力芯片合作");

    // 写入严格校验
    assert.throws(
        () => normalizeItineraryStoreForWrite({ schemaVersion: 99, itineraries: {} }),
        /版本不兼容/,
    );
    assert.throws(
        () => normalizeItineraryStoreForWrite({ schemaVersion: 1, itineraries: { "invalid-doc-id": [] } }),
        /人物文档 ID 无效/,
    );
});

test("deriveInteractionFromItinerary：将行程转为交往互动事件", () => {
    const item = makeItinerary();
    const event = deriveInteractionFromItinerary(item, "李明远", 1700000000000);

    assert.equal(event.personDocId, docId);
    assert.equal(event.externalRef, item.id);
    assert.equal(event.source, "manual");
    assert.match(event.note ?? "", /【会面拜访】在 深圳南山科技园腾讯大厦 18F 与 李明远 会见交流/);
    assert.match(event.note ?? "", /• 主题：探讨战略算力芯片合作/);
    assert.match(event.note ?? "", /• 随行\/参会人员：李总（CTO）、王博士/);
    assert.match(event.note ?? "", /• 行前准备：1\/2 项已备妥/);
    assert.match(event.note ?? "", /• 事项备忘：重点关注散热性能指标/);
});

test("filterItineraries：状态分类与关键词过滤", () => {
    const i1 = makeItinerary({ id: "1", title: "洽谈A轮融资", status: "planned" });
    const i2 = makeItinerary({ id: "2", title: "咖啡馆叙旧", status: "completed", location: "星巴克" });
    const i3 = makeItinerary({ id: "3", title: "行业峰会交流", status: "cancelled", attendees: "赵工" });

    const list = [i1, i2, i3];

    assert.equal(filterItineraries(list, "all").length, 3);
    assert.equal(filterItineraries(list, "planned").length, 1);
    assert.equal(filterItineraries(list, "completed").length, 1);
    assert.equal(filterItineraries(list, "cancelled").length, 1);

    // 关键词检索
    assert.equal(filterItineraries(list, "all", "融资").length, 1);
    assert.equal(filterItineraries(list, "all", "星巴克").length, 1);
    assert.equal(filterItineraries(list, "all", "赵工").length, 1);
    assert.equal(filterItineraries(list, "all", "不存在").length, 0);
});

test("formatItineraryMarkdown：输出规范的思源 Markdown 文本", () => {
    const item = makeItinerary();
    const md = formatItineraryMarkdown(item, "李明远");

    assert.match(md, /### 🗓️ 会面拜访备忘 · 李明远/);
    assert.match(md, /- \*\*会见主题\*\*：探讨战略算力芯片合作/);
    assert.match(md, /- \*\*拟定时间\*\*：2026-11-15 14:30/);
    assert.match(md, /- \[x\] 携带产品样机与测试数据/);
    assert.match(md, /- \[ \] 打印商业合作方案（双份）/);
    assert.match(md, /- \*\*备忘要点\*\*：/);
});
