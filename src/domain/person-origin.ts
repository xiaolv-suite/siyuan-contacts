/**
 * 初识溯源与引荐人链路纯函数域模型（Monica 对标融合）。
 * 纯函数：零 DOM、零 IO，node --test 直接可测。
 * 存储契约：person-origins.json (schemaVersion: 1)。
 */
import { StoreIntegrityError } from "./store-integrity.ts";

const DOC_ID_RE = /^\d{14}-[0-9a-z]{7}$/;

export function isPersonDocId(value: string): boolean {
    return DOC_ID_RE.test(value);
}

export interface PersonOrigin {
    /** 目标联系人文档 ID */
    personDocId: string;
    /** 初识场合或日期（如 "2024年秋季行业峰会", "2023-05-18 创业孵化器路演"） */
    metAt?: string;
    /** 引荐人文档 ID（库内另一位联系人文档 ID，不可为自身） */
    introducedByDocId?: string;
    /** 社交偏好/忌口/话题速记（如 "海鲜过敏、喜欢手冲咖啡、忌聊前东家"） */
    preferences?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface PersonOriginStore {
    schemaVersion: 1;
    origins: Record<string, PersonOrigin>;
}

export const PERSON_ORIGIN_STORAGE_KEY = "person-origins.json";
export const PERSON_ORIGIN_STORE_VERSION = 1;

export const MAX_MET_AT_LENGTH = 200;
export const MAX_PREFERENCES_LENGTH = 2000;

export function emptyPersonOriginStore(): PersonOriginStore {
    return {
        schemaVersion: PERSON_ORIGIN_STORE_VERSION,
        origins: {},
    };
}

export function validatePersonOrigin(origin: PersonOrigin): string[] {
    const errors: string[] = [];
    if (!origin.personDocId || !isPersonDocId(origin.personDocId)) {
        errors.push("人物文档 ID 无效");
    }
    if (origin.metAt !== undefined && typeof origin.metAt !== "string") {
        errors.push("初识场合必须为字符串");
    } else if (origin.metAt && origin.metAt.trim().length > MAX_MET_AT_LENGTH) {
        errors.push(`初识场合不能超过 ${MAX_MET_AT_LENGTH} 个字符`);
    }
    if (origin.introducedByDocId !== undefined && origin.introducedByDocId !== "") {
        if (!isPersonDocId(origin.introducedByDocId)) {
            errors.push("引荐人文档 ID 格式无效");
        } else if (origin.introducedByDocId === origin.personDocId) {
            errors.push("引荐人不能设置为联系人自身");
        }
    }
    if (origin.preferences !== undefined && typeof origin.preferences !== "string") {
        errors.push("偏好忌口速记必须为字符串");
    } else if (origin.preferences && origin.preferences.trim().length > MAX_PREFERENCES_LENGTH) {
        errors.push(`偏好忌口速记不能超过 ${MAX_PREFERENCES_LENGTH} 个字符`);
    }
    return errors;
}

export function normalizePersonOriginStore(raw: unknown): PersonOriginStore {
    if (!raw || typeof raw !== "object") {
        return emptyPersonOriginStore();
    }
    const record = raw as Record<string, unknown>;
    if (record.schemaVersion !== PERSON_ORIGIN_STORE_VERSION || !record.origins || typeof record.origins !== "object") {
        return emptyPersonOriginStore();
    }
    const rawOrigins = record.origins as Record<string, unknown>;
    const safeOrigins: Record<string, PersonOrigin> = {};

    for (const [docId, val] of Object.entries(rawOrigins)) {
        if (!isPersonDocId(docId) || !val || typeof val !== "object") continue;
        const entry = val as Record<string, unknown>;
        const metAt = typeof entry.metAt === "string" ? entry.metAt.trim().slice(0, MAX_MET_AT_LENGTH) : undefined;
        const introducedByDocId = typeof entry.introducedByDocId === "string" && isPersonDocId(entry.introducedByDocId) && entry.introducedByDocId !== docId
            ? entry.introducedByDocId
            : undefined;
        const preferences = typeof entry.preferences === "string" ? entry.preferences.trim().slice(0, MAX_PREFERENCES_LENGTH) : undefined;
        const createdAt = typeof entry.createdAt === "number" && Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now();
        const updatedAt = typeof entry.updatedAt === "number" && Number.isFinite(entry.updatedAt) ? entry.updatedAt : createdAt;

        if (metAt || introducedByDocId || preferences) {
            safeOrigins[docId] = {
                personDocId: docId,
                metAt: metAt || undefined,
                introducedByDocId: introducedByDocId || undefined,
                preferences: preferences || undefined,
                createdAt,
                updatedAt,
            };
        }
    }

    return {
        schemaVersion: PERSON_ORIGIN_STORE_VERSION,
        origins: safeOrigins,
    };
}

export function normalizePersonOriginStoreForWrite(raw: unknown): PersonOriginStore {
    if (raw == null || raw === "") {
        return emptyPersonOriginStore();
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
        throw new StoreIntegrityError("初识溯源与引荐", "存储必须为对象结构");
    }
    const record = raw as Record<string, unknown>;
    if (record.schemaVersion !== PERSON_ORIGIN_STORE_VERSION) {
        throw new StoreIntegrityError("初识溯源与引荐", `版本不支持，必须为 ${PERSON_ORIGIN_STORE_VERSION}`);
    }
    if (!record.origins || typeof record.origins !== "object" || Array.isArray(record.origins)) {
        throw new StoreIntegrityError("初识溯源与引荐", "条目容器必须为对象");
    }
    const rawOrigins = record.origins as Record<string, unknown>;
    const safeOrigins: Record<string, PersonOrigin> = {};

    for (const [docId, val] of Object.entries(rawOrigins)) {
        if (!isPersonDocId(docId)) {
            throw new StoreIntegrityError("初识溯源与引荐", `无效的人物文档 ID: ${docId}`);
        }
        if (!val || typeof val !== "object") {
            throw new StoreIntegrityError("初识溯源与引荐", `条目结构无效: ${docId}`);
        }
        const entry = val as PersonOrigin;
        const errors = validatePersonOrigin(entry);
        if (errors.length > 0) {
            throw new StoreIntegrityError("初识溯源与引荐", `条目校验失败: ${errors.join("; ")}`);
        }
        safeOrigins[docId] = {
            personDocId: docId,
            metAt: entry.metAt ? entry.metAt.trim() : undefined,
            introducedByDocId: entry.introducedByDocId || undefined,
            preferences: entry.preferences ? entry.preferences.trim() : undefined,
            createdAt: typeof entry.createdAt === "number" ? entry.createdAt : Date.now(),
            updatedAt: Date.now(),
        };
    }

    return {
        schemaVersion: PERSON_ORIGIN_STORE_VERSION,
        origins: safeOrigins,
    };
}
