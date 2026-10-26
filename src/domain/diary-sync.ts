/**
 * 思源日记（Daily Note）互动双向链接同步纯函数。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */
import type { InteractionType } from "./interactions.ts";
import { INTERACTION_TYPE_LABELS } from "./interactions.ts";
import { escapeLinkLabel, escapeMarkdown } from "./format.ts";

export interface DiaryInteractionInput {
    personDocId: string;
    personName: string;
    type?: InteractionType;
    note?: string;
    occurredTimeStr?: string;
}

export interface DiaryOccasionInput {
    title: string;
    type?: string;
    date: string;
    place?: string;
    attendees: readonly { personDocId: string; name: string }[];
}

/**
 * 生成追加到思源当日日记文档中的互动列表项 Markdown：
 * 例：`- 🤝 14:30 与 [张三](siyuan://blocks/20261026000000-xxxxxxx) 见面：沟通了大模型项目合作协议`
 */
export function buildDailyNoteInteractionMarkdown(input: DiaryInteractionInput): string {
    const meta = input.type && INTERACTION_TYPE_LABELS[input.type]
        ? INTERACTION_TYPE_LABELS[input.type]
        : { label: "互动", icon: "📝" };
    
    const timePrefix = input.occurredTimeStr ? `${input.occurredTimeStr} ` : "";
    const cleanName = escapeLinkLabel(input.personName.trim() || "联系人");
    const personLink = `[${cleanName}](siyuan://blocks/${input.personDocId})`;
    
    const noteText = input.note ? input.note.replace(/\r\n/g, " ").replace(/[\r\n]+/g, " ").trim() : "";
    const notePart = noteText ? `：${noteText}` : "";

    return `- ${meta.icon} ${timePrefix}与 ${personLink} ${meta.label}${notePart}`;
}

/**
 * 生成追加到思源当日日记文档中的多人活动/场合列表项 Markdown：
 * 例：`- 🍽️ 活动：大湾区开发者晚餐 @ 深圳湾（与 [张三](siyuan://blocks/id1)、[李四](siyuan://blocks/id2)）`
 */
export function buildDailyNoteOccasionMarkdown(input: DiaryOccasionInput): string {
    const icon = input.type === "meal" ? "🍽️" : input.type === "meeting" ? "🤝" : input.type === "party" ? "🎉" : "📅";
    const placeStr = input.place ? ` @ ${escapeMarkdown(input.place)}` : "";
    const attendeeLinks = input.attendees
        .map((a) => `[${escapeLinkLabel(a.name.trim() || "联系人")}](siyuan://blocks/${a.personDocId})`)
        .join("、");
    const attendeePart = attendeeLinks ? `（与 ${attendeeLinks}）` : "";
    return `- ${icon} 活动：${escapeMarkdown(input.title)}${placeStr} ${attendeePart}`.trim();
}
