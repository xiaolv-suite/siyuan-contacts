/** 人物补充资料以原生单段落中的可见 JSON 为事实，不投影到 AV 联系方式。 */

export const PERSON_FIELDS_ATTR = "custom-lvct-person-fields";
export const PERSON_FIELDS_FORMAT_ATTR = "custom-lvct-person-fields-format";
export const PERSON_FIELDS_TITLE = "补充资料";
export const MAX_PERSON_FIELDS_ITEMS = 100;
export const MAX_PERSON_FIELD_LABEL_LENGTH = 80;
export const MAX_PERSON_FIELD_VALUE_LENGTH = 2000;
export const MAX_PERSON_FIELDS_JSON_LENGTH = 100000;

export type PersonField =
    | { id: string; kind: "group"; label: string }
    | { id: string; kind: "entry"; label: string; value: string; parentId?: string };

export interface PersonFieldsSnapshot {
    schemaVersion: 1;
    ownerDocId: string;
    items: PersonField[];
}

export interface PersonFieldsState {
    blockId?: string;
    snapshot: PersonFieldsSnapshot;
}

export interface PersonFieldsBlock {
    id: string;
    type: string;
    content: string;
    format?: string;
}

const NODE_ID = /^\d{14}-[0-9a-z]{7}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LABEL_CONTROLS = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/;
// LF 和 Tab 是多行值的可见文本；CR 在进入此边界前统一为 LF。
const VALUE_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u2028\u2029]/;

function assertOwnerDocId(docId: string): void {
    if (typeof docId !== "string" || !NODE_ID.test(docId)) throw new Error("补充资料人物文档 ID 无效");
}

