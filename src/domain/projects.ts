/**
 * E-37 人物协作项目与主题双向关联模型（Project & Initiative Collaborators）
 * 在人物档案中维护其参与的思源项目或协作主题文档，支持参与人反查与人物项目跳转。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */

import { StoreIntegrityError } from "./store-integrity.ts";

export const PERSON_PROJECTS_STORE_VERSION = 1;
export const MAX_PROJECTS_PER_PERSON = 30;

export type ProjectStatus = "active" | "completed" | "archived";

export interface PersonProjectItem {
    /** 稳定项目关联 ID */
    id: string;
    /** 归属联系人文档 ID */
    personDocId: string;
    /** 项目或协作主题名称（如：Q4 战略复盘、开源人脉插件） */
    title: string;
    /** 关联的思源笔记文档 ID（可选） */
    docId?: string;
    /** 协作状态 */
    status: ProjectStatus;
    /** 在该项目中的角色/分工（如：发起人、核心成员、外部顾问、协同配合） */
    role?: string;
    /** 备注备忘 */
    note?: string;
    createdAt: number;
    updatedAt: number;
}

export interface PersonProjectsStore {
    schemaVersion: 1;
    projects: Record<string, PersonProjectItem[]>;
    /** 显式清空/删除所有协作项目的人物墓碑（与「从未初始化」严格区分，防止从旧文档块复活） */
    deletedAll?: Record<string, true>;
    /** 正文受控区块同步失败待对账状态 */
    docSyncPending?: Record<string, true>;
}

const DOC_ID_RE = /^\d{14}-[0-9a-z]{7}$/;

export function emptyPersonProjectsStore(): PersonProjectsStore {
    return { schemaVersion: PERSON_PROJECTS_STORE_VERSION, projects: {} };
}

export function newProjectId(): string {
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const random = Math.random().toString(36).slice(2, 9).padEnd(7, "0");
    return `proj-${stamp}-${random}`;
}

export function validatePersonProject(item: Partial<PersonProjectItem>): string[] {
    const errors: string[] = [];

    if (!item.id || !String(item.id).trim()) {
        errors.push("项目 ID 不能为空");
    }

    const title = item.title?.trim() ?? "";
    if (!title) {
        errors.push("项目名称不能为空");
    } else if (title.length > 80) {
        errors.push("项目名称不能超过 80 个字符");
    }

    if (!item.personDocId || !DOC_ID_RE.test(item.personDocId)) {
        errors.push("人物文档 ID 无效");
    }

    if (item.docId && !DOC_ID_RE.test(item.docId)) {
        errors.push("关联文档 ID 无效");
    }

    if (item.status && !["active", "completed", "archived"].includes(item.status)) {
        errors.push("未知的项目状态");
    }

    if (item.role && item.role.trim().length > 40) {
        errors.push("角色说明不能超过 40 个字符");
    }

    return errors;
}

/** 为指定人物新增项目协作记录 */
export function addProjectToStore(
    store: PersonProjectsStore,
    item: PersonProjectItem,
): PersonProjectsStore {
    const errors = validatePersonProject(item);
    if (errors.length > 0) throw new Error(`项目数据无效：${errors.join("；")}`);

    const existing = store.projects[item.personDocId] ?? [];
    if (existing.length >= MAX_PROJECTS_PER_PERSON) {
        throw new Error(`单人最多关联 ${MAX_PROJECTS_PER_PERSON} 个协作项目`);
    }

    const updated = [item, ...existing.filter((p) => p.id !== item.id)];
    const nextDeletedAll = store.deletedAll ? { ...store.deletedAll } : {};
    delete nextDeletedAll[item.personDocId];
    return {
        schemaVersion: PERSON_PROJECTS_STORE_VERSION,
        projects: {
            ...store.projects,
            [item.personDocId]: updated,
        },
        ...(Object.keys(nextDeletedAll).length > 0 ? { deletedAll: nextDeletedAll } : {}),
        ...(store.docSyncPending && Object.keys(store.docSyncPending).length > 0 ? { docSyncPending: { ...store.docSyncPending } } : {}),
    };
}

/** 更新指定人物的项目协作记录 */
export function updateProjectInStore(
    store: PersonProjectsStore,
    personDocId: string,
    projectId: string,
    patch: Partial<Omit<PersonProjectItem, "id" | "personDocId" | "createdAt">>,
    nowTime: number = Date.now(),
): PersonProjectsStore {
    const list = store.projects[personDocId] ?? [];
    const index = list.findIndex((item) => item.id === projectId);
    if (index === -1) return store;

    const current = list[index];
    const candidate: PersonProjectItem = {
        ...current,
        ...patch,
        updatedAt: nowTime,
    };

    const errors = validatePersonProject(candidate);
    if (errors.length > 0) throw new Error(`项目更新无效：${errors.join("；")}`);

    const nextList = [...list];
    nextList[index] = candidate;

    return {
        schemaVersion: PERSON_PROJECTS_STORE_VERSION,
        projects: {
            ...store.projects,
            [personDocId]: nextList,
        },
        ...(store.deletedAll && Object.keys(store.deletedAll).length > 0 ? { deletedAll: { ...store.deletedAll } } : {}),
        ...(store.docSyncPending && Object.keys(store.docSyncPending).length > 0 ? { docSyncPending: { ...store.docSyncPending } } : {}),
    };
}

