/**
 * 老用户存量人脉数据「一人一档」幂等迁移与 30 天安全回滚服务
 */
import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { loadJsonStrict, saveJsonVerified, withStoreLock } from "../data/storage.ts";
import {
    deleteBlock,
    flushBlockIndex,
    readMarkedBlocks,
    readMarkedBlocksByRoots,
    setBlockAttrs,
    markedBlockContent,
} from "../api/blocks.ts";
import { KernelPermissionError, KernelResponseError } from "../api/client.ts";
import { queryBlockIal, sqlCoalescer } from "../api/sql-coalescer.ts";
import { getRoster, invalidateRoster } from "./roster.ts";
import { loadPersonProjectsStore } from "../data/projects.ts";
import { loadTopicsStore } from "../data/topics.ts";
import { loadGiftIdeaStore } from "../data/gift-ideas.ts";
import { loadScratchpadStore } from "../data/person-scratchpad.ts";
import {
    PROFILE_SECTION_ATTR,
    PROJECTS_SECTION_ATTR,
    TOPICS_SECTION_ATTR,
    GIFT_IDEAS_SECTION_ATTR,
    SCRATCHPAD_SECTION_ATTR,
    syncPersonProfileDocSection,
    syncProjectsDocSection,
    syncTopicsDocSection,
    syncGiftIdeasDocSection,
    syncScratchpadDocSection,
} from "./doc-section.ts";
import {
    formatContactLocation,
    LOCATIONS_ATTR,
    serializeContactLocationsAttr,
} from "../domain/china-regions.ts";
import { sha256Hex } from "../domain/sha256.ts";
import {
    buildMigrationBackupEnvelope,
    computePersonMigrationFingerprint,
    DEFAULT_MIGRATION_CHUNK_SIZE,
    deterministicLegacyId,
    extractLegacyLocationsForMigration,
    MIGRATION_BACKUP_KEY,
    MIGRATION_MANIFEST_KEY,
    normalizeMigrationManifest,
    normalizeMigrationManifestForWrite,
    verifyMigrationBackupEnvelope,
    type OneDocMigrationBackupEnvelope,
    type OneDocMigrationDryRun,
    type OneDocMigrationManifest,
    type OneDocMigrationPlanItem,
    type OneDocMigrationResult,
    type OneDocMigrationRollbackResult,
    type PersonLegacyBackupSnapshot,
} from "../domain/one-doc-migration.ts";

const MIGRATED_SECTION_ATTRS = [
    PROFILE_SECTION_ATTR,
    PROJECTS_SECTION_ATTR,
    TOPICS_SECTION_ATTR,
    GIFT_IDEAS_SECTION_ATTR,
    SCRATCHPAD_SECTION_ATTR,
] as const;

function extractLocationAttrFromIal(ial: string | null | undefined): string {
    if (!ial) return "";
    const m = ial.match(/custom-lv-locations="([^"]*)"/);
    return m?.[1] ?? "";
}

async function inspectExistingSectionAttrs(docIds: readonly string[]): Promise<Record<string, Set<string>>> {
    const map: Record<string, Set<string>> = {};
    for (const id of docIds) map[id] = new Set();
    if (docIds.length === 0) return map;
    for (const attr of MIGRATED_SECTION_ATTRS) {
        const hits = await readMarkedBlocksByRoots(docIds, attr).catch(() => ({} as Record<string, string>));
        for (const docId of Object.keys(hits)) {
            if (!map[docId]) map[docId] = new Set();
            map[docId].add(attr);
        }
    }
    return map;
}

/**
 * Dry-Run 只读预检：扫描存量联系人与旧数据，计算待迁入清单（严格零写入）
 */
