import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFactCandidates, extractFactsFromText } from "../src/domain/fact-extraction.ts";

test("extractFactCandidates：从自然语言沟通记录中提取偏好、背景、观点与事实", () => {
    const raw = "和张总沟通交流，他提到平时喜欢喝肉桂岩茶，另外对花生坚果严重过敏。他之前曾负责腾讯云存储核心引擎，他认为私有知识库的治理重在权限边界与最小上下文。此外他下个月计划去新加坡出差考察业务。";

    const candidates = extractFactCandidates(raw);
    assert.ok(candidates.length >= 4);

    const preferenceItems = candidates.filter((c) => c.category === "preference");
    assert.ok(preferenceItems.some((c) => c.text.includes("喜欢喝肉桂岩茶")));
    assert.ok(preferenceItems.some((c) => c.text.includes("花生坚果严重过敏")));

    const backgroundItems = candidates.filter((c) => c.category === "background");
    assert.ok(backgroundItems.some((c) => c.text.includes("曾负责腾讯云存储核心引擎")));

    const quoteItems = candidates.filter((c) => c.category === "quote");
    assert.ok(quoteItems.some((c) => c.text.includes("认为私有知识库的治理重在权限边界与最小上下文")));

    const factItems = candidates.filter((c) => c.category === "fact");
    assert.ok(factItems.some((c) => c.text.includes("下个月计划去新加坡出差考察业务")));
});

test("extractFactsFromText：生成带时间与格式化属性的事实实体", () => {
    const text = "毕业于清华大学电子系，平时爱好手冲咖啡。";
    const facts = extractFactsFromText(text, "2026-10-28", "2026战略研讨会");
    assert.equal(facts.length, 2);
    assert.equal(facts[0].category, "background");
    assert.equal(facts[0].date, "2026-10-28");
    assert.equal(facts[0].sourceRef, "2026战略研讨会");
    assert.equal(facts[1].category, "preference");
});

test("extractFactCandidates：空输入与过短/无意义文字过滤", () => {
    assert.deepEqual(extractFactCandidates(""), []);
    assert.deepEqual(extractFactCandidates("你好"), []);
    assert.deepEqual(extractFactCandidates("今天天气不错，吃了午饭"), []);
});
