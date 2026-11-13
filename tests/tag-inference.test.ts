import { test } from "node:test";
import assert from "node:assert/strict";
import { inferPersonaTags, buildTagInferencePrompt } from "../src/domain/tag-inference.ts";

test("inferPersonaTags：基于职业、事实与城市智能推导层级标签", () => {
    const inferred = inferPersonaTags({
        name: "李总",
        workText: "腾讯云存储核心引擎 / 首席架构师",
        city: "深圳市",
        facts: [
            { text: "花生过敏，喜饮肉桂岩茶", category: "preference" },
            { text: "周末常在深圳湾骑行与露营", category: "preference" },
        ],
        topics: [
            { text: "沟通云原生 Ceph 存储架构落地" },
        ],
        existingTags: ["重要客户"],
    });

    assert.ok(inferred.includes("#行业/云计算"), "应智能识别云计算行业");
    assert.ok(inferred.includes("#身份/技术管理"), "应智能识别架构师技术管理身份");
    assert.ok(inferred.includes("#偏好/品茶"), "应从喜饮肉桂岩茶识别品茶偏好");
    assert.ok(inferred.includes("#偏好/户外运动"), "应从骑行露营识别户外运动");
    assert.ok(inferred.includes("#偏好/饮食注意"), "应从花生过敏识别饮食注意");
    assert.ok(inferred.includes("#地域/深圳"), "应从深圳市提取地域标签");
    assert.equal(inferred.includes("重要客户"), false, "已有标签不重复推导");
});

test("inferPersonaTags：金融投资与生活画像识别", () => {
    const inferred = inferPersonaTags({
        name: "王合伙人",
        workText: "红杉中国 / 联合创始人兼VC投资总监",
        facts: [
            { text: "喜好手冲咖啡，只喝埃塞俄比亚水洗豆", category: "preference" },
        ],
        existingTags: [],
    });

    assert.ok(inferred.includes("#行业/金融投资"));
    assert.ok(inferred.includes("#身份/创始人合伙人"));
    assert.ok(inferred.includes("#偏好/精品咖啡"));
});

test("buildTagInferencePrompt：生成规范的 Prompt 指令", () => {
    const prompt = buildTagInferencePrompt({
        name: "张三",
        workText: "某某科技 CTO",
        city: "北京",
    });

    assert.ok(prompt.includes("张三"));
    assert.ok(prompt.includes("某某科技 CTO"));
    assert.ok(prompt.includes("北京"));
    assert.ok(prompt.includes("JSON 数组"));
});

test("inferPersonaTags：结合社交偏好与承诺推导标签及 adoptSuggestedTags 采纳去重", async () => {
    const { adoptSuggestedTags } = await import("../src/domain/tag-inference.ts");

    const inferred = inferPersonaTags({
        name: "陈总",
        socialPreferences: [
            { content: "不饮白酒，喜好龙井与普洱茶道" },
        ],
        promises: [
            { title: "探讨东南亚跨境电商出海合作方案" },
        ],
        existingTags: ["战略伙伴"],
    });

    assert.ok(inferred.includes("#偏好/品茶"));
    assert.ok(inferred.includes("#行业/出海跨境"));

    // 采纳测试
    const adopted = adoptSuggestedTags(["战略伙伴"], ["#偏好/品茶", "战略伙伴", "#行业/出海跨境"]);
    assert.deepEqual(adopted, ["战略伙伴", "#偏好/品茶", "#行业/出海跨境"]);
});