export async function previewOneDocMigration(
    plugin: Plugin,
    settings: ContactsSettings,
): Promise<OneDocMigrationDryRun> {
    const [rawManifest, rawBackup, people, projectsStore, topicsStore, giftIdeasStore, scratchpadStore] = await Promise.all([
        loadJsonStrict(plugin, MIGRATION_MANIFEST_KEY).catch(() => null),
        loadJsonStrict(plugin, MIGRATION_BACKUP_KEY).catch(() => null),
        getRoster(settings),
        loadPersonProjectsStore(plugin),
        loadTopicsStore(plugin),
        loadGiftIdeaStore(plugin),
        loadScratchpadStore(plugin),
    ]);

    const manifest = normalizeMigrationManifest(rawManifest);
    let hasValidBackup = false;
    let backupExpiresAt: number | undefined;
    if (rawBackup) {
        try {
            const verified = verifyMigrationBackupEnvelope(rawBackup);
            hasValidBackup = true;
            backupExpiresAt = verified.expiresAt;
        } catch {
            hasValidBackup = false;
        }
    }

    const docIds = people.map((p) => p.docId).filter(Boolean);
    const existingAttrsByDoc = await inspectExistingSectionAttrs(docIds);

    const items: OneDocMigrationPlanItem[] = [];
    let pendingCount = 0;
    let alreadySyncedCount = 0;

    for (const person of people) {
        if (!person.docId) continue;
        const locations = extractLegacyLocationsForMigration(person);
        const projects = projectsStore.projects[person.docId] ?? [];
        const topics = topicsStore.topics[person.docId] ?? [];
        const giftIdeas = giftIdeasStore.ideas[person.docId] ?? [];
        const scratchpads = scratchpadStore.notes[person.docId] ?? [];

        const fingerprint = computePersonMigrationFingerprint({
            person,
            locations,
            projects,
            topics,
            giftIdeas,
            scratchpads,
        });

        const existingAttrs = existingAttrsByDoc[person.docId] ?? new Set<string>();
        const needsLocationMigration = Boolean(
            (locations.resident || locations.hometown)
            && (!person.locations?.resident && !person.locations?.hometown),
        );
        const hasProfileData = Boolean(
            person.phone || person.wechat || person.email || person.birthday
            || person.group || (person.tags && person.tags.length > 0)
            || locations.resident || locations.hometown,
        );
        const missingProfileBlock = hasProfileData && !existingAttrs.has(PROFILE_SECTION_ATTR);
        const missingProjectsBlock = projects.length > 0 && !existingAttrs.has(PROJECTS_SECTION_ATTR);
        const missingTopicsBlock = topics.length > 0 && !existingAttrs.has(TOPICS_SECTION_ATTR);
        const missingGiftsBlock = giftIdeas.length > 0 && !existingAttrs.has(GIFT_IDEAS_SECTION_ATTR);
        const missingScratchpadBlock = scratchpads.length > 0 && !existingAttrs.has(SCRATCHPAD_SECTION_ATTR);

        const prevRecord = manifest.completedDocIds[person.docId];
        const alreadySynced = Boolean(
            prevRecord
            && prevRecord.fingerprint === fingerprint
            && !needsLocationMigration
            && !missingProfileBlock
            && !missingProjectsBlock
            && !missingTopicsBlock
            && !missingGiftsBlock
            && !missingScratchpadBlock,
        );

        if (alreadySynced) alreadySyncedCount += 1;
        else pendingCount += 1;

        items.push({
            docId: person.docId,
            name: person.name,
            legacyId: deterministicLegacyId(person.docId, "one-doc", fingerprint),
            needsLocationMigration,
            ...(locations.resident ? { residentPreview: formatContactLocation(locations.resident) } : {}),
            ...(locations.hometown ? { hometownPreview: formatContactLocation(locations.hometown) } : {}),
            projectsCount: projects.length,
            topicsCount: topics.length,
            giftIdeasCount: giftIdeas.length,
            scratchpadsCount: scratchpads.length,
            alreadySynced,
        });
    }

    return {
        state: manifest.state,
        totalPeople: items.length,
        pendingCount,
        alreadySyncedCount,
        hasValidBackup,
        ...(backupExpiresAt !== undefined ? { backupExpiresAt } : {}),
        items,
    };
}

