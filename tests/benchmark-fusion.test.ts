import test from "node:test";
import assert from "node:assert/strict";

import { CADENCE_TIERS, computeWarmthStatus, computeRelationshipHealth } from "../src/domain/cadence.ts";
import {
    validatePersonOrigin,
    normalizePersonOriginStore,
    normalizePersonOriginStoreForWrite,
    PERSON_ORIGIN_STORAGE_KEY,
    PERSON_ORIGIN_STORE_VERSION,
    type PersonOrigin,
} from "../src/domain/person-origin.ts";
import { buildGraph } from "../src/domain/graph.ts";
import { applyPeopleFilters } from "../src/domain/people-filters.ts";
import { buildPreMeetingBrief, formatPreMeetingBriefText } from "../src/domain/pre-meeting-brief.ts";
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
    assert.ok(brief.taboos.some((t) => t.includes("避开前东家诉讼敏感话题")));
    assert.ok(brief.sharedNetwork.some((n) => n.includes("引荐人: 王伟")));
    assert.ok(brief.sharedNetwork.some((n) => n.includes("林知夏 (同场 4 次)")));

    const formattedText = formatPreMeetingBriefText(brief);
    assert.ok(formattedText.includes("⚡ 会前 30 秒破冰速览 · 陈予安"));
    assert.ok(formattedText.includes("💬 上次互动:"));
    assert.ok(formattedText.includes("🌱 初识溯源:"));
    assert.ok(formattedText.includes("❤️ 喜好习惯:"));
    assert.ok(formattedText.includes("⚠️ 禁忌雷区:"));
});
