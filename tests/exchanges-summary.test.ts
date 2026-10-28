import assert from "node:assert/strict";
import test from "node:test";
import {
    computeExchangesSummary,
    buildExchangesLedgerMarkdown,
} from "../src/domain/exchanges-summary.ts";
import type { ExchangeRecord } from "../src/domain/exchanges.ts";
import type { ContactSummary } from "../src/domain/person.ts";

test("computeExchangesSummary：正确统计全库收支、待结清事项与人物映射", () => {
    const mockPeople: ContactSummary[] = [
        {
            docId: "doc-1",
            itemId: "item-1",
            name: "张三",
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
            docId: "doc-2",
            itemId: "item-2",
            name: "李四",
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

    const mockRecords: ExchangeRecord[] = [
        {
            id: "ex-1",
            personDocId: "doc-1",
            kind: "item",
            direction: "receivable", // 收到
            description: "武夷山大红袍礼盒",
            currency: "CNY",
            occurredOn: "2026-10-01",
            dueOn: "",
            status: "open", // 待还礼
            settledOn: "",
            note: "中秋答谢",
            createdAt: 1000,
            updatedAt: 1000,
        },
        {
            id: "ex-2",
            personDocId: "doc-2",
            kind: "money",
            direction: "payable", // 付出
            description: "结婚礼金",
            amount: 2000,
            currency: "CNY",
            occurredOn: "2026-10-15",
            dueOn: "",
            status: "settled",
            settledOn: "2026-10-15",
            note: "深圳婚礼现场",
            createdAt: 2000,
            updatedAt: 2000,
        },
    ];

    const summary = computeExchangesSummary(mockRecords, mockPeople);

    assert.equal(summary.totalRecords, 2);
    assert.equal(summary.openCount, 1);
    assert.equal(summary.settledCount, 1);
    assert.equal(summary.receivableCount, 1);
    assert.equal(summary.payableCount, 1);
    assert.equal(summary.byKind.item, 1);
    assert.equal(summary.byKind.money, 1);
    assert.equal(summary.moneySummary.payableTotal, 2000);

    // 检查人物映射
    assert.equal(summary.records[0].personName, "李四"); // 日期较新排在前
    assert.equal(summary.records[1].personName, "张三");

    // 检查待处理
    assert.equal(summary.openItems.length, 1);
    assert.equal(summary.openItems[0].description, "武夷山大红袍礼盒");

    // 测试 Markdown 组装
    const md = buildExchangesLedgerMarkdown(summary, "2026秋季人情大账");
    assert(md.includes("# 🧧 2026秋季人情大账"));
    assert(md.includes("礼品往来 1 笔"));
    assert(md.includes("累计送出/借出 ¥2000.00"));
    assert(md.includes("- [ ] 【收】[礼品] **武夷山大红袍礼盒** · 对接人：(( doc-1 '张三' ))"));
    assert(md.includes("| 2026-10-15 | [李四](siyuan://blocks/doc-2) | 📤 送出 | 礼金/款项 | 结婚礼金 | ¥2000 | 已结清 | 深圳婚礼现场 |"));
});
