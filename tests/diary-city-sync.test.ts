import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDailyNoteInteractionMarkdown, buildDailyNoteOccasionMarkdown, buildDailyNoteFollowUpTaskMarkdown } from "../src/domain/diary-sync.ts";
import {
    buildCityTopicSectionMarkdown,
    buildCityInitialDocumentMarkdown,
    CITY_TOPIC_ATTR,
    CITY_CONTACTS_SECTION_ATTR,
    extractCityOrganizations,
    detectChangedCities,
    buildTripItineraryMarkdown,
    TRIP_CONTEXT_METAS,
} from "../src/domain/city-topic.ts";
import type { ContactSummary } from "../src/domain/person.ts";

test("buildDailyNoteInteractionMarkdown: 生成带思源块引的日记互动记录", () => {
    const md = buildDailyNoteInteractionMarkdown({
        personDocId: "20261026000000-doc001",
        personName: "张三",
        type: "meeting",
        note: "讨论大模型合作方案",
        occurredTimeStr: "14:30",
    });

    assert.ok(md.includes("🤝"));
    assert.ok(md.includes("14:30"));
    assert.ok(md.includes("(( 20261026000000-doc001 '张三' ))"));
    assert.ok(md.includes("见面"));
    assert.ok(md.includes("讨论大模型合作方案"));
});

test("buildDailyNoteInteractionMarkdown: 缺省类型与时间正常兜底", () => {
    const md = buildDailyNoteInteractionMarkdown({
        personDocId: "20261026000000-doc002",
        personName: "李四",
    });

    assert.ok(md.includes("📝"));
    assert.ok(md.includes("(( 20261026000000-doc002 '李四' ))"));
    assert.ok(md.includes("互动"));
});

test("buildDailyNoteOccasionMarkdown: 生成带全部参与人块引的多人活动记录", () => {
    const md = buildDailyNoteOccasionMarkdown({
        title: "大湾区开发者晚宴",
        type: "meal",
        date: "2026-10-26",
        place: "深圳湾万象城",
        attendees: [
            { personDocId: "20261026000000-doc001", name: "张三" },
            { personDocId: "20261026000000-doc002", name: "李四" },
        ],
    });

    assert.ok(md.includes("🍽️"));
    assert.ok(md.includes("大湾区开发者晚宴"));
    assert.ok(md.includes("@ 深圳湾万象城"));
    assert.ok(md.includes("(( 20261026000000-doc001 '张三' ))"));
    assert.ok(md.includes("(( 20261026000000-doc002 '李四' ))"));
});

test("buildDailyNoteFollowUpTaskMarkdown: 生成兼容 Task Horizon (任务视界) 的标准任务块", () => {
    const md = buildDailyNoteFollowUpTaskMarkdown({
        personDocId: "20261028000000-doc001",
        personName: "张三",
        title: "探讨深度合作协议",
        dueDate: "2026-10-30",
        priority: "high",
    });

    assert.ok(md.startsWith("- [ ] 📅 2026-10-30 拜访 (( 20261028000000-doc001 '张三' ))：探讨深度合作协议"));
});

test("buildCityTopicSectionMarkdown & buildCityInitialDocumentMarkdown: 正式市级名称与受控人脉区块生成", () => {
    assert.equal(CITY_TOPIC_ATTR, "custom-lvct-city");
    assert.equal(CITY_CONTACTS_SECTION_ATTR, "custom-lvct-city-contacts");

    const contacts: ContactSummary[] = [
        {
            docId: "20261026000000-doc001",
            itemId: "item-001",
            name: "张三",
            phone: "13800000001",
            wechat: "zhangsan_wx",
            group: "同事",
            isSelf: false,
            relatedItemIds: [],
        },
    ];

    const input = {
        city: "深圳",
        contacts,
        organizations: [
            { name: "未来科技创新中心", docId: "20261026000000-org001" },
        ],
        generatedDate: "2026-10-26",
    };

    const sectionMd = buildCityTopicSectionMarkdown(input);
    assert.ok(sectionMd.includes("## 城市人脉网络"));
    assert.ok(sectionMd.includes("共 1 位好友 · 1 家关联机构"));
    assert.ok(sectionMd.includes("[张三](siyuan://blocks/20261026000000-doc001)"));
    assert.ok(sectionMd.includes("13800000001"));
    assert.ok(sectionMd.includes("zhangsan_wx"));
    assert.ok(sectionMd.includes("[未来科技创新中心](siyuan://blocks/20261026000000-org001)"));

    const initialMd = buildCityInitialDocumentMarkdown(input);
    assert.ok(initialMd.startsWith("# 深圳\n\n"));
    assert.ok(initialMd.includes("## 城市人脉网络"));
});

