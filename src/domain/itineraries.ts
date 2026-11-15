/**
 * 会客拜访行程备忘与准备清单（E-54）：
 * 纯函数模型。支持规划拜访议程、拟定时间地点、随行人员、待办核验清单（资料/礼品/设备），
 * 并提供一键转已发生交往互动与 Markdown 行程纪要生成。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */
import { StoreIntegrityError } from "./store-integrity.ts";
import { toLocalDateKey, type InteractionEvent } from "./interactions.ts";

export const ITINERARY_STORE_VERSION = 1;
export const MAX_ITINERARIES_PER_PERSON = 20;
export const MAX_CHECKLISTS_PER_ITINERARY = 10;
const DOC_ID_RE = /^\d{14}-[0-9a-z]{7}$/;

export type ItineraryStatus = "planned" | "completed" | "cancelled";

export interface ItineraryChecklistItem {
    id: string;
    text: string;
    done: boolean;
}

export interface PersonItineraryItem {
    id: string;
    personDocId: string;
    title: string;
    targetDate: string; // YYYY-MM-DD
    targetTime?: string; // HH:mm (可选)
    location?: string;
    attendees?: string;
    checklists: readonly ItineraryChecklistItem[];
    note?: string;
    status: ItineraryStatus;
    createdAt: number;
    updatedAt: number;
}

export interface PersonItineraryStore {
    schemaVersion: 1;
    itineraries: Record<string, PersonItineraryItem[]>;
}

export function emptyItineraryStore(): PersonItineraryStore {
    return { schemaVersion: ITINERARY_STORE_VERSION, itineraries: {} };
}

