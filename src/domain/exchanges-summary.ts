/**
 * 全库人情往来与礼尚往来大账本（Exchanges & Gifts Summary）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 聚合全库人情礼品、资金往来与待答谢/待结清事项，并提供思源实体账簿 Markdown 组装。
 */

import type { ContactSummary } from "./person.ts";
import type { ExchangeRecord } from "./exchanges.ts";
import { escapeLinkLabel } from "./format.ts";

export interface ExchangeRecordWithPerson extends ExchangeRecord {
    personName: string;
    personDocId: string;
}

export interface ExchangesSummary {
    totalRecords: number;
    openCount: number;
    settledCount: number;
    cancelledCount: number;
    receivableCount: number; // 收到/收入的笔数
    payableCount: number;    // 送出/付出的笔数
    byKind: {
        money: number;
        item: number;
        favor: number;
    };
    moneySummary: {
        /** Compatibility totals are CNY only; currencies are never converted or added together. */
        receivableTotal: number;
        payableTotal: number;
        byCurrency?: { currency: string; receivableTotal: number; payableTotal: number }[];
    };
    records: ExchangeRecordWithPerson[];
    openItems: ExchangeRecordWithPerson[];
}

export function exchangeCurrency(currency?: string): string {
    return currency?.trim().toUpperCase() || "CNY";
}

export function formatExchangeAmount(amount: number, currency?: string, fractionDigits?: number): string {
    const unit = exchangeCurrency(currency);
    const value = fractionDigits === undefined ? String(amount) : amount.toFixed(fractionDigits);
    return unit === "CNY" ? `¥${value}` : `${value} ${unit}`;
}

/**
 * 汇总全库往来记录，计算收支统计与人物映射。
 * 纯函数：零外部依赖。
 */
export function computeExchangesSummary(
    records: readonly ExchangeRecord[],
    people: readonly ContactSummary[] = [],
): ExchangesSummary {
    const personMap = new Map<string, string>();
    for (const p of people) {
        if (p.docId && p.name) personMap.set(p.docId, p.name.trim());
    }

    let openCount = 0;
    let settledCount = 0;
    let cancelledCount = 0;
    let receivableCount = 0;
    let payableCount = 0;

    const byKind = { money: 0, item: 0, favor: 0 };
    const moneySummary = { receivableTotal: 0, payableTotal: 0 };
    const currencyTotals = new Map<string, { currency: string; receivableTotal: number; payableTotal: number }>();

    const enrichedRecords: ExchangeRecordWithPerson[] = [];
    const openItems: ExchangeRecordWithPerson[] = [];

    // 默认按发生日期降序
    const sorted = records.slice().sort((a, b) => (b.occurredOn || "").localeCompare(a.occurredOn || ""));

    for (const r of sorted) {
        const personName = personMap.get(r.personDocId) || "未命名联系人";
        const enriched: ExchangeRecordWithPerson = { ...r, currency: exchangeCurrency(r.currency), personName };
        enrichedRecords.push(enriched);

        if (r.status === "open") {
            openCount += 1;
            openItems.push(enriched);
        } else if (r.status === "settled") {
            settledCount += 1;
        } else if (r.status === "cancelled") {
            cancelledCount += 1;
        }

        if (r.direction === "receivable") {
            receivableCount += 1;
            if (r.kind === "money" && typeof r.amount === "number") {
                if (exchangeCurrency(r.currency) === "CNY") moneySummary.receivableTotal += r.amount;
            }
        } else if (r.direction === "payable") {
            payableCount += 1;
            if (r.kind === "money" && typeof r.amount === "number") {
                if (exchangeCurrency(r.currency) === "CNY") moneySummary.payableTotal += r.amount;
            }
        }

        if (r.kind === "money" && typeof r.amount === "number") {
            const currency = exchangeCurrency(r.currency);
            const total = currencyTotals.get(currency) ?? { currency, receivableTotal: 0, payableTotal: 0 };
            if (r.direction === "receivable") total.receivableTotal += r.amount;
            else total.payableTotal += r.amount;
            currencyTotals.set(currency, total);
        }

        if (r.kind === "money") byKind.money += 1;
        else if (r.kind === "item") byKind.item += 1;
        else if (r.kind === "favor") byKind.favor += 1;
    }

    return {
        totalRecords: records.length,
        openCount,
        settledCount,
        cancelledCount,
        receivableCount,
        payableCount,
        byKind,
        moneySummary: { ...moneySummary, byCurrency: [...currencyTotals.values()].sort((a, b) => a.currency.localeCompare(b.currency)) },
        records: enrichedRecords,
        openItems,
    };
}