function record(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)
        || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${label}格式无效`);
    return value as Record<string, unknown>;
}

function knownKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
    if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !allowed.includes(key))) {
        throw new Error(`${label}含未知字段`);
    }
}

function uuid(value: unknown, label: string): string {
    if (typeof value !== "string" || !UUID_V4.test(value)) throw new Error(`${label}必须是 UUID v4`);
    return value.toLowerCase();
}

function fieldLabel(value: unknown): string {
    if (typeof value !== "string" || LABEL_CONTROLS.test(value)) throw new Error("补充资料名称格式无效或含控制字符");
    const label = value.trim();
    if (!label || label.length > MAX_PERSON_FIELD_LABEL_LENGTH) throw new Error(`补充资料名称须为 1–${MAX_PERSON_FIELD_LABEL_LENGTH} 个字符`);
    return label;
}

function normalizeItems(value: unknown): PersonField[] {
    if (!Array.isArray(value) || value.length > MAX_PERSON_FIELDS_ITEMS) throw new Error(`补充资料最多 ${MAX_PERSON_FIELDS_ITEMS} 项且必须为数组`);
    if (Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)).some((present) => !present)
        || Reflect.ownKeys(value).some((key) => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) {
        throw new Error("补充资料数组含缺项或未知属性");
    }
    const ids = new Set<string>();
    const items = value.map((raw): PersonField => {
        const item = record(raw, "补充资料条目");
        if (item.kind !== "group" && item.kind !== "entry") throw new Error("补充资料条目类型无效");
        knownKeys(item, item.kind === "group" ? ["id", "kind", "label"] : ["id", "kind", "label", "value", "parentId"], "补充资料条目");
        const id = uuid(item.id, "补充资料条目标识");
        if (ids.has(id)) throw new Error("补充资料条目标识重复");
        ids.add(id);
        const label = fieldLabel(item.label);
        if (item.kind === "group") return { id, kind: "group", label };
        if (typeof item.value !== "string") throw new Error("补充资料条目值必须为字符串");
        const text = item.value.replace(/\r\n?/g, "\n");
        if (VALUE_CONTROLS.test(text)) throw new Error("补充资料条目值含控制字符");
        if (text.length > MAX_PERSON_FIELD_VALUE_LENGTH) throw new Error(`补充资料条目值不能超过 ${MAX_PERSON_FIELD_VALUE_LENGTH} 个字符`);
        if (Object.hasOwn(item, "parentId")) return { id, kind: "entry", label, value: text, parentId: uuid(item.parentId, "补充资料上级标识") };
        return { id, kind: "entry", label, value: text };
    });
    const groups = new Set(items.filter((item) => item.kind === "group").map((item) => item.id));
    if (items.some((item) => item.kind === "entry" && item.parentId !== undefined && !groups.has(item.parentId))) {
        throw new Error("补充资料上级必须是当前快照的顶层分组，不能悬空或循环");
    }
    return items;
}

export function emptyPersonFields(docId: string): PersonFieldsSnapshot {
    assertOwnerDocId(docId);
    return { schemaVersion: 1, ownerDocId: docId, items: [] };
}

/** 严格校验整份快照；不丢弃坏项，不把未知格式归为空资料。 */
export function normalizePersonFields(value: unknown, ownerDocId: string): PersonFieldsSnapshot {
    assertOwnerDocId(ownerDocId);
    const snapshot = record(value, "补充资料快照");
    knownKeys(snapshot, ["schemaVersion", "ownerDocId", "items"], "补充资料快照");
    if (snapshot.schemaVersion !== 1) throw new Error("补充资料版本无效或不受支持");
    if (snapshot.ownerDocId !== ownerDocId) throw new Error("补充资料所属人物不一致，未自动认领文档副本");
    const normalized: PersonFieldsSnapshot = { schemaVersion: 1, ownerDocId, items: normalizeItems(snapshot.items) };
    if (JSON.stringify(normalized).length > MAX_PERSON_FIELDS_JSON_LENGTH) throw new Error(`补充资料 JSON 不能超过 ${MAX_PERSON_FIELDS_JSON_LENGTH} 个字符`);
    return normalized;
}

/** 属性顺序固定、条目次序保留，供编辑基线和写后回读逐字核对。 */
export function personFieldsKey(snapshot: PersonFieldsSnapshot): string {
    return JSON.stringify(normalizePersonFields(snapshot, snapshot.ownerDocId));
}

/** 标记与全部正文在同一次 DOM 块写入中保存；空快照仍生成持久段落。 */
export function buildPersonFieldsDom(snapshot: PersonFieldsSnapshot, blockId: string): string {
    if (typeof blockId !== "string" || !NODE_ID.test(blockId) || blockId === snapshot.ownerDocId) throw new Error("补充资料块 ID 无效");
    const json = personFieldsKey(snapshot).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    return `<div data-node-id="${blockId}" data-type="NodeParagraph" class="p" ${PERSON_FIELDS_ATTR}="1" ${PERSON_FIELDS_FORMAT_ATTR}="1"><div contenteditable="true"><strong>${PERSON_FIELDS_TITLE}</strong><br />${json}</div></div>`;
}

/** 生成人类可读的 Markdown 补充资料区块（包含两层分组与条目，带隐式数据注释） */
export function buildPersonFieldsMarkdown(snapshot: PersonFieldsSnapshot): string {
    const lines = [`## ${PERSON_FIELDS_TITLE}`, ""];
    const groups = snapshot.items.filter((item): item is Extract<PersonField, { kind: "group" }> => item.kind === "group");
    const topEntries = snapshot.items.filter((item): item is Extract<PersonField, { kind: "entry" }> => item.kind === "entry" && !item.parentId);

    if (snapshot.items.length === 0) {
        lines.push("- *（暂无补充条目）*");
    } else {
        for (const group of groups) {
            lines.push(`- **${group.label}** <!-- lvct-id:${group.id} -->`);
            const children = snapshot.items.filter((item): item is Extract<PersonField, { kind: "entry" }> => item.kind === "entry" && item.parentId === group.id);
            for (const child of children) {
                const cleanVal = (child.value || "").replace(/\r?\n/g, " <br /> ");
                lines.push(`  - ${child.label}：${cleanVal} <!-- lvct-id:${child.id} -->`);
            }
        }
        for (const entry of topEntries) {
            const cleanVal = (entry.value || "").replace(/\r?\n/g, " <br /> ");
            lines.push(`- ${entry.label}：${cleanVal} <!-- lvct-id:${entry.id} -->`);
        }
    }
    const json = personFieldsKey(snapshot);
    lines.push(`<!-- lvct-fields-data:${json} -->`);
    return lines.join("\n");
}

