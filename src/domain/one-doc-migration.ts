/**
 * 老用户存量人脉数据「一人一档」幂等迁移与 30 天回滚域模型（纯函数，0 DOM、0 IO）
 *
 * 状态机：
 * IDLE → PREFLIGHT_LOCK_CHECK → BACKUP_CREATED → DRY_RUN_PREVIEWED →
 * MIGRATING_CHUNK → VERIFIED → COMMITTED_SCHEMA_V2 / ROLLBACK_RESTORED
 */

import { sha256Hex } from "./sha256.ts";
import {
    extractLocationsFromPerson,
    type Person,
} from "./region.ts";
import type { ContactLocations } from "./china-regions.ts";
import type { PersonProjectItem } from "./projects.ts";
import type { PersonTopicItem } from "./topics.ts";
import type { GiftIdeaItem } from "./gift-ideas.ts";
import type { PersonScratchpadItem } from "./person-scratchpad.ts";

export const ONE_DOC_MIGRATION_SCHEMA_VERSION = 2;
export const MIGRATION_MANIFEST_KEY = "migration-manifest.json";
export const MIGRATION_BACKUP_KEY = "legacy-one-doc.migrated.bak";
export const MIGRATION_BACKUP_TTL_DAYS = 30;
export const DEFAULT_MIGRATION_CHUNK_SIZE = 50;

export type OneDocMigrationState =
    | "IDLE"
    | "PREFLIGHT_LOCK_CHECK"
    | "BACKUP_CREATED"
    | "DRY_RUN_PREVIEWED"
    | "MIGRATING_CHUNK"
    | "VERIFIED"
    | "COMMITTED_SCHEMA_V2"
    | "ROLLBACK_RESTORED";

export interface MigratedDocRecord {
    docId: string;
    name: string;
    /** 迁移后的业务数据指纹，用于幂等判定和增量续做 */
    fingerprint: string;
    /** 迁移写入并核实后的 custom-lv-locations 原串，用于回滚时判别用户是否后改过常住地/籍贯 */
    migratedLocationsAttr?: string;
    /** 写前登记的拟写入 custom-lv-locations 原串（防止写已落盘但响应失败时漏回滚或误判为用户修改） */
    intendedLocationsAttr?: string;
    /** 根地区属性写入状态：none=无需写入，pending=已持久化意图待核实，verified=已写回核实 */
    locationsWriteState?: "none" | "pending" | "verified";
    /** 写前登记的拟写入目标区块列表（保障写后回读失败时仍可追踪预期落盘区块） */
    intendedSectionAttrs?: string[];
    /** 写前计算的各目标区块预期内容 SHA-256（用于写后核实与未知状态归属比对） */
    expectedBlockHashes?: Record<string, string>;
    /** 写后回读已核实落盘的受控区块属性名集合 */
    writtenSectionAttrs?: string[];
    /** 写入已发出但写后回读失败/结果未知的区块列表（Fail-Closed 保留记录） */
    unknownSectionAttrs?: string[];
    /** 写入并核实后的思源受控区块内容指纹（用于 30 天回滚时检测用户是否手工修改过正文） */
    blockHashes: Record<string, string>;
    migratedAt: number;
    legacyId: string;
}

export interface OneDocMigrationManifest {
    schemaVersion: 2;
    state: OneDocMigrationState;
    updatedAt: number;
    lastBackupKey?: string;
    lastBackupSha256?: string;
    lastBackupExpiresAt?: number;
    pendingCursor: {
        processedDocIds: string[];
        failedDocIds: Record<string, string>;
        chunkIndex: number;
    };
    completedDocIds: Record<string, MigratedDocRecord>;
    /** 单人写入中途中断时保留已写入的局部记录，供续做或 Fail-Closed 回滚精确撤销 */
    partialDocIds?: Record<string, MigratedDocRecord>;
}

