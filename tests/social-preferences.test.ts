import assert from "node:assert/strict";
import test from "node:test";
import {
    addSocialPreference,
    emptySocialPreferencesStore,
    getCategoryMeta,
    groupPreferencesByCategory,
    isValidCategory,
    newSocialPreferenceId,
    normalizeSocialPreferencesStore,
    normalizeSocialPreferencesStoreForWrite,
    removeSocialPreference,
    SOCIAL_PREFERENCE_CATEGORIES,
    updateSocialPreference,
    extractPreferenceMicroTags,
    type PersonSocialPreferenceItem,
} from "../src/domain/social-preferences.ts";

test("social-preferences domain: newSocialPreferenceId 与分类元信息", () => {
    const id1 = newSocialPreferenceId();
    const id2 = newSocialPreferenceId();
    assert.ok(id1.startsWith("spf-"));
    assert.ok(id2.startsWith("spf-"));
    assert.notEqual(id1, id2);

    assert.equal(SOCIAL_PREFERENCE_CATEGORIES.length, 4);
    for (const cat of SOCIAL_PREFERENCE_CATEGORIES) {
        assert.ok(isValidCategory(cat.key));
        const meta = getCategoryMeta(cat.key);
        assert.equal(meta.key, cat.key);
        assert.ok(meta.label.length > 0);
        assert.ok(meta.placeholder.length > 0);
    }

    assert.equal(isValidCategory("invalid"), false);
    assert.equal(getCategoryMeta("other").key, "dietary"); // 降级为 dietary
});

test("social-preferences domain: normalizeSocialPreferencesStore 规整化与版本校验", () => {
    const raw = {
        schemaVersion: 1,
        preferences: {
            "doc-1": [
                { id: "spf-1", personDocId: "doc-1", category: "dietary", content: "海鲜严重过敏", isTaboo: true, createdAt: 1000, updatedAt: 1000 },
                { id: "", content: "自动补全ID" },
                { id: "invalid", content: "   " }, // 空白丢弃
                null,
            ],
            "doc-empty": [],
        },
    };

    const norm = normalizeSocialPreferencesStore(raw);
    assert.equal(norm.schemaVersion, 1);
    assert.ok(norm.preferences["doc-1"]);
    assert.equal(norm.preferences["doc-1"]?.length, 2);
    assert.equal(norm.preferences["doc-1"]?.[0]?.content, "海鲜严重过敏");
    assert.equal(norm.preferences["doc-1"]?.[0]?.isTaboo, true);
    assert.equal(norm.preferences["doc-empty"], undefined);

    assert.throws(
        () => normalizeSocialPreferencesStoreForWrite({ schemaVersion: 99, preferences: {} }),
        /社交偏好与忌口存储版本不支持/
    );
});

test("social-preferences domain: CRUD 操作与按类别分组", () => {
    let store = emptySocialPreferencesStore();
    const item1: PersonSocialPreferenceItem = {
        id: "p1",
        personDocId: "doc-alice",
        category: "dietary",
        content: "不吃香菜",
        isTaboo: false,
        createdAt: 1000,
        updatedAt: 1000,
    };
    const item2: PersonSocialPreferenceItem = {
        id: "p2",
        personDocId: "doc-alice",
        category: "taboos",
        content: "切勿提及前合伙人",
        isTaboo: true,
        createdAt: 2000,
        updatedAt: 2000,
    };
    const item3: PersonSocialPreferenceItem = {
        id: "p3",
        personDocId: "doc-alice",
        category: "beverage",
        content: "偏好冰美式不加糖",
        isTaboo: false,
        createdAt: 3000,
        updatedAt: 3000,
    };

    store = addSocialPreference(store, item1);
    store = addSocialPreference(store, item2);
    store = addSocialPreference(store, item3);
    assert.equal(store.preferences["doc-alice"]?.length, 3);

    const grouped = groupPreferencesByCategory(store.preferences["doc-alice"] ?? []);
    assert.equal(grouped.dietary.length, 1);
    assert.equal(grouped.dietary[0]?.content, "不吃香菜");
    assert.equal(grouped.taboos.length, 1);
    assert.equal(grouped.taboos[0]?.content, "切勿提及前合伙人");
    assert.equal(grouped.beverage.length, 1);
    assert.equal(grouped.habits.length, 0);

    // 更新内容与红线标记
    store = updateSocialPreference(store, "doc-alice", "p1", { isTaboo: true, content: "严重忌口：香菜" });
    const updated = store.preferences["doc-alice"]?.find((p) => p.id === "p1");
    assert.equal(updated?.isTaboo, true);
    assert.equal(updated?.content, "严重忌口：香菜");

    // 移除项目
    store = removeSocialPreference(store, "doc-alice", "p1");
    assert.equal(store.preferences["doc-alice"]?.length, 2);
    assert.equal(store.preferences["doc-alice"]?.some((p) => p.id === "p1"), false);
});

test("social-preferences domain: extractPreferenceMicroTags 优先红线禁忌并截取微标签", () => {
    const items: PersonSocialPreferenceItem[] = [
        { id: "1", personDocId: "d1", category: "habits", content: "喜上午开会", isTaboo: false, createdAt: 1, updatedAt: 1 },
        { id: "2", personDocId: "d1", category: "taboos", content: "严禁提及某项目", isTaboo: true, createdAt: 2, updatedAt: 2 },
        { id: "3", personDocId: "d1", category: "dietary", content: "海鲜严重过敏", isTaboo: true, createdAt: 3, updatedAt: 3 },
        { id: "4", personDocId: "d1", category: "beverage", content: "喜冰美式", isTaboo: false, createdAt: 4, updatedAt: 4 },
        { id: "5", personDocId: "d1", category: "dietary", content: "偏好清淡粤菜", isTaboo: false, createdAt: 5, updatedAt: 5 },
    ];

    const tags = extractPreferenceMicroTags(items, 3);
    assert.equal(tags.length, 3);

    // 优先排布红线禁忌 (id 2, 3)
    assert.equal(tags[0].isTaboo, true);
    assert.equal(tags[0].icon, "🚫");
    assert.equal(tags[0].text, "严禁提及某项目");

    assert.equal(tags[1].isTaboo, true);
    assert.equal(tags[1].icon, "🚫");
    assert.equal(tags[1].text, "海鲜严重过敏");

    // 剩余普通项
    assert.equal(tags[2].isTaboo, false);
    assert.equal(tags[2].text, "喜上午开会");
});
