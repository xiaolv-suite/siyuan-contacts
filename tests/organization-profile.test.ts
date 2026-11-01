import test from "node:test";
import assert from "node:assert/strict";
import {
    emptyOrganizationProfileDraft,
    normalizeOrganizationProfileDraft,
    organizationTemplateDraft,
    ORGANIZATION_TEMPLATES,
    validateOrganizationProfile,
} from "../src/domain/organization-profile.ts";
import { saveOrganizationProfile, OrganizationProfileConflictError } from "../src/data/organization-profiles.ts";

test("组织资料名称为必填，模板提供可编辑的内置组织", () => {
    assert.equal(validateOrganizationProfile(emptyOrganizationProfileDraft()).valid, false);
    assert.deepEqual(ORGANIZATION_TEMPLATES.map((item) => item.key), [
        "family", "primary-school", "middle-school", "high-school", "university", "company", "community",
    ]);
    const family = organizationTemplateDraft("family");
    family.name = "我的家庭";
    assert.equal(validateOrganizationProfile(family).valid, true);
});

test("组织资料校验企查查、Logo 和部门层级", () => {
    const draft = organizationTemplateDraft("company");
    draft.name = " 示例公司 ";
    draft.qccUrl = "https://www.qcc.com/firm/abc";
    draft.logoDataUrl = "data:image/png;base64,aGVsbG8=";
    draft.departments = [
        { id: "root", name: "总部", parentId: null, description: "" },
        { id: "rd", name: "研发", parentId: "root", description: "" },
    ];
    draft.customFields = [{ id: "founded", label: "成立年份", value: "2020" }];
    assert.equal(validateOrganizationProfile(draft).valid, true);
    assert.equal(normalizeOrganizationProfileDraft(draft).name, "示例公司");
    draft.qccUrl = "https://example.com/company";
    assert.match(validateOrganizationProfile(draft).errors.join("、"), /企查查/);
    draft.qccUrl = "https://www.qcc.com/firm/abc";
    draft.departments[1].parentId = "missing";
    assert.match(validateOrganizationProfile(draft).errors.join("、"), /上级不存在/);
});

test("组织部门循环和重复自定义标识会被拒绝", () => {
    const draft = organizationTemplateDraft("family");
    draft.name = "家庭";
    draft.departments = [
        { id: "a", name: "A", parentId: "b", description: "" },
        { id: "b", name: "B", parentId: "a", description: "" },
    ];
    draft.customFields = [{ id: "x", label: "一", value: "" }, { id: "x", label: "二", value: "" }];
    const result = validateOrganizationProfile(draft);
    assert.equal(result.valid, false);
    assert.match(result.errors.join("、"), /循环/);
    assert.match(result.errors.join("、"), /标识重复/);
});

test("组织资料保存使用打开时快照，拒绝覆盖其他窗口的新版本", async () => {
    const docId = "20261014000000-org0001";
    let stored: unknown = null;
    const plugin = {
        async loadData() { return structuredClone(stored); },
        async saveData(_key: string, value: unknown) { stored = structuredClone(value); },
    } as never;
    const original = organizationTemplateDraft("company");
    original.name = "原公司";
    await saveOrganizationProfile(plugin, docId, original, null);
    const external = { ...original, description: "其他窗口的最新介绍" };
    await saveOrganizationProfile(plugin, docId, external, original);
    const stale = { ...original, description: "旧窗口草稿" };
    await assert.rejects(saveOrganizationProfile(plugin, docId, stale, original), OrganizationProfileConflictError);
    const latest = JSON.parse(JSON.stringify(stored)) as { profiles: Record<string, { description: string }> };
    assert.equal(latest.profiles[docId].description, external.description);
});

test("思源文档深度联动 P2：buildOrganizationDossierMarkdown 生成组织全要素受控文档与在职/离职成员双链", async () => {
    const { buildOrganizationDossierMarkdown } = await import("../src/domain/org-dossier.ts");

    const md = buildOrganizationDossierMarkdown({
        name: "远山科技有限公司",
        shortName: "远山科技",
        description: "专注本地优先企业协同软件",
        qccUrl: "https://www.qcc.com/firm/yuanshan.html",
        isArchived: false,
        departments: [
            {
                id: "dept-1",
                name: "研发中心",
                children: [
                    { id: "dept-1-1", name: "架构组" },
                ],
            },
            { id: "dept-2", name: "产品部" },
        ],
        members: [
            {
                personDocId: "20261001000000-p001",
                name: "王浩然",
                department: "研发中心",
                title: "架构师",
                status: "active",
                startYearMonth: "2023-05",
            },
            {
                personDocId: "20261002000000-p002",
                name: "陈明",
                department: "研发中心",
                title: "工程师",
                status: "former",
                startYearMonth: "2021-03",
                endYearMonth: "2023-04",
            },
        ],
    });

    assert.ok(md.includes("## 🏢 机构档案概览"));
    assert.ok(md.includes("- **简称 / 状态**：远山科技 · 活跃"));
    assert.ok(md.includes("- **机构简介**：专注本地优先企业协同软件"));
    assert.ok(md.includes("- **外部链接**：[企业信息档案](https://www.qcc.com/firm/yuanshan.html)"));
    assert.ok(md.includes("- **部门架构**：\n  - 研发中心\n    - 架构组\n  - 产品部"));
    assert.ok(md.includes("## 👥 关联人脉名录"));
    assert.ok(md.includes("- **在职 / 当前成员（1）**："));
    assert.ok(md.includes("- ((20261001000000-p001 '王浩然')) · 研发中心 · 架构师 · 2023-05 ~ 至今"), "在职成员必须生成思源原生块引用双链与履历信息");
    assert.ok(md.includes("- **历史成员 / 前同事校友（1）**："));
    assert.ok(md.includes("- ((20261002000000-p002 '陈明')) · 研发中心 · 工程师 · 2021-03 ~ 2023-04 · 已离职"), "离职成员必须生成思源原生块引用双链与历史任期");
});
