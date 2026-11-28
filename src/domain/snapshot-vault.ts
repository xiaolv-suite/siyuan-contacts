/**
 * 小驴人脉跨机容灾快照（lvSnapshotVault）纯函数契约与 24 模块统计/脱敏/差异预览。
 * 严格保持 domain 层纯净：零外部框架、零存储与内核依赖。
 */

export const VAULT_PLUGIN_ID = "siyuan-contacts";
export const VAULT_PLUGIN_LABEL = "小驴人脉";
export const VAULT_SCHEMA_VERSION = 1;

export type VaultModuleKey =
    | "interactions"
    | "followUps"
    | "cadences"
    | "reminderDismissals"
    | "registry"
    | "templates"
    | "exchanges"
    | "aliases"
    | "selfIdentity"
    | "orgMemberships"
    | "organizationProfiles"
    | "relationshipLabels"
    | "topics"
    | "giftIdeas"
    | "occasions"
    | "anniversaries"
    | "promises"
    | "kinships"
    | "projects"
    | "itineraries"
    | "scratchpads"
    | "socialPreferences"
    | "lifecycleStage"
    | "personOrigins";

export interface VaultModuleDescriptor {
    readonly key: VaultModuleKey;
    readonly label: string;
    readonly group: "contacts_ext" | "interactions" | "relations" | "followups" | "orgs_events";
}

export const VAULT_MODULES: readonly VaultModuleDescriptor[] = [
    { key: "interactions", label: "互动事件", group: "interactions" },
    { key: "followUps", label: "跟进事项", group: "followups" },
    { key: "cadences", label: "联系节奏", group: "followups" },
    { key: "itineraries", label: "会客行程", group: "followups" },
    { key: "reminderDismissals", label: "提醒暂缓", group: "contacts_ext" },
    { key: "registry", label: "收编时间索引", group: "contacts_ext" },
    { key: "templates", label: "备注模板", group: "contacts_ext" },
    { key: "aliases", label: "人物别名", group: "contacts_ext" },
    { key: "selfIdentity", label: "本人身份", group: "contacts_ext" },
    { key: "topics", label: "谈资备忘", group: "contacts_ext" },
    { key: "giftIdeas", label: "礼物点子与偏好", group: "contacts_ext" },
    { key: "anniversaries", label: "重要纪念日", group: "contacts_ext" },
    { key: "scratchpads", label: "闪念便签", group: "contacts_ext" },
    { key: "socialPreferences", label: "社交偏好与忌口", group: "contacts_ext" },
    { key: "lifecycleStage", label: "交往阶段", group: "contacts_ext" },
    { key: "personOrigins", label: "初识溯源", group: "contacts_ext" },
    { key: "relationshipLabels", label: "与我的关系", group: "relations" },
    { key: "kinships", label: "亲属谱系", group: "relations" },
    { key: "promises", label: "双向承诺", group: "relations" },
    { key: "orgMemberships", label: "组织成员", group: "orgs_events" },
    { key: "organizationProfiles", label: "组织资料", group: "orgs_events" },
    { key: "occasions", label: "群体活动", group: "orgs_events" },
    { key: "projects", label: "协作项目", group: "orgs_events" },
    { key: "exchanges", label: "往来账本", group: "orgs_events" },
] as const;

export interface VaultGroupSummary {
    key: VaultModuleDescriptor["group"];
    label: string;
    currentCount: number;
    incomingCount: number;
}

export interface VaultModuleDiffItem {
    key: VaultModuleKey;
    label: string;
    currentCount: number;
    incomingCount: number;
}

export interface VaultDiffPreview {
    currentCount: number;
    incomingCount: number;
    summary: string;
    groups: VaultGroupSummary[];
    modules: VaultModuleDiffItem[];
}

