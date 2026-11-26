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
import { CHANNEL_TYPE_MAP, type ChannelType, type ContactChannel } from "./person-channels.ts";
import { getCategoryMeta, newSocialPreferenceId, type PersonSocialPreferenceItem, type SocialPreferenceCategory } from "./social-preferences.ts";
import { newPromiseId, type PersonPromiseItem, type PromiseDirection } from "./promises.ts";
import { formatContactLocation, type ContactLocations } from "./china-regions.ts";
import { newProjectId, getProjectStatusMeta, type PersonProjectItem, type ProjectStatus } from "./projects.ts";
import type { PersonTopicItem } from "./topics.ts";
import type { GiftIdeaItem } from "./gift-ideas.ts";
import type { PersonScratchpadItem } from "./person-scratchpad.ts";

export const RELATED_SECTION_ATTR = "custom-lvct-related";
export const INTERACTIONS_SECTION_ATTR = "custom-lvct-interactions";
export const PROFILE_SECTION_ATTR = "custom-lvct-profile";
export const FOLLOWUPS_SECTION_ATTR = "custom-lvct-followups";
export const EXCHANGES_SECTION_ATTR = "custom-lvct-exchanges";
export const ANNIVERSARIES_SECTION_ATTR = "custom-lvct-anniversaries";
export const FACTS_SECTION_ATTR = "custom-lvct-facts";
export const CHANNELS_SECTION_ATTR = "custom-lvct-channels-section";
export const SOCIAL_PREFERENCES_SECTION_ATTR = "custom-lvct-social-preferences";
export const PROMISES_SECTION_ATTR = "custom-lvct-promises";
export const PROJECTS_SECTION_ATTR = "custom-lv-projects-section";
export const TOPICS_SECTION_ATTR = "custom-lv-topics-section";
export const GIFT_IDEAS_SECTION_ATTR = "custom-lv-gift-ideas-section";
export const SCRATCHPAD_SECTION_ATTR = "custom-lv-scratchpad-section";

export type FactCategory = "quote" | "preference" | "background" | "fact";

export interface PersonFactItem {
    id: string;
    text: string;
    category: FactCategory;
    date: string;
    sourceRef?: string;
    /** 当 category === "preference" 且为饮食过敏或社交敏感禁忌时为 true */
    isTaboo?: boolean;
}

export const FACT_CATEGORY_META: Record<FactCategory, { label: string; icon: string }> = {
    quote: { label: "观点", icon: "💡" },
    preference: { label: "喜好/忌口", icon: "❤️" },
    background: { label: "背景经历", icon: "💼" },
    fact: { label: "关键事实", icon: "📌" },
};

export interface ProfileSectionDetails {
    origin?: {
        metAt?: string;
        introducedByDocId?: string;
        introducedByName?: string;
    } | null;
    kinships?: readonly {
        role?: string;
        relationLabel?: string;
        relation?: string;
        name: string;
        linkedDocId?: string;
    }[];
    locations?: ContactLocations | null;
}

