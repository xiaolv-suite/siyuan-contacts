import assert from "node:assert/strict";
import test from "node:test";
import {
    addScratchpadItem,
    emptyScratchpadStore,
    isValidScratchpadColor,
    newScratchpadId,
    normalizeScratchpadStore,
    normalizeScratchpadStoreForWrite,
    removeScratchpadItem,
    sortScratchpadItems,
    updateScratchpadItem,
    type PersonScratchpadItem,
} from "../src/domain/person-scratchpad.ts";

test("person-scratchpad domain: newScratchpadId 与 emptyScratchpadStore", () => {
    const id1 = newScratchpadId();
    const id2 = newScratchpadId();
    assert.ok(id1.startsWith("scb-"));
    assert.ok(id2.startsWith("scb-"));
    assert.notEqual(id1, id2);

    const store = emptyScratchpadStore();
    assert.equal(store.schemaVersion, 1);
    assert.deepEqual(store.notes, {});
});

test("person-scratchpad domain: 颜色类型校验与排序规则", () => {
    assert.equal(isValidScratchpadColor("default"), true);
    assert.equal(isValidScratchpadColor("warm"), true);
    assert.equal(isValidScratchpadColor("blue"), true);
    assert.equal(isValidScratchpadColor("green"), true);
    assert.equal(isValidScratchpadColor("purple"), true);
    assert.equal(isValidScratchpadColor("other"), false);

    const items: PersonScratchpadItem[] = [
        { id: "1", personDocId: "doc-1", content: "普通便签1", pinned: false, color: "default", createdAt: 1000, updatedAt: 1000 },
        { id: "2", personDocId: "doc-1", content: "置顶便签", pinned: true, color: "warm", createdAt: 500, updatedAt: 500 },
        { id: "3", personDocId: "doc-1", content: "普通便签2", pinned: false, color: "blue", createdAt: 2000, updatedAt: 2000 },
    ];
    const sorted = sortScratchpadItems(items);
    assert.equal(sorted[0]?.id, "2"); // pinned 置顶
    assert.equal(sorted[1]?.id, "3"); // 未置顶按 updatedAt 倒序
    assert.equal(sorted[2]?.id, "1");
});

test("person-scratchpad domain: normalizeScratchpadStore 规整化与版本校验", () => {
    const raw = {
        schemaVersion: 1,
        notes: {
            "doc-1": [
                { id: "scb-1", personDocId: "doc-1", content: "临时备忘", pinned: false, color: "warm", createdAt: 1000, updatedAt: 1000 },
                { id: "", content: "空ID自动补全" },
                { id: "bad", content: "   " }, // 空内容丢弃
                null,
            ],
            "doc-empty": [],
        },
    };

    const norm = normalizeScratchpadStore(raw);
    assert.equal(norm.schemaVersion, 1);
    assert.ok(norm.notes["doc-1"]);
    assert.equal(norm.notes["doc-1"]?.length, 2);
    assert.equal(norm.notes["doc-empty"], undefined);

    assert.throws(
        () => normalizeScratchpadStoreForWrite({ schemaVersion: 99, notes: {} }),
        /速记便签存储版本不支持/
    );
});

test("person-scratchpad domain: addScratchpadItem、updateScratchpadItem 与 removeScratchpadItem", () => {
    let store = emptyScratchpadStore();
    const note1: PersonScratchpadItem = {
        id: "scb-01",
        personDocId: "doc-alice",
        content: "推荐了一本《思考快与慢》",
        pinned: false,
        color: "warm",
        createdAt: 1000,
        updatedAt: 1000,
    };
    store = addScratchpadItem(store, note1);
    assert.equal(store.notes["doc-alice"]?.length, 1);

    // 标记置顶
    store = updateScratchpadItem(store, "doc-alice", "scb-01", { pinned: true });
    assert.equal(store.notes["doc-alice"]?.[0]?.pinned, true);

    // 移除便签
    store = removeScratchpadItem(store, "doc-alice", "scb-01");
    assert.equal(store.notes["doc-alice"], undefined);
});