/** 移除指定人物的项目协作记录（清空最后一条时写入 deletedAll 墓碑，防止旧文档投影复活） */
export function removeProjectFromStore(
    store: PersonProjectsStore,
    personDocId: string,
    projectId: string,
): PersonProjectsStore {
    const list = store.projects[personDocId];
    if (!list) return store;

    const remaining = list.filter((item) => item.id !== projectId);
    const updated = { ...store.projects };
    const nextDeletedAll = store.deletedAll ? { ...store.deletedAll } : {};
    if (remaining.length > 0) {
        updated[personDocId] = remaining;
        delete nextDeletedAll[personDocId];
    } else {
        delete updated[personDocId];
        nextDeletedAll[personDocId] = true;
    }

    return {
        schemaVersion: PERSON_PROJECTS_STORE_VERSION,
        projects: updated,
        ...(Object.keys(nextDeletedAll).length > 0 ? { deletedAll: nextDeletedAll } : {}),
        ...(store.docSyncPending && Object.keys(store.docSyncPending).length > 0 ? { docSyncPending: { ...store.docSyncPending } } : {}),
    };
}

/** 判断某人物是否已显式清空协作项目（区别于「从未初始化」） */
export function isPersonProjectsDeletedAll(store: PersonProjectsStore, personDocId: string): boolean {
    return Boolean(store.deletedAll?.[personDocId]) && (store.projects[personDocId]?.length ?? 0) === 0;
}

/** 更新某人物协作项目正文同步待对账标记 */
export function setProjectDocSyncPending(
    store: PersonProjectsStore,
    personDocId: string,
    pending: boolean,
): PersonProjectsStore {
    if (!DOC_ID_RE.test(personDocId)) return store;
    const nextPending = store.docSyncPending ? { ...store.docSyncPending } : {};
    if (pending) {
        nextPending[personDocId] = true;
    } else {
        delete nextPending[personDocId];
    }
    return {
        schemaVersion: PERSON_PROJECTS_STORE_VERSION,
        projects: { ...store.projects },
        ...(store.deletedAll && Object.keys(store.deletedAll).length > 0 ? { deletedAll: { ...store.deletedAll } } : {}),
        ...(Object.keys(nextPending).length > 0 ? { docSyncPending: nextPending } : {}),
    };
}

/** 反查参与某特定项目或文档的所有联系人（按项目名或关联 docId 精准匹配） */
export function findPeopleByProject(
    store: PersonProjectsStore,
    matcher: { title?: string; docId?: string },
): Array<{ personDocId: string; role?: string; status: ProjectStatus; title: string }> {
    const results: Array<{ personDocId: string; role?: string; status: ProjectStatus; title: string }> = [];
    const targetTitle = matcher.title?.trim().toLowerCase();
    const targetDocId = matcher.docId?.trim();

    for (const [personDocId, list] of Object.entries(store.projects)) {
        for (const item of list) {
            const matchesTitle = targetTitle && item.title.trim().toLowerCase() === targetTitle;
            const matchesDoc = targetDocId && item.docId === targetDocId;
            if (matchesTitle || matchesDoc) {
                results.push({
                    personDocId,
                    role: item.role,
                    status: item.status,
                    title: item.title,
                });
            }
        }
    }
    return results;
}

/** 容错读取归一化 */
export function normalizePersonProjectsStore(raw: unknown): PersonProjectsStore {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return emptyPersonProjectsStore();
    const record = raw as Partial<PersonProjectsStore>;
    if (record.schemaVersion !== PERSON_PROJECTS_STORE_VERSION || typeof record.projects !== "object" || record.projects === null) {
        return emptyPersonProjectsStore();
    }

    const projects: Record<string, PersonProjectItem[]> = {};
    const deletedAll: Record<string, true> = {};
    const docSyncPending: Record<string, true> = {};

    if (record.deletedAll && typeof record.deletedAll === "object" && !Array.isArray(record.deletedAll)) {
        for (const [docId, flag] of Object.entries(record.deletedAll)) {
            if (DOC_ID_RE.test(docId) && flag === true) deletedAll[docId] = true;
        }
    }
    if (record.docSyncPending && typeof record.docSyncPending === "object" && !Array.isArray(record.docSyncPending)) {
        for (const [docId, flag] of Object.entries(record.docSyncPending)) {
            if (DOC_ID_RE.test(docId) && flag === true) docSyncPending[docId] = true;
        }
    }

    for (const [docId, list] of Object.entries(record.projects)) {
        if (!DOC_ID_RE.test(docId) || !Array.isArray(list)) continue;
        const validList: PersonProjectItem[] = [];
        const seenIds = new Set<string>();

        for (const item of list) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const candidate = item as Partial<PersonProjectItem>;
            if (!candidate.id || seenIds.has(candidate.id)) continue;
            const errors = validatePersonProject({ ...candidate, personDocId: docId });
            if (errors.length > 0) continue;

            seenIds.add(candidate.id);
            validList.push({
                id: candidate.id,
                personDocId: docId,
                title: candidate.title!.trim(),
                docId: candidate.docId?.trim() || undefined,
                status: candidate.status ?? "active",
                role: candidate.role?.trim() || undefined,
                note: candidate.note?.trim() || undefined,
                createdAt: Number.isFinite(candidate.createdAt) ? candidate.createdAt! : Date.now(),
                updatedAt: Number.isFinite(candidate.updatedAt) ? candidate.updatedAt! : Date.now(),
            });
        }

        if (validList.length > 0) {
            projects[docId] = validList;
            delete deletedAll[docId];
        } else if (list.length === 0) {
            deletedAll[docId] = true;
        }
    }

    return {
        schemaVersion: PERSON_PROJECTS_STORE_VERSION,
        projects,
        ...(Object.keys(deletedAll).length > 0 ? { deletedAll } : {}),
        ...(Object.keys(docSyncPending).length > 0 ? { docSyncPending } : {}),
    };
}

