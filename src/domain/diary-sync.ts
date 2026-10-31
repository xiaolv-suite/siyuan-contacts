/**
 * 思源日记（Daily Note）互动双向链接同步纯函数。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 * 深度对齐思源原生块引 ((docId '锚文本')) 与 LifeLog 时间流规范。
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
 * 生成追加到思源当日日记文档中的互动列表项 Markdown（LifeLog 经典时间线格式）：
 * 例：`- 14:30 🤝 与 (( 20261026000000-xxxxxxx '张三' )) 见面：沟通了大模型项目合作协议`
 */
export function buildDailyNoteInteractionMarkdown(input: DiaryInteractionInput): string {
    const meta = input.type && INTERACTION_TYPE_LABELS[input.type]
        ? INTERACTION_TYPE_LABELS[input.type]
        : { label: "互动", icon: "📝" };
    
    const timePrefix = input.occurredTimeStr ? `${input.occurredTimeStr} ` : "";
    const cleanName = escapeLinkLabel(input.personName.trim() || "联系人");
    const personRef = `(( ${input.personDocId} '${cleanName}' ))`;
    
    const noteText = input.note ? input.note.replace(/\r\n/g, " ").replace(/[\r\n]+/g, " ").trim() : "";
    const notePart = noteText ? `：${noteText}` : "";

    return `- ${timePrefix}${meta.icon} 与 ${personRef} ${meta.label}${notePart}`;
}

/**
 * 生成追加到思源当日日记文档中的多人活动/场合列表项 Markdown：
 * 例：`- 🍽️ 活动：大湾区开发者晚餐 @ 深圳湾（与 (( id1 '张三' ))、(( id2 '李四' ))）`
 */
export function buildDailyNoteOccasionMarkdown(input: DiaryOccasionInput): string {
    const icon = input.type === "meal" ? "🍽️" : input.type === "meeting" ? "🤝" : input.type === "party" ? "🎉" : "📅";
    const placeStr = input.place ? ` @ ${escapeMarkdown(input.place)}` : "";
    const attendeeLinks = input.attendees
        .map((a) => `(( ${a.personDocId} '${escapeLinkLabel(a.name.trim() || "联系人")}' ))`)
        .join("、");
    const attendeePart = attendeeLinks ? `（与 ${attendeeLinks}）` : "";
    return `- ${icon} 活动：${escapeMarkdown(input.title)}${placeStr} ${attendeePart}`.trim();
}

export interface DiaryFollowUpTaskInput {
    personDocId: string;
    personName: string;
    title: string;
    dueDate: string;
    priority?: "low" | "medium" | "high";
}

/**
 * 思源原生标准待办任务块：
 * 生成带联系人原生块引的标准复选框任务块，完美契合 Task Horizon 任务视界与 LifeLog 流，绝无任何裸露的大括号乱码。
 * 例：`- [ ] 📅 ${input.dueDate} 拜访 (( 20261026000000-xxxxxxx '张三' ))：讨论技术方案`
 */
export function buildDailyNoteFollowUpTaskMarkdown(input: DiaryFollowUpTaskInput): string {
    const cleanName = escapeLinkLabel(input.personName.trim() || "联系人");
    const rawNote = input.title?.trim() ? input.title.replace(/\r\n/g, " ").replace(/[\r\n]+/g, " ").trim() : "";
    const personRef = `(( ${input.personDocId} '${cleanName}' ))`;
    const notePart = rawNote ? `：${rawNote}` : "";
    return `- [ ] 📅 ${input.dueDate} 拜访 ${personRef}${notePart}`;
}
