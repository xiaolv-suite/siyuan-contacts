/**
 * UX-01.11 展示格式统一：相对互动时间与月日格式的共享助手。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */

/** 相对互动时间文案：0=今天互动、1=昨天互动、其余 N 天前互动 */
export function formatRelativeInteraction(daysAgo: number): string {
    if (daysAgo <= 0) return "今天互动";
    if (daysAgo === 1) return "昨天互动";
    return `${daysAgo} 天前互动`;
}

/** YYYY-MM-DD → "M月D日"（非契约格式原样返回） */
export function formatMonthDay(iso: string): string {
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return iso;
    return `${Number(match[2])}月${Number(match[3])}日`;
}

export function validateDocumentTitle(title: string): string | null {
    if (!title.trim()) return "文档名称不能为空";
    if (/[\/\u0000-\u001f\u007f]/.test(title)) return "文档名称不能包含斜杠或控制字符（含换行），思源内核无法原文保留这类名称";
    return null;
}

/**
 * 联系人姓名专用校验（思源 3.8.8+ 解除斜杠限制，支持 张三 / CTO 复合命名）。
 * 允许包含半角斜杠，严格拦截换行与控制字符。
 */
export function validatePersonName(name: string): string | null {
    if (!name.trim()) return "姓名不能为空";
    if (/[\u0000-\u001f\u007f]/.test(name)) return "姓名不能包含控制字符（含换行），思源内核无法原文保留这类名称";
    return null;
}

/**
 * 将路径段内的半角斜杠安全转义为全角斜杠，防止思源文件树将复合名称（如 张三 / CTO）误切分为多级子目录。
 */
export function sanitizeHPathSegment(segment: string): string {
    return segment.trim().replace(/\//g, "／");
}

export function documentHPath(...segments: readonly string[]): string {
    if (!segments.length) throw new Error("文档路径不能为空");
    return "/" + segments.map((segment) => {
        const error = validateDocumentTitle(segment);
        if (error) throw new Error(error);
        return segment.trim();
    }).join("/");
}

export const DEFAULT_CONTACTS_HUB_ROOT = "/03-小驴人脉";

export function isContactsHubNotebookName(name: string | undefined): boolean {
    if (!name) return false;
    return (
        name.includes("小驴空间") ||
        name.includes("小驴笔记本") ||
        name.includes("小驴生态统一测试空间")
    );
}

export function resolveContactsRootSegments(settings: { notebookName?: string; rootPath?: string }): string[] {
    const rawRoot = settings.rootPath?.trim() || (isContactsHubNotebookName(settings.notebookName) ? DEFAULT_CONTACTS_HUB_ROOT : "");
    if (!rawRoot) return [];
    return rawRoot.split("/").map((s) => s.trim()).filter(Boolean);
}

/** 统一小驴空间下归入 /03-小驴人脉/人物档案/<姓名>；独立笔记本保持兼容路径 */
export function personDocumentHPath(settings: { notebookName: string; rootPath?: string }, personName: string): string {
    const rootSegs = resolveContactsRootSegments(settings);
    if (rootSegs.length > 0) {
        return documentHPath(...rootSegs, "人物档案", sanitizeHPathSegment(personName));
    }
    return documentHPath(settings.notebookName, personName);
}

/** 统一小驴空间下归入 /03-小驴人脉/组织与机构/<组织名> */
export function orgDocumentHPath(settings: { notebookName?: string; rootPath?: string }, orgName: string): string {
    const rootSegs = resolveContactsRootSegments(settings);
    if (rootSegs.length > 0) {
        return documentHPath(...rootSegs, "组织与机构", sanitizeHPathSegment(orgName));
    }
    return documentHPath(orgName);
}

/** 统一小驴空间下为次级沉淀文档（简报/闪卡/人情账/周报/回顾/里程碑等）挂载 /03-小驴人脉 前缀 */
export function qualifyContactsSubHPath(
    settings: { notebookName?: string; rootPath?: string } | null | undefined,
    subHPath: string,
): string {
    const cleanSub = subHPath.startsWith("/") ? subHPath : `/${subHPath}`;
    if (!settings) return cleanSub;
    const rootSegs = resolveContactsRootSegments(settings);
    if (rootSegs.length === 0) return cleanSub;
    const prefix = "/" + rootSegs.join("/");
    if (cleanSub === prefix || cleanSub.startsWith(prefix + "/")) return cleanSub;
    return `${prefix}${cleanSub}`;
}

export function escapeMarkdown(text: string): string {
    return text.replace(/([\\`*_\[\]#<>])/g, "\\$1");
}

/**
 * C-14：Markdown 链接标签文本转义。
 * 保证含 `[`、`]`、`\` 或换行的人名/组织名不会破坏 `[标签](siyuan://blocks/...)` 的 Markdown 链接语法结构。
 */
export function escapeLinkLabel(value: string): string {
    return value.trim().replace(/[\r\n]+/g, " ").replace(/([\\\[\]])/g, "\\$1");
}

export function markdownHeading(title: string): string {
    return `# ${escapeMarkdown(title.trim())}\n\n`;
}

/**
 * 生成合法节点 ID（yyyyMMddHHmmss-xxxxxxx，同 Lute.NewNodeID 格式）。
 * 仅作标识符使用，无加密语义，随机性要求与内核同源。
 */
export function newNodeId(now: Date = new Date()): string {
    const pad = (value: number, width: number) => String(value).padStart(width, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`;
    const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
    let rand = "";
    for (let i = 0; i < 7; i += 1) {
        rand += charset[Math.floor(Math.random() * charset.length)];
    }
    return `${stamp}-${rand}`;
}

const WINDOWS_RESERVED_NAMES = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/**
 * K-11：跨平台安全文件名清洗。
 * 过滤 Windows/macOS/Linux 非法字符（/\:*?"<>|）、控制字符、尾随空格/点号，并做安全长度截断。
 */
export function sanitizeFileName(name: string, fallback = "未命名", maxLength = 64): string {
    const raw = typeof name === "string" ? name.trim() : "";
    if (!raw) return fallback;
    let cleaned = raw
        .replace(/[<>:"/\\|?*\u0000-\u001F\u007F]/g, "_")
        .trim()
        .replace(/[. ]+$/g, "");
    if (WINDOWS_RESERVED_NAMES.test(cleaned)) {
        cleaned = `_${cleaned}`;
    }
    if (cleaned.length > maxLength) {
        cleaned = cleaned.slice(0, maxLength).trim().replace(/[. ]+$/g, "");
    }
    return cleaned || fallback;
}

export const BLOCK_ID_REGEX = /^\d{14}-[a-z0-9]{7}$/;

export function assertSafeBlockId(id: string, label = "块 ID"): void {
    if (typeof id !== "string" || !BLOCK_ID_REGEX.test(id)) {
        throw new Error(`${label}不是合法的思源块 ID: ${id}`);
    }
}

export function escapeSqlString(value: string): string {
    return String(value ?? "").replace(/'/g, "''");
}

/**
 * 清洗思源双链/块引语法 ((id "文本")) 为流畅纯净的可见文本
 */
export function cleanBlockRefText(text: string): string {
    if (!text) return "";
    return text.replace(/\(\(\d{14}-[a-z0-9]{7}(?:\s+["']([^"']+)["'])?\)\)/g, (_match, anchor) => anchor || "链接")
        .replace(/\s+/g, " ")
        .trim();
}
