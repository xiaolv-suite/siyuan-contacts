import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDailyNoteInteractionMarkdown } from "../src/domain/diary-sync.ts";
import { buildCityTopicSectionMarkdown, buildCityInitialDocumentMarkdown, CITY_TOPIC_ATTR, CITY_CONTACTS_SECTION_ATTR } from "../src/domain/city-topic.ts";
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
    assert.ok(md.includes("[张三](siyuan://blocks/20261026000000-doc001)"));
    assert.ok(md.includes("见面"));
    assert.ok(md.includes("讨论大模型合作方案"));
});

test("buildDailyNoteInteractionMarkdown: 缺省类型与时间正常兜底", () => {
    const md = buildDailyNoteInteractionMarkdown({
        personDocId: "20261026000000-doc002",
        personName: "李四",
    });

    assert.ok(md.includes("📝"));
    assert.ok(md.includes("[李四](siyuan://blocks/20261026000000-doc002)"));
    assert.ok(md.includes("互动"));
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
