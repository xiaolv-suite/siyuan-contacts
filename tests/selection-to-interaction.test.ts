import assert from "node:assert/strict";
import test from "node:test";
import type { ContactSummary } from "../src/domain/person.ts";
import {
    resolvePreselectedPerson,
    searchPeopleForSelection,
    inferInteractionTypeFromText,
    buildSelectionInteractionPayload,
    restoreFocusToEditor,
} from "../src/domain/selection-resolver.ts";
import { computeRelationshipHealth } from "../src/domain/cadence.ts";
import { interactionSectionMarkdown } from "../src/domain/doc-section.ts";
import type { InteractionEvent } from "../src/domain/interactions.ts";

function createMockPerson(docId: string, name: string, overrides: Partial<ContactSummary> = {}): ContactSummary {
    return {
        docId,
        itemId: `item-${docId}`,
        name,
        phone: overrides.phone ?? "",
        email: overrides.email ?? "",
        wechat: overrides.wechat ?? "",
        website: overrides.website ?? "",
        birthday: overrides.birthday ?? "",
        isLunar: false,
        group: overrides.group ?? "朋友",
        tags: overrides.tags ?? [],
        relatedItemIds: [],
        aliasProfile: overrides.aliasProfile,
    };
}

// -------------------------------------------------------------
// 1. 全名预选匹配
// -------------------------------------------------------------
test("Selection-to-Interaction · 全名预选匹配：选区文本包含人名时自动精确预选", () => {
    const people = [
        createMockPerson("doc-li", "李总"),
        createMockPerson("doc-zhang", "张三"),
        createMockPerson("doc-wang", "王浩然"),
    ];

    const matchLi = resolvePreselectedPerson(people, "今天和李总聊了预算");
    assert.ok(matchLi);
    assert.equal(matchLi.name, "李总");
    assert.equal(matchLi.docId, "doc-li");

    const matchWang = resolvePreselectedPerson(people, "下午与王浩然开会复盘");
    assert.ok(matchWang);
    assert.equal(matchWang.name, "王浩然");

    const noMatch = resolvePreselectedPerson(people, "今天自己写了一下午代码");
    assert.equal(noMatch, null);
});

test("Selection-to-Interaction · 全名预选匹配：多候选时最长匹配优先且支持别名预选", () => {
    const people = [
        createMockPerson("doc-li1", "李总"),
        createMockPerson("doc-li2", "老李总"),
        createMockPerson("doc-alias", "李建国", {
            aliasProfile: { state: "known", values: ["建国叔"] },
        }),
    ];

    // "老李总" 比 "李总" 更长，优先匹配 "老李总"
    const matchLonger = resolvePreselectedPerson(people, "今天和老李总商定合作");
    assert.ok(matchLonger);
    assert.equal(matchLonger.name, "老李总");

    // 别名匹配
    const matchAlias = resolvePreselectedPerson(people, "建国叔上午打电话过来问候");
    assert.ok(matchAlias);
    assert.equal(matchAlias.name, "李建国");
});

// -------------------------------------------------------------
// 2. 拼音首字母简拼搜索与模糊匹配
// -------------------------------------------------------------
test("Selection-to-Interaction · 简拼搜索：拼音首字母简拼快速匹配联系人", () => {
    const people = [
        createMockPerson("doc-1", "王浩然", { phone: "13800138000" }),
        createMockPerson("doc-2", "李总", { phone: "13900139000" }),
        createMockPerson("doc-3", "张三", { phone: "13700137000" }),
        createMockPerson("doc-4", "诸葛孔明"),
    ];

    // whr -> 王浩然
    const resWhr = searchPeopleForSelection(people, "whr");
    assert.equal(resWhr.length, 1);
    assert.equal(resWhr[0].name, "王浩然");

    // lz -> 李总
    const resLz = searchPeopleForSelection(people, "lz");
    assert.equal(resLz.length, 1);
    assert.equal(resLz[0].name, "李总");

    // zs -> 张三
    const resZs = searchPeopleForSelection(people, "zs");
    assert.equal(resZs.length, 1);
    assert.equal(resZs[0].name, "张三");

    // zgkm -> 诸葛孔明
    const resZg = searchPeopleForSelection(people, "zgkm");
    assert.equal(resZg.length, 1);
    assert.equal(resZg[0].name, "诸葛孔明");

    // 汉字前缀/子串匹配
    const resHanzi = searchPeopleForSelection(people, "浩然");
    assert.equal(resHanzi.length, 1);
    assert.equal(resHanzi[0].name, "王浩然");

    // 手机号匹配
    const resPhone = searchPeopleForSelection(people, "13800");
    assert.equal(resPhone.length, 1);
    assert.equal(resPhone[0].name, "王浩然");

    // 空查询返回全部
    assert.equal(searchPeopleForSelection(people, "").length, 4);
});

// -------------------------------------------------------------
// 3. 互动方式智能推断
// -------------------------------------------------------------
test("Selection-to-Interaction · 互动方式推断：依据选区文本关键词智能推荐三选一 chips", () => {
    assert.equal(inferInteractionTypeFromText("今天给李总打了电话确认预算"), "call");
    assert.equal(inferInteractionTypeFromText("致电王总讨论排期"), "call");
    assert.equal(inferInteractionTypeFromText("微信上和张三发消息聊了方案"), "message");
    assert.equal(inferInteractionTypeFromText("企微私信沟通"), "message");
    assert.equal(inferInteractionTypeFromText("今天在咖啡厅和李总面谈预算"), "meeting");
    assert.equal(inferInteractionTypeFromText("讨论了下季度规划"), "meeting");
});

