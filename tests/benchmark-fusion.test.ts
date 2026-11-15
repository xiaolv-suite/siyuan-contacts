import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { CADENCE_TIERS, computeWarmthStatus, computeRelationshipHealth } from "../src/domain/cadence.ts";
import {
    validatePersonOrigin,
    normalizePersonOriginStore,
    normalizePersonOriginStoreForWrite,
    PERSON_ORIGIN_STORAGE_KEY,
    PERSON_ORIGIN_STORE_VERSION,
    type PersonOrigin,
} from "../src/domain/person-origin.ts";
import { buildGraph, orderGraph } from "../src/domain/graph.ts";
import { graphRegistry } from "../src/domain/graph-query.ts";
import { applyPeopleFilters } from "../src/domain/people-filters.ts";
import { normalizeSavedViews } from "../src/domain/saved-views.ts";
import { buildPreMeetingBrief, formatPreMeetingBriefText } from "../src/domain/pre-meeting-brief.ts";
import { savePersonOrigin, loadPersonOrigin, mergePersonOriginStore } from "../src/data/person-origins.ts";
import type { ContactSummary } from "../src/domain/person.ts";

test("标杆融合 · 联络周期档位与关系温度状态 (Warm / Cooling / Overdue) 计算", () => {
    // 1. 档位预设完整性
    assert.equal(CADENCE_TIERS.length, 4);
    assert.deepEqual(CADENCE_TIERS.map((t) => t.days), [14, 30, 90, 180]);
    assert.equal(CADENCE_TIERS[0].key, "core");
    assert.equal(CADENCE_TIERS[1].key, "familiar");
    assert.equal(CADENCE_TIERS[2].key, "partner");
    assert.equal(CADENCE_TIERS[3].key, "evergreen");

    const now = 1700000000000;
    // 2. Warm 状态：近期互动且在周期内
    const healthWarm = computeRelationshipHealth({
        cadenceDays: 30,
        lastInteractionTime: now - 5 * 86400 * 1000,
        nowTime: now,
    });
    assert.equal(computeWarmthStatus(healthWarm), "warm");

    // 3. Cooling 状态：轻度逾期（1~13 天）或处于 cool 等级
    const healthCooling = computeRelationshipHealth({
        cadenceDays: 30,
        lastInteractionTime: now - 35 * 86400 * 1000,
        nowTime: now,
    });
    assert.equal(computeWarmthStatus(healthCooling), "cooling");

    // 4. Overdue 状态：严重逾期（>=14 天）或深度疏远 (cold) 或从未联系 (unknown)
    const healthOverdue = computeRelationshipHealth({
        cadenceDays: 30,
        lastInteractionTime: now - 50 * 86400 * 1000,
        nowTime: now,
    });
    assert.equal(computeWarmthStatus(healthOverdue), "overdue");

    const healthUnknown = computeRelationshipHealth({
        cadenceDays: 30,
        lastInteractionTime: null,
        nowTime: now,
    });
    assert.equal(computeWarmthStatus(healthUnknown), "overdue");

    // 5. Paused 状态：视为 warm（不打扰）
    const healthPaused = computeRelationshipHealth({
        cadenceDays: 30,
        lastInteractionTime: now - 100 * 86400 * 1000,
        paused: true,
        nowTime: now,
    });
    assert.equal(computeWarmthStatus(healthPaused), "warm");
});

