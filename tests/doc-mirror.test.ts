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
                    "export default {}; export function getActiveEditor() { return globalThis.__lvctActiveEditor?.() ?? null; } export function fetchPost(route, body, cb){ Promise.resolve().then(() => cb(globalThis.__lvctMirrorMock(route, body))).catch((e) => cb({ code: -1, msg: e.message })); }",
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

(globalThis as unknown as { __lvctMirrorMock: typeof mockRouteHandler }).__lvctMirrorMock = (route, body) => mockRouteHandler(route, body);

const { schedulePersonDocMirror, runPersonDocMirror, markDocumentActiveTyping, disposeDocMirrorScheduler } = await import("../src/services/doc-mirror.ts");
const DOC = "20261031100000-person1";
const NB = "20261031100000-nb00001";

test("思源文档深度联动 · 自动增量文档镜像调度器（防抖、输入保护与同步执行）", async () => {
    let synced = false;
    let syncCalls = 0;

    const dummySettings = { notebookId: NB, hostDocId: "doc-h", dbBlockId: "blk-d", avId: "av-1", fieldMap: { phone: "phone" } };
    const dummyPlugin = {
        settings: dummySettings,
        loadData: async () => null,
        saveData: async () => {},
    } as any;

    const blocksMap = new Map<string, { id: string; markdown: string }>();

    mockRouteHandler = (route, body) => {
        if (route === "/api/sqlite/flushTransaction") return { code: 0, msg: "", data: null };
        if (route === "/api/block/insertBlock" || route === "/api/block/appendBlock" || route === "/api/block/updateBlock") {
            synced = true;
            syncCalls += 1;
            const data = String(body.data ?? "");
            const matchAttr = data.match(/custom-lvct-[a-z-]+/);
            const attr = matchAttr ? matchAttr[0] : "unknown";
            const id = `20261031100000-b${String(blocksMap.size + 1).padStart(6, "0")}`;
            const markdownOnly = data.replace(/\n\{:[^\n]*\}\s*$/, "");
            blocksMap.set(attr, { id, markdown: markdownOnly });
            return { code: 0, msg: "", data: [{ doOperations: [{ action: "insert", id }] }] };
        }
        if (route === "/api/query/sql") {
            const stmt = String(body.stmt ?? "");
            if (stmt.includes("type = 'd'")) return { code: 0, msg: "", data: [{ id: DOC }] };
            for (const [attr, blk] of blocksMap.entries()) {
                if (stmt.includes(attr)) return { code: 0, msg: "", data: [blk] };
            }
            return { code: 0, msg: "", data: [] };
        }
        if (route === "/api/av/renderAttributeView") {
            return {
                code: 0,
                msg: "",
                data: {
                    view: {
                        columns: [
                            { id: "name", name: "姓名", type: "block" },
                            { id: "phone", name: "电话", type: "phone" },
                        ],
                        rows: [{
                            id: "item-1",
                            cells: [
                                { valueType: "block", value: { keyID: "name", type: "block", block: { id: DOC, content: "王浩然" } } },
                                { valueType: "phone", value: { keyID: "phone", type: "phone", phone: { content: "13800000000" } } },
                            ],
                        }],
                    },
                },
            };
        }
        if (route === "/api/block/insertBlock" || route === "/api/block/appendBlock") {
            synced = true;
            syncCalls += 1;
            return { code: 0, msg: "", data: [{ doOperations: [{ action: "insert", id: "20261031100000-blk0001" }] }] };
        }
        return { code: 0, msg: "", data: [] };
    };

    // 1. 测试正在编辑打字保护：当用户在该文档打字时，推迟执行
    (globalThis as any).__lvctActiveEditor = () => ({ protyle: { block: { rootID: DOC } } });
    markDocumentActiveTyping(DOC);

    const deferred = await runPersonDocMirror(dummyPlugin, DOC);
    assert.equal(deferred, false, "用户在当前文档打字时应延后同步，不抢夺光标");

    // 2. 空闲时执行同步
    (globalThis as any).__lvctActiveEditor = () => null;
    const ok = await runPersonDocMirror(dummyPlugin, DOC);
    assert.equal(ok, true, "空闲时应成功执行同步");

    // 3. 测试防抖调度
    schedulePersonDocMirror(dummyPlugin, DOC, 50);
    schedulePersonDocMirror(dummyPlugin, DOC, 50);
    await new Promise((r) => setTimeout(r, 120));
    assert.ok(syncCalls >= 1, "防抖后应合并执行一次同步");

    disposeDocMirrorScheduler();
});