export function profileSectionMarkdown(person: ContactSummary, details?: ProfileSectionDetails): string {
    const lines = ["## 人脉基本档案", ""];
    if (person.phone) lines.push(`- **电话**：${person.phone}`);
    if (person.wechat) lines.push(`- **微信**：${person.wechat}`);
    if (person.email) lines.push(`- **邮箱**：${person.email}`);
    if (person.birthday) {
        const bdayStr = person.isLunar ? `${person.birthday}（农历）` : person.birthday;
        lines.push(`- **生日**：${bdayStr}`);
    }
    const locations = details?.locations ?? person.locations;
    const residentText = formatContactLocation(locations?.resident);
    const hometownText = formatContactLocation(locations?.hometown);
    if (residentText) lines.push(`- **常住地**：${residentText}`);
    if (hometownText) lines.push(`- **籍贯**：${hometownText}`);
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
    if (details?.origin) {
        const parts: string[] = [];
        if (details.origin.metAt) parts.push(details.origin.metAt);
        if (details.origin.introducedByDocId) {
            const anchor = details.origin.introducedByName ? ` '${escapeLinkLabel(details.origin.introducedByName)}'` : "";
            parts.push(`引荐人 ((${details.origin.introducedByDocId}${anchor}))`);
        } else if (details.origin.introducedByName) {
            parts.push(`引荐人 ${escapeLinkLabel(details.origin.introducedByName)}`);
        }
        if (parts.length > 0) {
            lines.push(`- **初识与引荐**：${parts.join(" · ")}`);
        }
    }
    if (details?.kinships && details.kinships.length > 0) {
        const roleLabels: Record<string, string> = {
            parent: "长辈",
            spouse: "配偶",
            sibling: "兄弟姐妹",
            child: "子女",
            relative: "亲属",
        };
        const kinItems = details.kinships.map((k) => {
            const rel = k.relation || k.relationLabel || (k.role && roleLabels[k.role]) || "亲属";
            if (k.linkedDocId) {
                return `${rel} ((${k.linkedDocId} '${escapeLinkLabel(k.name)}'))`;
            }
            return `${rel} ${escapeLinkLabel(k.name)}`;
        });
        lines.push(`- **家庭亲属**：${kinItems.join(" · ")}`);
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

export function followupsSectionMarkdown(items: readonly FollowUpItem[], personDocId?: string, personName?: string): string {
    const valid = items.filter((item) => item.status !== "cancelled");
    if (valid.length === 0) return "";
    const lines = ["## 待办跟进", ""];
    for (const item of valid) {
        const checked = item.status === "done" ? "[x]" : "[ ]";
        const title = cleanMarkdownLine(item.title) || "保持联系";
        const status = item.status === "done" ? "done" : "todo";
        const cleanName = personName ? escapeLinkLabel(personName) : "";
        const remarkAttr = personDocId ? ` custom-remark="(( ${personDocId} '${cleanName}名片' ))"` : "";
        lines.push(`- ${checked} 📅${item.dueDate} ${title} {: custom-status="${status}" custom-priority="medium" custom-completion-time="${item.dueDate}"${remarkAttr} }`);
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
    const links = related.map((item) => `((${item.docId} '${escapeLinkLabel(item.name)}'))`);
    return `**相关人物**：${links.join("、")}`;
}

export function buildFactsSectionMarkdown(items: readonly PersonFactItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 谈资与关键事实", ""];
    for (const item of items) {
        const cat = FACT_CATEGORY_META[item.category] || FACT_CATEGORY_META.fact;
        const cleanText = cleanMarkdownLine(item.text);
        if (!cleanText) continue;
        const isTaboo = item.category === "preference" && Boolean(item.isTaboo);
        const icon = isTaboo ? "🚫" : cat.icon;
        const label = isTaboo ? "忌口红线" : cat.label;
        const source = item.sourceRef ? ` （出处：${escapeLinkLabel(item.sourceRef)}）` : "";
        lines.push(`- ${icon} [${label}] ${item.date}：${cleanText}${source} <!-- id:${item.id} -->`);
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
        const match = trimmed.match(/^- (?:(💡|❤️|💼|📌|🚫)\s*)?\[(.*?)\]\s*(\d{4}-\d{2}-\d{2})[：:]\s*(.*?)(?:\s*<!--\s*id:([a-zA-Z0-9_-]+)\s*-->)?$/);
        if (match) {
            const leadIcon = match[1]?.trim();
            const label = match[2]?.trim() || "";
            const date = match[3]?.trim();
            let rawContent = match[4]?.trim() || "";
            const id = match[5]?.trim() || `fact-${date}-${Math.random().toString(36).slice(2, 8)}`;

            let sourceRef: string | undefined;
            const sourceMatch = rawContent.match(/（出处：(.*?)）$/);
            if (sourceMatch) {
                sourceRef = sourceMatch[1];
                rawContent = rawContent.replace(/（出处：(.*?)）$/, "").trim();
            }

            const isTaboo = leadIcon === "🚫" || label.includes("忌口红线") || label.includes("禁忌");
            let category: FactCategory = "fact";
            if (isTaboo) category = "preference";
            else if (label.includes("观点")) category = "quote";
            else if (label.includes("喜好") || label.includes("忌口") || label.includes("偏好")) category = "preference";
            else if (label.includes("背景") || label.includes("经历")) category = "background";

            items.push({
                id,
                date,
                category,
                text: rawContent,
                ...(sourceRef ? { sourceRef } : {}),
                ...(isTaboo ? { isTaboo: true } : {}),
            });
        }
    }
    return items;
}

const CHANNEL_ICON_FALLBACK: Record<ChannelType, string> = {
    phone: "📱",
    wechat: "💬",
    email: "✉️",
    landline: "☎️",
    im: "🗨️",
    social: "🌐",
    address: "📍",
    custom: "🏷️",
};

/**
 * 将多维通讯条目渲染为思源原生 Markdown 受控区块。
 * 标题使用 ## 📞 通讯与联系方式，条目包含图标、类型标签、值与主条目标记，
 * 末尾附带 HTML 注释 <!-- id:... --> 用于无损反向解析。
 */
export function channelsSectionMarkdown(channels: readonly ContactChannel[]): string {
    if (!channels || channels.length === 0) return "";
    const lines = ["## 📞 通讯与联系方式", ""];
    for (const ch of channels) {
        if (!ch || !ch.value?.trim()) continue;
        const icon = (CHANNEL_TYPE_MAP[ch.type]?.icon) || CHANNEL_ICON_FALLBACK[ch.type] || "🏷️";
        const typeLabel = CHANNEL_TYPE_MAP[ch.type]?.label || "联系方式";
        const isDefaultLabel = !ch.label
            || ch.label.trim() === typeLabel
            || (ch.type === "phone" && (ch.label === "手机" || ch.label === "手机号"))
            || (ch.type === "wechat" && (ch.label === "微信" || ch.label === "微信号"))
            || (ch.type === "email" && (ch.label === "邮箱" || ch.label === "电子邮箱"))
            || (ch.type === "address" && ch.label === "地址");
        const tag = !isDefaultLabel ? ` [${ch.label.trim()}]` : "";
        const primaryTag = ch.isPrimary ? " *(主)*" : "";
        const idComment = ch.id ? ` <!-- id:${ch.id} -->` : "";
        lines.push(`- ${icon} **${typeLabel}**${tag}：${ch.value.trim()}${primaryTag}${idComment}`);
    }
    if (lines.length <= 2) return "";
    return lines.join("\n");
}

/**
 * 反向解析：从文档正文的通讯与联系方式受控区块还原为 ContactChannel 列表。
 * 具备高度容错性，即使用户手动在思源中增删改条目也能安全识别。
 */
export function parseChannelsSectionMarkdown(markdown: string): ContactChannel[] {
    if (!markdown) return [];
    const channels: ContactChannel[] = [];
    const lines = markdown.split(/\r?\n/);

    const iconToType: Record<string, ChannelType> = {
        "📱": "phone",
        "💬": "wechat",
        "✉️": "email",
        "☎️": "landline",
        "🗨️": "im",
        "🌐": "social",
        "📍": "address",
        "🏷️": "custom",
    };

    const labelToType: Record<string, ChannelType> = {
        手机号: "phone",
        手机: "phone",
        微信号: "wechat",
        微信: "wechat",
        电子邮箱: "email",
        邮箱: "email",
        "电话/座机": "landline",
        座机: "landline",
        电话: "landline",
        即时通讯: "im",
        社交主页: "social",
        社交: "social",
        地址: "address",
        常驻地: "address",
        自定义: "custom",
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("- ")) continue;

        const idMatch = trimmed.match(/<!--\s*id:([a-zA-Z0-9_-]+)\s*-->/);
        const id = idMatch ? idMatch[1] : `chan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const cleanLine = trimmed.replace(/<!--\s*id:[a-zA-Z0-9_-]+\s*-->/, "").trim();

        const match = cleanLine.match(/^- (?:([^\*]+?)\s+)?\*\*(.*?)\*\*(?:\s*\[(.*?)\])?[：:]\s*(.*?)$/);
        if (match) {
            const icon = match[1]?.trim();
            const rawTypeStr = match[2]?.trim() || "";
            const customLabel = match[3]?.trim();
            let valueWithPrimary = match[4]?.trim() || "";

            const isPrimary = /\*\(主\)\*|\(主\)|\[主\]/i.test(valueWithPrimary);
            const value = valueWithPrimary.replace(/\s*(\*\(主\)\*|\(主\)|\[主\])\s*$/i, "").trim();

            if (!value) continue;

            let type: ChannelType = "custom";
            if (icon && iconToType[icon]) {
                type = iconToType[icon];
            } else if (labelToType[rawTypeStr]) {
                type = labelToType[rawTypeStr];
            } else if (/phone|tel/i.test(rawTypeStr)) {
                type = "phone";
            } else if (/wechat|wx/i.test(rawTypeStr)) {
                type = "wechat";
            } else if (/mail/i.test(rawTypeStr)) {
                type = "email";
            } else if (/address|addr/i.test(rawTypeStr)) {
                type = "address";
            }

            const label = customLabel || rawTypeStr || CHANNEL_TYPE_MAP[type]?.label || "联系方式";

            channels.push({
                id,
                type,
                label,
                value,
                ...(isPrimary ? { isPrimary: true } : {}),
            });
        }
    }

    return channels;
}

/**
 * 将联系人自管社交偏好与交往忌口档案渲染为思源原生 Markdown 受控区块。
 * 包含饮食、饮品、会面习惯与敏感雷区等红线标注，末尾附带 <!-- id:... --> 注释。
 */
export function socialPreferencesSectionMarkdown(items: readonly PersonSocialPreferenceItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 🌟 个人偏好与交往禁忌", ""];
    for (const item of items) {
        if (!item || !item.content?.trim()) continue;
        const meta = getCategoryMeta(item.category);
        const isTaboo = item.isTaboo || item.category === "taboos";
        const icon = isTaboo ? "🚫" : meta.icon;
        const tabooTag = isTaboo ? " *(忌口/雷区)*" : "";
        const idComment = item.id ? ` <!-- id:${item.id} -->` : "";
        lines.push(`- ${icon} **${meta.label}**：${item.content.trim()}${tabooTag}${idComment}`);
    }
    if (lines.length <= 2) return "";
    return lines.join("\n");
}

/**
 * 将双向承诺与信诺履约追踪记录渲染为思源原生 Markdown 受控区块。
 * 区分“我承诺对方”与“对方承诺我”，以及待履行 - [ ] 与已兑现 - [x] 任务语法。
 */
export function promisesSectionMarkdown(items: readonly PersonPromiseItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 🤝 彼此承诺与信诺约定", ""];
    for (const item of items) {
        if (!item || !item.title?.trim()) continue;
        const checked = item.status === "fulfilled" ? "[x]" : "[ ]";
        const dirLabel = item.direction === "they_promised" ? "【对方承诺我】" : "【我承诺对方】";
        const dateStr = item.promisedOn ? `${item.promisedOn} ` : "";
        const dueStr = item.dueOn ? ` (约定：${item.dueOn})` : "";
        const fulfilledStr = item.fulfilledOn ? ` (已兑现：${item.fulfilledOn})` : "";
        const detailStr = item.detail ? ` —— ${cleanMarkdownLine(item.detail)}` : "";
        const idComment = item.id ? ` <!-- id:${item.id} -->` : "";
        lines.push(`- ${checked} ${dateStr}${dirLabel}${item.title.trim()}${detailStr}${dueStr}${fulfilledStr}${idComment}`);
    }
    if (lines.length <= 2) return "";
    return lines.join("\n");
}

/**
 * 反向解析：从文档正文的个人偏好受控区块还原为 PersonSocialPreferenceItem 列表（自愈读取）
 */
export function parseSocialPreferencesSectionMarkdown(markdown: string, personDocId: string): PersonSocialPreferenceItem[] {
    if (!markdown) return [];
    const items: PersonSocialPreferenceItem[] = [];
    const lines = markdown.split(/\r?\n/);

    const labelToCategory: Record<string, SocialPreferenceCategory> = {
        "饮食偏好与忌口": "dietary",
        "饮食偏好": "dietary",
        "饮食忌口": "dietary",
        "忌口": "dietary",
        "茶酒咖啡饮品": "beverage",
        "茶酒咖啡": "beverage",
        "饮品偏好": "beverage",
        "饮品": "beverage",
        "会面与交往习惯": "habits",
        "交往习惯": "habits",
        "会面习惯": "habits",
        "习惯": "habits",
        "敏感话题与雷区": "taboos",
        "敏感话题": "taboos",
        "雷区": "taboos",
        "禁忌": "taboos",
    };

    const iconToCategory: Record<string, SocialPreferenceCategory> = {
        "🍲": "dietary",
        "☕": "beverage",
        "🤝": "habits",
        "🚫": "taboos",
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("- ")) continue;

        const idMatch = trimmed.match(/<!--\s*id:([a-zA-Z0-9_-]+)\s*-->/);
        const id = idMatch ? idMatch[1] : newSocialPreferenceId();
        const cleanLine = trimmed.replace(/<!--\s*id:[a-zA-Z0-9_-]+\s*-->/, "").trim();

        const match = cleanLine.match(/^- (?:([^\*]+?)\s+)?\*\*(.*?)\*\*[：:]\s*(.*?)$/);
        if (match) {
            const icon = match[1]?.trim();
            const label = match[2]?.trim();
            let rawContent = match[3]?.trim() || "";

            const isTaboo = /\*\(忌口\/雷区\)\*|\(忌口\/雷区\)|\(雷区\)|\[雷区\]/i.test(rawContent) || icon === "🚫" || label === "敏感话题与雷区";
            const content = rawContent.replace(/\s*(\*\(忌口\/雷区\)\*|\(忌口\/雷区\)|\(雷区\)|\[雷区\])\s*$/i, "").trim();
            if (!content) continue;

            let category: SocialPreferenceCategory = "dietary";
            if (icon && iconToCategory[icon]) category = iconToCategory[icon];
            else if (label && labelToCategory[label]) category = labelToCategory[label];

            items.push({
                id,
                personDocId,
                category,
                content,
                isTaboo,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
    }
    return items;
}

/**
 * 反向解析：从文档正文的信诺履约受控区块还原为 PersonPromiseItem 列表（自愈读取）
 */
export function parsePromisesSectionMarkdown(markdown: string, personDocId: string): PersonPromiseItem[] {
    if (!markdown) return [];
    const items: PersonPromiseItem[] = [];
    const lines = markdown.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("- [ ]") && !trimmed.startsWith("- [x]") && !trimmed.startsWith("- [X]")) continue;

        const idMatch = trimmed.match(/<!--\s*id:([a-zA-Z0-9_-]+)\s*-->/);
        const id = idMatch ? idMatch[1] : newPromiseId();
        const cleanLine = trimmed.replace(/<!--\s*id:[a-zA-Z0-9_-]+\s*-->/, "").trim();

        const isFulfilled = cleanLine.startsWith("- [x]") || cleanLine.startsWith("- [X]");
        const rest = cleanLine.slice(5).trim();

        const dateMatch = rest.match(/^(\d{4}-\d{2}-\d{2})\s+/);
        const promisedOn = dateMatch ? dateMatch[1] : "";
        let body = dateMatch ? rest.slice(dateMatch[0].length).trim() : rest;

        let direction: PromiseDirection = "i_promised";
        if (body.startsWith("【对方承诺我】")) {
            direction = "they_promised";
            body = body.slice("【对方承诺我】".length).trim();
        } else if (body.startsWith("【我承诺对方】")) {
            direction = "i_promised";
            body = body.slice("【我承诺对方】".length).trim();
        }

        let dueOn: string | undefined;
        const dueMatch = body.match(/\(约定[：:]\s*(\d{4}-\d{2}-\d{2})\)/);
        if (dueMatch) {
            dueOn = dueMatch[1];
            body = body.replace(/\(约定[：:]\s*(\d{4}-\d{2}-\d{2})\)/, "").trim();
        }

        let fulfilledOn: string | undefined;
        const fulMatch = body.match(/\(已兑现[：:]\s*(\d{4}-\d{2}-\d{2})\)/);
        if (fulMatch) {
            fulfilledOn = fulMatch[1];
            body = body.replace(/\(已兑现[：:]\s*(\d{4}-\d{2}-\d{2})\)/, "").trim();
        }

        let title = body;
        let detail: string | undefined;
        if (body.includes(" —— ")) {
            const parts = body.split(" —— ");
            title = parts[0].trim();
            detail = parts.slice(1).join(" —— ").trim();
        }

        if (!title) continue;

        items.push({
            id,
            personDocId,
            direction,
            title,
            ...(detail ? { detail } : {}),
            promisedOn,
            ...(dueOn ? { dueOn } : {}),
            status: isFulfilled ? "fulfilled" : "pending",
            ...(fulfilledOn ? { fulfilledOn } : {}),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    }
    return items;
}

/**
 * 将「协作项目与主题」渲染为思源原生 Markdown 受控区块（custom-lv-projects-section）。
 * 保持可读性且支持双向无损解析与用户手工编辑兼容。
 */
export function projectsSectionMarkdown(items: readonly PersonProjectItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 📁 协作项目与主题", ""];
    for (const item of items) {
        if (!item || !item.title?.trim()) continue;
        const meta = getProjectStatusMeta(item.status);
        const cleanTitle = cleanMarkdownLine(item.title);
        const roleStr = item.role?.trim() ? ` （角色：${cleanMarkdownLine(item.role)}）` : "";
        const docStr = item.docId ? ` · ((${item.docId} '关联文档'))` : "";
        const noteStr = item.note?.trim() ? ` —— ${cleanMarkdownLine(item.note)}` : "";
        const idComment = item.id ? ` <!-- id:${item.id} -->` : "";
        lines.push(`- **${meta.label}**：${cleanTitle}${roleStr}${docStr}${noteStr}${idComment}`);
    }
    if (lines.length <= 2) return "";
    return lines.join("\n");
}

/**
 * 反向解析：从人物文档正文的「协作项目与主题」受控区块还原为 PersonProjectItem 列表。
 * 兼容插件写入格式与用户手工在思源正文增删改后的 Markdown 条目。
 */
export function parseProjectsSectionMarkdown(markdown: string, personDocId: string): PersonProjectItem[] {
    if (!markdown) return [];
    const items: PersonProjectItem[] = [];
    const lines = markdown.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("- ")) continue;

        const idMatch = trimmed.match(/<!--\s*id:([a-zA-Z0-9_-]+)\s*-->/);
        const id = idMatch ? idMatch[1] : newProjectId();
        let body = trimmed.replace(/<!--\s*id:[a-zA-Z0-9_-]+\s*-->/, "").slice(2).trim();

        let status: ProjectStatus = "active";
        const colonStatusMatch = body.match(/^(?:\*\*)?(进行中|已结项|已归档)(?:\*\*)?[：:]\s*/);
        const bracketStatusMatch = body.match(/^(?:(?:🚀|✅|📦)\s*)?(?:\*\*)?\[(进行中|已结项|已归档)\](?:\*\*)?\s*/);
        const statusMatch = colonStatusMatch ?? bracketStatusMatch;
        if (statusMatch) {
            const label = statusMatch[1];
            if (label === "已结项") status = "completed";
            else if (label === "已归档") status = "archived";
            else status = "active";
            body = body.slice(statusMatch[0].length).trim();
        }

        let note: string | undefined;
        const noteSepIdx = body.lastIndexOf(" —— ");
        if (noteSepIdx > 0) {
            note = body.slice(noteSepIdx + 4).replace(/\s*<br\s*\/?>\s*/gi, "\n").trim() || undefined;
            body = body.slice(0, noteSepIdx).trim();
        }

        let docId: string | undefined;
        const refMatch = body.match(/\s*·\s*\(\((\d{14}-[0-9a-z]{7})(?:\s+'[^']*')?\)\)\s*$/);
        if (refMatch) {
            docId = refMatch[1];
            body = body.slice(0, refMatch.index).trim();
        } else {
            const uriMatch = body.match(/\s*·\s*\[[^\]]*\]\(siyuan:\/\/blocks\/(\d{14}-[0-9a-z]{7})\)\s*$/);
            if (uriMatch) {
                docId = uriMatch[1];
                body = body.slice(0, uriMatch.index).trim();
            }
        }

        let role: string | undefined;
        const roleMatch = body.match(/\s*[（(]角色[：:]\s*([^）)]+)[）)]\s*$/);
        if (roleMatch) {
            role = roleMatch[1].trim() || undefined;
            body = body.slice(0, roleMatch.index).trim();
        }

        const title = body.replace(/^\*\*(.*)\*\*$/, "$1").trim();
        if (!title) continue;

        items.push({
            id,
            personDocId,
            title,
            ...(docId ? { docId } : {}),
            status,
            ...(role ? { role } : {}),
            ...(note ? { note } : {}),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    }
    return items;
}

/** 将会面谈资与备忘渲染为思源受控区块（custom-lv-topics-section） */
export function topicsSectionMarkdown(items: readonly PersonTopicItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 💬 会面谈资与备忘", ""];
    for (const item of items) {
        if (!item || !item.text?.trim()) continue;
        const idComment = item.id ? ` <!-- id:${item.id} -->` : "";
        lines.push(`- ${cleanMarkdownLine(item.text)}${idComment}`);
    }
    return lines.length > 2 ? lines.join("\n") : "";
}

/** 将礼物点子与偏好渲染为思源受控区块（custom-lv-gift-ideas-section） */
export function giftIdeasSectionMarkdown(items: readonly GiftIdeaItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 🎁 礼物点子与偏好", ""];
    for (const item of items) {
        if (!item || !item.title?.trim()) continue;
        const typeTag = item.type === "idea" ? "送礼点子" : "喜好偏好";
        const priceTag = item.priceEstimate !== undefined ? ` · 预算¥${item.priceEstimate}` : "";
        const occTag = item.targetOccasion ? ` · ${cleanMarkdownLine(item.targetOccasion)}` : "";
        const idComment = item.id ? ` <!-- id:${item.id} -->` : "";
        lines.push(`- [${typeTag}] ${cleanMarkdownLine(item.title)}${priceTag}${occTag}${idComment}`);
    }
    return lines.length > 2 ? lines.join("\n") : "";
}

/** 将闪念速记便签渲染为思源受控区块（custom-lv-scratchpad-section） */
export function scratchpadSectionMarkdown(items: readonly PersonScratchpadItem[]): string {
    if (!items || items.length === 0) return "";
    const lines = ["## 📝 闪念速记便签", ""];
    for (const item of items) {
        if (!item || !item.content?.trim()) continue;
        const pinTag = item.pinned ? "[置顶] " : "";
        const idComment = item.id ? ` <!-- id:${item.id} -->` : "";
        lines.push(`- ${pinTag}${cleanMarkdownLine(item.content)}${idComment}`);
    }
    return lines.length > 2 ? lines.join("\n") : "";
}

