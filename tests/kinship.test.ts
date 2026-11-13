import assert from "node:assert/strict";
import test from "node:test";
import {
    emptyKinshipStore,
    normalizeKinshipStore,
    normalizeKinshipStoreForWrite,
    addKinshipToStore,
    removeKinshipFromStore,
    groupKinshipByRole,
    type KinshipMemberItem,
} from "../src/domain/kinship.ts";

test("kinship domain：初始化、规整化与写前校验", () => {
    const empty = emptyKinshipStore();
    assert.equal(empty.schemaVersion, 1);
    assert.deepEqual(empty.kinships, {});

    // 容错读取
    const norm = normalizeKinshipStore({
        schemaVersion: 1,
        kinships: {
            "doc-1": [
                { id: "k1", personDocId: "doc-1", role: "spouse", name: "张夫人", relationLabel: "妻子" },
                { id: "", role: "unknown-role", name: "无DocId自动补全" },
                { id: "k-invalid", name: "" }, // 无名应丢弃
            ],
        },
    });

    assert.equal(norm.kinships["doc-1"].length, 2);
    assert.equal(norm.kinships["doc-1"][0].role, "spouse");
    assert.equal(norm.kinships["doc-1"][1].role, "relative", "未知角色回退为 relative");
    assert.equal(norm.kinships["doc-1"][1].personDocId, "doc-1", "缺省 personDocId 自动继承外层键");

    // 不支持的版本应拒绝
    assert.throws(() => {
        normalizeKinshipStoreForWrite({ schemaVersion: 99 });
    }, /亲属关系存储版本不支持/);
});

test("kinship domain：新增、更新、移除与层级分组", () => {
    let store = emptyKinshipStore();

    const wife: KinshipMemberItem = {
        id: "kin-1",
        personDocId: "doc-person-1",
        role: "spouse",
        name: "李娜",
        relationLabel: "妻子",
        birthYearOrDate: "1992",
        createdAt: 1000,
    };

    const son: KinshipMemberItem = {
        id: "kin-2",
        personDocId: "doc-person-1",
        role: "child",
        name: "张小宝",
        relationLabel: "长子",
        birthYearOrDate: "2020",
        createdAt: 2000,
    };

    const mom: KinshipMemberItem = {
        id: "kin-3",
        personDocId: "doc-person-1",
        role: "parent",
        name: "王老太",
        relationLabel: "母亲",
        createdAt: 3000,
    };

    // 1. 新增
    store = addKinshipToStore(store, wife);
    store = addKinshipToStore(store, son);
    store = addKinshipToStore(store, mom);
    assert.equal(store.kinships["doc-person-1"].length, 3);

    // 2. 层级分组
    const grouped = groupKinshipByRole(store.kinships["doc-person-1"]);
    assert.equal(grouped.spouse.length, 1);
    assert.equal(grouped.spouse[0].name, "李娜");
    assert.equal(grouped.child.length, 1);
    assert.equal(grouped.child[0].name, "张小宝");
    assert.equal(grouped.parent.length, 1);
    assert.equal(grouped.parent[0].name, "王老太");
    assert.equal(grouped.sibling.length, 0);

    // 3. 移除
    store = removeKinshipFromStore(store, "doc-person-1", "kin-2");
    assert.equal(store.kinships["doc-person-1"].length, 2);
    assert.equal(store.kinships["doc-person-1"].some((m) => m.name === "张小宝"), false);
});