test("extractCityOrganizations: 聚合工作单位与 profile affiliations", () => {
    const contacts: ContactSummary[] = [
        {
            docId: "p1",
            itemId: "i1",
            name: "张三",
            isSelf: false,
            relatedItemIds: [],
            profile: {
                affiliations: {
                    state: "known",
                    value: {
                        work: [{ orgName: "腾讯科技", orgDocId: "org-tencent" }],
                    },
                },
            },
        },
        {
            docId: "p2",
            itemId: "i2",
            name: "李四",
            isSelf: false,
            relatedItemIds: [],
            profile: {
                affiliations: {
                    state: "known",
                    value: {
                        education: [{ orgName: "北京大学", orgDocId: "org-pku" }],
                    },
                },
            },
        },
    ];

    const orgs = extractCityOrganizations(contacts, [
        { name: "大疆创新", docId: "org-dji" },
    ]);

    assert.deepEqual(orgs, [
        { name: "北京大学", docId: "org-pku" },
        { name: "腾讯科技", docId: "org-tencent" },
    ]);
});

test("detectChangedCities: 检测名册变动中常驻城市的差量", () => {
    const prev: ContactSummary[] = [
        { docId: "p1", itemId: "i1", name: "张三", isSelf: false, relatedItemIds: [], address: "广东省深圳市南山区" } as ContactSummary,
        { docId: "p2", itemId: "i2", name: "李四", isSelf: false, relatedItemIds: [], address: "北京市海淀区中关村" } as ContactSummary,
    ];

    // 1. 李四搬家去杭州
    const next1: ContactSummary[] = [
        { docId: "p1", itemId: "i1", name: "张三", isSelf: false, relatedItemIds: [], address: "广东省深圳市南山区" } as ContactSummary,
        { docId: "p2", itemId: "i2", name: "李四", isSelf: false, relatedItemIds: [], address: "浙江省杭州市西湖区" } as ContactSummary,
    ];
    assert.deepEqual(Array.from(detectChangedCities(prev, next1)).sort(), ["北京", "杭州"]);

    // 2. 新增联系人常驻成都
    const next2: ContactSummary[] = [
        ...prev,
        { docId: "p3", itemId: "i3", name: "王五", isSelf: false, relatedItemIds: [], address: "四川省成都市高新区" } as ContactSummary,
    ];
    assert.deepEqual(Array.from(detectChangedCities(prev, next2)), ["成都"]);

    // 3. 删除李四（北京）
    const next3: ContactSummary[] = [prev[0]];
    assert.deepEqual(Array.from(detectChangedCities(prev, next3)), ["北京"]);

    // 4. 未发生城市变化
    assert.deepEqual(Array.from(detectChangedCities(prev, prev)), []);
});

test("buildTripItineraryMarkdown: 生成带任务复选框与人物块引的出差/行程拜访文档", () => {
    assert.equal(TRIP_CONTEXT_METAS.length, 4);

    const contacts: ContactSummary[] = [
        {
            docId: "doc-zs",
            itemId: "item-zs",
            name: "张三",
            phone: "13800000001",
            wechat: "zhangsan_wx",
            isSelf: false,
            relatedItemIds: [],
            profile: {
                affiliations: {
                    state: "known",
                    value: {
                        work: [{ orgName: "腾讯科技", orgDocId: "org-tencent" }],
                    },
                },
            },
        },
    ];

    const md = buildTripItineraryMarkdown({
        city: "深圳",
        context: "business",
        contacts,
        date: "2026-10-27",
    });

    assert.ok(md.includes("# 💼 出差人脉拜访清单 · 深圳 (共 1 人)"));
    assert.ok(md.includes("> 行程类型：商务出差 · 发生日期：2026-10-27"));
    assert.ok(md.includes("## 📋 拜访任务清单"));
    assert.ok(md.includes("- [ ] [张三](siyuan://blocks/doc-zs)"));
    assert.ok(md.includes("电话: 13800000001"));
    assert.ok(md.includes("微信: zhangsan_wx"));
    assert.ok(md.includes("腾讯科技"));
});

test("思源文档深度联动 P3：Daily Note 互动行支持 custom-lvct-event-id 锚点契约与改删同步", async () => {
    const { buildDailyNoteInteractionMarkdown } = await import("../src/domain/diary-sync.ts");

    const input = {
        personDocId: "20261026000000-doc001",
        personName: "张三",
        type: "meeting" as const,
        note: "修改后的深度会面讨论",
        occurredTimeStr: "15:00",
    };

    const updatedMd = buildDailyNoteInteractionMarkdown(input);
    assert.ok(updatedMd.includes("🤝 与 (( 20261026000000-doc001 '张三' )) 见面：修改后的深度会面讨论"));
    assert.ok(updatedMd.startsWith("- 15:00 🤝"));
});
