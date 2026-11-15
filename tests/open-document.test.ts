import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

type MockSiyuanState = {
    frontend: string;
    openTabCalls: unknown[];
    openMobileCalls: unknown[];
};

const mockState: MockSiyuanState = {
    frontend: "desktop",
    openTabCalls: [],
    openMobileCalls: [],
};

(globalThis as unknown as { __lvctOpenDocMock: MockSiyuanState }).__lvctOpenDocMock = mockState;

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "siyuan") {
            const mockCode = `
                export default {};
                export function getFrontend() {
                    return globalThis.__lvctOpenDocMock.frontend;
                }
                export function openMobileFileById(app, id) {
                    globalThis.__lvctOpenDocMock.openMobileCalls.push({ app, id });
                }
                export function openTab(params) {
                    globalThis.__lvctOpenDocMock.openTabCalls.push(params);
                    return Promise.resolve();
                }
            `;
            return {
                shortCircuit: true,
                url: "data:text/javascript," + encodeURIComponent(mockCode),
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

const { openSiYuanDocument } = await import("../src/libs/open-document.ts");
const mockApp = { id: "test-app" } as unknown as import("siyuan").App;

test("openSiYuanDocument：桌面端默认只传 docId 时，调用 openTab 且不附带 action", async () => {
    mockState.frontend = "desktop";
    mockState.openTabCalls = [];
    mockState.openMobileCalls = [];

    await openSiYuanDocument(mockApp, "20261101-doc001");

    assert.equal(mockState.openTabCalls.length, 1);
    assert.deepEqual(mockState.openTabCalls[0], {
        app: mockApp,
        doc: { id: "20261101-doc001" },
    });
    assert.equal(mockState.openMobileCalls.length, 0);
});

test("openSiYuanDocument：桌面端指定 targetBlockId 时，精确传子块并附带 cb-get-hl 高亮滚动 action", async () => {
    mockState.frontend = "desktop";
    mockState.openTabCalls = [];
    mockState.openMobileCalls = [];

    await openSiYuanDocument(mockApp, "20261101-doc001", {
        targetBlockId: "20261101-blk999",
    });

    assert.equal(mockState.openTabCalls.length, 1);
    assert.deepEqual(mockState.openTabCalls[0], {
        app: mockApp,
        doc: {
            id: "20261101-blk999",
            action: ["cb-get-hl", "cb-get-context"],
        },
    });
});

test("openSiYuanDocument：桌面端指定 highlight=true 时，向目标文档附带高亮 action", async () => {
    mockState.frontend = "desktop";
    mockState.openTabCalls = [];
    mockState.openMobileCalls = [];

    await openSiYuanDocument(mockApp, "20261101-doc001", {
        highlight: true,
    });

    assert.equal(mockState.openTabCalls.length, 1);
    assert.deepEqual(mockState.openTabCalls[0], {
        app: mockApp,
        doc: {
            id: "20261101-doc001",
            action: ["cb-get-hl", "cb-get-context"],
        },
    });
});

test("openSiYuanDocument：移动端调用 openMobileFileById，不调用 openTab", async () => {
    mockState.frontend = "mobile";
    mockState.openTabCalls = [];
    mockState.openMobileCalls = [];

    await openSiYuanDocument(mockApp, "20261101-doc001", {
        targetBlockId: "20261101-blk888",
    });

    assert.equal(mockState.openTabCalls.length, 0);
    assert.equal(mockState.openMobileCalls.length, 1);
    assert.deepEqual(mockState.openMobileCalls[0], {
        app: mockApp,
        id: "20261101-blk888",
    });
});
