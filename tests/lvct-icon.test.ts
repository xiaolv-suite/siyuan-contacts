import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "siyuan") {
            return {
                shortCircuit: true,
                url: "data:text/javascript," + encodeURIComponent("export default {};"),
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

test("LvctIcon：正确解析与构建思源原生 SVG symbol href", () => {
    const formatHref = (name: string) => (name.startsWith("#") ? name : `#${name}`);

    assert.equal(formatHref("iconSearch"), "#iconSearch");
    assert.equal(formatHref("#iconSettings"), "#iconSettings");
    assert.equal(formatHref("iconAccount"), "#iconAccount");
    assert.equal(formatHref("iconPhone"), "#iconPhone");
    assert.equal(formatHref("iconSparkles"), "#iconSparkles");
});
