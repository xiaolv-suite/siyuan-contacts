/**
 * Selection-to-Interaction 划词转互动领域解析器
 * 纯函数：全名预选匹配、拼音简拼搜索、载荷构建（含双链）与焦点归还
 */
import type { ContactSummary } from "./person.ts";
import type { InteractionType } from "./interactions.ts";
import { getPinyinInitials } from "./pinyin.ts";
import { toLocalDateKey } from "./interactions.ts";

export interface SelectionInteractionPayload {
    personDocId: string;
    personName: string;
    note: string;
    type: InteractionType;
    occurredAt: number;
    localDate: string;
    blockId?: string;
    externalRef?: string;
}

/**
 * 1. 全名与别名预选解析：从选中文本中寻找匹配的人物
 * 若选区文本包含库内联系人全名（或已知别名），自动选出最匹配的人物（更长匹配优先，同长度出现早者优先）。
 */
export function resolvePreselectedPerson(
    people: readonly ContactSummary[],
    text: string,
): ContactSummary | null {
    if (!text || !text.trim() || !people || people.length === 0) return null;
    const cleanText = text.trim();
    let bestMatch: { person: ContactSummary; length: number; index: number } | null = null;

    for (const person of people) {
        const name = person.name.trim();
        if (name.length >= 2) {
            const idx = cleanText.indexOf(name);
            if (idx !== -1) {
                if (!bestMatch || name.length > bestMatch.length || (name.length === bestMatch.length && idx < bestMatch.index)) {
                    bestMatch = { person, length: name.length, index: idx };
                }
            }
        }
        if (person.aliasProfile?.state === "known") {
            for (const alias of person.aliasProfile.values) {
                const aliasTrim = alias.trim();
                if (aliasTrim.length >= 2) {
                    const idx = cleanText.indexOf(aliasTrim);
                    if (idx !== -1) {
                        if (!bestMatch || aliasTrim.length > bestMatch.length || (aliasTrim.length === bestMatch.length && idx < bestMatch.index)) {
                            bestMatch = { person, length: aliasTrim.length, index: idx };
                        }
                    }
                }
            }
        }
    }

    return bestMatch?.person ?? null;
}

/**
 * 2. 联系人快速搜索（拼音首字母简拼 + 姓名 + 别名 + 手机号）
 */
export function searchPeopleForSelection(
    people: readonly ContactSummary[],
    query: string,
): ContactSummary[] {
    const q = query.trim().toLowerCase();
    if (!q) return [...people];
    const isAscii = /^[a-z0-9]+$/i.test(q);
    return people.filter((person) => {
        const name = person.name.toLowerCase();
        if (name.includes(q)) return true;
        if (isAscii) {
            const initials = getPinyinInitials(person.name).toLowerCase();
            if (initials.includes(q)) return true;
        }
        if (person.aliasProfile?.state === "known") {
            if (person.aliasProfile.values.some((alias) => {
                const a = alias.toLowerCase();
                return a.includes(q) || (isAscii && getPinyinInitials(alias).toLowerCase().includes(q));
            })) {
                return true;
            }
        }
        if (person.phone && person.phone.includes(q)) return true;
        if (person.group && person.group.toLowerCase().includes(q)) return true;
        return false;
    });
}

/**
 * 3. 智能推断推荐互动方式：选区文本若含拨打/电话 -> call，含微信/聊/信息 -> message，否则默认为 meeting
 */
export function inferInteractionTypeFromText(text: string): InteractionType {
    if (!text) return "meeting";
    if (/(电话|通话|拨打|致电|电联|呼叫)/i.test(text)) return "call";
    if (/(微信|发消息|发信息|留言|私信|微聊|聊天|企微)/i.test(text)) return "message";
    return "meeting";
}

/**
 * 4. 构建互动写入载荷（包含 siyuan://blocks/${blockId} 双链）
 */
export function buildSelectionInteractionPayload(params: {
    person: ContactSummary;
    note: string;
    type: InteractionType;
    blockId?: string;
    occurredAt?: number;
}): SelectionInteractionPayload {
    const occurredAt = params.occurredAt ?? Date.now();
    const localDate = toLocalDateKey(new Date(occurredAt));
    const trimmedNote = params.note.trim();
    const blockId = params.blockId?.trim();
    const backlink = blockId ? `siyuan://blocks/${blockId}` : undefined;
    const formattedNote = backlink && !trimmedNote.includes("siyuan://blocks/")
        ? (trimmedNote ? `${trimmedNote} [🔗 原文](${backlink})` : `[🔗 原文](${backlink})`)
        : trimmedNote;

    return {
        personDocId: params.person.docId,
        personName: params.person.name,
        note: formattedNote,
        type: params.type,
        occurredAt,
        localDate,
        blockId,
        externalRef: blockId ? `block:${blockId}` : undefined,
    };
}

/**
 * 5. 焦点交还编辑器（原元素若在 DOM 则聚焦，若不在则回落至 protyle）
 */
export function restoreFocusToEditor(
    previousActive: HTMLElement | null,
    protyleElement?: HTMLElement | null,
): void {
    if (previousActive && previousActive.isConnected) {
        try {
            previousActive.focus({ preventScroll: true });
            return;
        } catch {}
    }
    if (protyleElement && protyleElement.isConnected) {
        const wysiwyg = protyleElement.querySelector<HTMLElement>(".protyle-wysiwyg") || protyleElement;
        try {
            wysiwyg.focus({ preventScroll: true });
        } catch {}
    }
}
