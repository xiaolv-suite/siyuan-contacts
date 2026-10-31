/**
 * 联系人交往历程里程碑与编年史纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 从全量互动时间线、生命周期跃迁、纪念日、已兑现信诺与重要往来中提取关键里程碑，
 * 绘制联系人交往一生的故事线与编年史长卷。
 */

import { getStageMeta, type RelationshipStageKey } from "./lifecycle-stage.ts";
import { ANNIVERSARY_CATEGORY_LABELS, type AnniversaryCategory } from "./anniversaries.ts";
import type { ContactSummary } from "./person.ts";
import { escapeMarkdown, sanitizeFileName } from "./format.ts";
import { toLocalDateKey } from "./date-key.ts";

export type MilestoneType =
    | "first_contact"      // 初识相聚（最早一条互动）
    | "stage_advance"     // 阶段跃迁（生命周期变迁，如初识 -> 合作）
    | "anniversary"       // 重要纪念日（结婚纪念、相识纪念、特别日子）
    | "promise_fulfilled" // 诺言兑现（已履约的互信承诺）
    | "exchange"          // 人情礼往（互赠与金钱人情）
    | "timeline_event";   // 重要互动记录

export interface MilestoneEvent {
    id: string;
    type: MilestoneType;
    date: string; // YYYY-MM-DD
    title: string;
    detail?: string;
    badgeLabel: string;
    icon: string;
    timestamp: number;
}

export interface RawTimelineItem {
    id?: string;
    eventId?: string;
    occurredAt?: number;
    localDate: string;
    note?: string;
    source?: string;
    groupSize?: number;
}

export interface RawLifecycleHistoryItem {
    stage: RelationshipStageKey;
    changedAt: string;
    note?: string;
    timestamp: number;
}

export interface RawAnniversaryItem {
    id: string;
    title: string;
    category: AnniversaryCategory;
    date: string;
    isLunar: boolean;
    note?: string;
}

export interface RawPromiseItem {
    id: string;
    direction: "i_promised" | "they_promised";
    title: string;
    detail?: string;
    promisedOn: string;
    status: "pending" | "fulfilled" | "broken";
    fulfilledOn?: string;
}

export interface RawExchangeItem {
    id: string;
    kind: string;
    direction: string;
    description: string;
    amount?: number;
    currency?: string;
    occurredOn: string;
    status: string;
}

export interface ExtractMilestonesInput {
    timeline?: readonly RawTimelineItem[];
    lifecycleHistory?: readonly RawLifecycleHistoryItem[];
    anniversaries?: readonly RawAnniversaryItem[];
    promises?: readonly RawPromiseItem[];
    exchanges?: readonly RawExchangeItem[];
}

function parseTimestamp(dateStr: string, fallback: number): number {
    const ts = Date.parse(dateStr);
    return Number.isFinite(ts) && ts > 0 ? ts : fallback;
}