const SAFE_META_KEY_RE = /^(?:hasSecret|secretSlot|secretSlots|configuredSecretSlots|secretSlotsToRebind|tokenCount|totalTokens|promptTokens|completionTokens|maxTokens|tokensUsed|tokenUsage|tokenBudget|tokenLimit|tokensPerMinute)$/i;
const SENSITIVE_KEY_EXACT_RE = /^(?:api[-_]?key|fallback[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|bearer[-_]?token|gist[-_]?token|bot[-_]?token|client[-_]?secret|app[-_]?secret|secret[-_]?key|private[-_]?key|password|passwd|credential|aiKey|backupKey|wereadApiKey|wereadIntegration|webhookUrl|barkUrl|token|secret)$/i;
const SENSITIVE_KEY_SUFFIX_RE = /(?:api[-_]?key|fallback[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|bearer[-_]?token|gist[-_]?token|bot[-_]?token|client[-_]?secret|app[-_]?secret|secret[-_]?key|private[-_]?key|password|passwd|credential|webhookUrl)$/i;
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
    /sk-[A-Za-z0-9_-]{8,}/g,
    /Bearer\s+[A-Za-z0-9._-]{6,}/gi,
    /ghp_[A-Za-z0-9]{10,}/g,
    /xox[baprs]-[A-Za-z0-9-]{8,}/g,
];

function isSensitiveVaultKey(key: string, value: unknown): boolean {
    if (SAFE_META_KEY_RE.test(key)) return false;
    if (SENSITIVE_KEY_EXACT_RE.test(key) || SENSITIVE_KEY_SUFFIX_RE.test(key)) {
        return !(typeof value === "number" || typeof value === "boolean");
    }
    if (typeof value === "string" && /(?:token|secret|key|password)$/i.test(key) && !/(?:count|limit|budget|usage|slot|slots|name|label|mode|type|storageKey)$/i.test(key)) {
        return true;
    }
    return false;
}

/** 递归剔除任何私密 Token / Key 字段与明文凭据串，确保零密钥进入快照 */
export function sanitizeSnapshotForVault<T>(value: T): T {
    if (value == null) return value;
    if (typeof value === "string") {
        let cleaned: string = value;
        for (const pattern of SECRET_VALUE_PATTERNS) {
            const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
            cleaned = cleaned.replace(re, "[REDACTED_SECRET]");
        }
        return cleaned as unknown as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeSnapshotForVault(item)) as unknown as T;
    }
    if (typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (isSensitiveVaultKey(k, v)) continue;
            out[k] = sanitizeSnapshotForVault(v);
        }
        return out as T;
    }
    return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resolveModulesMap(snapshot: unknown): Record<string, unknown> {
    if (!isRecord(snapshot)) return {};
    if (isRecord(snapshot.modules)) return snapshot.modules;
    return snapshot;
}

function sumMapArrayLengths(mapObj: unknown): number {
    if (!isRecord(mapObj)) return 0;
    let total = 0;
    for (const val of Object.values(mapObj)) {
        if (Array.isArray(val)) total += val.length;
    }
    return total;
}

export function countSingleModuleRecords(modules: Record<string, unknown>, key: VaultModuleKey): number {
    const mod = modules[key];
    if (!isRecord(mod)) return 0;
    switch (key) {
        case "interactions":
            return Array.isArray(mod.events) ? mod.events.length : 0;
        case "followUps":
            return Array.isArray(mod.items) ? mod.items.length : 0;
        case "cadences":
            return isRecord(mod.cadences) ? Object.keys(mod.cadences).length : 0;
        case "reminderDismissals":
            return Array.isArray(mod.dismissals) ? mod.dismissals.length : 0;
        case "registry":
            return isRecord(mod.registeredAt) ? Object.keys(mod.registeredAt).length : 0;
        case "templates":
            return Array.isArray(mod.templates) ? mod.templates.length : 0;
        case "exchanges":
            return Array.isArray(mod.records) ? mod.records.length : 0;
        case "aliases":
            return Array.isArray(mod.aliases) ? mod.aliases.length : 0;
        case "selfIdentity":
            return isRecord(mod.identity) && typeof mod.identity.selfDocId === "string" && mod.identity.selfDocId ? 1 : 0;
        case "orgMemberships":
            return Array.isArray(mod.memberships) ? mod.memberships.length : 0;
        case "organizationProfiles":
            return isRecord(mod.profiles) ? Object.keys(mod.profiles).length : 0;
        case "relationshipLabels":
            return Array.isArray(mod.labels) ? mod.labels.length : 0;
        case "topics":
            return sumMapArrayLengths(mod.topics);
        case "giftIdeas":
            return sumMapArrayLengths(mod.ideas);
        case "occasions":
            return Array.isArray(mod.occasions) ? mod.occasions.length : 0;
        case "anniversaries":
            return sumMapArrayLengths(mod.anniversaries);
        case "promises":
            return sumMapArrayLengths(mod.promises);
        case "kinships":
            return sumMapArrayLengths(mod.kinships);
        case "projects":
            return sumMapArrayLengths(mod.projects);
        case "itineraries":
            return sumMapArrayLengths(mod.itineraries);
        case "scratchpads":
            return sumMapArrayLengths(mod.notes);
        case "socialPreferences":
            return sumMapArrayLengths(mod.preferences);
        case "lifecycleStage":
            return isRecord(mod.records) ? Object.keys(mod.records).length : 0;
        case "personOrigins":
            return isRecord(mod.origins) ? Object.keys(mod.origins).length : 0;
    }
}