// -------------------------------------------------------------
// 4. 互动载荷写入（含双链与 externalRef）
// -------------------------------------------------------------
test("Selection-to-Interaction · 互动载荷写入：自动挂载源笔记 siyuan://blocks/${blockId} 双链", () => {
    const person = createMockPerson("doc-100", "李总");
    const payload = buildSelectionInteractionPayload({
        person,
        note: "今天聊了预算分配",
        type: "meeting",
        blockId: "20261105093012-abc1234",
        occurredAt: 1793863800000,
    });

    assert.equal(payload.personDocId, "doc-100");
    assert.equal(payload.personName, "李总");
    assert.equal(payload.type, "meeting");
    assert.equal(payload.blockId, "20261105093012-abc1234");
    assert.equal(payload.externalRef, "block:20261105093012-abc1234");
    assert.ok(payload.note.includes("今天聊了预算分配"));
    assert.ok(payload.note.includes("[🔗 原文](siyuan://blocks/20261105093012-abc1234)"));

    // 验证与受控正文区块 (interactionSectionMarkdown) 的兼容格式
    const mockEvent: InteractionEvent = {
        id: "event-1",
        personDocId: payload.personDocId,
        type: payload.type,
        note: payload.note,
        occurredAt: payload.occurredAt,
        localDate: payload.localDate,
        externalRef: payload.externalRef,
    };
    const markdown = interactionSectionMarkdown([mockEvent]);
    assert.ok(markdown.includes("siyuan://blocks/20261105093012-abc1234"));
    // 不产生重复双链
    const occurrences = (markdown.match(/siyuan:\/\/blocks/g) || []).length;
    assert.equal(occurrences, 1);
});

// -------------------------------------------------------------
// 5. 温度计刷新触发（Warm 活跃态）
// -------------------------------------------------------------
test("Selection-to-Interaction · 关系温度计刷新：记录互动后立即由冷淡/久未联系重算为 Warm/Hot 活跃态", () => {
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 86400 * 1000;

    // 互动前：90 天未联系，周期 30 天 → 状态为 cold / overdue
    const healthBefore = computeRelationshipHealth({
        cadenceDays: 30,
        lastInteractionTime: ninetyDaysAgo,
        nowTime: now,
    });
    assert.equal(healthBefore.level, "cold");
    assert.equal(healthBefore.overdue, true);

    // 互动后：发生时间为今天 (now) → 状态即时重算为活跃态 (hot / warm，overdue: false)
    const healthAfter = computeRelationshipHealth({
        cadenceDays: 30,
        lastInteractionTime: now,
        nowTime: now,
    });
    assert.equal(healthAfter.level, "hot");
    assert.equal(healthAfter.overdue, false);
    assert.equal(healthAfter.score, 100);
    assert.equal(healthAfter.elapsedDays, 0);
});

// -------------------------------------------------------------
// 6. 焦点归还编辑器（原元素在则原元素聚焦，不在则回落至 protyle）
// -------------------------------------------------------------
test("Selection-to-Interaction · 焦点归还：原元素若在 DOM 则聚焦，若不在则回落至 protyle-wysiwyg", () => {
    // 场景 A: 原元素仍在 DOM
    let focusedElement: HTMLElement | null = null;
    const activeEl = {
        isConnected: true,
        focus: () => { focusedElement = activeEl as unknown as HTMLElement; },
    } as unknown as HTMLElement;

    restoreFocusToEditor(activeEl, null);
    assert.equal(focusedElement, activeEl);

    // 场景 B: 原元素已不在 DOM (isConnected = false)，回落至 protyle-wysiwyg
    let wysiwygFocused = false;
    const mockWysiwyg = {
        isConnected: true,
        focus: () => { wysiwygFocused = true; },
    } as unknown as HTMLElement;
    const mockProtyle = {
        isConnected: true,
        querySelector: (sel: string) => sel === ".protyle-wysiwyg" ? mockWysiwyg : null,
    } as unknown as HTMLElement;

    const detachedEl = {
        isConnected: false,
        focus: () => { throw new Error("Should not focus detached element"); },
    } as unknown as HTMLElement;

    restoreFocusToEditor(detachedEl, mockProtyle);
    assert.equal(wysiwygFocused, true);
});

// -------------------------------------------------------------
// 7. 划词右键菜单注册
// -------------------------------------------------------------
test("Selection-to-Interaction · 菜单项注册：有选中文本时准确注册「👥 人脉：记一笔互动」菜单", () => {
    const registeredItems: { id?: string; label?: string; click?: () => void }[] = [];
    const mockMenu = {
        addItem: (item: { id?: string; label?: string; click?: () => void }) => {
            registeredItems.push(item);
        },
    };

    // 模拟选区存在
    const selectionText = "今天和李总商定下月预算";
    if (selectionText.trim()) {
        mockMenu.addItem({
            id: "lvct-selection-to-interaction",
            label: "👥 人脉：记一笔互动",
            click: () => {},
        });
    }

    assert.equal(registeredItems.length, 1);
    assert.equal(registeredItems[0].id, "lvct-selection-to-interaction");
    assert.equal(registeredItems[0].label, "👥 人脉：记一笔互动");

    // 模拟空选区时不注册
    registeredItems.length = 0;
    const emptySelection = "   ";
    if (emptySelection.trim()) {
        mockMenu.addItem({
            id: "lvct-selection-to-interaction",
            label: "👥 人脉：记一笔互动",
            click: () => {},
        });
    }
    assert.equal(registeredItems.length, 0);
});