export interface PersonLegacyBackupSnapshot {
    docId: string;
    name: string;
    /** 迁移前的 custom-lv-locations 原值（空串代表原不存在） */
    previousLocationsAttr: string;
    /** 迁移前已有受控区块标记属性名列表（回滚时保留原本就已存在的块，仅撤销本次迁移新增块） */
    existingSectionAttrs: string[];
}

export interface OneDocMigrationBackupPayload {
    schemaVersion: 2;
    createdAt: number;
    expiresAt: number;
    people: Record<string, PersonLegacyBackupSnapshot>;
    projectsStore?: unknown;
    topicsStore?: unknown;
    giftIdeasStore?: unknown;
    scratchpadStore?: unknown;
}

export interface OneDocMigrationBackupEnvelope {
    schemaVersion: 2;
    storageKey: typeof MIGRATION_BACKUP_KEY;
    createdAt: number;
    expiresAt: number;
    sha256: string;
    payload: OneDocMigrationBackupPayload;
}

export interface OneDocMigrationPlanItem {
    docId: string;
    name: string;
    legacyId: string;
    needsLocationMigration: boolean;
    residentPreview?: string;
    hometownPreview?: string;
    projectsCount: number;
    topicsCount: number;
    giftIdeasCount: number;
    scratchpadsCount: number;
    alreadySynced: boolean;
    reason?: string;
}

export interface OneDocMigrationDryRun {
    state: OneDocMigrationState;
    totalPeople: number;
    pendingCount: number;
    alreadySyncedCount: number;
    hasValidBackup: boolean;
    backupExpiresAt?: number;
    items: OneDocMigrationPlanItem[];
}

export interface OneDocMigrationResult {
    state: OneDocMigrationState;
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
    failedDetails: Array<{ docId: string; name: string; error: string }>;
    backupKey: string;
    backupSha256: string;
    backupExpiresAt: number;
}

export interface OneDocMigrationRollbackResult {
    state: OneDocMigrationState;
    restoredCount: number;
    removedBlocksCount: number;
    userModifiedPreserved: Array<{ docId: string; name: string; attr: string; reason: string }>;
}

export function deterministicLegacyId(docId: string, kind: string, payload: string): string {
    const digest = sha256Hex(`${docId}|${kind}|${payload}`).slice(0, 16);
    return `legacy-${digest}`;
}

export function emptyMigrationManifest(now = Date.now()): OneDocMigrationManifest {
    return {
        schemaVersion: ONE_DOC_MIGRATION_SCHEMA_VERSION,
        state: "IDLE",
        updatedAt: now,
        pendingCursor: {
            processedDocIds: [],
            failedDocIds: {},
            chunkIndex: 0,
        },
        completedDocIds: {},
    };
}

const VALID_STATES = new Set<OneDocMigrationState>([
    "IDLE",
    "PREFLIGHT_LOCK_CHECK",
    "BACKUP_CREATED",
    "DRY_RUN_PREVIEWED",
    "MIGRATING_CHUNK",
    "VERIFIED",
    "COMMITTED_SCHEMA_V2",
    "ROLLBACK_RESTORED",
]);

