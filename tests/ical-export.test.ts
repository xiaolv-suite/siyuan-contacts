import assert from "node:assert/strict";
import test from "node:test";
import {
    buildBatchIcsFilename,
    buildContactEventsForIcs,
    buildIcsFilename,
    escapeIcsText,
    foldIcsLine,
    serializeBatchAnniversariesToIcs,
    serializeIcsCalendar,
    serializePersonAnniversariesToIcs,
    type IcsEventItem,
} from "../src/domain/ical-export.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { AnniversaryItem } from "../src/domain/anniversaries.ts";

test("ical-export domain: escapeIcsText 转义与 foldIcsLine 75字节规范折行", () => {
    const raw = "第一行;第二行,第三行\\第四行\n新的一行";
    const escaped = escapeIcsText(raw);
    assert.equal(escaped, "第一行\\;第二行\\,第三行\\\\第四行\\n新的一行");

    const shortLine = "SUMMARY:生日纪念日";
    assert.equal(foldIcsLine(shortLine), shortLine);

    const longLine = "DESCRIPTION:" + "这是一段非常长非常长的日历事件描述文字测试内容用于检验RFC5545折行规范".repeat(3);
    const folded = foldIcsLine(longLine);
    assert.ok(folded.includes("\r\n "));
});

test("ical-export domain: serializeIcsCalendar 生成标准 VCALENDAR / VEVENT 结构", () => {
    const events: IcsEventItem[] = [
        {
            uid: "ev-01@lv-contacts",
            summary: "🎂 张三 的生日",
            description: "小驴人脉记录",
            startDateStr: "19900815",
            isAllDay: true,
            isYearly: true,
            categories: ["生日"],
        },
    ];

    const ics = serializeIcsCalendar(events, "测试日历");
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.includes("VERSION:2.0\r\n"));
    assert.ok(ics.includes("X-WR-CALNAME:测试日历\r\n"));
    assert.ok(ics.includes("BEGIN:VEVENT\r\n"));
    assert.ok(ics.includes("UID:ev-01@lv-contacts\r\n"));
    assert.ok(ics.includes("DTSTART;VALUE=DATE:19900815\r\n"));
    assert.ok(ics.includes("DTEND;VALUE=DATE:19900816\r\n"));
    assert.ok(ics.includes("RRULE:FREQ=YEARLY\r\n"));
    assert.ok(ics.includes("SUMMARY:🎂 张三 的生日\r\n"));
    assert.ok(ics.includes("TRANSP:TRANSPARENT\r\n"));
    assert.ok(ics.includes("END:VEVENT\r\n"));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("ical-export domain: buildContactEventsForIcs 包含生日与纪念日，支持 0000 年份与免打扰排除", () => {
    const person: ContactSummary = {
        docId: "doc-1",
        itemId: "item-1",
        name: "李四",
        phone: "13800001111",
        email: "",
        wechat: "",
        website: "",
        birthday: "1985-05-20",
        isLunar: false,
        group: "好友",
        tags: [],
        relatedItemIds: [],
    };

    const annivs: AnniversaryItem[] = [
        {
            id: "anniv-1",
            personDocId: "doc-1",
            title: "结婚十周年",
            category: "wedding",
            date: "2016-10-10",
            isLunar: false,
            createdAt: 1000,
            updatedAt: 1000,
        },
        {
            id: "anniv-2",
            personDocId: "doc-1",
            title: "免打扰纪念日",
            category: "other",
            date: "0000-12-25",
            isLunar: false,
            remindDisabled: true, // 已关闭提醒，不导出
            createdAt: 1000,
            updatedAt: 1000,
        },
    ];

    const evs = buildContactEventsForIcs(person, annivs);
    assert.equal(evs.length, 2); // 1 生日 + 1 纪念日（第 2 个免打扰被排除）

    assert.equal(evs[0]?.startDateStr, "19850520");
    assert.ok(evs[0]?.summary.includes("李四 的生日"));

    assert.equal(evs[1]?.startDateStr, "20161010");
    assert.ok(evs[1]?.summary.includes("结婚十周年"));
});

test("ical-export domain: 单人物与批量序列化及文件名生成", () => {
    const person: ContactSummary = {
        docId: "doc-test",
        itemId: "item-test",
        name: "王五/总监",
        phone: "",
        email: "",
        wechat: "",
        website: "",
        birthday: "1992-03-15",
        isLunar: true,
        group: "",
        tags: [],
        relatedItemIds: [],
    };

    const ics = serializePersonAnniversariesToIcs(person, []);
    assert.ok(ics.includes("🎂 王五/总监 的生日 (农历)"));

    const batchIcs = serializeBatchAnniversariesToIcs([{ person, anniversaries: [] }]);
    assert.ok(batchIcs.includes("BEGIN:VCALENDAR"));

    const filename = buildIcsFilename("王五/总监", "2026-10-29");
    assert.equal(filename, "小驴人脉_纪念日_王五_总监_2026-10-29.ics");

    const batchFilename = buildBatchIcsFilename("全量纪念日/导出", "2026-10-30");
    assert.equal(batchFilename, "小驴人脉_全量纪念日_导出_2026-10-30.ics");
});
