/**
 * 家庭与重要亲属关系（Family & Kinship）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 涵盖父母长辈、配偶伴侣、兄弟姐妹、子女与亲属的多层次关系管理。
 */

export type KinshipRole = "parent" | "spouse" | "sibling" | "child" | "relative";

export interface KinshipMemberItem {
    id: string;
    personDocId: string;
    role: KinshipRole;
    name: string;
    relationLabel?: string;
    linkedDocId?: string;
    birthYearOrDate?: string;
    note?: string;
    createdAt: number;
}

export interface PersonKinshipStore {
    schemaVersion: 1;
    kinships: Record<string, KinshipMemberItem[]>;
}

export const KINSHIP_STORE_VERSION = 1;

const VALID_ROLES = new Set<KinshipRole>(["parent", "spouse", "sibling", "child", "relative"]);

export function newKinshipMemberId(): string {
    return `kin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyKinshipStore(): PersonKinshipStore {
    return {
        schemaVersion: KINSHIP_STORE_VERSION,
        kinships: {},
    };
}

export function isValidKinshipRole(val: unknown): val is KinshipRole {
    return typeof val === "string" && VALID_ROLES.has(val as KinshipRole);
}

function sanitizeMember(raw: unknown, expectedPersonDocId?: string): KinshipMemberItem | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;

    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : newKinshipMemberId();
    const personDocId = typeof r.personDocId === "string" && r.personDocId.trim()
        ? r.personDocId.trim()
        : expectedPersonDocId || "";
    if (!personDocId) return null;

    const role: KinshipRole = isValidKinshipRole(r.role) ? r.role : "relative";
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) return null;

    const relationLabel = typeof r.relationLabel === "string" && r.relationLabel.trim() ? r.relationLabel.trim() : undefined;
    const linkedDocId = typeof r.linkedDocId === "string" && r.linkedDocId.trim() ? r.linkedDocId.trim() : undefined;
    const birthYearOrDate = typeof r.birthYearOrDate === "string" && r.birthYearOrDate.trim() ? r.birthYearOrDate.trim() : undefined;
    const note = typeof r.note === "string" && r.note.trim() ? r.note.trim() : undefined;
    const createdAt = typeof r.createdAt === "number" && r.createdAt > 0 ? r.createdAt : Date.now();

    return {
        id,
        personDocId,
        role,
        name,
        ...(relationLabel ? { relationLabel } : {}),
        ...(linkedDocId ? { linkedDocId } : {}),
        ...(birthYearOrDate ? { birthYearOrDate } : {}),
        ...(note ? { note } : {}),
        createdAt,
    };
}

export function normalizeKinshipStore(raw: unknown): PersonKinshipStore {
    if (!raw || typeof raw !== "object") return emptyKinshipStore();
    const r = raw as Record<string, unknown>;
    const kinships: Record<string, KinshipMemberItem[]> = {};

    if (r.kinships && typeof r.kinships === "object" && !Array.isArray(r.kinships)) {
        for (const [docId, list] of Object.entries(r.kinships as Record<string, unknown>)) {
            if (Array.isArray(list)) {
                const validList: KinshipMemberItem[] = [];
                for (const item of list) {
                    const sanitized = sanitizeMember(item, docId);
                    if (sanitized) validList.push(sanitized);
                }
                if (validList.length > 0) {
                    kinships[docId] = validList;
                }
            }
        }
    }

    return {
        schemaVersion: KINSHIP_STORE_VERSION,
        kinships,
    };
}

export function normalizeKinshipStoreForWrite(raw: unknown): PersonKinshipStore {
    if (!raw || typeof raw !== "object") return emptyKinshipStore();
    const r = raw as Record<string, unknown>;
    if ("schemaVersion" in r && r.schemaVersion !== KINSHIP_STORE_VERSION) {
        throw new Error(`亲属关系存储版本不支持（schemaVersion: ${String(r.schemaVersion)}）`);
    }
    return normalizeKinshipStore(raw);
}

export function addKinshipToStore(
    store: PersonKinshipStore,
    item: KinshipMemberItem,
): PersonKinshipStore {
    const sanitized = sanitizeMember(item);
    if (!sanitized) throw new Error("亲属关系条目数据不合法");

    const existingList = store.kinships[sanitized.personDocId] ? [...store.kinships[sanitized.personDocId]] : [];
    const idx = existingList.findIndex((m) => m.id === sanitized.id);
    if (idx >= 0) {
        existingList[idx] = sanitized;
    } else {
        existingList.push(sanitized);
    }

    return {
        ...store,
        kinships: {
            ...store.kinships,
            [sanitized.personDocId]: existingList,
        },
    };
}

export function removeKinshipFromStore(
    store: PersonKinshipStore,
    personDocId: string,
    memberId: string,
): PersonKinshipStore {
    if (!personDocId || !memberId) return store;
    const existingList = store.kinships[personDocId];
    if (!existingList) return store;

    const filtered = existingList.filter((m) => m.id !== memberId);
    const updatedKinships = { ...store.kinships };
    if (filtered.length > 0) {
        updatedKinships[personDocId] = filtered;
    } else {
        delete updatedKinships[personDocId];
    }

    return {
        ...store,
        kinships: updatedKinships,
    };
}

export function groupKinshipByRole(
    members: readonly KinshipMemberItem[],
): Record<KinshipRole, KinshipMemberItem[]> {
    const grouped: Record<KinshipRole, KinshipMemberItem[]> = {
        parent: [],
        spouse: [],
        sibling: [],
        child: [],
        relative: [],
    };

    for (const m of members) {
        if (grouped[m.role]) {
            grouped[m.role].push(m);
        } else {
            grouped.relative.push(m);
        }
    }

    return grouped;
}