export function normalizeMigrationManifest(raw: unknown): OneDocMigrationManifest {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyMigrationManifest();
    const rec = raw as Partial<OneDocMigrationManifest>;
    if (rec.schemaVersion !== ONE_DOC_MIGRATION_SCHEMA_VERSION) return emptyMigrationManifest();
    const state: OneDocMigrationState = typeof rec.state === "string" && VALID_STATES.has(rec.state as OneDocMigrationState)
        ? rec.state as OneDocMigrationState
        : "IDLE";
    const normalizeRecordMap = (mapRaw: unknown): Record<string, MigratedDocRecord> => {
        const out: Record<string, MigratedDocRecord> = {};
        if (!mapRaw || typeof mapRaw !== "object" || Array.isArray(mapRaw)) return out;
        for (const [docId, item] of Object.entries(mapRaw)) {
            if (!item || typeof item !== "object") continue;
            if (typeof item.docId === "string" && typeof item.fingerprint === "string") {
                out[docId] = {
                    docId: item.docId,
                    name: typeof item.name === "string" ? item.name : "",
                    fingerprint: item.fingerprint,
                    ...(typeof item.migratedLocationsAttr === "string" ? { migratedLocationsAttr: item.migratedLocationsAttr } : {}),
                    ...(typeof item.intendedLocationsAttr === "string" ? { intendedLocationsAttr: item.intendedLocationsAttr } : {}),
                    ...(item.locationsWriteState === "none" || item.locationsWriteState === "pending" || item.locationsWriteState === "verified"
                        ? { locationsWriteState: item.locationsWriteState }
                        : {}),
                    ...(Array.isArray(item.intendedSectionAttrs)
                        ? { intendedSectionAttrs: item.intendedSectionAttrs.filter((a: unknown): a is string => typeof a === "string") }
                        : {}),
                    ...(item.expectedBlockHashes && typeof item.expectedBlockHashes === "object"
                        ? { expectedBlockHashes: { ...item.expectedBlockHashes } }
                        : {}),
                    ...(Array.isArray(item.writtenSectionAttrs)
                        ? { writtenSectionAttrs: item.writtenSectionAttrs.filter((a: unknown): a is string => typeof a === "string") }
                        : {}),
                    ...(Array.isArray(item.unknownSectionAttrs)
                        ? { unknownSectionAttrs: item.unknownSectionAttrs.filter((a: unknown): a is string => typeof a === "string") }
                        : {}),
                    blockHashes: item.blockHashes && typeof item.blockHashes === "object" ? { ...item.blockHashes } : {},
                    migratedAt: typeof item.migratedAt === "number" ? item.migratedAt : 0,
                    legacyId: typeof item.legacyId === "string" ? item.legacyId : deterministicLegacyId(docId, "person", ""),
                };
            }
        }
        return out;
    };
    const completedDocIds = normalizeRecordMap(rec.completedDocIds);
    const partialDocIds = normalizeRecordMap(rec.partialDocIds);
    const pendingRaw = rec.pendingCursor && typeof rec.pendingCursor === "object" ? rec.pendingCursor : undefined;
    return {
        schemaVersion: ONE_DOC_MIGRATION_SCHEMA_VERSION,
        state,
        updatedAt: typeof rec.updatedAt === "number" ? rec.updatedAt : Date.now(),
        ...(typeof rec.lastBackupKey === "string" ? { lastBackupKey: rec.lastBackupKey } : {}),
        ...(typeof rec.lastBackupSha256 === "string" ? { lastBackupSha256: rec.lastBackupSha256 } : {}),
        ...(typeof rec.lastBackupExpiresAt === "number" ? { lastBackupExpiresAt: rec.lastBackupExpiresAt } : {}),
        pendingCursor: {
            processedDocIds: Array.isArray(pendingRaw?.processedDocIds)
                ? pendingRaw.processedDocIds.filter((id): id is string => typeof id === "string")
                : [],
            failedDocIds: pendingRaw?.failedDocIds && typeof pendingRaw.failedDocIds === "object"
                ? Object.fromEntries(Object.entries(pendingRaw.failedDocIds).filter(([, v]) => typeof v === "string"))
                : {},
            chunkIndex: typeof pendingRaw?.chunkIndex === "number" && Number.isInteger(pendingRaw.chunkIndex) && pendingRaw.chunkIndex >= 0
                ? pendingRaw.chunkIndex
                : 0,
        },
        completedDocIds,
        ...(Object.keys(partialDocIds).length > 0 ? { partialDocIds } : {}),
    };
}

export function normalizeMigrationManifestForWrite(raw: unknown): OneDocMigrationManifest {
    if (raw == null || raw === "") return emptyMigrationManifest();
    if (typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("迁移清单 migration-manifest 格式损坏，拒绝覆盖");
    }
    const rec = raw as Partial<OneDocMigrationManifest>;
    if (rec.schemaVersion !== ONE_DOC_MIGRATION_SCHEMA_VERSION) {
        throw new Error(`迁移清单版本不受支持：${String(rec.schemaVersion)}`);
    }
    return normalizeMigrationManifest(raw);
}