function validateDocFlagMap(raw: unknown, label: string): void {
    if (raw === undefined) return;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new StoreIntegrityError(`项目协作存储 ${label} 容器损坏`, "项目协作", 0, 0);
    }
    for (const [docId, flag] of Object.entries(raw)) {
        if (!DOC_ID_RE.test(docId)) {
            throw new StoreIntegrityError(`项目协作 ${label} 人物文档 ID 非法：${docId}`, "项目协作", 1, 0);
        }
        if (flag !== true) {
            throw new StoreIntegrityError(`项目协作 ${label} 标记值非法：${docId}`, "项目协作", 1, 0);
        }
    }
}

/** 写前检查严格归一化：坏条目抛出 StoreIntegrityError */
export function normalizePersonProjectsStoreForWrite(raw: unknown): PersonProjectsStore {
    if (raw == null || raw === "") return emptyPersonProjectsStore();
    if (typeof raw !== "object" || Array.isArray(raw)) {
        throw new StoreIntegrityError("项目协作存储格式不兼容，非对象容器", "项目协作", 0, 0);
    }
    const record = raw as Partial<PersonProjectsStore>;
    if (record.schemaVersion !== PERSON_PROJECTS_STORE_VERSION) {
        throw new StoreIntegrityError(`项目协作存储版本未知：${record.schemaVersion}`, "项目协作", 0, 0);
    }
    if (typeof record.projects !== "object" || record.projects === null || Array.isArray(record.projects)) {
        throw new StoreIntegrityError("项目协作存储 projects 容器损坏", "项目协作", 0, 0);
    }
    validateDocFlagMap(record.deletedAll, "deletedAll");
    validateDocFlagMap(record.docSyncPending, "docSyncPending");

    for (const [docId, list] of Object.entries(record.projects)) {
        if (!DOC_ID_RE.test(docId)) {
            throw new StoreIntegrityError(`项目协作归属人物文档 ID 非法：${docId}`, "项目协作", 1, 0);
        }
        if (!Array.isArray(list)) {
            throw new StoreIntegrityError(`人物 ${docId} 的项目协作列表损坏`, "项目协作", 1, 0);
        }
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const errors = validatePersonProject({ ...item, personDocId: docId });
            if (errors.length > 0) {
                throw new StoreIntegrityError(`人物 ${docId} 的第 ${i + 1} 个项目无效：${errors.join("；")}`, "项目协作", list.length, i);
            }
        }
    }

    return normalizePersonProjectsStore(raw);
}

export interface ProjectStatusMeta {
    status: ProjectStatus;
    label: string;
    icon: string;
    className: string;
    nextStatus: ProjectStatus;
}

export const PROJECT_STATUS_METAS: Record<ProjectStatus, ProjectStatusMeta> = {
    active: { status: "active", label: "进行中", icon: "🚀", className: "status-active", nextStatus: "completed" },
    completed: { status: "completed", label: "已结项", icon: "✅", className: "status-completed", nextStatus: "archived" },
    archived: { status: "archived", label: "已归档", icon: "📦", className: "status-archived", nextStatus: "active" },
};

export function getProjectStatusMeta(status: unknown): ProjectStatusMeta {
    if (typeof status === "string" && status in PROJECT_STATUS_METAS) {
        return PROJECT_STATUS_METAS[status as ProjectStatus];
    }
    return PROJECT_STATUS_METAS.active;
}

export function getNextProjectStatus(status: ProjectStatus): ProjectStatus {
    return PROJECT_STATUS_METAS[status]?.nextStatus ?? "active";
}

/** 过滤排除自身的同项目协作者 */
export function filterOtherCollaborators(
    collaborators: ReadonlyArray<{ personDocId: string; role?: string; status: ProjectStatus; title: string }>,
    currentPersonDocId: string,
): Array<{ personDocId: string; role?: string; status: ProjectStatus; title: string }> {
    return collaborators.filter((c) => c.personDocId !== currentPersonDocId);
}