/** JSON.parse 会静默保留同名键的末值；原生手工编辑必须显式拒绝这种歧义。 */
function rejectDuplicateJsonKeys(json: string): void {
    const stack: Array<{ kind: "object" | "array"; keys: Set<string>; expectKey: boolean }> = [];
    for (let index = 0; index < json.length; index += 1) {
        const character = json[index];
        if (character === '"') {
            let end = index + 1;
            while (end < json.length) {
                if (json[end] === "\\") { end += 2; continue; }
                if (json[end] === '"') break;
                end += 1;
            }
            const parent = stack.at(-1);
            if (parent?.kind === "object" && parent.expectKey) {
                const key = JSON.parse(json.slice(index, end + 1)) as string;
                if (parent.keys.has(key)) throw new Error("补充资料 JSON 含重复字段，未选择末值覆盖");
                parent.keys.add(key);
                parent.expectKey = false;
            }
            index = end;
        } else if (character === "{") stack.push({ kind: "object", keys: new Set(), expectKey: true });
        else if (character === "[") stack.push({ kind: "array", keys: new Set(), expectKey: false });
        else if (character === "}" || character === "]") stack.pop();
        else if (character === "," && stack.at(-1)?.kind === "object") stack.at(-1)!.expectKey = true;
    }
}

/** 兼容解析格式 1（单段落 JSON）与格式 2（可读 Markdown + 隐式注释），保留完整数据保真 */
export function parsePersonFieldsBlock(block: PersonFieldsBlock, ownerDocId: string): PersonFieldsSnapshot {
    assertOwnerDocId(ownerDocId);
    if (!block || typeof block.id !== "string" || !NODE_ID.test(block.id) || block.id === ownerDocId
        || (block.type !== "p" && block.type !== "s")
        || typeof block.content !== "string") throw new Error("补充资料块格式或身份无效");

    if (block.format === "1") {
        const prefix = `${PERSON_FIELDS_TITLE}\n`;
        if (!block.content.startsWith(prefix)) throw new Error("补充资料正文标题无效");
        const json = block.content.slice(prefix.length);
        if (!json || /[\r\n]/.test(json) || json.length > MAX_PERSON_FIELDS_JSON_LENGTH) throw new Error("补充资料正文必须为受限单行 JSON");
        let snapshot: unknown;
        try { snapshot = JSON.parse(json); }
        catch { throw new Error("补充资料 JSON 格式无效，请保留原文并核对"); }
        rejectDuplicateJsonKeys(json);
        return normalizePersonFields(snapshot, ownerDocId);
    }

    if (block.format === "2" || block.format === undefined) {
        // 格式 2 或含隐式注释区块：优先尝试还原
        const dataCommentMatch = block.content.match(/<!--\s*lvct-fields-data:([\s\S]*?)\s*-->/);
        if (dataCommentMatch) {
            const json = dataCommentMatch[1].trim();
            let snapshot: unknown;
            try { snapshot = JSON.parse(json); }
            catch { throw new Error("补充资料 JSON 格式无效，请保留原文并核对"); }
            rejectDuplicateJsonKeys(json);
            return normalizePersonFields(snapshot, ownerDocId);
        }

        if (block.content.startsWith(`## ${PERSON_FIELDS_TITLE}`)) {
            return parsePersonFieldsMarkdown(block.content, ownerDocId);
        }
    }

    throw new Error("补充资料块格式或身份无效");
}

