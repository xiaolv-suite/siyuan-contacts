import assert from "node:assert/strict";
import test from "node:test";
import {
    addPromiseToStore,
    emptyPromisesStore,
    isValidPromiseDirection,
    isValidPromiseStatus,
    newPromiseId,
    normalizePromisesStore,
    normalizePromisesStoreForWrite,
    type PersonPromiseItem,
    removePromiseFromStore,
    updatePromiseInStore,
} from "../src/domain/promises.ts";

test("promises domain：newPromiseId 与 emptyPromisesStore", () => {
    const id1 = newPromiseId();
    const id2 = newPromiseId();
    assert.equal(id1.startsWith("prm-"), true);
    assert.equal(id2.startsWith("prm-"), true);
    assert.notEqual(id1, id2);

    const store = emptyPromisesStore();
    assert.equal(store.schemaVersion, 1);
    assert.deepEqual(store.promises, {});
});

test("promises domain：方向与状态有效性校验", () => {
    assert.equal(isValidPromiseDirection("i_promised"), true);
    assert.equal(isValidPromiseDirection("they_promised"), true);
    assert.equal(isValidPromiseDirection("unknown"), false);
    assert.equal(isValidPromiseDirection(null), false);

    assert.equal(isValidPromiseStatus("pending"), true);
    assert.equal(isValidPromiseStatus("fulfilled"), true);
    assert.equal(isValidPromiseStatus("broken"), true);
    assert.equal(isValidPromiseStatus("other"), false);
});

test("promises domain：normalizePromisesStore 容错规整化", () => {
    const raw = {
        schemaVersion: 1,
        promises: {
            "doc-1": [
                {
                    id: "prm-1",
                    personDocId: "doc-1",
                    direction: "i_promised",
                    title: "引荐专家",
                    promisedOn: "2026-10-01",
                    dueOn: "2026-10-15",
                    status: "pending",
                    createdAt: 1000,
                    updatedAt: 1000,
                },
                {
                    // 缺少 title
                    id: "prm-invalid",
                    direction: "i_promised",
                },
                null,
            ],
            "doc-empty": [],
        },
    };

    const normalized = normalizePromisesStore(raw);
    assert.equal(normalized.schemaVersion, 1);
    assert.ok(normalized.promises["doc-1"]);
    assert.equal(normalized.promises["doc-1"]?.length, 1);
    assert.equal(normalized.promises["doc-1"]?.[0]?.title, "引荐专家");
    assert.equal(normalized.promises["doc-empty"], undefined);
});

test("promises domain：normalizePromisesStoreForWrite 检查版本冲突", () => {
    assert.throws(
        () =>
            normalizePromisesStoreForWrite({
                schemaVersion: 99,
                promises: {},
            }),
        /信诺存储版本不支持/
    );

    const ok = normalizePromisesStoreForWrite({
        schemaVersion: 1,
        promises: {},
    });
    assert.equal(ok.schemaVersion, 1);
});

test("promises domain：addPromiseToStore 添加并置顶承诺项，重复ID则覆盖更新", () => {
    let store = emptyPromisesStore();
    const p1: PersonPromiseItem = {
        id: "prm-1",
        personDocId: "doc-alice",
        direction: "i_promised",
        title: "赠送思源定制键帽",
        promisedOn: "2026-10-20",
        status: "pending",
        createdAt: 1000,
        updatedAt: 1000,
    };
    const p2: PersonPromiseItem = {
        id: "prm-2",
        personDocId: "doc-alice",
        direction: "they_promised",
        title: "反馈内测体验",
        promisedOn: "2026-10-22",
        status: "pending",
        createdAt: 2000,
        updatedAt: 2000,
    };

    store = addPromiseToStore(store, p1);
    assert.equal(store.promises["doc-alice"]?.length, 1);

    store = addPromiseToStore(store, p2);
    assert.equal(store.promises["doc-alice"]?.length, 2);
    // 新加入的置顶
    assert.equal(store.promises["doc-alice"]?.[0]?.id, "prm-2");

    // 再次添加相同ID则覆盖
    const p1Updated: PersonPromiseItem = {
        ...p1,
        status: "fulfilled",
        fulfilledOn: "2026-10-25",
    };
    store = addPromiseToStore(store, p1Updated);
    assert.equal(store.promises["doc-alice"]?.length, 2);
    const found = store.promises["doc-alice"]?.find((p) => p.id === "prm-1");
    assert.equal(found?.status, "fulfilled");
    assert.equal(found?.fulfilledOn, "2026-10-25");
});

test("promises domain：updatePromiseInStore 部分更新承诺属性并刷新 updatedAt", () => {
    let store = emptyPromisesStore();
    const p: PersonPromiseItem = {
        id: "prm-10",
        personDocId: "doc-bob",
        direction: "i_promised",
        title: "发送合作方案",
        promisedOn: "2026-10-20",
        status: "pending",
        createdAt: 1000,
        updatedAt: 1000,
    };
    store = addPromiseToStore(store, p);

    store = updatePromiseInStore(store, "doc-bob", "prm-10", {
        status: "fulfilled",
        fulfilledOn: "2026-10-28",
    });

    const target = store.promises["doc-bob"]?.[0];
    assert.equal(target?.status, "fulfilled");
    assert.equal(target?.fulfilledOn, "2026-10-28");
    assert.ok(target?.updatedAt && target.updatedAt > 1000);
});

test("promises domain：removePromiseFromStore 移除指定承诺，清空时清理键值", () => {
    let store = emptyPromisesStore();
    const p: PersonPromiseItem = {
        id: "prm-99",
        personDocId: "doc-carol",
        direction: "they_promised",
        title: "借阅图书",
        promisedOn: "2026-10-10",
        status: "pending",
        createdAt: 1000,
        updatedAt: 1000,
    };
    store = addPromiseToStore(store, p);
    assert.ok(store.promises["doc-carol"]);

    store = removePromiseFromStore(store, "doc-carol", "prm-99");
    assert.equal(store.promises["doc-carol"], undefined);
});
