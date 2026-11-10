import assert from "node:assert/strict";
import test from "node:test";
import {
    emptyLifecycleStore,
    getPersonLifecycle,
    getStageMeta,
    isValidStageKey,
    LIFECYCLE_STAGES,
    normalizeLifecycleStore,
    normalizeLifecycleStoreForWrite,
    updatePersonStage,
    batchUpdatePersonStages,
} from "../src/domain/lifecycle-stage.ts";

test("lifecycle-stage domain: 初始化与各阶段元信息完整性", () => {
    const store = emptyLifecycleStore();
    assert.equal(store.schemaVersion, 1);
    assert.deepEqual(store.records, {});

    assert.equal(LIFECYCLE_STAGES.length, 5);
    for (const stage of LIFECYCLE_STAGES) {
        assert.ok(isValidStageKey(stage.key));
        const meta = getStageMeta(stage.key);
        assert.equal(meta.key, stage.key);
        assert.ok(meta.label.length > 0);
        assert.ok(meta.suggestedCadenceDays > 0);
    }

    assert.equal(isValidStageKey("invalid_stage"), false);
    assert.equal(isValidStageKey(null), false);
    // 非法 key 降级为 acquaintance
    assert.equal(getStageMeta("invalid").key, "acquaintance");
});

test("lifecycle-stage domain: normalizeLifecycleStore 容错规整化", () => {
    const raw = {
        schemaVersion: 1,
        records: {
            "doc-1": {
                personDocId: "doc-1",
                currentStage: "collaboration",
                history: [
                    {
                        stage: "collaboration",
                        changedAt: "2026-10-01",
                        note: "签约合作",
                        timestamp: 1000,
                    },
                    {
                        // 缺少合法 stage，自动回退
                        stage: "invalid",
                        changedAt: "2026-09-01",
                    },
                ],
                updatedAt: 2000,
            },
            "doc-empty": null,
        },
    };

    const norm = normalizeLifecycleStore(raw);
    assert.equal(norm.schemaVersion, 1);
    assert.ok(norm.records["doc-1"]);
    assert.equal(norm.records["doc-1"]?.currentStage, "collaboration");
    assert.equal(norm.records["doc-1"]?.history.length, 2);
    assert.equal(norm.records["doc-1"]?.history[0]?.note, "签约合作");
    assert.equal(norm.records["doc-empty"], undefined);
});

test("lifecycle-stage domain: normalizeLifecycleStoreForWrite 检查版本冲突", () => {
    assert.throws(
        () =>
            normalizeLifecycleStoreForWrite({
                schemaVersion: 88,
                records: {},
            }),
        /交往生命周期存储版本不支持/
    );

    const ok = normalizeLifecycleStoreForWrite({
        schemaVersion: 1,
        records: {},
    });
    assert.equal(ok.schemaVersion, 1);
});

test("lifecycle-stage domain: getPersonLifecycle 与 updatePersonStage 演进变迁", () => {
    let store = emptyLifecycleStore();
    // 默认初相识
    const initial = getPersonLifecycle(store, "doc-alice");
    assert.equal(initial.currentStage, "acquaintance");
    assert.equal(initial.history.length, 0);

    // 推进阶段：进入常交流
    store = updatePersonStage(store, "doc-alice", "connection", "2026-10-15", "初次深谈，有共同创业经历");
    const step1 = getPersonLifecycle(store, "doc-alice");
    assert.equal(step1.currentStage, "connection");
    assert.equal(step1.history.length, 1);
    assert.equal(step1.history[0]?.stage, "connection");
    assert.equal(step1.history[0]?.changedAt, "2026-10-15");
    assert.equal(step1.history[0]?.note, "初次深谈，有共同创业经历");

    // 再次推进：进入共合作
    store = updatePersonStage(store, "doc-alice", "collaboration", "2026-10-25", "联合立项");
    const step2 = getPersonLifecycle(store, "doc-alice");
    assert.equal(step2.currentStage, "collaboration");
    assert.equal(step2.history.length, 2);
    assert.equal(step2.history[0]?.stage, "collaboration");
    assert.equal(step2.history[1]?.stage, "connection");
});

test("lifecycle-stage domain: batchUpdatePersonStages 批量更新多位联系人阶段", () => {
    let store = emptyLifecycleStore();
    const docIds = ["doc-u1", "doc-u2", "doc-u3"];

    const { nextStore, updatedCount } = batchUpdatePersonStages(
        store,
        docIds,
        "collaboration",
        "2026-10-29",
        "AI峰会达成战略合作",
    );

    assert.equal(updatedCount, 3);
    for (const id of docIds) {
        const record = getPersonLifecycle(nextStore, id);
        assert.equal(record.currentStage, "collaboration");
        assert.equal(record.history.length, 1);
        assert.equal(record.history[0]?.stage, "collaboration");
        assert.equal(record.history[0]?.note, "AI峰会达成战略合作");
    }
});