test("标杆融合 · 初识溯源模型校验与存储规范化", () => {
    assert.equal(PERSON_ORIGIN_STORAGE_KEY, "person-origins.json");
    assert.equal(PERSON_ORIGIN_STORE_VERSION, 1);

    const docId1 = "20261031120000-abcdef1";
    const docId2 = "20261031120000-abcdef2";

    // 1. 合法对象校验
    const validOrigin: PersonOrigin = {
        personDocId: docId1,
        metAt: "2024年秋季行业峰会",
        introducedByDocId: docId2,
        preferences: "海鲜过敏、喜欢手冲浅烘",
    };
    assert.deepEqual(validatePersonOrigin(validOrigin), []);

    // 2. 引荐人不能为自身
    const selfIntroOrigin: PersonOrigin = {
        personDocId: docId1,
        introducedByDocId: docId1,
    };
    const errors = validatePersonOrigin(selfIntroOrigin);
    assert.ok(errors.some((e) => e.includes("自身")));

    // 3. 容错读取规范化
    const rawCorrupt = {
        schemaVersion: 1,
        origins: {
            [docId1]: {
                personDocId: docId1,
                metAt: " 创业路演 ",
                introducedByDocId: docId2,
            },
            invalid_id: { metAt: "foo" },
        },
    };
    const normalized = normalizePersonOriginStore(rawCorrupt);
    assert.equal(normalized.schemaVersion, 1);
    assert.equal(normalized.origins[docId1].metAt, "创业路演");
    assert.equal(normalized.origins[docId1].introducedByDocId, docId2);
    assert.equal(normalized.origins["invalid_id"], undefined);

    // 4. 写前严格校验
    const writeNormalized = normalizePersonOriginStoreForWrite({
        schemaVersion: 1,
        origins: {
            [docId1]: {
                personDocId: docId1,
                metAt: " 创业路演 ",
                introducedByDocId: docId2,
            },
        },
    });
    assert.equal(writeNormalized.origins[docId1].metAt, "创业路演");
});

test("标杆融合 · 引荐人链路自动在 Cytoscape 图谱中生成引荐边", () => {
    const docA = "20261031120000-aaaaaa1";
    const docB = "20261031120000-bbbbbb1";
    const docC = "20261031120000-cccccc1";

    const people: ContactSummary[] = [
        {
            docId: docA,
            itemId: "item-a",
            name: "张三（引荐人）",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "朋友",
            tags: [],
            relatedItemIds: [],
        },
        {
            docId: docB,
            itemId: "item-b",
            name: "李四（被引荐人）",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "同事",
            tags: [],
            relatedItemIds: [],
        },
        {
            docId: docC,
            itemId: "item-c",
            name: "王五（独立联系人）",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "客户",
            tags: [],
            relatedItemIds: [],
        },
    ];

    const origins: Record<string, PersonOrigin> = {
        [docB]: {
            personDocId: docB,
            metAt: "2023 行业沙龙",
            introducedByDocId: docA,
        },
    };

    const graph = buildGraph(people, origins);
    assert.equal(graph.nodes.length, 3);
    assert.equal(graph.edges.length, 1);

    const edge = graph.edges[0];
    assert.equal(edge.source, docA);
    assert.equal(edge.target, docB);
    assert.equal(edge.kind, "introducer");

    // 两端节点度数递增
    const nodeA = graph.nodes.find((n) => n.id === docA);
    const nodeB = graph.nodes.find((n) => n.id === docB);
    const nodeC = graph.nodes.find((n) => n.id === docC);
    assert.equal(nodeA?.degree, 1);
    assert.equal(nodeB?.degree, 1);
    assert.equal(nodeC?.degree, 0);
});