export function newItineraryId(): string {
    return `itn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newChecklistId(): string {
    return `chk-${Math.random().toString(36).slice(2, 8)}`;
}

export function validateItineraryItem(item: Partial<PersonItineraryItem>): string[] {
    const errors: string[] = [];
    if (!item.title || !item.title.trim()) {
        errors.push("行程主题不能为空");
    } else if (item.title.trim().length > 100) {
        errors.push("行程主题不能超过 100 字符");
    }

    if (!item.targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(item.targetDate.trim())) {
        errors.push("行程日期必须为 YYYY-MM-DD 格式");
    }

    if (item.targetTime && !/^\d{2}:\d{2}$/.test(item.targetTime.trim())) {
        errors.push("行程时间格式必须为 HH:mm");
    }

    if (item.location && item.location.trim().length > 120) {
        errors.push("会见地点不能超过 120 字符");
    }

    if (item.attendees && item.attendees.trim().length > 120) {
        errors.push("随行人员不能超过 120 字符");
    }

    if (item.note && item.note.trim().length > 300) {
        errors.push("补充备忘不能超过 300 字符");
    }

    if (item.checklists && item.checklists.length > MAX_CHECKLISTS_PER_ITINERARY) {
        errors.push(`准备核对清单最多 ${MAX_CHECKLISTS_PER_ITINERARY} 项`);
    }

    return errors;
}

function parseChecklist(raw: unknown): ItineraryChecklistItem | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Partial<ItineraryChecklistItem>;
    if (typeof r.id !== "string" || !r.id.trim()) return null;
    if (typeof r.text !== "string" || !r.text.trim()) return null;
    return {
        id: r.id.trim(),
        text: r.text.trim().slice(0, 100),
        done: Boolean(r.done),
    };
}

function parseItineraryItem(raw: unknown): PersonItineraryItem | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Partial<PersonItineraryItem>;
    if (typeof r.id !== "string" || !r.id.trim()) return null;
    if (typeof r.personDocId !== "string" || !DOC_ID_RE.test(r.personDocId)) return null;
    if (typeof r.title !== "string" || !r.title.trim()) return null;
    if (typeof r.targetDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.targetDate.trim())) return null;

    const checklists: ItineraryChecklistItem[] = [];
    if (Array.isArray(r.checklists)) {
        for (const item of r.checklists) {
            const parsed = parseChecklist(item);
            if (parsed) checklists.push(parsed);
            if (checklists.length >= MAX_CHECKLISTS_PER_ITINERARY) break;
        }
    }

    const validStatus: ItineraryStatus = (r.status === "completed" || r.status === "cancelled")
        ? r.status
        : "planned";

    return {
        id: r.id.trim(),
        personDocId: r.personDocId,
        title: r.title.trim().slice(0, 100),
        targetDate: r.targetDate.trim(),
        ...(r.targetTime?.trim() ? { targetTime: r.targetTime.trim() } : {}),
        ...(r.location?.trim() ? { location: r.location.trim().slice(0, 120) } : {}),
        ...(r.attendees?.trim() ? { attendees: r.attendees.trim().slice(0, 120) } : {}),
        checklists,
        ...(r.note?.trim() ? { note: r.note.trim().slice(0, 300) } : {}),
        status: validStatus,
        createdAt: typeof r.createdAt === "number" && Number.isFinite(r.createdAt) ? r.createdAt : Date.now(),
        updatedAt: typeof r.updatedAt === "number" && Number.isFinite(r.updatedAt) ? r.updatedAt : Date.now(),
    };
}

/** 容错读取存储并归一化 */
export function normalizeItineraryStore(raw: unknown): PersonItineraryStore {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return emptyItineraryStore();
    }
    const record = raw as Record<string, unknown>;
    if (record.schemaVersion !== ITINERARY_STORE_VERSION || !record.itineraries || typeof record.itineraries !== "object" || Array.isArray(record.itineraries)) {
        return emptyItineraryStore();
    }

    const itineraries: Record<string, PersonItineraryItem[]> = {};
    for (const [docId, list] of Object.entries(record.itineraries as Record<string, unknown>)) {
        if (!DOC_ID_RE.test(docId) || !Array.isArray(list)) continue;
        const validItems: PersonItineraryItem[] = [];
        const seen = new Set<string>();
        for (const item of list) {
            const parsed = parseItineraryItem(item);
            if (!parsed || seen.has(parsed.id)) continue;
            seen.add(parsed.id);
            validItems.push(parsed);
            if (validItems.length >= MAX_ITINERARIES_PER_PERSON) break;
        }
        if (validItems.length > 0) itineraries[docId] = validItems;
    }
    return { schemaVersion: ITINERARY_STORE_VERSION, itineraries };
}

/** 写入严格校验：版本不兼容或损坏拒绝写入并报定位 */
export function normalizeItineraryStoreForWrite(raw: unknown): PersonItineraryStore {
    if (raw == null || raw === "") return emptyItineraryStore();
    if (typeof raw !== "object" || Array.isArray(raw)) {
        throw new StoreIntegrityError("会客行程", "需要版本化对象");
    }
    const record = raw as Record<string, unknown>;
    if (record.schemaVersion !== ITINERARY_STORE_VERSION) {
        throw new StoreIntegrityError("会客行程", "版本不兼容");
    }
    if (!record.itineraries || typeof record.itineraries !== "object" || Array.isArray(record.itineraries)) {
        throw new StoreIntegrityError("会客行程", "条目容器必须为对象映射");
    }

    const map = record.itineraries as Record<string, unknown>;
    const entries = Object.entries(map);
    for (let i = 0; i < entries.length; i++) {
        const [docId, list] = entries[i];
        if (!DOC_ID_RE.test(docId)) {
            throw new StoreIntegrityError("会客行程", `人物文档 ID 无效（${docId}）`, entries.length, i);
        }
        if (!Array.isArray(list)) {
            throw new StoreIntegrityError("会客行程", `人物行程列表必须为数组（${docId}）`, entries.length, i);
        }
        const seen = new Set<string>();
        for (let j = 0; j < list.length; j++) {
            const item = list[j];
            const parsed = parseItineraryItem(item);
            if (!parsed) {
                throw new StoreIntegrityError("会客行程", `行程条目字段或规则无效（${docId}）`, list.length, j);
            }
            if (seen.has(parsed.id)) {
                throw new StoreIntegrityError("会客行程", `行程条目 ID 重复（${parsed.id}）`, list.length, j);
            }
            seen.add(parsed.id);
        }
    }
    return normalizeItineraryStore(raw);
}

/** 一键将已完成的会客行程转为交往互动事件（可在时间线/人脉履历中沉淀） */
export function deriveInteractionFromItinerary(
    item: PersonItineraryItem,
    personName: string,
    occurredAt: number = Date.now(),
): InteractionEvent {
    const loc = item.location ? `在 ${item.location} ` : "";
    let note = `【会面拜访】${loc}与 ${personName} 会见交流。\n• 主题：${item.title}`;
    if (item.attendees) {
        note += `\n• 随行/参会人员：${item.attendees}`;
    }
    if (item.checklists.length > 0) {
        const doneCount = item.checklists.filter((c) => c.done).length;
        note += `\n• 行前准备：${doneCount}/${item.checklists.length} 项已备妥`;
    }
    if (item.note) {
        note += `\n• 事项备忘：${item.note}`;
    }

    return {
        id: `itn-${item.id}-${occurredAt}`,
        personDocId: item.personDocId,
        occurredAt,
        localDate: item.targetDate || toLocalDateKey(new Date(occurredAt)),
        source: "manual",
        externalRef: item.id,
        note,
    };
}

/** 按状态与关键词过滤行程条目 */
export function filterItineraries(
    items: readonly PersonItineraryItem[],
    statusFilter: "all" | ItineraryStatus = "all",
    query = "",
): PersonItineraryItem[] {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (!q) return true;
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchLoc = (item.location ?? "").toLowerCase().includes(q);
        const matchAtt = (item.attendees ?? "").toLowerCase().includes(q);
        const matchNote = (item.note ?? "").toLowerCase().includes(q);
        return matchTitle || matchLoc || matchAtt || matchNote;
    });
}

/** 生成结构化行程 Markdown 文本，供外部复制或嵌入笔记 */
export function formatItineraryMarkdown(item: PersonItineraryItem, personName: string): string {
    const lines: string[] = [
        `### 🗓️ 会面拜访备忘 · ${personName}`,
        `- **会见主题**：${item.title}`,
        `- **拟定时间**：${item.targetDate}${item.targetTime ? ` ${item.targetTime}` : ""}`,
        `- **会见地点**：${item.location || "待定"}`,
        `- **参会/随行人员**：${item.attendees || "无"}`,
    ];

    if (item.checklists.length > 0) {
        lines.push("- **行前核对清单**：");
        for (const c of item.checklists) {
            lines.push(`  - [${c.done ? "x" : " "}] ${c.text}`);
        }
    }

    if (item.note) {
        lines.push(`- **备忘要点**：\n  ${item.note.replace(/\n/g, "\n  ")}`);
    }

    return lines.join("\n");
}

