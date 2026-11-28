/**
 * 小驴人脉跨机容灾底座接入服务（lvSnapshotVault）
 * 涵盖全 24 模块导出/统计/差异预览/原子合并恢复，严禁明文密钥/Token 入快照。
 */
import type { Plugin } from "siyuan";
import {
    getLvEcosystemToggles,
    lvSnapshotVault,
    type LvVaultPluginAdapter,
} from "../libs/lv-notice-kit";
import {
    computeSnapshotDiffPreview,
    countSnapshotRecords,
    normalizeVaultSnapshotToBundleText,
    sanitizeSnapshotForVault,
    VAULT_PLUGIN_ID,
    VAULT_PLUGIN_LABEL,
    VAULT_SCHEMA_VERSION,
} from "../domain/snapshot-vault";
import {
    exportMigrationBundle,
    importMigrationBundle,
    MIGRATION_BUNDLE_STORAGE_KEY,
    MIGRATION_COVERAGE,
} from "./migration-bundle";
import { invalidateRoster } from "./roster";

export interface ContactsVaultStatus {
    enabled: boolean;
    localRecordCount: number;
    localRevision: number;
    lastUpdatedAt: string;
    remoteAvailable: boolean;
    remoteRecordCount: number;
    remoteRevision: number;
    remoteUpdatedAt: string;
    pointerDocHint: string;
    summary: string;
}

const VAULT_LOCAL_STATE_KEY = "lv_snapshot_vault_state_v1";
const VAULT_POINTER_DOC_HINT = "/🐴 小驴生态/跨机容灾快照中心";

let vaultMergeInProgress = false;

export function isVaultMergeInProgress(): boolean {
    return vaultMergeInProgress;
}

function readLocalVaultMeta(pluginId: string): { revision: number; updatedAt: string; recordCount: number } {
    try {
        if (typeof localStorage === "undefined") return { revision: 0, updatedAt: "", recordCount: 0 };
        const raw = localStorage.getItem(VAULT_LOCAL_STATE_KEY);
        if (!raw) return { revision: 0, updatedAt: "", recordCount: 0 };
        const parsed = JSON.parse(raw) as Record<string, { revision?: number; updatedAt?: string; recordCount?: number }>;
        const entry = parsed?.[pluginId];
        return {
            revision: typeof entry?.revision === "number" ? entry.revision : 0,
            updatedAt: typeof entry?.updatedAt === "string" ? entry.updatedAt : "",
            recordCount: typeof entry?.recordCount === "number" ? entry.recordCount : 0,
        };
    } catch {
        return { revision: 0, updatedAt: "", recordCount: 0 };
    }
}

export function createContactsVaultAdapter(
    plugin: Plugin,
    options: { onMerged?: () => void } = {},
): LvVaultPluginAdapter {
    const exportSanitizedSnapshot = async (): Promise<Record<string, unknown>> => {
        const rawText = await exportMigrationBundle(plugin);
        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        const sanitized = sanitizeSnapshotForVault(parsed);
        if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
            return {
                schemaVersion: VAULT_SCHEMA_VERSION,
                storageKey: MIGRATION_BUNDLE_STORAGE_KEY,
                coverage: MIGRATION_COVERAGE,
                modules: {},
            };
        }
        return sanitized;
    };

    return {
        pluginId: VAULT_PLUGIN_ID,
        label: VAULT_PLUGIN_LABEL,
        schemaVersion: VAULT_SCHEMA_VERSION,
        countRecords(snapshot: Record<string, unknown>): number {
            return countSnapshotRecords(snapshot);
        },
        async exportSnapshot(): Promise<Record<string, unknown>> {
            return exportSanitizedSnapshot();
        },
        async previewDiff(incoming: Record<string, unknown>): Promise<{ currentCount: number; incomingCount: number; summary: string }> {
            const current = await exportSanitizedSnapshot();
            const diff = computeSnapshotDiffPreview(current, incoming);
            return {
                currentCount: diff.currentCount,
                incomingCount: diff.incomingCount,
                summary: diff.summary,
            };
        },
        async importMerge(incoming: Record<string, unknown>): Promise<boolean> {
            const bundleText = normalizeVaultSnapshotToBundleText(incoming);
            vaultMergeInProgress = true;
            try {
                const result = await importMigrationBundle(plugin, bundleText);
                invalidateRoster();
                options.onMerged?.();
                return Array.isArray(result.failed) && result.failed.length === 0;
            } catch (err) {
                console.error("[LvContacts] 跨机容灾快照合并失败:", err);
                return false;
            } finally {
                vaultMergeInProgress = false;
            }
        },
    };
}