/**
 * 组装符合思源笔记标准的《人情礼尚往来大账簿》实体文档 Markdown。
 */
export function buildExchangesLedgerMarkdown(
    summary: ExchangesSummary,
    title: string = "人情礼尚往来大账簿",
    generatedAt?: string,
): string {
    const cleanTitle = escapeLinkLabel(title);
    const lines: string[] = [];

    lines.push(`# 🧧 ${cleanTitle}`);
    lines.push("");
    lines.push(`> 📅 生成时间：${generatedAt || new Date().toLocaleString()}`);
    lines.push(`> 💡 记账不是为了斤斤计较，而是为了牢记每一次相助、心意与善意。`);
    lines.push("");

    // 1. 统计大盘
    lines.push("## 📊 往来大盘统计");
    lines.push("");
    lines.push(`- **总往来笔数**：共 **${summary.totalRecords}** 笔`);
    lines.push(`- **待办状态**：待处理/待结清 **${summary.openCount}** 笔 · 已结清/已答谢 **${summary.settledCount}** 笔`);
    lines.push(`- **类别分布**：礼品往来 ${summary.byKind.item} 笔 · 资金往来 ${summary.byKind.money} 笔 · 人情帮扶 ${summary.byKind.favor} 笔`);
    const totals = summary.moneySummary.byCurrency ?? [{ currency: "CNY", ...summary.moneySummary }];
    for (const total of totals) {
        if (total.receivableTotal <= 0 && total.payableTotal <= 0) continue;
        lines.push(`- **资金收支（${escapeLinkLabel(total.currency)}）**：累计收到 ${formatExchangeAmount(total.receivableTotal, total.currency, 2)} · 累计送出/借出 ${formatExchangeAmount(total.payableTotal, total.currency, 2)}`);
    }
    lines.push("");

    // 2. 待处理/待答谢事项清单（带任务复选框）
    lines.push("## 📌 待答谢与未结清事项");
    lines.push("");
    if (summary.openItems.length === 0) {
        lines.push("*目前暂无待处理或未结清的人情事项，彼此安好！*");
        lines.push("");
    } else {
        for (const item of summary.openItems) {
            const dirLabel = item.direction === "receivable" ? "【收】" : "【送/支】";
            const kindLabel = item.kind === "item" ? "礼品" : item.kind === "money" ? "款项" : "人情";
            const amountStr = item.amount !== undefined ? ` (${escapeLinkLabel(formatExchangeAmount(item.amount, item.currency))})` : "";
            const dueStr = item.dueOn ? ` · 期望日期: ${item.dueOn}` : "";
            const cleanName = escapeLinkLabel(item.personName);

            lines.push(`- [ ] ${dirLabel}[${kindLabel}] **${item.description}**${amountStr} · 对接人：(( ${item.personDocId} '${cleanName}' ))${dueStr}`);
            if (item.note) {
                lines.push(`  - 备忘：${item.note}`);
            }
        }
        lines.push("");
    }

    // 3. 全量往来明细流水表
    lines.push("## 📝 全部往来明细记录");
    lines.push("");
    if (summary.records.length === 0) {
        lines.push("*暂无任何往来记录。可在人物详情中记录第一笔礼尚往来。*");
        lines.push("");
    } else {
        lines.push("| 发生日期 | 对接人物 | 方向 | 类别 | 描述 | 金额 | 状态 | 备注 |");
        lines.push("|---|---|---|---|---|---|---|---|");
        for (const r of summary.records) {
            const cleanName = escapeLinkLabel(r.personName);
            const dirText = r.direction === "receivable" ? "🎁 收到" : "📤 送出";
            const kindText = r.kind === "item" ? "礼品" : r.kind === "money" ? "礼金/款项" : "人情";
            const amountText = r.amount !== undefined ? escapeLinkLabel(formatExchangeAmount(r.amount, r.currency)) : "—";
            const statusText = r.status === "settled" ? "已结清" : r.status === "open" ? "待处理" : "已取消";
            const noteText = r.note ? escapeLinkLabel(r.note) : "—";
            lines.push(`| ${r.occurredOn} | [${cleanName}](siyuan://blocks/${r.personDocId}) | ${dirText} | ${kindText} | ${escapeLinkLabel(r.description)} | ${amountText} | ${statusText} | ${noteText} |`);
        }
        lines.push("");
    }

    return lines.join("\n");
}