/** 纯函数：在 store 中添加或更新一条行程 */
export function addOrUpdateItineraryInStore(
    store: PersonItineraryStore,
    item: PersonItineraryItem,
): PersonItineraryStore {
    const list = store.itineraries[item.personDocId] ? [...store.itineraries[item.personDocId]] : [];
    const index = list.findIndex((i) => i.id === item.id);
    if (index >= 0) {
        list[index] = { ...item, updatedAt: Date.now() };
    } else {
        list.unshift({ ...item, updatedAt: Date.now() });
        if (list.length > MAX_ITINERARIES_PER_PERSON) {
            list.pop();
        }
    }
    return {
        ...store,
        itineraries: {
            ...store.itineraries,
            [item.personDocId]: list,
        },
    };
}

/** 纯函数：从 store 中移除一条行程 */
export function removeItineraryFromStore(
    store: PersonItineraryStore,
    personDocId: string,
    itineraryId: string,
): PersonItineraryStore {
    const list = store.itineraries[personDocId] ?? [];
    const nextList = list.filter((i) => i.id !== itineraryId);
    const nextItineraries = { ...store.itineraries };
    if (nextList.length > 0) {
        nextItineraries[personDocId] = nextList;
    } else {
        delete nextItineraries[personDocId];
    }
    return {
        ...store,
        itineraries: nextItineraries,
    };
}

/** 纯函数：在 store 中切换行程核对项勾选状态 */
export function toggleChecklistInStore(
    store: PersonItineraryStore,
    personDocId: string,
    itineraryId: string,
    checklistId: string,
): PersonItineraryStore {
    const list = store.itineraries[personDocId] ?? [];
    const item = list.find((i) => i.id === itineraryId);
    if (!item) return store;

    const nextChecklists = item.checklists.map((c) =>
        c.id === checklistId ? { ...c, done: !c.done } : c
    );
    const nextItem: PersonItineraryItem = {
        ...item,
        checklists: nextChecklists,
        updatedAt: Date.now(),
    };
    return addOrUpdateItineraryInStore(store, nextItem);
}
