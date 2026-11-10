import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsvRows, parseCsvContacts, generateCsvTemplate, exportContactsToCsv, exportContactsToMarkdownTable } from "../src/domain/csv-contacts.ts";

test("parseCsvRows：能正确处理引号转义、逗号、多行和首尾空格", () => {
    const raw = `姓名,电话,"公司, 带逗号",备注\r\n张三,13800000000,"金雨""茂物""",普通备注\r\n李四,13900000000,腾讯,无`;
    const rows = parseCsvRows(raw);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[0], ["姓名", "电话", "公司, 带逗号", "备注"]);
    assert.deepEqual(rows[1], ["张三", "13800000000", '金雨"茂物"', "普通备注"]);
    assert.deepEqual(rows[2], ["李四", "13900000000", "腾讯", "无"]);
});

test("parseCsvContacts：解析标准模板与中英文别名表头", () => {
    const template = generateCsvTemplate();
    const contacts = parseCsvContacts(template);
    assert.equal(contacts.length, 2);
    assert.equal(contacts[0].name, "张三");
    assert.equal(contacts[0].phone, "13800138000");
    assert.equal(contacts[0].email, "zhangsan@example.com");
    assert.equal(contacts[0].birthday, "1992-05-20");
    assert.equal(contacts[0].isLunar, false);
    assert.deepEqual(contacts[0].tags, ["投资", "业务"]);
    assert.equal(contacts[0].org, "金雨茂物");

    assert.equal(contacts[1].name, "李四");
    assert.equal(contacts[1].phone, "13900139000");
    assert.equal(contacts[1].isLunar, true);
});

test("parseCsvContacts：缺失姓名列时给出友好报错", () => {
    const badCsv = "电话,邮箱\n13800000000,test@example.com";
    assert.throws(() => parseCsvContacts(badCsv), /未找到「姓名」列/);
});

test("exportContactsToCsv & exportContactsToMarkdownTable：生成标准带有 BOM 的 CSV 与规范 Markdown 宽表", () => {
    const people = [
        {
            docId: "doc-1",
            itemId: "item-1",
            name: '张三, 特殊"引号"',
            phone: "13800000000",
            email: "zhang@example.com",
            wechat: "wx_zhang",
            website: "https://example.com",
            birthday: "1990-01-01",
            isLunar: false,
            group: "核心客户",
            tags: ["科技", "投资"],
            relatedItemIds: [],
        },
        {
            docId: "doc-2",
            itemId: "item-2",
            name: "李四",
            phone: "13900000000",
            email: "li@example.com",
            wechat: "wx_li",
            website: "",
            birthday: "1995-05-05",
            isLunar: true,
            group: "同事",
            tags: ["AI"],
            relatedItemIds: [],
        },
    ];

    // CSV 测试
    const csv = exportContactsToCsv(people);
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes('"张三, 特殊""引号"""'));
    assert.ok(csv.includes("13800000000"));
    assert.ok(csv.includes("科技 投资"));

    // 反向解析验证 round-trip
    const parsed = parseCsvContacts(csv);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].name, '张三, 特殊"引号"');
    assert.equal(parsed[0].phone, "13800000000");

    // Markdown 表格测试
    const md = exportContactsToMarkdownTable(people, "核心伙伴");
    assert.ok(md.includes("### 📋 核心伙伴（共 2 人）"));
    assert.ok(md.includes("| 姓名 | 分组 | 电话 | 微信 | 邮箱 | 城市 | 组织与职位 | 标签 |"));
    assert.ok(md.includes("13800000000"));
    assert.ok(md.includes("李四"));
});