test("标杆融合 · 待问候 (overdue) 与渐冷 (cooling) 人脉筛选胶囊计算", () => {
    const docActive = "20261031120000-active1";
    const docOverdue = "20261031120000-overdu1";
    const docCooling = "20261031120000-coolin1";

    const people: ContactSummary[] = [
        {
            docId: docActive,
            itemId: "i-active",
            name: "常联好友",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "朋友",
            tags: [],
            relatedItemIds: [],
        },
        {
            docId: docCooling,
            itemId: "i-cooling",
            name: "渐冷伙伴",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "同事",
            tags: [],
            relatedItemIds: [],
        },
        {
            docId: docOverdue,
            itemId: "i-overdue",
            name: "超期未见朋友",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "朋友",
            tags: [],
            relatedItemIds: [],
        },
    ];

    const now = 1700000000000;
    const recent = {
        [docActive]: { occurredAt: now - 3 * 86400 * 1000, localDate: "2023-11-11" },
        [docCooling]: { occurredAt: now - 35 * 86400 * 1000, localDate: "2023-10-10" },
        [docOverdue]: { occurredAt: now - 65 * 86400 * 1000, localDate: "2023-09-10" },
    };

    // 1. 待问候筛选 (overdue)
    const overdueFiltered = applyPeopleFilters(
        people,
        recent,
        {
            tagMatch: "all",
            recentFrom: "",
            recentTo: "",
            neverContacted: false,
            profileGap: "",
            heatLevel: "overdue",
        },
        {},
        {},
        { defaultCadenceDays: 30, nowTime: now },
    );
    assert.equal(overdueFiltered.length, 2);
    assert.ok(overdueFiltered.some((p) => p.docId === docOverdue));
    assert.ok(overdueFiltered.some((p) => p.docId === docCooling));

    // 2. 渐冷筛选 (cooling)
    const coolingFiltered = applyPeopleFilters(
        people,
        recent,
        {
            tagMatch: "all",
            recentFrom: "",
            recentTo: "",
            neverContacted: false,
            profileGap: "",
            heatLevel: "cooling",
        },
        {},
        {},
        { defaultCadenceDays: 30, nowTime: now },
    );
    assert.equal(coolingFiltered.length, 2);

    // 3. 常温筛选 (warm)
    const warmFiltered = applyPeopleFilters(
        people,
        recent,
        {
            tagMatch: "all",
            recentFrom: "",
            recentTo: "",
            neverContacted: false,
            profileGap: "",
            heatLevel: "hot",
        },
        {},
        {},
        { defaultCadenceDays: 30, nowTime: now },
    );
    assert.equal(warmFiltered.length, 1);
    assert.equal(warmFiltered[0].docId, docActive);
});

test("标杆融合 · 会前 30 秒破冰速览卡 (Pre-Meeting Brief) 组装与格式化", () => {
    const docTarget = "20261031120000-target1";
    const person: ContactSummary = {
        docId: docTarget,
        itemId: "i-target",
        name: "陈予安",
        phone: "13800138000",
        email: "chen@example.com",
        wechat: "chen_ya",
        website: "",
        birthday: "1992-06-18",
        isLunar: false,
        group: "核心朋友",
        tags: ["架构师", "技术专家"],
        relatedItemIds: [],
    };

    const now = 1700000000000;
    const origin: PersonOrigin = {
        personDocId: docTarget,
        metAt: "2023年开源技术大会",
        introducedByDocId: "20261031120000-intro1",
        preferences: "喜欢浅烘手冲美式，不喝含糖饮料",
    };

    const brief = buildPreMeetingBrief({
        person,
        origin,
        socialPreferences: [
            {
                id: "spf-1",
                personDocId: docTarget,
                category: "dietary",
                content: "海鲜严重过敏",
                isTaboo: false,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: "spf-2",
                personDocId: docTarget,
                category: "taboos",
                content: "避开前东家诉讼敏感话题",
                isTaboo: true,
                createdAt: now,
                updatedAt: now,
            },
        ],
        timeline: [
            {
                eventId: "e-1",
                localDate: "2023-11-12",
                occurredAt: now - 2 * 86400 * 1000,
                note: "微信沟通思源插件架构与本地图谱性能优化",
                source: "manual",
                type: "chat",
                groupSize: 1,
            },
        ],
        facts: [
            { id: "f-1", category: "preference", date: "2023-11-10", text: "喜欢坐靠窗安静位" },
            { id: "f-2", category: "preference", isTaboo: true, date: "2023-11-10", text: "酒精过敏不饮酒" },
        ],
        coAttendance: [
            { name: "林知夏", count: 4 },
            { name: "许嘉", count: 2 },
        ],
        introducerName: "王伟",
        cadenceDays: 14,
        nowTime: now,
    });

    assert.equal(brief.personName, "陈予安");
    assert.ok(brief.lastMetText.includes("2023-11-12 (2天前)"));
    assert.ok(brief.originText.includes("初识于 2023年开源技术大会 · 由 王伟 引荐"));
    assert.ok(brief.dietAndPreferences.some((p) => p.includes("浅烘手冲")));
    assert.ok(brief.dietAndPreferences.some((p) => p.includes("海鲜严重过敏")));
    assert.ok(brief.dietAndPreferences.some((p) => p.includes("喜欢坐靠窗安静位")));
    assert.ok(brief.taboos.some((t) => t.includes("避开前东家诉讼敏感话题")));
    assert.ok(brief.taboos.some((t) => t.includes("酒精过敏不饮酒")));
    assert.ok(!brief.statusSummary.includes("健康度"), "会前速览不应展示无依据健康度分数");
    assert.ok(brief.sharedNetwork.some((n) => n.includes("引荐人: 王伟")));
    assert.ok(brief.sharedNetwork.some((n) => n.includes("林知夏 (同场 4 次)")));

    const formattedText = formatPreMeetingBriefText(brief);
    assert.ok(formattedText.includes("⚡ 会前 30 秒破冰速览 · 陈予安"));
    assert.ok(formattedText.includes("💬 上次互动:"));
    assert.ok(formattedText.includes("🌱 初识溯源:"));
    assert.ok(formattedText.includes("❤️ 喜好习惯:"));
    assert.ok(formattedText.includes("⚠️ 禁忌雷区:"));
});

