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
                    "export default {}; export function fetchPost(route, body, cb){ Promise.resolve().then(() => cb(globalThis.__lvctFactsMock(route, body))).catch((e) => cb({ code: -1, msg: e.message })); }",
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

(globalThis as unknown as { __lvctFactsMock: typeof mockRouteHandler }).__lvctFactsMock = (route, body) => mockRouteHandler(route, body);

const { loadPersonFactsFromDoc, savePersonFactsToDoc } = await import("../src/services/doc-section.ts");
const DOC = "20261031100000-abcdefg";

test("FUNC-02 loadPersonFactsFromDoc：内核读取失败或多受控块显式抛错，禁止静默返回空数组", async () => {
    mockRouteHandler = () => ({ code: -1, msg: "SQL 查询暂时不可用" });
    await assert.rejects(loadPersonFactsFromDoc(DOC), /SQL 查询暂时不可用/);

    mockRouteHandler = (route, body) => {
        if (route === "/api/sqlite/flushTransaction") return { code: 0, msg: "", data: null };
        const stmt = String(body.stmt ?? "");
        if (stmt.includes("type = 'd'")) return { code: 0, msg: "", data: [{ id: DOC }] };
        return {
            code: 0,
            msg: "",
            data: [
                { id: "20261031100000-b000001", markdown: "## 谈资与关键事实\n\n- 💡 [观点] 2026-10-30：A <!-- id:f1 -->" },
                { id: "20261031100000-b000002", markdown: "## 谈资与关键事实\n\n- 💡 [观点] 2026-10-31：B <!-- id:f2 -->" },
            ],
        };
    };
    await assert.rejects(loadPersonFactsFromDoc(DOC), /多个事实画像标记区块/);
});

test("FUNC-02 savePersonFactsToDoc：写入异常或多受控块显式抛错，不伪造保存成功", async () => {
    mockRouteHandler = (route, body) => {
        if (route === "/api/sqlite/flushTransaction") return { code: 0, msg: "", data: null };
        if (route === "/api/query/sql") {
            const stmt = String(body.stmt ?? "");
            if (stmt.includes("type = 'd'")) return { code: 0, msg: "", data: [{ id: DOC }] };
            return { code: 0, msg: "", data: [] };
        }
        return { code: -1, msg: "块插入失败", data: null };
    };
    await assert.rejects(
        savePersonFactsToDoc(DOC, [{ id: "f1", category: "preference", date: "2026-10-31", text: "不吃香菜" }]),
        /块插入失败/,
    );
});