export function registerContactsSnapshotVault(
    plugin: Plugin,
    options: { onMerged?: () => void } = {},
): () => void {
    const adapter = createContactsVaultAdapter(plugin, options);
    const cleaner = lvSnapshotVault.register(adapter);
    return () => {
        try {
            cleaner();
        } catch { /* ignore */ }
        try {
            lvSnapshotVault.unregister(VAULT_PLUGIN_ID);
        } catch { /* ignore */ }
    };
}

export function scheduleContactsAutoBackup(delayMs = 60000): void {
    if (vaultMergeInProgress) return;
    try {
        if (!getLvEcosystemToggles().autoSnapshotVault) return;
        lvSnapshotVault.scheduleAutoBackup(VAULT_PLUGIN_ID, delayMs);
    } catch { /* ignore */ }
}

export async function getContactsVaultStatus(plugin?: Plugin): Promise<ContactsVaultStatus> {
    const enabled = getLvEcosystemToggles().autoSnapshotVault !== false;
    const localMeta = readLocalVaultMeta(VAULT_PLUGIN_ID);
    let localRecordCount = localMeta.recordCount;

    if (plugin) {
        try {
            const rawText = await exportMigrationBundle(plugin);
            localRecordCount = countSnapshotRecords(JSON.parse(rawText) as Record<string, unknown>);
        } catch { /* fallback to meta */ }
    }

    try {
        const remoteList = await lvSnapshotVault.inspectRemoteSnapshots();
        const mine = Array.isArray(remoteList)
            ? remoteList.find((item: any) => item?.pluginId === VAULT_PLUGIN_ID)
            : null;
        if (mine) {
            return {
                enabled,
                localRecordCount: typeof mine.currentCount === "number" ? mine.currentCount : localRecordCount,
                localRevision: localMeta.revision,
                lastUpdatedAt: localMeta.updatedAt || String(mine.remoteUpdatedAt || ""),
                remoteAvailable: Boolean(mine.remoteAvailable),
                remoteRecordCount: Number(mine.remoteCount || 0),
                remoteRevision: Number(mine.remoteRevision || 0),
                remoteUpdatedAt: String(mine.remoteUpdatedAt || ""),
                pointerDocHint: VAULT_POINTER_DOC_HINT,
                summary: String(mine.summary || ""),
            };
        }
    } catch { /* fallback to local meta */ }

    return {
        enabled,
        localRecordCount,
        localRevision: localMeta.revision,
        lastUpdatedAt: localMeta.updatedAt,
        remoteAvailable: localMeta.revision > 0,
        remoteRecordCount: localMeta.recordCount,
        remoteRevision: localMeta.revision,
        remoteUpdatedAt: localMeta.updatedAt,
        pointerDocHint: VAULT_POINTER_DOC_HINT,
        summary: localMeta.revision > 0
            ? `本机 ${localRecordCount} 条 / 快照 ${localMeta.recordCount} 条`
            : "尚未生成跨机容灾快照",
    };
}

export async function syncContactsVaultNow(opts?: { force?: boolean }): Promise<{
    ok: boolean;
    snapshotRevision?: number;
    recordCount?: number;
    byteLength?: number;
    pointerDocId?: string;
    reason?: string;
}> {
    return await lvSnapshotVault.runBackupNow(VAULT_PLUGIN_ID, opts);
}

export async function openContactsVaultRestoreWizard(): Promise<void> {
    await lvSnapshotVault.openRestoreWizardDialog();
}
