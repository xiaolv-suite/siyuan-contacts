import assert from "node:assert/strict";
import test from "node:test";
import {
    buildPersonFlashcards,
    buildFlashcardDocumentMarkdown,
    buildBatchFlashcardsDocumentMarkdown,
} from "../src/domain/flashcards.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { PersonFactItem } from "../src/domain/doc-section.ts";
import type { PersonTopicItem } from "../src/domain/topics.ts";

test("buildPersonFlashcards：全要素提取资料、生日、偏好、履历与会面谈资", () => {
    const mockPerson: ContactSummary = {
        docId: "doc-card-1",
        itemId: "item-card-1",
        name: "李总",
        phone: "13800138000",
        email: "li@example.com",
        wechat: "li_wx",
        website: "",
        birthday: "1988-06-18",
        isLunar: false,
        group: "投资人",
        tags: ["消费科技", "高尔夫"],
        relatedItemIds: [],
        profile: {
            readAt: Date.now(),
            affiliations: {
                state: "known",
                value: {
                    work: [{ orgName: "红杉资本", department: "TMT组", title: "合伙人" }],
                    education: [],
                    family: [],
                    unspecified: [],
                },
            },
            relationship: { state: "unknown", message: "" },
        },
    };

    const mockFacts: PersonFactItem[] = [
        {
            id: "f-1",
            text: "重度喜爱普洱生茶，不喝含糖饮料，对甲壳类海鲜过敏",
            category: "preference",
            createdAt: 1000,
        },
        {
            id: "f-2",
            text: "本科毕业于浙江大学，曾在美国硅谷工作 4 年",
            category: "background",
            createdAt: 1000,
        },
        {
            id: "f-3",
            text: "坚信未来 3 年具身智能硬件将迎来爆发期",
            category: "quote",
            createdAt: 1000,
        },
    ];

    const mockTopics: PersonTopicItem[] = [
        {
            id: "t-1",
            text: "上次答应借他的关于半导体供应链的书籍",
            createdAt: 1000,
        },
    ];

    const cards = buildPersonFlashcards(mockPerson, mockFacts, mockTopics);

    assert.equal(cards.length, 6, "应生成 6 张针对不同维度的记忆闪卡");
    const categories = cards.map((c) => c.category);
    assert(categories.includes("profile"));
    assert(categories.includes("birthday"));
    assert(categories.includes("preference"));
    assert(categories.includes("background"));
    assert(categories.includes("quote"));
    assert(categories.includes("topics"));

    // 检查偏好卡
    const prefCard = cards.find((c) => c.category === "preference");
    assert(prefCard);
    assert(prefCard.prompt.includes("李总"));
    assert(prefCard.answer.includes("普洱生茶"));

    // 检查文档生成
    const md = buildFlashcardDocumentMarkdown(mockPerson, cards, "人脉复习");
    assert(md.includes("# 🎴 人脉记忆闪卡 · 李总"));
    assert(md.includes('{: custom-riff-decks="人脉复习" }'));
    assert(md.includes("?"));
    assert(md.includes("红杉资本 · TMT组 · 合伙人"));
});

test("buildPersonFlashcards：精简空卡回退测试", () => {
    const minimalPerson: ContactSummary = {
        docId: "doc-mini",
        itemId: "item-mini",
        name: "纯姓名用户",
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

    const cards = buildPersonFlashcards(minimalPerson, [], []);
    assert.equal(cards.length, 0, "空资料联系人不应生成空闪卡");

    const md = buildFlashcardDocumentMarkdown(minimalPerson, cards);
    assert(md.includes("暂无可用闪卡"));
});

test("buildBatchFlashcardsDocumentMarkdown：多联系人批量闪卡文档组装", () => {
    const p1: ContactSummary = {
        docId: "doc-p1",
        itemId: "item-p1",
        name: "客户甲",
        phone: "13800001111",
        email: "",
        wechat: "",
        website: "",
        birthday: "1992-05-01",
        isLunar: false,
        group: "VIP",
        tags: [],
        relatedItemIds: [],
    };

    const p2: ContactSummary = {
        docId: "doc-p2",
        itemId: "item-p2",
        name: "客户乙",
        phone: "13900002222",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "VIP",
        tags: [],
        relatedItemIds: [],
    };

    const md = buildBatchFlashcardsDocumentMarkdown(
        [
            { person: p1, facts: [{ id: "f1", text: "喜好高尔夫", category: "preference", createdAt: 1000 }] },
            { person: p2 },
        ],
        "重点客户",
        "战略合作伙伴"
    );

    assert(md.includes("# 🎴 人脉记忆闪卡 · 战略合作伙伴"));
    assert(md.includes("共 **2** 位（其中 **2** 位包含记忆细节）"));
    assert(md.includes("## 👤 [客户甲](siyuan://blocks/doc-p1)"));
    assert(md.includes("## 👤 [客户乙](siyuan://blocks/doc-p2)"));
    assert(md.includes('{: custom-riff-decks="重点客户" }'));
    assert(md.includes("喜好高尔夫"));
});