export function extractMilestoneEvents(input: ExtractMilestonesInput): MilestoneEvent[] {
    const events: MilestoneEvent[] = [];

    // 1. 初次相识（最早一条互动记录）
    if (input.timeline && input.timeline.length > 0) {
        const sorted = [...input.timeline].sort((a, b) =>
            (a.occurredAt ?? parseTimestamp(a.localDate, 0)) - (b.occurredAt ?? parseTimestamp(b.localDate, 0))
        );
        const earliest = sorted[0];
        if (earliest) {
            const timeVal = earliest.occurredAt ?? parseTimestamp(earliest.localDate, Date.now());
            const eid = earliest.id ?? earliest.eventId ?? String(timeVal);
            events.push({
                id: `ms-first-${eid}`,
                type: "first_contact",
                date: earliest.localDate,
                title: "初次相识 · 建立连接",
                detail: earliest.note?.trim() || "第一笔人脉互动记录",
                badgeLabel: "初识",
                icon: "🌱",
                timestamp: timeVal,
            });
        }
    }

    // 2. 阶段跃迁（生命周期历程）
    if (input.lifecycleHistory && input.lifecycleHistory.length > 0) {
        for (const h of input.lifecycleHistory) {
            const meta = getStageMeta(h.stage);
            events.push({
                id: `ms-stage-${h.stage}-${h.timestamp}`,
                type: "stage_advance",
                date: h.changedAt,
                title: `阶段演进 · ${meta.label}`,
                detail: h.note,
                badgeLabel: "阶段",
                icon: meta.icon,
                timestamp: h.timestamp || parseTimestamp(h.changedAt, Date.now()),
            });
        }
    }

    // 3. 重要日期与纪念日
    if (input.anniversaries && input.anniversaries.length > 0) {
        for (const anniv of input.anniversaries) {
            const catMeta = ANNIVERSARY_CATEGORY_LABELS[anniv.category] ?? { label: "纪念日", icon: "🌟" };
            const dateStr = anniv.date.startsWith("0000-") ? `每年${anniv.date.slice(5)}` : anniv.date;
            events.push({
                id: `ms-anniv-${anniv.id}`,
                type: "anniversary",
                date: anniv.date.startsWith("0000-") ? "循环纪念" : anniv.date,
                title: `${catMeta.label} · ${anniv.title}`,
                detail: anniv.note ? `${anniv.note}（${dateStr}）` : `原始记录日期：${dateStr}`,
                badgeLabel: catMeta.label,
                icon: catMeta.icon,
                timestamp: parseTimestamp(anniv.date, 0),
            });
        }
    }

    // 4. 诺言兑现（已履约的承诺）
    if (input.promises && input.promises.length > 0) {
        for (const p of input.promises) {
            if (p.status === "fulfilled" && p.fulfilledOn) {
                const dirStr = p.direction === "i_promised" ? "我承诺对方" : "对方承诺我";
                events.push({
                    id: `ms-prm-${p.id}`,
                    type: "promise_fulfilled",
                    date: p.fulfilledOn,
                    title: `信诺兑现 · ${p.title}`,
                    detail: `【${dirStr}】${p.detail ? ` — ${p.detail}` : ""}（许诺日：${p.promisedOn}）`,
                    badgeLabel: "履约",
                    icon: "✓",
                    timestamp: parseTimestamp(p.fulfilledOn, Date.now()),
                });
            }
        }
    }

    // 5. 重要人情礼往
    if (input.exchanges && input.exchanges.length > 0) {
        for (const ex of input.exchanges) {
            const dirStr = ex.direction === "receivable" ? "对方欠我" : "我欠对方";
            const amtStr = ex.amount ? ` ¥${ex.amount} ${ex.currency || "CNY"}` : "";
            events.push({
                id: `ms-ex-${ex.id}`,
                type: "exchange",
                date: ex.occurredOn,
                title: `人情往来 · ${ex.description}`,
                detail: `[${dirStr}]${amtStr} · 状态：${ex.status === "settled" ? "已结清" : "待处理"}`,
                badgeLabel: "人情",
                icon: "🧧",
                timestamp: parseTimestamp(ex.occurredOn, Date.now()),
            });
        }
    }

    // 统一按时间倒序排列（新里程碑在前）
    return events.sort((a, b) => {
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }
        return b.timestamp - a.timestamp;
    });
}

export function groupMilestonesByYear(events: readonly MilestoneEvent[]): Record<string, MilestoneEvent[]> {
    const groups: Record<string, MilestoneEvent[]> = {};
    for (const ev of events) {
        const year = /^\d{4}/.test(ev.date) ? ev.date.slice(0, 4) : "其他年份/里程碑";
        if (!groups[year]) groups[year] = [];
        groups[year].push(ev);
    }
    return groups;
}

export function filterMilestonesByType(
    events: readonly MilestoneEvent[],
    type: MilestoneType | "all",
): MilestoneEvent[] {
    if (type === "all") return [...events];
    return events.filter((ev) => ev.type === type);
}

export function buildMilestonesDocumentHpath(personName: string): string {
    const safeName = sanitizeFileName(personName, "联系人", 50);
    return `/人脉回顾/📜 人脉交往编年史 · ${safeName}`;
}

export function buildMilestonesDocumentMarkdown(
    person: ContactSummary,
    milestones: readonly MilestoneEvent[],
    generatedAt?: string,
): string {
    const personName = escapeMarkdown(person.name.trim() || "联系人");
    const stamp = generatedAt || toLocalDateKey(new Date());
    const lines: string[] = [];

    lines.push(`# 📜 人脉交往编年史 · ${personName}`);
    lines.push("");
    lines.push(`> 联系人：((${person.docId} "${personName}"))  `);
    lines.push(`> 编年史归档时间：${stamp} · 里程碑总计：${milestones.length} 件`);
    lines.push("");

    if (milestones.length === 0) {
        lines.push("暂无交往里程碑记录。");
        return lines.join("\n");
    }

    const grouped = groupMilestonesByYear(milestones);
    const sortedYears = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    for (const year of sortedYears) {
        const events = grouped[year] || [];
        lines.push(`## ${year} 年（${events.length} 个里程碑）`);
        lines.push("");
        for (const ev of events) {
            lines.push(`### ${ev.icon} ${ev.date} · ${escapeMarkdown(ev.title)}`);
            lines.push(`- **类型**：\`${escapeMarkdown(ev.badgeLabel)}\``);
            if (ev.detail) {
                lines.push(`- **细节**：${escapeMarkdown(ev.detail)}`);
            }
            lines.push("");
        }
    }

    lines.push("---");
    lines.push("由小驴人脉插件生成 · 真实沉淀交往历史事实");

    return lines.join("\n");
}