/** 统计 24 模块总有效业务记录数（空库严格返回 0） */
export function countSnapshotRecords(snapshot: Record<string, unknown>): number {
    const modules = resolveModulesMap(snapshot);
    let total = 0;
    for (const desc of VAULT_MODULES) {
        total += countSingleModuleRecords(modules, desc.key);
    }
    return total;
}

const GROUP_LABELS: Record<VaultModuleDescriptor["group"], string> = {
    contacts_ext: "联系人扩展",
    interactions: "互动记录",
    relations: "关系网",
    followups: "跟进提醒",
    orgs_events: "组织/事件",
};

const GROUP_ORDER: readonly VaultModuleDescriptor["group"][] = [
    "contacts_ext",
    "interactions",
    "relations",
    "followups",
    "orgs_events",
];

/** 输出 24 模块（分组聚合）的「当前 vs 容灾快照」对比摘要 */
export function computeSnapshotDiffPreview(
    currentSnapshot: Record<string, unknown>,
    incomingSnapshot: Record<string, unknown>,
): VaultDiffPreview {
    const curMods = resolveModulesMap(currentSnapshot);
    const incMods = resolveModulesMap(incomingSnapshot);

    const groupCurrent: Record<VaultModuleDescriptor["group"], number> = {
        contacts_ext: 0,
        interactions: 0,
        relations: 0,
        followups: 0,
        orgs_events: 0,
    };
    const groupIncoming: Record<VaultModuleDescriptor["group"], number> = {
        contacts_ext: 0,
        interactions: 0,
        relations: 0,
        followups: 0,
        orgs_events: 0,
    };

    const modules: VaultModuleDiffItem[] = [];
    let currentCount = 0;
    let incomingCount = 0;

    for (const desc of VAULT_MODULES) {
        const cur = countSingleModuleRecords(curMods, desc.key);
        const inc = countSingleModuleRecords(incMods, desc.key);
        currentCount += cur;
        incomingCount += inc;
        groupCurrent[desc.group] += cur;
        groupIncoming[desc.group] += inc;
        modules.push({
            key: desc.key,
            label: desc.label,
            currentCount: cur,
            incomingCount: inc,
        });
    }

    const groups: VaultGroupSummary[] = GROUP_ORDER.map((gKey) => ({
        key: gKey,
        label: GROUP_LABELS[gKey],
        currentCount: groupCurrent[gKey],
        incomingCount: groupIncoming[gKey],
    }));

    const activeGroupParts = groups
        .filter((g) => g.currentCount > 0 || g.incomingCount > 0)
        .map((g) => `${g.label} ${g.currentCount}→${g.incomingCount}`);

    const summary = activeGroupParts.length > 0
        ? `当前 ${currentCount} 条 / 快照 ${incomingCount} 条（${activeGroupParts.join("，")}）`
        : `当前 ${currentCount} 条 / 快照 ${incomingCount} 条`;

    return {
        currentCount,
        incomingCount,
        summary,
        groups,
        modules,
    };
}

/** 将快照规整为 importMigrationBundle 可接受的迁移包 JSON 文本 */
export function normalizeVaultSnapshotToBundleText(incoming: Record<string, unknown>): string {
    const modules = resolveModulesMap(incoming);
    return JSON.stringify({
        schemaVersion: VAULT_SCHEMA_VERSION,
        exportedAt: typeof incoming.exportedAt === "string" ? incoming.exportedAt : new Date().toISOString(),
        storageKey: "lvct-migration-bundle",
        modules,
    });
}