/** 从人类可读列表 Markdown 提取补充资料条目 */
export function parsePersonFieldsMarkdown(content: string, ownerDocId: string): PersonFieldsSnapshot {
    assertOwnerDocId(ownerDocId);
    const lines = content.split(/\r?\n/);
    const items: PersonField[] = [];
    let currentGroupId: string | null = null;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed.startsWith("- ")) continue;
        const isChild = rawLine.startsWith("  - ") || rawLine.startsWith("\t- ");

        const idMatch = rawLine.match(/<!--\s*lvct-id:([a-zA-Z0-9_-]+)\s*-->/);
        const assignedId = idMatch ? idMatch[1] : (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`);

        // 分组行：- **分组名**
        const groupMatch = trimmed.match(/^- \*\*(.*?)\*\*(?:\s*<!--.*-->)?$/);
        if (groupMatch && !isChild) {
            const label = groupMatch[1].trim();
            if (label) {
                currentGroupId = assignedId;
                items.push({ id: assignedId, kind: "group", label });
                continue;
            }
        }

        // 条目行：- 名称：内容
        const entryMatch = trimmed.match(/^- (.*?)[：:]([\s\S]*?)(?:\s*<!--.*-->)?$/);
        if (entryMatch) {
            const label = entryMatch[1].replace(/^\*\*(.*?)\*\*$/, "$1").trim();
            const value = entryMatch[2].replace(/<br\s*\/?>/gi, "\n").trim();
            if (label) {
                if (isChild && currentGroupId) {
                    items.push({ id: assignedId, kind: "entry", label, value, parentId: currentGroupId });
                } else {
                    currentGroupId = null;
                    items.push({ id: assignedId, kind: "entry", label, value });
                }
            }
        }
    }

    return normalizePersonFields({ schemaVersion: 1, ownerDocId, items }, ownerDocId);
}

/** 删除分组必须明确选择：解除子项分组，或连同子项移除。 */
export function removePersonField(items: readonly PersonField[], id: string, keepChildren: boolean): PersonField[] {
    if (typeof keepChildren !== "boolean") throw new Error("删除分组必须明确选择是否保留子条目");
    const safeItems = normalizeItems(items);
    const targetId = uuid(id, "补充资料条目标识");
    const target = safeItems.find((item) => item.id === targetId);
    if (!target) throw new Error("补充资料条目不存在，未删除其他条目");
    return safeItems.flatMap((item): PersonField[] => {
        if (item.id === targetId) return [];
        if (target.kind === "group" && item.kind === "entry" && item.parentId === targetId) {
            if (!keepChildren) return [];
            return [{ id: item.id, kind: "entry", label: item.label, value: item.value }];
        }
        return [item];
    });
}

export interface PersonFieldsFilterResult {
    items: PersonField[];
    /** 最终展示的条目数；组名匹配带出的子项计入，分组标题不计入。 */
    matchedEntryCount: number;
}

/** 已核实快照的本地只读筛选；不改变原文、顺序或身份，也不作为编辑草稿。 */
export function filterPersonFields(items: readonly PersonField[], query: string): PersonFieldsFilterResult {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return {
        items: items.map((item) => ({ ...item })),
        matchedEntryCount: items.filter((item) => item.kind === "entry").length,
    };
    const groupIds = new Set(items.filter((item) => item.kind === "group" && item.label.toLowerCase().includes(keyword)).map((item) => item.id));
    const matchingEntries = items.filter((item) => item.kind === "entry"
        && (item.label.toLowerCase().includes(keyword) || item.value.toLowerCase().includes(keyword)
            || item.parentId !== undefined && groupIds.has(item.parentId)));
    const entryIds = new Set(matchingEntries.map((item) => item.id));
    for (const item of matchingEntries) if (item.kind === "entry" && item.parentId !== undefined) groupIds.add(item.parentId);
    return {
        items: items.filter((item) => item.kind === "group" ? groupIds.has(item.id) : entryIds.has(item.id)).map((item) => ({ ...item })),
        matchedEntryCount: matchingEntries.length,
    };
}
