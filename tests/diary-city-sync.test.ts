import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDailyNoteInteractionMarkdown } from "../src/domain/diary-sync.ts";
import { buildCityTopicDocumentMarkdown, CITY_TOPIC_ATTR } from "../src/domain/city-topic.ts";
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

test("buildCityTopicDocumentMarkdown: 生成完整的城市人脉专题文档正文", () => {
    assert.equal(CITY_TOPIC_ATTR, "custom-lvct-city");

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

    const md = buildCityTopicDocumentMarkdown({
        city: "深圳",
        contacts,
        organizations: [
            { name: "未来科技创新中心", docId: "20261026000000-org001" },
        ],
        generatedDate: "2026-10-26",
    });

    assert.ok(md.includes("# 📍 城市人脉 · 深圳"));
    assert.ok(md.includes("共 1 位好友 · 1 家关联机构"));
    assert.ok(md.includes("[张三](siyuan://blocks/20261026000000-doc001)"));
    assert.ok(md.includes("13800000001"));
    assert.ok(md.includes("zhangsan_wx"));
    assert.ok(md.includes("[未来科技创新中心](siyuan://blocks/20261026000000-org001)"));
});
