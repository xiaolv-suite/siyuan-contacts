/**
 * 人脉文档各原子区块的 Markdown 纯函数渲染与属性标记契约。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */
import type { ContactSummary } from "./person.ts";
import type { InteractionEvent } from "./interactions.ts";
import { profileText } from "./people-profiles.ts";
import type { FollowUpItem } from "./followups.ts";
import type { ExchangeRecord } from "./exchanges.ts";
import type { AnniversaryItem } from "./anniversaries.ts";
import { escapeLinkLabel } from "./format.ts";

export const RELATED_SECTION_ATTR = "custom-lvct-related";
export const INTERACTIONS_SECTION_ATTR = "custom-lvct-interactions";
export const PROFILE_SECTION_ATTR = "custom-lvct-profile";
export const FOLLOWUPS_SECTION_ATTR = "custom-lvct-followups";
export const EXCHANGES_SECTION_ATTR = "custom-lvct-exchanges";
export const ANNIVERSARIES_SECTION_ATTR = "custom-lvct-anniversaries";
export const FACTS_SECTION_ATTR = "custom-lvct-facts";

export type FactCategory = "quote" | "preference" | "background" | "fact";

export interface PersonFactItem {
    id: string;
    text: string;
    category: FactCategory;
    date: string;
    sourceRef?: string;
}

export const FACT_CATEGORY_META: Record<FactCategory, { label: string; icon: string }> = {
    quote: { label: "观点", icon: "💡" },
    preference: { label: "喜好/忌口", icon: "❤️" },
    background: { label: "背景经历", icon: "💼" },
    fact: { label: "关键事实", icon: "📌" },
};

export function profileSectionMarkdown(person: ContactSummary): string {
    const lines = ["## 人脉基本档案", ""];
    if (person.phone) lines.push(`- **电话**：${person.phone}`);
    if (person.wechat) lines.push(`- **微信**：${person.wechat}`);
    if (person.email) lines.push(`- **邮箱**：${person.email}`);
    if (person.birthday) {
        const bdayStr = person.isLunar ? `${person.birthday}（农历）` : person.birthday;
        lines.push(`- **生日**：${bdayStr}`);
    }
    if (person.group) lines.push(`- **分组**：${person.group}`);
    if (person.tags && person.tags.length > 0) lines.push(`- **标签**：${person.tags.map((t) => `#${t}`).join(" ")}`);
    if (person.profile) {
        const work = profileText(person.profile, "work");
        const edu = profileText(person.profile, "education");
        const fam = profileText(person.profile, "family");
        const rel = profileText(person.profile, "relationship");
        if (work && work !== "—") lines.push(`- **工作单位**：${work}`);
        if (edu && edu !== "—") lines.push(`- **学校**：${edu}`);
        if (fam && fam !== "—") lines.push(`- **家庭**：${fam}`);
        if (rel && rel !== "—") lines.push(`- **与我的关系**：${rel}`);
    }
    if (lines.length <= 2) return "";
    return lines.join("\n");
}

function cleanMarkdownLine(text: string | undefined): string {
    if (!text) return "";
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n+/g, " <br /> ").trim();
}

const INTERACTION_ICONS: Record<string, string> = {
    meeting: "🤝 见面",
    meet: "🤝 见面",
    call: "📞 电话",
    message: "💬 消息",
    meal: "🍽️ 聚餐",
    email: "✉️ 邮件",
    mail: "✉️ 邮件",
    other: "📝 互动",
};

export function interactionSectionMarkdown(events: readonly InteractionEvent[]): string {
    if (events.length === 0) return "";
    const lines = ["## 往来记录", ""];
    for (const event of events) {
        const typeStr = (event.type && INTERACTION_ICONS[event.type]) ? INTERACTION_ICONS[event.type] : "📝 互动";
        let note = cleanMarkdownLine(event.note);
        if (event.externalRef?.startsWith("block:")) {
            const blockId = event.externalRef.slice("block:".length);
            if (/（源自笔记《(.*?)》）/.test(note)) {
                note = note.replace(/（源自笔记《(.*?)》）/, `（源自笔记 [《$1》](siyuan://blocks/${blockId})）`);
            } else if (!note.includes("siyuan://blocks/")) {
                note = note ? `${note} [🔗 原文](siyuan://blocks/${blockId})` : `[🔗 原文](siyuan://blocks/${blockId})`;
            }
        }
        const noteStr = note ? `：${note}` : "";
        lines.push(`- ${event.localDate} ${typeStr}${noteStr}`);
    }
    return lines.join("\n");
}

