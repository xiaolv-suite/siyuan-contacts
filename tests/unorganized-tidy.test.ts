import assert from "node:assert/strict";
import test from "node:test";
import {
    inferGroupSuggestion,
    inferCitySuggestion,
    isUnorganizedPerson,
    buildTidyPlan,
} from "../src/domain/unorganized-tidy.ts";
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
        group: "",
        tags: [],
        relatedItemIds: [],
        ...overrides,
    };
}

test("inferGroupSuggestion：从工作履历与关键词推断最匹配的现有分组", () => {
    const availableGroups = ["投资机构", "高校学者", "科技研发", "商业客户"];

    const p1 = makeContact("1", "张合伙人", {
        profile: {
            readAt: 1000,
            affiliations: { state: "known", value: { work: [{ orgName: "高瓴资本", title: "合伙人" }], education: [], family: [], unspecified: [] } },
            relationship: { state: "unknown", message: "" },
        },
    });
    assert.equal(inferGroupSuggestion(p1, availableGroups), "投资机构");

    const p2 = makeContact("2", "李教授", {
        profile: {
            readAt: 1000,
            affiliations: { state: "known", value: { work: [{ orgName: "浙江大学计算机学院", title: "博导教授" }], education: [], family: [], unspecified: [] } },
            relationship: { state: "unknown", message: "" },
        },
    });
    assert.equal(inferGroupSuggestion(p2, availableGroups), "高校学者");
});

test("inferCitySuggestion：从组织经历中智能提取常驻城市", () => {
    const p1 = makeContact("1", "王总", {
        profile: {
            readAt: 1000,
            affiliations: { state: "known", value: { work: [{ orgName: "深圳市腾讯计算机系统有限公司", title: "总监" }], education: [], family: [], unspecified: [] } },
            relationship: { state: "unknown", message: "" },
        },
    });
    assert.equal(inferCitySuggestion(p1), "深圳");

    const p2 = makeContact("2", "赵工", {
        profile: {
            readAt: 1000,
            affiliations: { state: "known", value: { work: [{ orgName: "北京百度网讯科技有限公司", title: "架构师" }], education: [], family: [], unspecified: [] } },
            relationship: { state: "unknown", message: "" },
        },
    });
    assert.equal(inferCitySuggestion(p2), "北京");
});

test("isUnorganizedPerson & buildTidyPlan：精准识别待安顿无序联系人并生成整理计划", () => {
    const pOrganized = makeContact("p1", "全要素人员", {
        group: "投资机构",
        tags: ["AI芯片"],
        profile: {
            readAt: 1000,
            affiliations: { state: "known", value: { work: [{ orgName: "深圳市创新投资集团", title: "投资人" }], education: [], family: [], unspecified: [] } },
            relationship: { state: "unknown", message: "" },
        },
    });

    const pUnorganized = makeContact("p2", "待安顿学者", {
        group: "",
        tags: [],
        profile: {
            readAt: 1000,
            affiliations: { state: "known", value: { work: [{ orgName: "清华大学深圳研究生院", title: "教授" }], education: [], family: [], unspecified: [] } },
            relationship: { state: "unknown", message: "" },
        },
    });

    assert.equal(isUnorganizedPerson(pOrganized), false);
    assert.equal(isUnorganizedPerson(pUnorganized), true);

    const availableGroups = ["高校学者", "投资机构"];
    const plan = buildTidyPlan([pOrganized, pUnorganized], availableGroups);

    assert.equal(plan.length, 1);
    assert.equal(plan[0].person.name, "待安顿学者");
    assert.equal(plan[0].suggestedGroup, "高校学者");
    assert.equal(plan[0].currentCity, "深圳");
    assert.ok(plan[0].suggestedTags.some((t) => t.includes("高校") || t.includes("教育")));
});
