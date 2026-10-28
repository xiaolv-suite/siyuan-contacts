import assert from "node:assert/strict";
import test from "node:test";
import {
    escapeSvgText,
    generateBusinessCardSvg,
    getAvatarInitial,
    type BusinessCardInput,
} from "../src/domain/business-card.ts";
import type { ContactSummary } from "../src/domain/person.ts";

test("business-card domain: escapeSvgText 与 getAvatarInitial", () => {
    assert.equal(escapeSvgText('Tom & Jerry <"Friends">'), "Tom &amp; Jerry &lt;&quot;Friends&quot;&gt;");
    assert.equal(getAvatarInitial("张小明"), "张");
    assert.equal(getAvatarInitial(" Alice "), "A");
    assert.equal(getAvatarInitial(""), "人");
});

test("business-card domain: generateBusinessCardSvg 横版与品牌主题渲染", () => {
    const person: ContactSummary = {
        docId: "doc-card-1",
        itemId: "item-card-1",
        name: "方总/创始人",
        phone: "13800002222",
        email: "fang@example.com",
        wechat: "fang_wx",
        website: "",
        birthday: "1988-08-08",
        isLunar: false,
        group: "投资人",
        tags: ["半导体", "天使轮"],
        relatedItemIds: [],
    };

    const input: BusinessCardInput = {
        person,
        orgAndTitle: "深创投 · 管理合伙人",
        region: "广东 深圳",
        socialScore: 95,
        tierLabel: "核心伙伴",
        stageLabel: "共创阶段",
        theme: "brand",
        orientation: "horizontal",
    };

    const svg = generateBusinessCardSvg(input);
    assert.ok(svg.startsWith("<?xml"));
    assert.ok(svg.includes('viewBox="0 0 600 380"'));
    assert.ok(svg.includes("方总/创始人"));
    assert.ok(svg.includes("深创投 · 管理合伙人"));
    assert.ok(svg.includes("13800002222"));
    assert.ok(svg.includes("广东 深圳"));
    assert.ok(svg.includes("核心伙伴 · 95分"));
    assert.ok(svg.includes("共创阶段"));
    assert.ok(svg.includes("半导体"));
    assert.ok(svg.includes("LV CONTACTS"));
});

test("business-card domain: generateBusinessCardSvg 竖版与暗黑主题", () => {
    const person: ContactSummary = {
        docId: "doc-card-2",
        itemId: "item-card-2",
        name: "李工",
        phone: "13900003333",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "",
        tags: [],
        relatedItemIds: [],
    };

    const svg = generateBusinessCardSvg({
        person,
        theme: "dark",
        orientation: "vertical",
    });

    assert.ok(svg.includes('viewBox="0 0 440 600"'));
    assert.ok(svg.includes("fill=\"#18181B\""));
    assert.ok(svg.includes("李工"));
});
