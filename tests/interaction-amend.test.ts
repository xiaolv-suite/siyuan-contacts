import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { Plugin } from "siyuan";

// src/data/interactions.ts 使用无扩展名相对导入（vite 构建正常）；node --test 直跑需 resolve 钩子补 .ts。
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "siyuan") return { shortCircuit: true, url: "data:text/javascript," + encodeURIComponent("export default {};export function fetchPost(){}export function fetchSyncPost(){}") };
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
process.on("exit", () => hooks.deregister());

const { amendEvent, appendEvent, emptyStore, normalizeInteractionStore, buildTimeline } = await import("../src/domain/interactions.ts");
type InteractionEvent = import("../src/domain/interactions.ts").InteractionEvent;
const { amendInteraction, loadInteractionStoreStrict, recordInteractionWithResult } = await import("../src/data/interactions.ts");
const { mergeInteractionBackup } = await import("../src/domain/interaction-backup.ts");

const DOC = "20261031090000-abcdefg";
const OTHER = "20261031090000-hijklmn";

function event(partial: Partial<InteractionEvent>): InteractionEvent {
    const occurredAt = new Date(2026, 9, 20, 15, 30, 0).getTime();
    return { id: "e1", personDocId: DOC, occurredAt, localDate: "2026-10-20", source: "manual", type: "meeting", note: "聊了新项目", ...partial };
}

function memoryPlugin(): { plugin: Plugin; memory: Map<string, unknown> } {
    const memory = new Map<string, unknown>();
    const plugin = {
        async loadData(key: string) { return memory.has(key) ? structuredClone(memory.get(key)) : null; },
        async saveData(key: string, value: unknown) { memory.set(key, structuredClone(value)); },
    } as unknown as Plugin;
    return { plugin, memory };
}

test("D-0040 互动修改：墓碑旧事件并追加修正事件，保留来源与场合标识", () => {
    const store = appendEvent(emptyStore(), event({ source: "diary", externalRef: "block:20261020100000-aaaaaaa" }));
    const { store: next, event: amended } = amendEvent(store, "e1", { note: "  改成：聊了预算  ", type: "call" }, "e2");
    assert.deepEqual(next.tombstones, ["e1"]);
    assert.equal(next.events.length, 1);
    assert.equal(amended.id, "e2");
    assert.equal(amended.note, "改成：聊了预算");
    assert.equal(amended.type, "call");
    assert.equal(amended.source, "diary");
    assert.equal(amended.externalRef, "block:20261020100000-aaaaaaa");
    assert.equal(amended.occurredAt, store.events[0].occurredAt, "日期未变时保留原时刻");
    // 同步重放旧事件不会复活旧内容
    assert.equal(appendEvent(next, store.events[0]), next);
});

test("D-0040 互动修改：改日期沿用原时分秒，非法日期与缺失事件明确报错", () => {
    const store = appendEvent(emptyStore(), event({}));
    const { event: moved } = amendEvent(store, "e1", { localDate: "2026-10-18" }, "e2");
    const at = new Date(moved.occurredAt);
    assert.equal(moved.localDate, "2026-10-18");
    assert.deepEqual([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()], [2026, 9, 18, 15, 30]);
    assert.equal(moved.note, "聊了新项目", "未改的字段保持原值");
    assert.throws(() => amendEvent(store, "e1", { localDate: "2026-02-30" }, "e2"), /日期无效/);
    assert.throws(() => amendEvent(store, "missing", { note: "x" }, "e2"), /已不存在/);
    assert.throws(() => amendEvent(store, "e1", { note: "x" }, "e1"), /新标识无效/);
    assert.throws(() => amendEvent(store, "e1", { type: "bogus" as never }, "e2"), /类型无效/);
});

test("D-0040 互动修改：清空内容后不保留 note 字段，时间线按新日期排序", () => {
    let store = appendEvent(emptyStore(), event({}));
    store = appendEvent(store, event({ id: "e3", localDate: "2026-10-25", occurredAt: new Date(2026, 9, 25, 9).getTime(), note: "后一次" }));
    const { store: next, event: amended } = amendEvent(store, "e1", { note: "   ", localDate: "2026-10-28" }, "e2");
    assert.equal("note" in amended, false);
    assert.deepEqual(buildTimeline(next.events, DOC).map((item) => item.eventId), ["e2", "e3"]);
    assert.deepEqual(normalizeInteractionStore(next).events.map((item) => item.id).sort(), ["e2", "e3"]);
});

test("D-0040 互动修改：迁移合并旧备份不会复活被修改前的事件", () => {
    const original = appendEvent(emptyStore(), event({}));
    const { store: amended } = amendEvent(original, "e1", { note: "修正后" }, "e2");
    const merged = mergeInteractionBackup(amended, original);
    assert.deepEqual(merged.store.events.map((item) => item.id), ["e2"]);
});

test("D-0040 互动修改数据层：锁内修改写后回读，归属不符拒绝且零写入", async () => {
    const { plugin } = memoryPlugin();
    const { store } = await recordInteractionWithResult(plugin, { personDocId: DOC, note: "初次见面", type: "meeting" });
    const eventId = store.events[0].id;

    await assert.rejects(amendInteraction(plugin, eventId, OTHER, { note: "篡改" }), /不属于当前人物/);
    assert.equal((await loadInteractionStoreStrict(plugin)).events[0].note, "初次见面", "归属不符零写入");

    const { event: amended } = await amendInteraction(plugin, eventId, DOC, { note: "初次见面，聊了合作" });
    const reloaded = await loadInteractionStoreStrict(plugin);
    assert.deepEqual(reloaded.events.map((item) => item.id), [amended.id]);
    assert.deepEqual(reloaded.tombstones, [eventId]);
    assert.equal(reloaded.events[0].note, "初次见面，聊了合作");

    await assert.rejects(amendInteraction(plugin, eventId, DOC, { note: "再改旧的" }), /已不存在/);
});