/**
 * 从老人物数据中无损抽取结构化常住地与籍贯（保留 rawText，绝不丢字）
 */
export function extractLegacyLocationsForMigration(person: Person): ContactLocations {
    return extractLocationsFromPerson(person);
}

export interface PersonMigrationInput {
    person: Person & { docId: string };
    locations: ContactLocations;
    projects: readonly PersonProjectItem[];
    topics: readonly PersonTopicItem[];
    giftIdeas: readonly GiftIdeaItem[];
    scratchpads: readonly PersonScratchpadItem[];
}

export function computePersonMigrationFingerprint(input: PersonMigrationInput): string {
    const canonical = JSON.stringify({
        docId: input.person.docId,
        name: input.person.name,
        phone: input.person.phone ?? "",
        wechat: input.person.wechat ?? "",
        email: input.person.email ?? "",
        birthday: input.person.birthday ?? "",
        group: input.person.group ?? "",
        tags: input.person.tags ?? [],
        locations: input.locations,
        channels: (input.person.channels ?? []).map((c) => ({
            id: c.id,
            type: c.type,
            label: c.label,
            value: c.value,
            isPrimary: Boolean(c.isPrimary),
        })),
        projects: input.projects.map((p) => ({ id: p.id, title: p.title, status: p.status, role: p.role, docId: p.docId, note: p.note })),
        topics: input.topics.map((t) => ({ id: t.id, text: t.text })),
        giftIdeas: input.giftIdeas.map((g) => ({ id: g.id, title: g.title, type: g.type, status: g.status })),
        scratchpads: input.scratchpads.map((s) => ({ id: s.id, content: s.content, pinned: Boolean(s.pinned) })),
    });
    return sha256Hex(canonical);
}

export function buildMigrationBackupEnvelope(
    payload: Omit<OneDocMigrationBackupPayload, "schemaVersion" | "createdAt" | "expiresAt">,
    now = Date.now(),
): OneDocMigrationBackupEnvelope {
    const expiresAt = now + MIGRATION_BACKUP_TTL_DAYS * 86_400_000;
    const fullPayload: OneDocMigrationBackupPayload = {
        schemaVersion: ONE_DOC_MIGRATION_SCHEMA_VERSION,
        createdAt: now,
        expiresAt,
        ...payload,
    };
    const sha256 = sha256Hex(JSON.stringify(fullPayload));
    return {
        schemaVersion: ONE_DOC_MIGRATION_SCHEMA_VERSION,
        storageKey: MIGRATION_BACKUP_KEY,
        createdAt: now,
        expiresAt,
        sha256,
        payload: fullPayload,
    };
}

export function verifyMigrationBackupEnvelope(raw: unknown, now = Date.now()): OneDocMigrationBackupEnvelope {
    let parsed: unknown = raw;
    if (typeof raw === "string" && raw.trim()) {
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("未找到有效的 30 天迁移备份 (.migrated.bak)");
    }
    const env = parsed as Partial<OneDocMigrationBackupEnvelope>;
    if (
        env.schemaVersion !== ONE_DOC_MIGRATION_SCHEMA_VERSION
        || env.storageKey !== MIGRATION_BACKUP_KEY
        || typeof env.sha256 !== "string"
        || !env.payload
        || typeof env.payload !== "object"
    ) {
        throw new Error("迁移备份包结构或版本损坏，已中止回滚（Fail-Closed）");
    }
    const computed = sha256Hex(JSON.stringify(env.payload));
    if (computed !== env.sha256) {
        throw new Error("迁移备份包 SHA-256 校验失败，可能已损坏或被篡改，已中止回滚");
    }
    if (typeof env.expiresAt === "number" && now > env.expiresAt) {
        throw new Error("该迁移备份已超过 30 天保留期");
    }
    return env as OneDocMigrationBackupEnvelope;
}
