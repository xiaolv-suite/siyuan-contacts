/**
 * 联系人自管闪念速记便签板（Person Scratchpad & Ephemeral Memo Pinboard）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 用于临时灵感、未成型事实或通话闪念便签的沉淀，支持置顶、多彩分类及转为正式互动。
 */

export type ScratchpadColor = "default" | "warm" | "blue" | "green" | "purple";

export interface PersonScratchpadItem {
    id: string; // "scb-xxxx"
    personDocId: string;
    content: string; // 便签正文
    pinned: boolean; // 是否置顶
    color: ScratchpadColor; // 便签色调分类
    createdAt: number;
    updatedAt: number;
}

export interface PersonScratchpadStore {
    schemaVersion: 1;
    notes: Record<string, PersonScratchpadItem[]>;
}

export const SCRATCHPAD_STORE_VERSION = 1;

const VALID_COLORS = new Set<ScratchpadColor>(["default", "warm", "blue", "green", "purple"]);

export function newScratchpadId(): string {
    return `scb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidScratchpadColor(val: unknown): val is ScratchpadColor {
    return typeof val === "string" && VALID_COLORS.has(val as ScratchpadColor);
}

export function emptyScratchpadStore(): PersonScratchpadStore {
    return {
        schemaVersion: SCRATCHPAD_STORE_VERSION,
        notes: {},
    };
}

function sanitizeScratchpadItem(raw: unknown, expectedPersonDocId?: string): PersonScratchpadItem | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;

    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : newScratchpadId();
    const personDocId = typeof r.personDocId === "string" && r.personDocId.trim()
        ? r.personDocId.trim()
        : expectedPersonDocId || "";
    if (!personDocId) return null;

    const content = typeof r.content === "string" ? r.content.trim() : "";
    if (!content) return null;

    const pinned = Boolean(r.pinned);
    const color: ScratchpadColor = isValidScratchpadColor(r.color) ? r.color : "default";
    const createdAt = typeof r.createdAt === "number" && r.createdAt > 0 ? r.createdAt : Date.now();
    const updatedAt = typeof r.updatedAt === "number" && r.updatedAt > 0 ? r.updatedAt : Date.now();

    return {
        id,
        personDocId,
        content,
        pinned,
        color,
        createdAt,
        updatedAt,
    };
}

export function sortScratchpadItems(items: readonly PersonScratchpadItem[]): PersonScratchpadItem[] {
    return [...items].sort((a, b) => {
        if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1;
        }
        return b.updatedAt - a.updatedAt;
    });
}

export function normalizeScratchpadStore(raw: unknown): PersonScratchpadStore {
    if (!raw || typeof raw !== "object") return emptyScratchpadStore();
    const r = raw as Record<string, unknown>;
    const notes: Record<string, PersonScratchpadItem[]> = {};

    if (r.notes && typeof r.notes === "object" && !Array.isArray(r.notes)) {
        for (const [docId, list] of Object.entries(r.notes as Record<string, unknown>)) {
            if (Array.isArray(list)) {
                const validList: PersonScratchpadItem[] = [];
                for (const item of list) {
                    const sanitized = sanitizeScratchpadItem(item, docId);
                    if (sanitized) validList.push(sanitized);
                }
                if (validList.length > 0) {
                    notes[docId] = sortScratchpadItems(validList);
                }
            }
        }
    }

    return {
        schemaVersion: SCRATCHPAD_STORE_VERSION,
        notes,
    };
}

export function normalizeScratchpadStoreForWrite(raw: unknown): PersonScratchpadStore {
    if (!raw || typeof raw !== "object") return emptyScratchpadStore();
    const r = raw as Record<string, unknown>;
    if ("schemaVersion" in r && r.schemaVersion !== SCRATCHPAD_STORE_VERSION) {
        throw new Error(`速记便签存储版本不支持（schemaVersion: ${String(r.schemaVersion)}）`);
    }
    return normalizeScratchpadStore(raw);
}

export function addScratchpadItem(
    store: PersonScratchpadStore,
    item: PersonScratchpadItem,
): PersonScratchpadStore {
    const sanitized = sanitizeScratchpadItem(item);
    if (!sanitized) throw new Error("便签内容不能为空");

    const existingList = store.notes[sanitized.personDocId] ? [...store.notes[sanitized.personDocId]] : [];
    const idx = existingList.findIndex((n) => n.id === sanitized.id);
    if (idx >= 0) {
        existingList[idx] = sanitized;
    } else {
        existingList.unshift(sanitized);
    }

    return {
        ...store,
        notes: {
            ...store.notes,
            [sanitized.personDocId]: sortScratchpadItems(existingList),
        },
    };
}

export function updateScratchpadItem(
    store: PersonScratchpadStore,
    personDocId: string,
    noteId: string,
    patch: Partial<Omit<PersonScratchpadItem, "id" | "personDocId" | "createdAt">>,
): PersonScratchpadStore {
    if (!personDocId || !noteId) return store;
    const existingList = store.notes[personDocId];
    if (!existingList) return store;

    const idx = existingList.findIndex((n) => n.id === noteId);
    if (idx < 0) return store;

    const cur = existingList[idx];
    const updated: PersonScratchpadItem = {
        ...cur,
        ...patch,
        updatedAt: Date.now(),
    };

    const nextList = [...existingList];
    nextList[idx] = updated;

    return {
        ...store,
        notes: {
            ...store.notes,
            [personDocId]: sortScratchpadItems(nextList),
        },
    };
}

export function removeScratchpadItem(
    store: PersonScratchpadStore,
    personDocId: string,
    noteId: string,
): PersonScratchpadStore {
    if (!personDocId || !noteId) return store;
    const existingList = store.notes[personDocId];
    if (!existingList) return store;

    const filtered = existingList.filter((n) => n.id !== noteId);
    const updated = { ...store.notes };
    if (filtered.length > 0) {
        updated[personDocId] = filtered;
    } else {
        delete updated[personDocId];
    }

    return {
        ...store,
        notes: updated,
    };
}
