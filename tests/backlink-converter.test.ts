import { test } from "node:test";
import assert from "node:assert/strict";
import {
    parseBacklinkOccurredTime,
    inferInteractionType,
    cleanInteractionNote,
} from "../src/domain/backlink-converter.ts";

test("parseBacklinkOccurredTime：从日记标题精准提取当时发生的历史日期", () => {
    // 标准 ISO 风格标题
    const r1 = parseBacklinkOccurredTime({
        docTitle: "2026-08-15 每日随记",
        hpath: "/日记/2026-08-15 每日随记",
        created: "20260815143000",
    });
    assert.equal(r1.localDate, "2026-08-15");
    assert.equal(r1.sourceKind, "diary_title");
    const d1 = new Date(r1.occurredAt);
    assert.equal(d1.getFullYear(), 2026);
    assert.equal(d1.getMonth() + 1, 8);
    assert.equal(d1.getDate(), 15);
    assert.equal(d1.getHours(), 14); // 保留了创建时分秒
    assert.equal(d1.getMinutes(), 30);

    // 中文年月日标题
    const r2 = parseBacklinkOccurredTime({
        docTitle: "2025年12月01日项目复盘",
        hpath: "/会议/2025年12月01日项目复盘",
    });
    assert.equal(r2.localDate, "2025-12-01");
    assert.equal(r2.sourceKind, "diary_title");
    const d2 = new Date(r2.occurredAt);
    assert.equal(d2.getFullYear(), 2025);
    assert.equal(d2.getMonth() + 1, 12);
    assert.equal(d2.getDate(), 1);

    // 8位紧凑格式
    const r3 = parseBacklinkOccurredTime({
        docTitle: "20260520 日常记录",
    });
    assert.equal(r3.localDate, "2026-05-20");
    assert.equal(r3.sourceKind, "diary_title");

    // 多级层级路径（如 /日记/2026年/10月/24日/随笔）
    const r4 = parseBacklinkOccurredTime({
        docTitle: "随笔记录",
        hpath: "/日记/2026年/10月/24日/随笔记录",
    });
    assert.equal(r4.localDate, "2026-10-24");
    assert.equal(r4.sourceKind, "diary_title");

    // 斜杠层级路径（如 /Daily/2026/10/24/note）
    const r5 = parseBacklinkOccurredTime({
        docTitle: "note",
        hpath: "/Daily/2026/10/24/note",
    });
    assert.equal(r5.localDate, "2026-10-24");
    assert.equal(r5.sourceKind, "diary_title");
});

test("parseBacklinkOccurredTime：标题无日期时，回退使用块创建时间 created", () => {
    const r = parseBacklinkOccurredTime({
        docTitle: "工作备忘录",
        hpath: "/随笔/工作备忘录",
        created: "20260710091530",
    });
    assert.equal(r.localDate, "2026-07-10");
    assert.equal(r.sourceKind, "block_created");
    const d = new Date(r.occurredAt);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth() + 1, 7);
    assert.equal(d.getDate(), 10);
    assert.equal(d.getHours(), 9);
    assert.equal(d.getMinutes(), 15);
});

test("parseBacklinkOccurredTime：块创建时间缺失时，使用更新时间 updated 或文档 ID", () => {
    // 使用 updated
    const r1 = parseBacklinkOccurredTime({
        docTitle: "随手记",
        updated: "20260601180000",
    });
    assert.equal(r1.localDate, "2026-06-01");
    assert.equal(r1.sourceKind, "block_updated");

    // 使用 rootId
    const r2 = parseBacklinkOccurredTime({
        docTitle: "临时笔记",
        rootId: "20260405102030-abcdef1",
    });
    assert.equal(r2.localDate, "2026-04-05");
    assert.equal(r2.sourceKind, "doc_id");
});

test("inferInteractionType：智能识别互动类型", () => {
    // 聚餐
    assert.equal(inferInteractionType("中午一起吃饭讨论合作"), "meal");
    assert.equal(inferInteractionType("下班后聚餐吃火锅"), "meal");
    assert.equal(inferInteractionType("在星巴克喝咖啡聊天"), "meal");

    // 电话
    assert.equal(inferInteractionType("下午打了个电话沟通进度"), "call");
    assert.equal(inferInteractionType("微信语音通话交流方案"), "call");
    assert.equal(inferInteractionType("电话联络确认到货时间"), "call");

    // 消息
    assert.equal(inferInteractionType("微信发消息确认下周行程"), "message");
    assert.equal(inferInteractionType("钉钉沟通了接口联调细节"), "message");

    // 邮件
    assert.equal(inferInteractionType("已发送邮件同步项目报告"), "email");

    // 见面
    assert.equal(inferInteractionType("在金鹰世界见面交流"), "meeting");
    assert.equal(inferInteractionType("去客户公司拜访并开会"), "meeting");
    assert.equal(inferInteractionType("线下碰头讨论Q4战略"), "meeting");

    // 兜底
    assert.equal(inferInteractionType("记录关于新产品的几个思考点"), "other");
});

test("cleanInteractionNote：清洗列表符、任务框并附加自然出处", () => {
    const raw = "- [x] 14:00 与 ((20261024100000-person1 '张三')) 电话确认采购清单";
    const cleaned = cleanInteractionNote(raw, "2026-10-24 工作日记");
    assert.equal(
        cleaned,
        "14:00 与 张三 电话确认采购清单（源自笔记《2026-10-24 工作日记》）",
    );

    // 已包含文档名时不再重复附带
    const raw2 = "在2026-10-24 工作日记中已记录了面谈内容";
    const cleaned2 = cleanInteractionNote(raw2, "2026-10-24 工作日记");
    assert.equal(cleaned2, "在2026-10-24 工作日记中已记录了面谈内容");

    // 多行列表符清洗
    const raw3 = "- 事项一：方案沟通\n* 事项二：预算评审";
    const cleaned3 = cleanInteractionNote(raw3, "未命名文档");
    assert.equal(cleaned3, "事项一：方案沟通 事项二：预算评审");
});