/**
 * 幂等分批迁入「一人一档」思源文档流水线（支持断点续做、写失败保留 JSON、30 天备份）
 */
export async function executeOneDocMigration(
    plugin: Plugin,
    settings: ContactsSettings,
    options?: {
        chunkSize?: number;
        onProgress?: (current: number, total: number, docId: string) => void;
        shouldAbort?: () => boolean;
    },
): Promise<OneDocMigrationResult> {
    const chunkSize = Math.max(1, Math.min(200, options?.chunkSize ?? DEFAULT_MIGRATION_CHUNK_SIZE));

    return withStoreLock(MIGRATION_MANIFEST_KEY, async () => {
        // 1. PREFLIGHT_LOCK_CHECK：穿透读取 manifest（loadJsonStrict 已自动清 plugin.data[key]）
        const rawManifest = await loadJsonStrict(plugin, MIGRATION_MANIFEST_KEY);
        const manifest: OneDocMigrationManifest = normalizeMigrationManifestForWrite(rawManifest);
        manifest.state = "PREFLIGHT_LOCK_CHECK";
        manifest.updatedAt = Date.now();

        const [people, projectsStore, topicsStore, giftIdeasStore, scratchpadStore] = await Promise.all([
            getRoster(settings),
            loadPersonProjectsStore(plugin),
            loadTopicsStore(plugin),
            loadGiftIdeaStore(plugin),
            loadScratchpadStore(plugin),
        ]);

        const docIds = people.map((p) => p.docId).filter(Boolean);
        const existingAttrsByDoc = await inspectExistingSectionAttrs(docIds);

        // 2. BACKUP_CREATED：若无未完成的续做备份，则生成 SHA-256 30 天冷备
        let backupEnvelope: OneDocMigrationBackupEnvelope | null = null;
        if (manifest.state === "PREFLIGHT_LOCK_CHECK" && manifest.lastBackupKey === MIGRATION_BACKUP_KEY) {
            try {
                const existingBak = await loadJsonStrict(plugin, MIGRATION_BACKUP_KEY);
                if (existingBak && manifest.pendingCursor.processedDocIds.length > 0) {
                    backupEnvelope = verifyMigrationBackupEnvelope(existingBak);
                }
            } catch {
                backupEnvelope = null;
            }
        }

        if (!backupEnvelope) {
            const peopleBackups: Record<string, PersonLegacyBackupSnapshot> = {};
            for (const person of people) {
                if (!person.docId) continue;
                const ial = await queryBlockIal(person.docId).catch(() => null);
                peopleBackups[person.docId] = {
                    docId: person.docId,
                    name: person.name,
                    previousLocationsAttr: extractLocationAttrFromIal(ial),
                    existingSectionAttrs: [...(existingAttrsByDoc[person.docId] ?? [])],
                };
            }
            backupEnvelope = buildMigrationBackupEnvelope({
                people: peopleBackups,
                projectsStore,
                topicsStore,
                giftIdeasStore,
                scratchpadStore,
            });
            await saveJsonVerified(plugin, MIGRATION_BACKUP_KEY, backupEnvelope);
        }

        manifest.state = "BACKUP_CREATED";
        manifest.lastBackupKey = MIGRATION_BACKUP_KEY;
        manifest.lastBackupSha256 = backupEnvelope.sha256;
        manifest.lastBackupExpiresAt = backupEnvelope.expiresAt;
        manifest.updatedAt = Date.now();
        await saveJsonVerified(plugin, MIGRATION_MANIFEST_KEY, manifest);

        // 3. MIGRATING_CHUNK：按 chunkSize 分批幂等迁移
        manifest.state = "MIGRATING_CHUNK";
        let migrated = 0;
        let skipped = 0;
        const failedDetails: Array<{ docId: string; name: string; error: string }> = [];
        const total = people.length;

        for (let start = 0; start < total; start += chunkSize) {
            if (options?.shouldAbort?.()) break;
            const chunk = people.slice(start, start + chunkSize);

            for (let idx = 0; idx < chunk.length; idx++) {
                if (options?.shouldAbort?.()) break;
                const person = chunk[idx];
                if (!person.docId) continue;
                const globalIndex = start + idx;
                options?.onProgress?.(globalIndex + 1, total, person.docId);

                const locations = extractLegacyLocationsForMigration(person);
                const projects = projectsStore.projects[person.docId] ?? [];
                const topics = topicsStore.topics[person.docId] ?? [];
                const giftIdeas = giftIdeasStore.ideas[person.docId] ?? [];
                const scratchpads = scratchpadStore.notes[person.docId] ?? [];

                const fingerprint = computePersonMigrationFingerprint({
                    person,
                    locations,
                    projects,
                    topics,
                    giftIdeas,
                    scratchpads,
                });

                const existingAttrs = existingAttrsByDoc[person.docId] ?? new Set<string>();
                const prevRecord = manifest.completedDocIds[person.docId];
                const prevPartial = manifest.partialDocIds?.[person.docId];
                const needsLocationWrite = Boolean(
                    (locations.resident || locations.hometown)
                    && (!person.locations?.resident && !person.locations?.hometown),
                );
                const hasProfileData = Boolean(
                    person.phone || person.wechat || person.email || person.birthday
                    || person.group || (person.tags && person.tags.length > 0)
                    || locations.resident || locations.hometown,
                );
                const missingProfileBlock = hasProfileData && !existingAttrs.has(PROFILE_SECTION_ATTR);
                const missingProjectsBlock = projects.length > 0 && !existingAttrs.has(PROJECTS_SECTION_ATTR);
                const missingTopicsBlock = topics.length > 0 && !existingAttrs.has(TOPICS_SECTION_ATTR);
                const missingGiftsBlock = giftIdeas.length > 0 && !existingAttrs.has(GIFT_IDEAS_SECTION_ATTR);
                const missingScratchpadBlock = scratchpads.length > 0 && !existingAttrs.has(SCRATCHPAD_SECTION_ATTR);
                const missingDocSections =
                    missingProfileBlock
                    || missingProjectsBlock
                    || missingTopicsBlock
                    || missingGiftsBlock
                    || missingScratchpadBlock;

                if (prevRecord && prevRecord.fingerprint === fingerprint && !needsLocationWrite && !missingDocSections) {
                    skipped += 1;
                    continue;
                }

                const partialRecord: NonNullable<OneDocMigrationManifest["partialDocIds"]>[string] = {
                    docId: person.docId,
                    name: person.name,
                    fingerprint,
                    migratedLocationsAttr: prevPartial?.migratedLocationsAttr ?? backupEnvelope.payload.people[person.docId]?.previousLocationsAttr ?? "",
                    ...(prevPartial?.intendedLocationsAttr !== undefined ? { intendedLocationsAttr: prevPartial.intendedLocationsAttr } : {}),
                    locationsWriteState: prevPartial?.locationsWriteState ?? "none",
                    intendedSectionAttrs: [...(prevPartial?.intendedSectionAttrs ?? [])],
                    expectedBlockHashes: { ...(prevPartial?.expectedBlockHashes ?? {}) },
                    writtenSectionAttrs: [...(prevPartial?.writtenSectionAttrs ?? [])],
                    unknownSectionAttrs: [...(prevPartial?.unknownSectionAttrs ?? [])],
                    blockHashes: { ...(prevPartial?.blockHashes ?? {}) },
                    migratedAt: Date.now(),
                    legacyId: deterministicLegacyId(person.docId, "one-doc", fingerprint),
                };

                try {
                    const persistPartialIntent = async () => {
                        if (!manifest.partialDocIds) manifest.partialDocIds = {};
                        manifest.partialDocIds[person.docId] = {
                            ...partialRecord,
                            migratedAt: Date.now(),
                        };
                        manifest.updatedAt = Date.now();
                        await saveJsonVerified(plugin, MIGRATION_MANIFEST_KEY, manifest);
                    };

                    const serializedLocs = serializeContactLocationsAttr(locations);
                    if (serializedLocs && needsLocationWrite) {
                        // 写前先持久化根属性拟写意图与 pending 状态，避免落盘后响应失败时回滚误判或遗漏
                        partialRecord.intendedLocationsAttr = serializedLocs;
                        partialRecord.locationsWriteState = "pending";
                        await persistPartialIntent();

                        await setBlockAttrs(person.docId, { [LOCATIONS_ATTR]: serializedLocs });
                        sqlCoalescer.clearCache(person.docId);
                        partialRecord.migratedLocationsAttr = serializedLocs;
                        partialRecord.locationsWriteState = "verified";
                    } else if (!partialRecord.migratedLocationsAttr) {
                        sqlCoalescer.clearCache(person.docId);
                        const liveIal = await queryBlockIal(person.docId).catch(() => null);
                        partialRecord.migratedLocationsAttr = extractLocationAttrFromIal(liveIal);
                        if (partialRecord.locationsWriteState === "pending" && partialRecord.intendedLocationsAttr === partialRecord.migratedLocationsAttr) {
                            partialRecord.locationsWriteState = "verified";
                        }
                    }

                    const enrichedPerson = {
                        ...person,
                        locations,
                    };

                    const verifySectionLanded = async (attr: string) => {
                        const blocks = await readMarkedBlocks(person.docId, attr);
                        if (blocks.length !== 1) {
                            throw new Error(`写后回读未核实唯一区块 (${attr})`);
                        }
                        const actualHash = sha256Hex(markedBlockContent(blocks[0].markdown, attr));
                        const expectedHash = partialRecord.expectedBlockHashes?.[attr];
                        if (expectedHash && actualHash !== expectedHash) {
                            throw new Error(`写后回读内容与预期哈希不符 (${attr})`);
                        }
                        partialRecord.blockHashes[attr] = actualHash;
                        if (!partialRecord.writtenSectionAttrs!.includes(attr)) {
                            partialRecord.writtenSectionAttrs!.push(attr);
                        }
                        partialRecord.unknownSectionAttrs = (partialRecord.unknownSectionAttrs ?? []).filter((a) => a !== attr);
                    };

                    // 续做场景：若上次某区块写后回读失败留在 unknownSectionAttrs 且现已出现在文档中，先核实其内容指纹
                    for (const unknownAttr of [...(partialRecord.unknownSectionAttrs ?? [])]) {
                        if (existingAttrs.has(unknownAttr)) {
                            await verifySectionLanded(unknownAttr);
                        }
                    }

                    const writeMissingSection = async (
                        attr: string,
                        writer: (onIntent: (markdown: string) => Promise<void>) => Promise<void>,
                    ) => {
                        let intendedMarkdown = "";
                        const onIntent = async (markdown: string) => {
                            intendedMarkdown = markdown;
                            const expectedHash = sha256Hex(markedBlockContent(markdown));
                            if (!partialRecord.intendedSectionAttrs!.includes(attr)) {
                                partialRecord.intendedSectionAttrs!.push(attr);
                            }
                            partialRecord.expectedBlockHashes![attr] = expectedHash;
                            if (!partialRecord.unknownSectionAttrs!.includes(attr)) {
                                partialRecord.unknownSectionAttrs!.push(attr);
                            }
                            await persistPartialIntent();
                        };

                        try {
                            await writer(onIntent);
                            if (intendedMarkdown) {
                                await verifySectionLanded(attr);
                            } else {
                                partialRecord.unknownSectionAttrs = (partialRecord.unknownSectionAttrs ?? []).filter((a) => a !== attr);
                            }
                        } catch (writeErr) {
                            if (writeErr instanceof KernelResponseError || writeErr instanceof KernelPermissionError) {
                                // 明确被内核拒绝未落盘时，仅移除 unknown 标记但仍保留 intended 供对账
                                partialRecord.unknownSectionAttrs = (partialRecord.unknownSectionAttrs ?? []).filter((a) => a !== attr);
                            }
                            throw writeErr;
                        }
                    };

                    // 严格仅迁入缺失的目标区块，写前记录拟写意图与预期哈希，写后核实（不覆盖既有正文，也不触碰 5 项清单外的旧块）
                    if (missingProfileBlock) {
                        await writeMissingSection(PROFILE_SECTION_ATTR, (onIntent) =>
                            syncPersonProfileDocSection(enrichedPerson, { strict: true, plugin, onIntent }),
                        );
                    }
                    if (missingProjectsBlock) {
                        await writeMissingSection(PROJECTS_SECTION_ATTR, async (onIntent) => {
                            await syncProjectsDocSection(plugin, person.docId, { strict: true, items: projects, onIntent });
                        });
                    }
                    if (missingTopicsBlock) {
                        await writeMissingSection(TOPICS_SECTION_ATTR, (onIntent) =>
                            syncTopicsDocSection(plugin, person.docId, { strict: true, onIntent }),
                        );
                    }
                    if (missingGiftsBlock) {
                        await writeMissingSection(GIFT_IDEAS_SECTION_ATTR, (onIntent) =>
                            syncGiftIdeasDocSection(plugin, person.docId, { strict: true, onIntent }),
                        );
                    }
                    if (missingScratchpadBlock) {
                        await writeMissingSection(SCRATCHPAD_SECTION_ATTR, (onIntent) =>
                            syncScratchpadDocSection(plugin, person.docId, { strict: true, onIntent }),
                        );
                    }

                    if ((partialRecord.unknownSectionAttrs?.length ?? 0) > 0) {
                        throw new Error(`存在结果未知区块未完成核实: ${partialRecord.unknownSectionAttrs!.join("、")}`);
                    }

                    manifest.completedDocIds[person.docId] = {
                        ...partialRecord,
                        migratedAt: Date.now(),
                    };
                    if (manifest.partialDocIds) {
                        delete manifest.partialDocIds[person.docId];
                    }
                    delete manifest.pendingCursor.failedDocIds[person.docId];
                    if (!manifest.pendingCursor.processedDocIds.includes(person.docId)) {
                        manifest.pendingCursor.processedDocIds.push(person.docId);
                    }
                    migrated += 1;
                } catch (err) {
                    if (!manifest.partialDocIds) manifest.partialDocIds = {};
                    manifest.partialDocIds[person.docId] = {
                        ...partialRecord,
                        migratedAt: Date.now(),
                    };
                    const message = err instanceof Error ? err.message : String(err);
                    manifest.pendingCursor.failedDocIds[person.docId] = message;
                    failedDetails.push({ docId: person.docId, name: person.name, error: message });
                }
            }

            manifest.pendingCursor.chunkIndex = Math.floor(start / chunkSize) + 1;
            manifest.updatedAt = Date.now();
            await saveJsonVerified(plugin, MIGRATION_MANIFEST_KEY, manifest);
        }

        if (failedDetails.length === 0 && !options?.shouldAbort?.()) {
            manifest.state = "COMMITTED_SCHEMA_V2";
        } else {
            manifest.state = "VERIFIED";
        }
        manifest.updatedAt = Date.now();
        await saveJsonVerified(plugin, MIGRATION_MANIFEST_KEY, manifest);
        await flushBlockIndex().catch(() => {});
        invalidateRoster();

        return {
            state: manifest.state,
            total,
            migrated,
            skipped,
            failed: failedDetails.length,
            failedDetails,
            backupKey: MIGRATION_BACKUP_KEY,
            backupSha256: backupEnvelope.sha256,
            backupExpiresAt: backupEnvelope.expiresAt,
        };
    });
}

