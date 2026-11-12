import assert from "node:assert/strict";
import test from "node:test";
import {
    computeReciprocityAudit,
    type ReciprocityAuditResult,
} from "../src/domain/reciprocity.ts";
import type { PersonPromiseItem } from "../src/domain/promises.ts";
import type { ExchangeRecord } from "../src/domain/exchanges.ts";

function makePromise(id: string, direction: "i_promised" | "they_promised", status: "pending" | "fulfilled" | "cancelled"): PersonPromiseItem {
    return {
        id,
        personDocId: "doc-1",
        direction,
        title: `信诺-${id}`,
        status,
        createdAt: 1000,
        updatedAt: 1000,
    };
}

function makeExchange(id: string, direction: "payable" | "receivable", amount: number, status: "open" | "settled" | "cancelled"): ExchangeRecord {
    return {
        id,
        personDocId: "doc-1",
        kind: "money",
        direction,
        description: `往来-${id}`,
        amount,
        currency: "CNY",
        occurredOn: "2026-10-01",
        dueOn: "2026-10-15",
        status,
        settledOn: status === "settled" ? "2026-10-15" : "",
        note: "",
        createdAt: 1000,
        updatedAt: 1000,
    };
}

test("computeReciprocityAudit：空输入或初识浅交返回 nascent 状态", () => {
    const res = computeReciprocityAudit({});
    assert.equal(res.balanceStatus, "nascent");
    assert.equal(res.reciprocityScore, 60);
    assert.match(res.statusLabel, /初识浅交/);
    assert.match(res.actionableAdvice, /当前尚无深层事务交集/);
});

test("computeReciprocityAudit：双向信诺均履约且人情收支平衡返回 balanced 状态与高分", () => {
    const promises = [
        makePromise("1", "i_promised", "fulfilled"),
        makePromise("2", "they_promised", "fulfilled"),
    ];
    const exchanges = [
        makeExchange("1", "receivable", 200, "settled"),
        makeExchange("2", "payable", 200, "settled"),
    ];

    const res = computeReciprocityAudit({ promises, exchanges, timelineCount: 5 });

    assert.equal(res.balanceStatus, "balanced");
    assert.equal(res.myFulfillRate, 100);
    assert.equal(res.theirFulfillRate, 100);
    assert.equal(res.exchangeNetBalance, 0);
    assert.ok(res.reciprocityScore >= 90);
    assert.match(res.statusLabel, /互利共赢 · 往来均衡/);
});

test("computeReciprocityAudit：对方关照较多且未回请时触发 receiver_heavy 状态与答谢建议", () => {
    const exchanges = [
        makeExchange("1", "payable", 1200, "open"),
    ];
    const promises = [
        makePromise("1", "they_promised", "fulfilled"),
    ];

    const res = computeReciprocityAudit({ promises, exchanges, timelineCount: 2 });

    assert.equal(res.balanceStatus, "receiver_heavy");
    assert.ok(res.theirSharePercentage > 65);
    assert.equal(res.exchangeNetBalance, -1200);
    assert.match(res.statusLabel, /受惠关照/);
    assert.match(res.actionableAdvice, /适宜在重要节日备手信礼物或回请聚餐/);
});

test("computeReciprocityAudit：我方付出较多且对方有未兑现信诺时触发 giver_heavy 状态与跟进建议", () => {
    const exchanges = [
        makeExchange("1", "receivable", 1500, "open"),
    ];
    const promises = [
        makePromise("1", "i_promised", "fulfilled"),
        makePromise("2", "they_promised", "pending"),
    ];

    const res = computeReciprocityAudit({ promises, exchanges, timelineCount: 2 });

    assert.equal(res.balanceStatus, "giver_heavy");
    assert.ok(res.mySharePercentage > 65);
    assert.equal(res.exchangeNetBalance, 1500);
    assert.match(res.statusLabel, /付出较多/);
    assert.match(res.actionableAdvice, /对方尚有 1 项未兑现信诺/);
});