test("BUG-01 回归 · orderGraph 与 graphRegistry 保留 introducer 有向引荐边原始方向（target < source 时不反转）", () => {
    // 被引荐人 docTarget 的字典序小于引荐人 docIntroducer
    const docTarget = "20260101000000-aaaaaaa";
    const docIntroducer = "20261231235959-zzzzzzz";

    const people: ContactSummary[] = [
        {
            docId: docTarget,
            itemId: "item-target",
            name: "被引荐人甲",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "朋友",
            tags: [],
            relatedItemIds: [],
        },
        {
            docId: docIntroducer,
            itemId: "item-introducer",
            name: "引荐人乙",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "朋友",
            tags: [],
            relatedItemIds: [],
        },
    ];

    const origins: Record<string, PersonOrigin> = {
        [docTarget]: {
            personDocId: docTarget,
            metAt: "技术沙龙",
            introducedByDocId: docIntroducer,
        },
    };

    const rawGraph = buildGraph(people, origins);
    const ordered = orderGraph(rawGraph);
    assert.equal(ordered.edges.length, 1);
    assert.equal(ordered.edges[0].kind, "introducer");
    assert.equal(ordered.edges[0].source, docIntroducer, "引荐边 source 必须保持为引荐人，不能被字典序反转");
    assert.equal(ordered.edges[0].target, docTarget, "引荐边 target 必须保持为被引荐人");

    const registry = graphRegistry({
        people,
        organizations: [],
        selfDocId: null,
        status: { roster: "verified", organizations: "verified", self: "verified" },
        errors: {},
        revision: 1,
        origins,
    });
    const introEdge = registry.graph.edges.find((e) => e.kind === "introducer");
    assert.ok(introEdge);
    assert.equal(introEdge.source, docIntroducer);
    assert.equal(introEdge.target, docTarget);
});

