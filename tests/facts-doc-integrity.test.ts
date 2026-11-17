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

const { loadPersonFactsFromDoc, savePersonFactsToDoc, syncFullPersonDocument, syncPersonFieldsDocSection } = await import("../src/services/doc-section.ts");
const { createDocWithMd } = await import("../src/api/client.ts");
const { markedBlockContent } = await import("../src/api/blocks.ts");
const DOC = "20261031100000-abcdefg";
const NB = "20261031100000-nb00001";

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

test("真内核回归 · 多段受控区块以 {{{row ... }}} 原子超级块落盘并无损回读校验", async () => {
    let appendedData = "";
    mockRouteHandler = (route, body) => {
        if (route === "/api/sqlite/flushTransaction") return { code: 0, msg: "", data: null };
        if (route === "/api/block/appendBlock" || route === "/api/block/insertBlock") {
            appendedData = String(body.data ?? "");
            return { code: 0, msg: "", data: [{ doOperations: [{ action: "insert", id: "20261031100000-sblk001" }] }] };
        }
        if (route === "/api/query/sql") {
            const stmt = String(body.stmt ?? "");
            if (stmt.includes("type = 'd'")) return { code: 0, msg: "", data: [{ id: DOC }] };
            if (!appendedData) return { code: 0, msg: "", data: [] };
            // 模拟思源 3.8.9 Lute 落盘超级块后把末尾 IAL 收入 blocks.ial，blocks.markdown 仅保留 {{{row ... }}}
            const markdownOnly = appendedData.replace(/\n\{:[^\n]*\}\s*$/, "");
            return { code: 0, msg: "", data: [{ id: "20261031100000-sblk001", markdown: markdownOnly }] };
        }
        return { code: 0, msg: "", data: null };
    };

    await savePersonFactsToDoc(DOC, [
        { id: "f-taboo", category: "preference", isTaboo: true, date: "2026-10-31", text: "花生严重过敏" },
    ]);
    assert.match(appendedData, /^\{\{\{row\n## 谈资与关键事实\n\n- 🚫 \[忌口红线\]/);
    assert.ok(markedBlockContent(appendedData, "custom-lvct-facts").startsWith("## 谈资与关键事实"));

    const loaded = await loadPersonFactsFromDoc(DOC);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].isTaboo, true);
    assert.equal(loaded[0].text, "花生严重过敏");
});

test("真内核回归 · SiYuan 3.8.9 createDocWithMd 多级路径命中 document metadata is not ready 时自动补建父文档并成功重试", async () => {
    const existingPaths = new Set<string>();
    const calls: string[] = [];
    mockRouteHandler = (route, body) => {
        calls.push(`${route}:${String(body.path ?? "")}`);
        if (route === "/api/sqlite/flushTransaction") return { code: 0, msg: "", data: null };
        if (route === "/api/filetree/getIDsByHPath") {
            const p = String(body.path ?? "");
            return { code: 0, msg: "", data: existingPaths.has(p) ? ["20261031100000-parent1"] : [] };
        }
        if (route === "/api/filetree/createDocWithMd") {
            const p = String(body.path ?? "");
            if (p === "/人脉/王浩然" && !existingPaths.has("/人脉")) {
                return { code: -1, msg: "document metadata is not ready", data: null };
            }
            existingPaths.add(p);
            return { code: 0, msg: "", data: p === "/人脉" ? "20261031100000-parent1" : "20261031100000-child01" };
        }
        return { code: 0, msg: "", data: null };
    };

    const docId = await createDocWithMd(NB, "/人脉/王浩然", "# 王浩然\n");
    assert.equal(docId, "20261031100000-child01");
    assert.ok(existingPaths.has("/人脉"), "应自动补建缺失父路径 /人脉");
});

test("思源文档深度联动 · syncFullPersonDocument 自动清理历史静态跟进超级块，避免与原生跟进任务块重复", async () => {
    let deletedBlockId = "";
    const memory = new Map<string, unknown>();
    memory.set("interaction-events.json", { schemaVersion: 1, events: [], tombstones: [] });
    memory.set("follow-ups.json", { schemaVersion: 1, items: [] });
    memory.set("exchange-records.json", { schemaVersion: 1, records: [] });
    memory.set("person-anniversaries.json", { schemaVersion: 1, anniversaries: {} });
    memory.set("contacts-settings.json", { schemaVersion: 1, notebookId: NB, hostDocId: "doc-h", dbBlockId: "blk-d", avId: "av-1", fieldMap: {} });

    const dummyPlugin = {
        loadData: async (k: string) => memory.get(k) ?? null,
        saveData: async (k: string, v: unknown) => { memory.set(k, v); },
    } as any;

    const blocksMap = new Map<string, { id: string; markdown: string }>();
    blocksMap.set("custom-lvct-followups", { id: "20261031100000-legacfu", markdown: "## 待办跟进\n- [ ] 历史遗留" });

    mockRouteHandler = (route, body) => {
        if (route === "/api/sqlite/flushTransaction") return { code: 0, msg: "", data: null };
        if (route === "/api/block/deleteBlock") {
            deletedBlockId = String(body.id ?? "");
            blocksMap.delete("custom-lvct-followups");
            return { code: 0, msg: "", data: null };
        }
        if (route === "/api/block/insertBlock" || route === "/api/block/appendBlock" || route === "/api/block/updateBlock") {
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
        return { code: 0, msg: "", data: [] };
    };

    const person = {
        docId: DOC,
        itemId: "item-1",
        name: "王浩然",
        phone: "13800000000",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "",
        tags: [],
        relatedItemIds: [],
    };

    await syncFullPersonDocument(dummyPlugin, person);
    assert.equal(deletedBlockId, "20261031100000-legacfu", "应自动调用 deleteBlock 删除历史静态双轨跟进块");
});

