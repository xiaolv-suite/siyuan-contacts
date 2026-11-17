import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { Plugin } from "siyuan";

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "siyuan") return { shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(
            "export function fetchPost(){throw new Error('迁移扩展模块测试不应访问内核');}"), };
        if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
            const candidate = new URL(specifier + ".ts", context.parentURL);
            if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.startsWith("file:") && url.endsWith(".ts")) return { shortCircuit: true, format: "module", source:
            ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText };
        return nextLoad(url, context);
    },
});
test.after(() => hooks.deregister());

const { exportMigrationBundle, previewMigrationImport, importMigrationBundle, MIGRATION_COVERAGE } = await import("../src/services/migration-bundle.ts");
const { ANNIVERSARIES_STORAGE_KEY } = await import("../src/data/anniversaries.ts");
const { PERSON_PROMISES_STORAGE_KEY } = await import("../src/data/promises.ts");
const { PERSON_KINSHIP_STORAGE_KEY } = await import("../src/data/kinship.ts");
const { PERSON_PROJECTS_STORAGE_KEY } = await import("../src/data/projects.ts");
const { ITINERARIES_STORAGE_KEY } = await import("../src/data/itineraries.ts");
const { PERSON_SCRATCHPAD_STORAGE_KEY } = await import("../src/data/person-scratchpad.ts");
const { PERSON_SOCIAL_PREFERENCES_STORAGE_KEY } = await import("../src/data/social-preferences.ts");
const { PERSON_LIFECYCLE_STORAGE_KEY } = await import("../src/data/lifecycle-stage.ts");
const { PERSON_ORIGIN_STORAGE_KEY } = await import("../src/data/person-origins.ts");

const personDocId = "20261029000000-doc0001";

function mockPlugin() {
    const memory = new Map<string, unknown>();
    return {
        async loadData(key: string) {
            return memory.has(key) ? structuredClone(memory.get(key)) : null;
        },
        async saveData(key: string, value: unknown) {
            memory.set(key, structuredClone(value));
        },
        _memory: memory,
    } as unknown as Plugin & { _memory: Map<string, unknown> };
}

test("P0 数据迁移：全量导出覆盖 23 个自管模块，包含纪念日/信诺/亲属/项目/行程/便签/偏好/生命周期", async () => {
    const plugin = mockPlugin();

    // 预填部分新实体数据
    plugin._memory.set(ANNIVERSARIES_STORAGE_KEY, {
        schemaVersion: 1,
        anniversaries: {
            [personDocId]: [{ id: "anniv-1", personDocId, title: "相识纪念日", category: "acquaintance", date: "2024-05-20", isLunar: false }],
        },
    });
    plugin._memory.set(PERSON_PROMISES_STORAGE_KEY, {
        schemaVersion: 1,
        promises: {
            [personDocId]: [{ id: "prom-1", personDocId, title: "寄送签名书", direction: "i_promised", status: "pending", promisedOn: "2026-10-29", createdAt: 1700000000000, updatedAt: 1700000000000 }],
        },
    });

    const bundleText = await exportMigrationBundle(plugin);
    const bundle = JSON.parse(bundleText);

    assert.equal(bundle.schemaVersion, 1);
    assert.ok(bundle.modules.anniversaries, "导出应包含 anniversaries 模块");
    assert.ok(bundle.modules.promises, "导出应包含 promises 模块");
    assert.ok(bundle.modules.kinships, "导出应包含 kinships 模块");
    assert.ok(bundle.modules.projects, "导出应包含 projects 模块");
    assert.ok(bundle.modules.itineraries, "导出应包含 itineraries 模块");
    assert.ok(bundle.modules.scratchpads, "导出应包含 scratchpads 模块");
    assert.ok(bundle.modules.socialPreferences, "导出应包含 socialPreferences 模块");
    assert.ok(bundle.modules.lifecycleStage, "导出应包含 lifecycleStage 模块");

    // 验证预览
    const previews = previewMigrationImport(bundleText);
    const annivPreview = previews.find((p) => p.key === "anniversaries");
    assert.ok(annivPreview);
    assert.equal(annivPreview.count, 1);
});

test("P0 数据迁移：恢复导入支持现状优先合并，旧包无新增模块时不破坏当前库", async () => {
    const plugin = mockPlugin();

    // 当前库已有 1 条纪念日
    plugin._memory.set(ANNIVERSARIES_STORAGE_KEY, {
        schemaVersion: 1,
        anniversaries: {
            [personDocId]: [{ id: "anniv-keep", personDocId, title: "当前相识纪念", category: "acquaintance", date: "2020-01-01", isLunar: false }],
        },
    });

    // 构造一个包含新纪念日与偏好的包
    const incomingBundle = {
        schemaVersion: 1,
        storageKey: "lvct-migration-bundle",
        modules: {
            anniversaries: {
                schemaVersion: 1,
                anniversaries: {
                    [personDocId]: [
                        { id: "anniv-keep", personDocId, title: "当前相识纪念", category: "acquaintance", date: "2020-01-01", isLunar: false },
                        { id: "anniv-new", personDocId, title: "银婚纪念日", category: "wedding", date: "2025-10-01", isLunar: false },
                    ],
                },
            },
            socialPreferences: {
                schemaVersion: 1,
                preferences: {
                    [personDocId]: [
                        { id: "pref-1", personDocId, category: "dietary", content: "海鲜过敏", isTaboo: true, createdAt: 1700000000000, updatedAt: 1700000000000 },
                    ],
                },
            },
        },
    };

    const res = await importMigrationBundle(plugin, JSON.stringify(incomingBundle));
    assert.equal(res.failed.length, 0);

    const annivResult = res.modules.find((m) => m.key === "anniversaries");
    assert.ok(annivResult);
    assert.equal(annivResult.merged, 1, "仅合并新增的 1 条纪念日");
    assert.equal(annivResult.skipped, 1, "已存在的 1 条纪念日被现状优先跳过");

    const prefResult = res.modules.find((m) => m.key === "socialPreferences");
    assert.ok(prefResult);
    assert.equal(prefResult.merged, 1, "合并新增的 1 条忌口记录");
});

test("BUG-02 回归：24 模块全要素迁移包包含初识溯源与引荐 (personOrigins) 的导出、预览与现状优先恢复", async () => {
    const plugin = mockPlugin();
    const introducerDocId = "20261029000000-doc0002";

    assert.ok(
        MIGRATION_COVERAGE.some((c) => c.key === PERSON_ORIGIN_STORAGE_KEY && c.status === "included"),
        "MIGRATION_COVERAGE 必须包含 person-origins.json",
    );

    plugin._memory.set(PERSON_ORIGIN_STORAGE_KEY, {
        schemaVersion: 1,
        origins: {
            [personDocId]: {
                personDocId,
                metAt: "2025春季技术峰会",
                introducedByDocId: introducerDocId,
                preferences: "喜欢浅烘手冲",
            },
        },
    });

    const bundleText = await exportMigrationBundle(plugin);
    const previews = previewMigrationImport(bundleText);
    const originPreview = previews.find((p) => p.key === "personOrigins");
    assert.ok(originPreview, "预览应包含 personOrigins 模块");
    assert.equal(originPreview.count, 1);

    const targetPlugin = mockPlugin();
    const importRes = await importMigrationBundle(targetPlugin, bundleText);
    assert.equal(importRes.failed.length, 0);
    const originMod = importRes.modules.find((m) => m.key === "personOrigins");
    assert.ok(originMod);
    assert.equal(originMod.merged, 1);
});