test("BUG-02 & BUG-04 回归 · 初识溯源首次空库写入、清空移除与 24 模块全要素迁移包往返", async () => {
    const storeMap = new Map<string, unknown>();
    const fakePlugin = {
        async loadData(key: string) {
            return storeMap.has(key) ? structuredClone(storeMap.get(key)) : null;
        },
        async saveData(key: string, data: unknown) {
            storeMap.set(key, typeof data === "string" ? JSON.parse(data) : structuredClone(data));
        },
    } as any;

    const docA = "20261031120000-persona";
    const docB = "20261031120000-personb";

    // 1. 首次空库（loadData 返回 null 或空串 ""）时 normalizePersonOriginStoreForWrite 与 savePersonOrigin 必须成功
    assert.deepEqual(normalizePersonOriginStoreForWrite(null), {
        schemaVersion: 1,
        origins: {},
    });
    assert.deepEqual(normalizePersonOriginStoreForWrite(""), {
        schemaVersion: 1,
        origins: {},
    });

    const saved = await savePersonOrigin(fakePlugin, {
        personDocId: docA,
        metAt: "2025春季峰会",
        introducedByDocId: docB,
        preferences: "常喝美式咖啡",
    });
    assert.equal(saved.metAt, "2025春季峰会");
    assert.equal(saved.introducedByDocId, docB);

    const readBack = await loadPersonOrigin(fakePlugin, docA);
    assert.ok(readBack);
    assert.equal(readBack.metAt, "2025春季峰会");

    // 2. 清空后移除记录
    await savePersonOrigin(fakePlugin, {
        personDocId: docA,
        metAt: "   ",
        introducedByDocId: "",
        preferences: "",
    });
    assert.equal(await loadPersonOrigin(fakePlugin, docA), null);

    // 3. mergePersonOriginStore 可无损恢复初识溯源记录并支持现状优先合并
    const mergeInitial = await mergePersonOriginStore(fakePlugin, {
        schemaVersion: 1,
        origins: {
            [docA]: {
                personDocId: docA,
                metAt: "2025春季峰会",
                introducedByDocId: docB,
                preferences: "常喝美式咖啡",
            },
        },
    });
    assert.equal(mergeInitial.merged, 1);

    const restored = await loadPersonOrigin(fakePlugin, docA);
    assert.ok(restored);
    assert.equal(restored.metAt, "2025春季峰会");
    assert.equal(restored.introducedByDocId, docB);
    assert.equal(restored.preferences, "常喝美式咖啡");

    // 4. 现状优先合并：已有部分字段时不覆盖，仅补齐缺失字段
    const mergeRes = await mergePersonOriginStore(fakePlugin, {
        schemaVersion: 1,
        origins: {
            [docA]: {
                personDocId: docA,
                metAt: "旧峰会不应覆盖",
                preferences: "旧偏好不应覆盖",
            },
        },
    });
    assert.equal(mergeRes.skipped, 1);
    const afterMerge = await loadPersonOrigin(fakePlugin, docA);
    assert.equal(afterMerge?.metAt, "2025春季峰会");
});

test("BUG-05 回归 · 已保存视图枚举白名单校验与全仓零 UTC 日期切片守门", () => {
    const views = normalizeSavedViews([
        {
            id: "v-valid",
            name: "待问候视图",
            query: {
                search: "",
                group: "",
                tags: [],
                tagMatch: "all",
                recentFrom: "",
                recentTo: "",
                neverContacted: false,
                sort: "recent",
                lifecycleStage: "close_ally",
                heatLevel: "overdue",
            },
        },
        {
            id: "v-invalid-enum",
            name: "脏枚举视图",
            query: {
                search: "",
                group: "",
                tags: [],
                tagMatch: "all",
                recentFrom: "",
                recentTo: "",
                neverContacted: false,
                sort: "name",
                lifecycleStage: "invalid_stage_xyz",
                heatLevel: "invalid_heat_xyz",
            },
        },
    ]);
    assert.equal(views.length, 2);
    assert.equal(views[0].query.lifecycleStage, "close_ally");
    assert.equal(views[0].query.heatLevel, "overdue");
    assert.equal(views[1].query.lifecycleStage, undefined, "非法 lifecycleStage 必须被过滤");
    assert.equal(views[1].query.heatLevel, undefined, "非法 heatLevel 必须被过滤");

    // 扫描 src/ 确保零 toISOString().slice(0, 10) 残留
    const srcRoot = path.resolve(import.meta.dirname, "../src");
    const walk = (dir: string): string[] => {
        const out: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) out.push(...walk(full));
            else if (/\.(ts|svelte)$/.test(entry.name)) out.push(full);
        }
        return out;
    };
    const offenders: string[] = [];
    for (const file of walk(srcRoot)) {
        const content = fs.readFileSync(file, "utf8");
        if (content.includes("toISOString().slice(0, 10)")) {
            offenders.push(path.relative(srcRoot, file));
        }
    }
    assert.deepEqual(offenders, [], `src/ 下禁止使用 UTC 日期切片 toISOString().slice(0, 10)：${offenders.join(", ")}`);
});

