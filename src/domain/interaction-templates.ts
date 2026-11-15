/**
 * 互动备注模板（F09）：为见面/电话/聚会等场景保存可复用备注，应用时纯本地变量替换。
 * 模板文本不发送 AI；应用模板不自动提交、不悄悄覆盖已有草稿（由调用方确认）。
 * 存储契约见 docs/DATA-CONTRACT.md §3 interaction-templates.json。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */

export interface NoteTemplate {
    id: string;
    name: string;
    content: string;
}

export const TEMPLATES_STORE_VERSION = 1;
export const TEMPLATES_LIMIT = 50;

/** 内置默认模板：涵盖见面、通话、商务拜访、咖啡、宴请、活动、请教、问候等高频场景 */
export const DEFAULT_TEMPLATES: readonly NoteTemplate[] = [
    { id: "tpl-meet", name: "见面", content: "和{{姓名}}见面，聊了……" },
    { id: "tpl-call", name: "电话", content: "和{{姓名}}通电话，主要聊了……" },
    { id: "tpl-party", name: "聚会", content: "在聚会见到{{姓名}}，大家一起……" },
    { id: "tpl-business", name: "商务拜访", content: "【商务拜访】与{{姓名}}（{{公司}} · {{职位}}）沟通合作。\n• 探讨重点：\n• 双方共识：\n• 下次跟进点：" },
    { id: "tpl-coffee", name: "咖啡小聚", content: "【咖啡小聚】在咖啡馆与{{姓名}}交流近况与行业动态，重点谈及……" },
    { id: "tpl-meal", name: "餐饮宴请", content: "【餐叙交流】与{{姓名}}一同就餐，席间聊到……对方关注要点：" },
    { id: "tpl-conference", name: "活动论坛", content: "【行业活动】在活动/论坛中与{{姓名}}碰面交流，要点留存……" },
    { id: "tpl-mentor", name: "请教咨询", content: "【请教咨询】就相关事项向{{姓名}}请教，收获启发：\n1. \n2." },
    { id: "tpl-greeting", name: "日常问候", content: "【日常问候】向{{姓名}}致以问候与关切，对方回复要点……" },
];

/** 获取系统预置精选模板副本 */
export function getDefaultTemplates(): NoteTemplate[] {
    return DEFAULT_TEMPLATES.map((item) => ({ ...item }));
}

/** 模板变量元数据：供 UI 变量插入器和帮助提示展示 */
export interface TemplatePlaceholderMeta {
    readonly key: string;
    readonly labelZh: string;
    readonly labelEn: string;
    readonly descZh: string;
}

export const TEMPLATE_PLACEHOLDERS: readonly TemplatePlaceholderMeta[] = [
    { key: "{{姓名}}", labelZh: "姓名", labelEn: "Name", descZh: "人物完整姓名" },
    { key: "{{日期}}", labelZh: "日期", labelEn: "Date", descZh: "记录当天日期 (YYYY-MM-DD)" },
    { key: "{{上次互动}}", labelZh: "上次互动", labelEn: "Last Interaction", descZh: "最近一次互动日期（无则显示'无'）" },
    { key: "{{公司}}", labelZh: "公司/机构", labelEn: "Company", descZh: "人物所在主机构或公司" },
    { key: "{{职位}}", labelZh: "职位", labelEn: "Title", descZh: "人物职位或头衔" },
    { key: "{{城市}}", labelZh: "城市", labelEn: "City", descZh: "常驻城市或所在地" },
];

/** 模板占位符（应用时纯本地替换） */
export interface TemplateVars {
    /** 人物姓名 → {{姓名}} */
    name: string;
    /** 当天本地日期 → {{日期}} */
    date: string;
    /** 上次互动日期，无则传"无" → {{上次互动}} */
    lastInteraction: string;
    /** 公司/机构 → {{公司}} 或 {{机构}} */
    company?: string;
    /** 职位/头衔 → {{职位}} */
    title?: string;
    /** 城市/所在地 → {{城市}} */
    city?: string;
}

/** 单次扫描原模板；替换值按字面保留，不再解释其中的占位符或 $ 替换语法。 */
export function renderTemplate(content: string, vars: TemplateVars): string {
    const values: Readonly<Record<string, string>> = {
        "{{姓名}}": vars.name || "",
        "{{日期}}": vars.date || "",
        "{{上次互动}}": vars.lastInteraction || "无",
        "{{公司}}": vars.company || "",
        "{{机构}}": vars.company || "",
        "{{职位}}": vars.title || "",
        "{{城市}}": vars.city || "",
    };
    return content.replace(/\{\{(?:姓名|日期|上次互动|公司|机构|职位|城市)\}\}/g, (placeholder) => values[placeholder] ?? placeholder);
}

/** 在文本指定光标位置或末尾插入占位符变量 */
export function insertPlaceholderToContent(
    content: string,
    placeholder: string,
    selectionStart?: number,
    selectionEnd?: number,
): { newContent: string; newCursor: number } {
    if (typeof selectionStart !== "number" || typeof selectionEnd !== "number" || selectionStart < 0 || selectionEnd < 0) {
        const next = content + placeholder;
        return { newContent: next, newCursor: next.length };
    }
    const before = content.slice(0, selectionStart);
    const after = content.slice(selectionEnd);
    const newContent = before + placeholder + after;
    const newCursor = selectionStart + placeholder.length;
    return { newContent, newCursor };
}

function isNoteTemplate(raw: unknown): raw is NoteTemplate {
    if (raw === null || typeof raw !== "object") return false;
    const item = raw as Partial<NoteTemplate>;
    return typeof item.id === "string" && item.id.length > 0 &&
        typeof item.name === "string" && item.name.trim().length > 0 &&
        typeof item.content === "string";
}

/** 归一化：丢弃坏条目、name/content 去首尾空白、按 id 去重、截断到上限；非法输入回退空数组 */
export function normalizeTemplates(raw: unknown): NoteTemplate[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const result: NoteTemplate[] = [];
    for (const item of raw) {
        if (result.length >= TEMPLATES_LIMIT) break;
        if (!isNoteTemplate(item) || seen.has(item.id)) continue;
        seen.add(item.id);
        result.push({ id: item.id, name: item.name.trim(), content: item.content.trim() });
    }
    return result;
}

/** 写入边界必须完整接受或拒绝，不能把用户草稿静默截断或丢弃。 */
export function normalizeTemplatesForWrite(raw: unknown): NoteTemplate[] {
    if (!Array.isArray(raw)) throw new Error("模板列表格式不正确，未保存");
    if (raw.length > TEMPLATES_LIMIT) throw new Error(`互动备注模板最多 ${TEMPLATES_LIMIT} 条，请先减少条目后重试；未保存`);
    const seen = new Set<string>();
    return raw.map((item, index) => {
        if (!isNoteTemplate(item) || !item.id.trim()) throw new Error(`第 ${index + 1} 条模板的标识、名称或内容格式不正确，未保存`);
        if (seen.has(item.id)) throw new Error(`第 ${index + 1} 条模板的标识重复，未保存`);
        seen.add(item.id);
        return { id: item.id, name: item.name.trim(), content: item.content.trim() };
    });
}

/** 新模板 ID（本地生成，存储内唯一性由调用方以 normalize 去重兜底） */
export function newTemplateId(): string {
    return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
