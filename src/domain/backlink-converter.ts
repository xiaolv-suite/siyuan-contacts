/**
 * 反向链接（Backlinks / 提及）转录为互动事件的纯函数转换引擎。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */
import type { InteractionType } from "./interactions.ts";

export interface BacklinkOccurredInfo {
    occurredAt: number;
    localDate: string;
    sourceKind: "diary_title" | "block_created" | "block_updated" | "doc_id" | "fallback_now";
}

const DATE_REGEX = /(?:^|[^0-9])(20\d{2})[-/年._\s]+(0?[1-9]|1[0-2])[-/月._\s]+(0?[1-9]|[12]\d|3[01])(?:$|[^0-9])/;
const DATE_COMPACT_REGEX = /(?:^|[^0-9])(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^0-9])/;

function padZero(num: number): string {
    return String(num).padStart(2, "0");
}

function parseStamp14(stamp: string | undefined): Date | null {
    if (!stamp || typeof stamp !== "string") return null;
    const match = stamp.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const min = Number(match[5]);
    const sec = Number(match[6]);
    const d = new Date(year, month, day, hour, min, sec);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 精准还原反链段落发生时的历史真实时间戳与日期。
 * 优先级：
 * 1. 日志文档标题/路径中提取的明确日期（Daily Note / 每日日志）；
 * 2. 块在思源中的真实创建时间戳（b.created）；
 * 3. 块更新时间（b.updated）；
 * 4. 所在文档 ID 前 14 位创建时间；
 * 5. 当前时间兜底。
 */
export function parseBacklinkOccurredTime(
    item: {
        docTitle?: string;
        hpath?: string;
        created?: string;
        updated?: string;
        rootId?: string;
        date?: string;
    },
    now: Date = new Date(),
): BacklinkOccurredInfo {
    // 1. 尝试从文档标题或路径提取明确的日历日期（日记场景）
    const pathText = `${item.hpath ?? ""} ${item.docTitle ?? ""}`;
    const dateMatch = pathText.match(DATE_REGEX) || pathText.match(DATE_COMPACT_REGEX);
    if (dateMatch) {
        const year = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        const day = Number(dateMatch[3]);
        const localDate = `${year}-${padZero(month)}-${padZero(day)}`;

        // 如果块自带精确时分秒且同天，则复用时分秒
        const createdDate = parseStamp14(item.created);
        let hour = 12;
        let minute = 0;
        let second = 0;
        if (createdDate && createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month && createdDate.getDate() === day) {
            hour = createdDate.getHours();
            minute = createdDate.getMinutes();
            second = createdDate.getSeconds();
        }
        const target = new Date(year, month - 1, day, hour, minute, second);
        return {
            occurredAt: target.getTime(),
            localDate,
            sourceKind: "diary_title",
        };
    }

    // 2. 从块创建时间 created 解析
    const createdDate = parseStamp14(item.created);
    if (createdDate) {
        const year = createdDate.getFullYear();
        const month = createdDate.getMonth() + 1;
        const day = createdDate.getDate();
        return {
            occurredAt: createdDate.getTime(),
            localDate: `${year}-${padZero(month)}-${padZero(day)}`,
            sourceKind: "block_created",
        };
    }

    // 3. 从块更新时间 updated 解析
    const updatedDate = parseStamp14(item.updated);
    if (updatedDate) {
        const year = updatedDate.getFullYear();
        const month = updatedDate.getMonth() + 1;
        const day = updatedDate.getDate();
        return {
            occurredAt: updatedDate.getTime(),
            localDate: `${year}-${padZero(month)}-${padZero(day)}`,
            sourceKind: "block_updated",
        };
    }

    // 4. 从文档 ID 解析（思源 ID 前 14 位是创建时间戳）
    if (item.rootId && item.rootId.length >= 14) {
        const rootDate = parseStamp14(item.rootId.slice(0, 14));
        if (rootDate) {
            const year = rootDate.getFullYear();
            const month = rootDate.getMonth() + 1;
            const day = rootDate.getDate();
            return {
                occurredAt: rootDate.getTime(),
                localDate: `${year}-${padZero(month)}-${padZero(day)}`,
                sourceKind: "doc_id",
            };
        }
    }

    // 5. 兜底
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return {
        occurredAt: now.getTime(),
        localDate: `${year}-${padZero(month)}-${padZero(day)}`,
        sourceKind: "fallback_now",
    };
}

/**
 * 依据内容语义智能推断互动类型
 */
export function inferInteractionType(content: string): InteractionType {
    const text = content.toLowerCase();

    // 1. 聚餐 / 餐饮
    if (/(?:吃[饭饭午晚餐点夜宵]|聚餐|请客|喝茶|喝咖啡|饮茶|下午茶|喝一杯|品酒|宴请|喝酒|烤肉|火锅|聚会|咖啡厅|餐厅)/.test(text)) {
        return "meal";
    }

    // 2. 电话 / 语音
    if (/(?:电话|致电|通话|打了个?电话|电联|呼叫|微信电话|微信语音|语音沟通|语音通话)/.test(text)) {
        return "call";
    }

    // 3. 邮件
    if (/(?:邮件|发件|回信|收件|email|mail)/.test(text)) {
        return "email";
    }

    // 4. 即时消息 / 微信 / 聊天
    if (/(?:微信|发信|发消息|钉钉|私信|飞书|短信|企微|留言|聊了聊|聊了下|文字沟通|发了[段条个])/.test(text)) {
        return "message";
    }

    // 5. 见面 / 会议 / 拜访
    if (/(?:见面|开会|拜访|面谈|碰头|会谈|交流|讨论|走访|研讨|会晤|接洽|约见|约了|造访|面商|线下|同场)/.test(text)) {
        return "meeting";
    }

    // 默认兜底
    return "other";
}

/**
 * 清洗提炼转录互动备注内容：剥离 Markdown 列表符、任务框与重复双链语法，并附加自然来源出处
 */
export function cleanInteractionNote(rawContent: string, docTitle?: string): string {
    if (!rawContent) return "";
    // 1. 先剥离双链标记语法，但保留换行结构以支持多行列表符清洗
    let cleaned = rawContent.replace(/\(\(\d{14}-[a-z0-9]{7}(?:\s+["']([^"']+)["'])?\)\)/g, (_match, anchor) => anchor || "链接");

    // 2. 清除行首列表符号、引用标记与复选框
    cleaned = cleaned
        .replace(/^[ \t]*[-*+][ \t]+/gm, "")
        .replace(/^[ \t]*\d+[.、][ \t]+/gm, "")
        .replace(/^[ \t]*>[ \t]*/gm, "")
        .replace(/^[ \t]*\[[ xX✓]\][ \t]*/gm, "")
        .replace(/\s+/g, " ")
        .trim();

    // 3. 附加优雅的来源说明（有意义的文档标题才附加）
    const title = docTitle?.trim();
    if (title && title !== "未命名文档" && title !== "未命名" && !cleaned.includes(title)) {
        cleaned = `${cleaned}（源自笔记《${title}》）`;
    }

    return cleaned;
}