export function followupsSectionMarkdown(items: readonly FollowUpItem[]): string {
    const valid = items.filter((item) => item.status !== "cancelled");
    if (valid.length === 0) return "";
    const lines = ["## 待办跟进", ""];
    for (const item of valid) {
        const checked = item.status === "done" ? "[x]" : "[ ]";
        const title = cleanMarkdownLine(item.title) || "保持联系";
        lines.push(`- ${checked} 📅${item.dueDate} ${title}`);
    }
    return lines.join("\n");
}

const DIRECTION_LABELS: Record<string, string> = {
    receivable: "应收/收到",
    payable: "应付/送出",
};
const STATUS_LABELS: Record<string, string> = {
    open: "进行中",
    settled: "已结清",
    cancelled: "已取消",
};

export function exchangesSectionMarkdown(items: readonly ExchangeRecord[]): string {
    const valid = items.filter((item) => item.status !== "cancelled");
    if (valid.length === 0) return "";
    const lines = ["## 人情往来", ""];
    for (const item of valid) {
        const dir = DIRECTION_LABELS[item.direction] || "往来";
        const amountStr = item.amount ? ` (${item.currency || "¥"}${item.amount})` : "";
        const statusStr = STATUS_LABELS[item.status] ? ` [${STATUS_LABELS[item.status]}]` : "";
        const dateStr = item.occurredOn || item.dueOn || "";
        const desc = cleanMarkdownLine(item.description);
        lines.push(`- ${dateStr} ${dir}：${desc}${amountStr}${statusStr}`);
    }
    return lines.join("\n");
}

export function anniversariesSectionMarkdown(items: readonly AnniversaryItem[]): string {
    if (items.length === 0) return "";
    const lines = ["## 重要纪念日", ""];
    for (const item of items) {
        const lunarTag = item.isLunar ? "（农历）" : "";
        lines.push(`- ${item.title}：${item.date}${lunarTag}`);
    }
    return lines.join("\n");
}

export function relatedSectionMarkdown(related: readonly ContactSummary[]): string {
    const links = related.map((item) => `[${escapeLinkLabel(item.name)}](siyuan://blocks/${item.docId})`);
    return `**相关人物**：${links.join("、")}`;
}

export function buildFactsSectionMarkdown(items: readonly PersonFactItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 谈资与关键事实", ""];
    for (const item of items) {
        const cat = FACT_CATEGORY_META[item.category] || FACT_CATEGORY_META.fact;
        const cleanText = cleanMarkdownLine(item.text);
        if (!cleanText) continue;
        const source = item.sourceRef ? ` （出处：${escapeLinkLabel(item.sourceRef)}）` : "";
        lines.push(`- ${cat.icon} [${cat.label}] ${item.date}：${cleanText}${source} <!-- id:${item.id} -->`);
    }
    return lines.join("\n");
}

export function parseFactsSectionMarkdown(markdown: string): PersonFactItem[] {
    if (!markdown) return [];
    const items: PersonFactItem[] = [];
    const lines = markdown.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("- ")) continue;
        const match = trimmed.match(/^- (?:(💡|❤️|💼|📌)\s*)?\[(.*?)\]\s*(\d{4}-\d{2}-\d{2})[：:]\s*(.*?)(?:\s*<!--\s*id:([a-zA-Z0-9_-]+)\s*-->)?$/);
        if (match) {
            const label = match[2]?.trim();
            const date = match[3]?.trim();
            let rawContent = match[4]?.trim() || "";
            const id = match[5]?.trim() || `fact-${date}-${Math.random().toString(36).slice(2, 8)}`;

            let sourceRef: string | undefined;
            const sourceMatch = rawContent.match(/（出处：(.*?)）$/);
            if (sourceMatch) {
                sourceRef = sourceMatch[1];
                rawContent = rawContent.replace(/（出处：(.*?)）$/, "").trim();
            }

            let category: FactCategory = "fact";
            if (label.includes("观点")) category = "quote";
            else if (label.includes("喜好") || label.includes("忌口") || label.includes("偏好")) category = "preference";
            else if (label.includes("背景") || label.includes("经历")) category = "background";

            items.push({
                id,
                date,
                category,
                text: rawContent,
                ...(sourceRef ? { sourceRef } : {}),
            });
        }
    }
    return items;
}
