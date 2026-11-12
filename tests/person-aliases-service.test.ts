import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

let mockRouteHandler: (route: string, body: Record<string, unknown>) => unknown = () => [];

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "siyuan") {
            return {
                shortCircuit: true,
                url: "data:text/javascript," + encodeURIComponent(
                    "export default {}; export function fetchPost(route, body, cb){ Promise.resolve().then(() => cb(globalThis.__lvctAliasMock(route, body))).catch((e) => cb({ code: -1, msg: e.message })); }",
                ),
            };
        }
        if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
            const candidate = new URL(specifier + ".ts", context.parentURL);
            if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.startsWith("file:") && url.endsWith(".ts")) {
            return {
                shortCircuit: true,
                format: "module",
                source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
                    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
                }).outputText,
            };
        }
        return nextLoad(url, context);
    },
});
process.on("exit", () => hooks.deregister());

(globalThis as unknown as { __lvctAliasMock: typeof mockRouteHandler }).__lvctAliasMock = (route, body) => mockRouteHandler(route, body);

const { addPersonAlias, removePersonAlias, listPersonAliases } = await import("../src/services/person-aliases.ts");
const DOC = "20261031100000-person1";

test("思源文档深度联动 · 增删别名自动同步写入人物文档原生 alias 块属性", async () => {
    const memory = new Map<string, unknown>();
    memory.set("person-aliases.json", { schemaVersion: 1, aliases: [], tombstones: [] });

    const dummyPlugin = {
        loadData: async (k: string) => memory.get(k) ?? null,
        saveData: async (k: string, v: unknown) => { memory.set(k, v); },
    } as any;

    let updatedAttrs: Record<string, string> | null = null;
    mockRouteHandler = (route, body) => {
        if (route === "/api/sqlite/flushTransaction") return { code: 0, msg: "", data: null };
        if (route === "/api/attr/setBlockAttrs") {
            assert.equal(body.id, DOC);
            updatedAttrs = body.attrs as Record<string, string>;
            return { code: 0, msg: "", data: null };
        }
        return { code: 0, msg: "", data: [] };
    };

    // 1. 添加别名 "浩然"
    const alias1 = await addPersonAlias(dummyPlugin, DOC, "浩然");
    assert.equal(alias1.alias, "浩然");
    assert.deepEqual(updatedAttrs, { alias: "浩然" });

    // 2. 添加第二个别名 "老王"
    const alias2 = await addPersonAlias(dummyPlugin, DOC, "老王");
    assert.equal(alias2.alias, "老王");
    assert.equal(updatedAttrs?.alias, "浩然,老王");

    // 3. 移除第一个别名
    await removePersonAlias(dummyPlugin, alias1.id);
    assert.equal(updatedAttrs?.alias, "老王");
});
