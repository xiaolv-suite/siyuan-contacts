/**
 * 联系人交往生命周期阶段与历程演进纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 将人际交往关系从浅到深演进管理：初相识 -> 常交流 -> 共合作 -> 核心挚友 (或自然沉睡维护)。
 */

import { toLocalDateKey } from "./date-key.ts";

export type RelationshipStageKey = "acquaintance" | "connection" | "collaboration" | "close_ally" | "dormant";

export interface StageTransitionRecord {
    stage: RelationshipStageKey;
    changedAt: string; // YYYY-MM-DD
    note?: string; // 阶段变迁备忘
    timestamp: number;
}

export interface PersonLifecycleRecord {
    personDocId: string;
    currentStage: RelationshipStageKey;
    history: StageTransitionRecord[];
    updatedAt: number;
}

export interface PersonLifecycleStore {
    schemaVersion: 1;
    records: Record<string, PersonLifecycleRecord>;
}

export interface StageMeta {
    key: RelationshipStageKey;
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
    suggestedCadenceDays: number;
}

export const LIFECYCLE_STORE_VERSION = 1;

export const LIFECYCLE_STAGES: readonly StageMeta[] = [
    {
        key: "acquaintance",
        label: "初相识 · 浅交探索",
        shortLabel: "初识",
        icon: "🌱",
        description: "刚建立连接，正在探索共同背景与兴趣交集",
        suggestedCadenceDays: 30,
    },
    {
        key: "connection",
        label: "常交流 · 互信升温",
        shortLabel: "交流",
        icon: "💬",
        description: "保持日常沟通与话题互动，互信逐步升温",
        suggestedCadenceDays: 14,
    },
    {
        key: "collaboration",
        label: "共合作 · 价值共创",
        shortLabel: "共创",
        icon: "🚀",
        description: "正在开展项目合作、业务往来或深度互助支持",
        suggestedCadenceDays: 7,
    },
    {
        key: "close_ally",
        label: "核心挚友 · 深度盟友",
        shortLabel: "挚友",
        icon: "⭐",
        description: "互信极高、托付心事的核心伙伴或长期同盟",
        suggestedCadenceDays: 10,
    },
    {
        key: "dormant",
        label: "沉睡维护 · 适时问候",
        shortLabel: "沉睡",
        icon: "💤",
        description: "阶段性平稳少联络，适宜重要日期与节日温情唤醒",
        suggestedCadenceDays: 90,
    },
];

const STAGE_META_MAP = new Map<RelationshipStageKey, StageMeta>(
    LIFECYCLE_STAGES.map((s) => [s.key, s])
);

export function isValidStageKey(val: unknown): val is RelationshipStageKey {
    return typeof val === "string" && STAGE_META_MAP.has(val as RelationshipStageKey);
}

export function getStageMeta(stage: unknown): StageMeta {
    if (isValidStageKey(stage)) {
        return STAGE_META_MAP.get(stage)!;
    }
    return STAGE_META_MAP.get("acquaintance")!;
}

export function emptyLifecycleStore(): PersonLifecycleStore {
    return {
        schemaVersion: LIFECYCLE_STORE_VERSION,
        records: {},
    };
}

function sanitizeTransitionRecord(raw: unknown): StageTransitionRecord | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const stage: RelationshipStageKey = isValidStageKey(r.stage) ? r.stage : "acquaintance";
    const changedAt = typeof r.changedAt === "string" && r.changedAt.trim()
        ? r.changedAt.trim()
        : toLocalDateKey(new Date());
    const note = typeof r.note === "string" && r.note.trim() ? r.note.trim() : undefined;
    const timestamp = typeof r.timestamp === "number" && r.timestamp > 0 ? r.timestamp : Date.now();

    return {
        stage,
        changedAt,
        ...(note ? { note } : {}),
        timestamp,
    };
}