/**
 * 30 天内安全回滚（Fail-Closed）：
 * 1. 校验 SHA-256 备份包（篡改/损坏/过期立即拒绝）；
 * 2. 常住地/籍贯属性仅在“未被用户于迁移后手工修改”时才恢复原值；若用户已修改则保留用户新值并列入冲突清单；
 * 3. 文档区块检查指纹，未被修改则删除，已被用户手工修改则保留正文仅剥离迁移标记并列冲突清单；
 * 4. 任何内核读/写/删失败均 Fail-Closed：保留未完成清单与错误原因，绝不吞错提交 ROLLBACK_RESTORED。
 */
export async function rollbackOneDocMigration(
    plugin: Plugin,
    _settings?: ContactsSettings,
): Promise<OneDocMigrationRollbackResult> {
    return withStoreLock(MIGRATION_MANIFEST_KEY, async () => {
        const rawBackup = await loadJsonStrict(plugin, MIGRATION_BACKUP_KEY);
        const envelope = verifyMigrationBackupEnvelope(rawBackup);
        const manifest = normalizeMigrationManifestForWrite(await loadJsonStrict(plugin, MIGRATION_MANIFEST_KEY));

        let restoredCount = 0;
        let removedBlocksCount = 0;
        const userModifiedPreserved: Array<{ docId: string; name: string; attr: string; reason: string }> = [];
        const rollbackErrors: string[] = [];

        for (const snapshot of Object.values(envelope.payload.people)) {
            const migratedRec = manifest.completedDocIds[snapshot.docId] ?? manifest.partialDocIds?.[snapshot.docId];
            const existedSet = new Set(snapshot.existingSectionAttrs);

            try {
                // 1. 先穿透缓存核验当前文档的 custom-lv-locations 是否在迁移后被用户修改过，绝不无条件覆盖用户新值
                await flushBlockIndex();
                sqlCoalescer.clearCache(snapshot.docId);
                const docRecord = await sqlCoalescer.queryBlockRecord(snapshot.docId);
                if (!docRecord) {
                    throw new Error(`目标人物文档 ${snapshot.docId} 不可达，无法核实地区属性`);
                }
                const currentLocAttr = extractLocationAttrFromIal(docRecord.ial);
                const expectedMigratedAttr = migratedRec?.migratedLocationsAttr;
                const intendedLocAttr = migratedRec?.intendedLocationsAttr;
                const matchesVerifiedMigrated = Boolean(
                    migratedRec && expectedMigratedAttr !== undefined && currentLocAttr === expectedMigratedAttr,
                );
                const matchesPendingIntended = Boolean(
                    migratedRec
                    && migratedRec.locationsWriteState === "pending"
                    && intendedLocAttr !== undefined
                    && currentLocAttr === intendedLocAttr,
                );

                if (currentLocAttr !== snapshot.previousLocationsAttr) {
                    if (matchesVerifiedMigrated || matchesPendingIntended) {
                        await setBlockAttrs(snapshot.docId, {
                            [LOCATIONS_ATTR]: snapshot.previousLocationsAttr || "",
                        });
                        sqlCoalescer.clearCache(snapshot.docId);
                    } else if (migratedRec?.locationsWriteState === "verified" || (migratedRec && expectedMigratedAttr !== undefined && migratedRec.locationsWriteState !== "pending")) {
                        userModifiedPreserved.push({
                            docId: snapshot.docId,
                            name: snapshot.name,
                            attr: LOCATIONS_ATTR,
                            reason: "迁移后常住地/籍贯已被用户修改，已保留用户新值未覆盖",
                        });
                    } else {
                        // 未核实地区写入成功且当前值既不等于旧值也不等于拟写值：严禁覆盖或误报完成
                        throw new Error(`发现未知归属且与旧值/拟写值均不符的地区属性 (${LOCATIONS_ATTR})，已保留当前值并拒绝宣称 ROLLBACK_RESTORED`);
                    }
                }

                // 2. 严格按已核实写入 + 写前拟写意图 + 未知结果并集逐区块核实内容指纹并回滚（严禁靠扩扫删除无归属正文）
                if (migratedRec) {
                    const combinedAttrs = Array.from(new Set([
                        ...(migratedRec.writtenSectionAttrs ?? []),
                        ...(migratedRec.intendedSectionAttrs ?? []),
                        ...(migratedRec.unknownSectionAttrs ?? []),
                    ]));
                    const targetAttrs = combinedAttrs.length > 0
                        ? combinedAttrs
                        : MIGRATED_SECTION_ATTRS.filter((a) => !existedSet.has(a));
                    for (const attr of targetAttrs) {
                        if (existedSet.has(attr)) continue;
                        const blocks = await readMarkedBlocks(snapshot.docId, attr);
                        if (blocks.length === 0) continue;
                        if (blocks.length > 1) {
                            throw new Error(`存在多个迁移标记块 (${attr})，未自动删除`);
                        }
                        const currentHash = sha256Hex(markedBlockContent(blocks[0].markdown, attr));
                        const verifiedHash = migratedRec.blockHashes[attr];
                        const expectedHash = migratedRec.expectedBlockHashes?.[attr];
                        if ((verifiedHash && currentHash === verifiedHash) || (expectedHash && currentHash === expectedHash)) {
                            await deleteBlock(blocks[0].id);
                            removedBlocksCount += 1;
                        } else if (migratedRec.writtenSectionAttrs?.includes(attr)) {
                            // 已核实属本插件写入，后被用户手工编辑：保留正文，仅剥离迁移属性标记并列入冲突清单
                            await setBlockAttrs(blocks[0].id, { [attr]: "" });
                            userModifiedPreserved.push({
                                docId: snapshot.docId,
                                name: snapshot.name,
                                attr,
                                reason: "迁移后正文已被用户手工编辑，已保留正文并剥离迁移标记",
                            });
                        } else {
                            // 未曾核实写入归属且当前正文与预期哈希不符：严禁删除或剥离无归属正文，Fail-Closed 保留记录并拒报完成
                            throw new Error(`发现未知归属且内容与预期不符的标记块 (${attr})，已保留正文并拒绝宣称 ROLLBACK_RESTORED`);
                        }
                    }
                    delete manifest.completedDocIds[snapshot.docId];
                    if (manifest.partialDocIds) delete manifest.partialDocIds[snapshot.docId];
                }
                delete manifest.pendingCursor.failedDocIds[snapshot.docId];
                restoredCount += 1;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                manifest.pendingCursor.failedDocIds[snapshot.docId] = msg;
                rollbackErrors.push(`${snapshot.name || snapshot.docId}：${msg}`);
            }
        }

        if (rollbackErrors.length > 0) {
            manifest.state = "VERIFIED";
            manifest.updatedAt = Date.now();
            await saveJsonVerified(plugin, MIGRATION_MANIFEST_KEY, manifest).catch(() => {});
            throw new Error(`回滚未完成（Fail-Closed，未提交 ROLLBACK_RESTORED）：${rollbackErrors.join("；")}`);
        }

        manifest.state = "ROLLBACK_RESTORED";
        manifest.pendingCursor = { processedDocIds: [], failedDocIds: {}, chunkIndex: 0 };
        manifest.updatedAt = Date.now();
        await saveJsonVerified(plugin, MIGRATION_MANIFEST_KEY, manifest);
        await flushBlockIndex();
        invalidateRoster();

        return {
            state: manifest.state,
            restoredCount,
            removedBlocksCount,
            userModifiedPreserved,
        };
    });
}