function sanitizeLifecycleRecord(raw: unknown, expectedPersonDocId?: string): PersonLifecycleRecord | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const personDocId = typeof r.personDocId === "string" && r.personDocId.trim()
        ? r.personDocId.trim()
        : expectedPersonDocId || "";
    if (!personDocId) return null;

    const currentStage: RelationshipStageKey = isValidStageKey(r.currentStage) ? r.currentStage : "acquaintance";
    const history: StageTransitionRecord[] = [];
    if (Array.isArray(r.history)) {
        for (const item of r.history) {
            const sanitized = sanitizeTransitionRecord(item);
            if (sanitized) history.push(sanitized);
        }
    }
    const updatedAt = typeof r.updatedAt === "number" && r.updatedAt > 0 ? r.updatedAt : Date.now();

    return {
        personDocId,
        currentStage,
        history,
        updatedAt,
    };
}

export function normalizeLifecycleStore(raw: unknown): PersonLifecycleStore {
    if (!raw || typeof raw !== "object") return emptyLifecycleStore();
    const r = raw as Record<string, unknown>;
    const records: Record<string, PersonLifecycleRecord> = {};

    if (r.records && typeof r.records === "object" && !Array.isArray(r.records)) {
        for (const [docId, item] of Object.entries(r.records as Record<string, unknown>)) {
            const sanitized = sanitizeLifecycleRecord(item, docId);
            if (sanitized) {
                records[docId] = sanitized;
            }
        }
    }

    return {
        schemaVersion: LIFECYCLE_STORE_VERSION,
        records,
    };
}

export function normalizeLifecycleStoreForWrite(raw: unknown): PersonLifecycleStore {
    if (!raw || typeof raw !== "object") return emptyLifecycleStore();
    const r = raw as Record<string, unknown>;
    if ("schemaVersion" in r && r.schemaVersion !== LIFECYCLE_STORE_VERSION) {
        throw new Error(`交往生命周期存储版本不支持（schemaVersion: ${String(r.schemaVersion)}）`);
    }
    return normalizeLifecycleStore(raw);
}

export function getPersonLifecycle(
    store: PersonLifecycleStore,
    personDocId: string,
): PersonLifecycleRecord {
    if (!personDocId || !store.records[personDocId]) {
        return {
            personDocId,
            currentStage: "acquaintance",
            history: [],
            updatedAt: Date.now(),
        };
    }
    return store.records[personDocId]!;
}

export function updatePersonStage(
    store: PersonLifecycleStore,
    personDocId: string,
    nextStage: RelationshipStageKey,
    dateStr?: string,
    note?: string,
): PersonLifecycleStore {
    if (!personDocId) return store;
    const stageKey: RelationshipStageKey = isValidStageKey(nextStage) ? nextStage : "acquaintance";
    const currentRecord = getPersonLifecycle(store, personDocId);

    const now = Date.now();
    const today = (dateStr || toLocalDateKey(new Date())).trim();

    const transition: StageTransitionRecord = {
        stage: stageKey,
        changedAt: today,
        ...(note?.trim() ? { note: note.trim() } : {}),
        timestamp: now,
    };

    const nextRecord: PersonLifecycleRecord = {
        personDocId,
        currentStage: stageKey,
        history: [transition, ...currentRecord.history],
        updatedAt: now,
    };

    return {
        ...store,
        records: {
            ...store.records,
            [personDocId]: nextRecord,
        },
    };
}

/** 批量为多位联系人更新交往生命周期阶段并追加演进历史 */
export function batchUpdatePersonStages(
    store: PersonLifecycleStore,
    personDocIds: readonly string[],
    nextStage: RelationshipStageKey,
    dateStr?: string,
    note?: string,
): { nextStore: PersonLifecycleStore; updatedCount: number } {
    let currentStore = store;
    let updatedCount = 0;
    const stageKey: RelationshipStageKey = isValidStageKey(nextStage) ? nextStage : "acquaintance";

    for (const docId of personDocIds) {
        if (!docId.trim()) continue;
        currentStore = updatePersonStage(currentStore, docId.trim(), stageKey, dateStr, note);
        updatedCount += 1;
    }

    return { nextStore: currentStore, updatedCount };
}
