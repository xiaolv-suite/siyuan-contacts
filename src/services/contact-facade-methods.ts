/**
 * 联系人全量业务门面方法集合 (contactFacadeMethods)
 *
 * 封装 LvContactsPlugin 的所有业务与数据方法，
 * 采用 prototype 扩展机制，使 src/index.ts 收敛为薄壳微内核。
 */

import { amendInteraction, deleteInteraction, recordInteractionWithResult, loadInteractionStoreStrict } from "../data/interactions";
import { toLocalDateKey, type InteractionAmendment, type InteractionSource, type InteractionType } from "../domain/interactions";
import { captureFromDoc, previewCapture } from "./capture";
import { extractFromDoc, prepareAiExtraction } from "./ai-extract";
import { AiExtractionError } from "../domain/ai-preflight";
import type { AiExtractionConfirmation } from "../domain/ai-extract-types";
import type { AiPreflightOptions } from "../domain/ai-preflight";
import { loadPersonInsights } from "./insights";
import { mapBoundDocIds } from "../api/av";
import {
    syncInteractionDocSection,
    syncFullPersonDocument,
    syncPersonProfileDocSection,
    loadPersonFactsFromDoc,
    savePersonFactsToDoc,
    syncChannelsDocSection,
    loadChannelsFromDoc,
    syncSocialPreferencesDocSection,
    loadSocialPreferencesFromDoc,
    syncProjectsDocSection,
    loadProjectsFromDoc,
} from "./doc-section";
import { detachLegacyPersonNote, inspectLegacyPersonNote, loadPersonNote, savePersonNote } from "./person-note";
import type { LegacyPersonNoteSnapshot } from "../domain/person-note";
import { loadPersonFields, savePersonFields } from "./person-fields";
import type { PersonFieldsSnapshot, PersonFieldsState } from "../domain/person-fields";
import {
    checkSettingsHealth,
    previewMissingFields,
    previewRebindSettings,
    rebuildMissingFields,
    rebindSettings,
    repairFieldMap,
    type FieldRebuildPreview,
    type SettingsRebindPreview,
} from "./settings-health";
import {
    auditWorkspaceData,
    auditWorkspaceDataReport,
    retryFailedHealthAuditModules,
} from "./health-audit";
import { reconcileFollowUpTasksFromDoc } from "./followup-sync";
import { updateContactFields, applyContactCandidateFields } from "./contacts";
import type { WritableContactField } from "../domain/contact-write";
import { addRelation, removeRelation, discoverConnections } from "./relations";
import { ensureSelfIdentity, designateSelfIdentity, previewSelfIdentityChange, applySelfIdentityChange } from "./self-identity";
import { loadSelfIdentity } from "../data/self-identity";
import {
    logCheckinEventSafely,
    callBridge,
    type HomeBridgeApi,
} from "../libs/ecosystem-bridge-kit";
import { exportMigrationBundle, importMigrationBundle, previewMigrationImport } from "./migration-bundle";
import { exportInteractionJson } from "./interaction-export";
import {
    appendInteractionToDailyNote,
    appendFollowUpToDailyNote,
    removeDailyNoteInteractionByEventId,
    updateDailyNoteInteractionByEventId,
} from "./diary";
import { loadExportSummary } from "./export-center";
import { exportVcfText } from "./vcard";
import {
    createFollowUp,
    exportFollowUpsJson,
    importFollowUpsJson,
    listPersonFollowUps,
    newFollowUpRequestId,
    previewFollowUpsImport,
    setFollowUpStatus,
    snoozeFollowUp,
} from "./followups";
import type { SnoozeOption } from "../domain/followups";
import { loadPersonCadence, savePersonCadence, loadCadenceMapStrict } from "../data/cadences";
import { dismissReminder, resumeReminder, loadReminderDismissalsStrict } from "../data/reminder-dismissals";
import type { ReminderKind } from "../data/reminder-dismissals";
import type { PersonCadence } from "../domain/cadence";
import { listTemplates, saveTemplates } from "./templates";
import type { NoteTemplate } from "../domain/interaction-templates";
import { loadPersonTopics, addPersonTopic, removePersonTopic } from "../data/topics";
import {
    listPersonExchanges,
    createPersonExchange,
    updatePersonExchange,
    changePersonExchangeStatus,
    loadExchangesSummary,
    createExchangesLedgerDoc,
    type CreatePersonExchangeInput,
    type ExchangePatch,
} from "./exchanges";
import { listPersonAliases, addPersonAlias, removePersonAlias, resolveAlias } from "./person-aliases";
import { listTrash, restoreContactFromTrash, removeContactToTrash, emptyTrash } from "./trash";
import { executeContactMerge } from "./duplicate-merge";
import { loadPersonGiftIdeas, addPersonGiftIdea, updatePersonGiftIdea, removePersonGiftIdea } from "../data/gift-ideas";
import { listOccasions, createOccasion, deleteOccasion } from "./occasions";
import {
    loadPersonAnniversaries,
    addPersonAnniversary,
    updatePersonAnniversary,
    removePersonAnniversary,
    listUpcomingAnniversaries,
} from "../data/anniversaries.ts";
import { exportPersonAnniversariesIcs, exportAllAnniversariesIcs } from "./ical.ts";
import {
    loadPersonProjectsState,
    addPersonProject,
    updatePersonProject,
    removePersonProject,
    findCollaboratorsByProject,
} from "../data/projects.ts";
import {
    loadPersonItineraries,
    savePersonItinerary,
    removePersonItinerary,
    togglePersonItineraryChecklist,
} from "../data/itineraries.ts";
import {
    loadPersonPromises,
    addPersonPromise,
    updatePersonPromise,
    removePersonPromise,
} from "../data/promises.ts";
import {
    loadPersonLifecycleStage,
    updatePersonLifecycleStage,
    loadAllLifecycleStages,
    batchUpdatePersonLifecycleStages,
} from "../data/lifecycle-stage.ts";
import {
    loadPersonScratchpads,
    savePersonScratchpad,
    updatePersonScratchpad,
    removePersonScratchpad,
} from "../data/person-scratchpad.ts";
import { normalizeChannels, type ContactChannel } from "../domain/person-channels.ts";
import {
    loadPersonSocialPreferences,
    addPersonSocialPreference,
    updatePersonSocialPreference,
    removePersonSocialPreference,
} from "../data/social-preferences.ts";
import { loadPersonOrigin, savePersonOrigin, loadAllPersonOrigins } from "../data/person-origins.ts";
import type { PersonOrigin } from "../domain/person-origin.ts";
import { buildReview, exportReviewReportToDoc } from "./review-report";
import { createWeeklyDigestDoc } from "./weekly-digest";
import { createPersonFlashcardsDoc, createBatchFlashcardsDoc } from "./flashcards";
import { createBriefingDoc } from "./briefing-doc.ts";
import { createMilestonesDoc } from "./milestones-doc.ts";
import { loadAllPreMeetingDossiers } from "./pre-meeting.ts";
import { loadCoolingRadarSummary } from "./cooling-radar.ts";
import { importInteractionJson, previewInteractionImport, previewInteractionImportDiff } from "./interaction-import";
import {
    initializeWorkspace,
    inspectWorkspace,
    scanAnchorCandidates,
    type AnchorScanOptions,
    type InitProgressStep,
    type WorkspaceSnapshot,
} from "./init";
import { loadDashboard, DEFAULT_DASHBOARD_OPTIONS } from "./dashboard";
import { getRoster, invalidateRoster } from "./roster";
import { loadPersonRelationshipLabels, savePersonRelationshipLabels } from "./people-profiles";
import { setBlockAttrs, flushBlockIndex } from "../api/blocks";
import { queryBlockIal, sqlCoalescer } from "../api/sql-coalescer";
import { querySql, assertKernelRecord } from "../api/client";
import { organizationIalAttributes } from "../domain/organization-operations";
import type { ContactSummary, ContactDraft } from "../domain/person";
import { backfillAllPersonDocuments } from "./data-sovereignty-backfill";
import {
    previewOneDocMigration,
    executeOneDocMigration,
    rollbackOneDocMigration,
} from "./one-doc-migration";
import {
    LOCATIONS_ATTR,
    LEGACY_LOCATIONS_ATTR,
    normalizeContactLocations,
    parseContactLocationsAttr,
    serializeContactLocationsAttr,
    type ContactLocations,
} from "../domain/china-regions";
import { lvActivity, lvEcosystem, lvNotify } from "../libs/lv-notice-kit";
import { emitDataChanged, emitWorkspaceState } from "../libs/data-events";
import { detectChangedCities } from "../domain/city-topic";
import { autoRebaseCityTopics } from "./city-topic";
import type { ContactsSettings } from "../domain/model";

export const contactFacadeMethods = {
    async initialize(
        this: any,
        notebookName: string,
        onProgress: (step: InitProgressStep) => void,
        options?: { createSelf?: boolean },
    ): Promise<ContactsSettings> {
        const lifecycleToken = this.lifecycleToken;
        const settings = await initializeWorkspace(this, { notebookName, createSelf: options?.createSelf }, (step) => {
            if (this.isLifecycleActive(lifecycleToken)) onProgress(step);
        });
        if (this.isLifecycleActive(lifecycleToken)) {
            this.recoverySettings = null;
            this.settings = settings;
        }
        if (this.isLifecycleActive(lifecycleToken)) {
            this.workspaceState = { kind: "ready" };
            emitWorkspaceState(this.workspaceState);
            this.onWorkspaceReadyRefreshed();
            const wb = typeof document !== "undefined" ? document.querySelector(".lvct-workbench") : null;
            if (!this.isMobile && wb && wb.getBoundingClientRect().width === 0) {
                this.openWorkbench();
            }
        }
        return settings;
    },

    async previewInitialize(this: any, notebookName: string): Promise<WorkspaceSnapshot> {
        return inspectWorkspace(notebookName);
    },

    async scanAnchorCandidates(this: any, options?: AnchorScanOptions) {
        return scanAnchorCandidates(options);
    },

    async loadDashboard(this: any, options?: Partial<typeof DEFAULT_DASHBOARD_OPTIONS>) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadDashboard(this, this.settings, { ...DEFAULT_DASHBOARD_OPTIONS, ...options });
    },

    async recordInteraction(
        this: any,
        personDocId: string,
        note?: string,
        type?: InteractionType,
        options?: { occurredAt?: number; source?: InteractionSource; externalRef?: string; skipDocSync?: boolean; skipDailyNoteSync?: boolean },
    ): Promise<void> {
        const recordResult = await recordInteractionWithResult(this, { personDocId, note, type, ...options });
        if (!options?.skipDocSync) {
            await syncInteractionDocSection(this, personDocId).catch(() => {});
        }
        if (!options?.skipDailyNoteSync && this.settings?.notebookId) {
            const notebookId = this.settings.notebookId;
            const date = toLocalDateKey(options?.occurredAt ? new Date(options.occurredAt) : new Date());
            const lastEvent = recordResult.store.events[recordResult.store.events.length - 1];
            await this.listContacts().then((roster: ContactSummary[]) => {
                const person = roster.find((p) => p.docId === personDocId);
                return appendInteractionToDailyNote(notebookId, {
                    eventId: lastEvent?.id,
                    personDocId,
                    personName: person?.name || "联系人",
                    localDate: date,
                    type,
                    note,
                    occurredAt: options?.occurredAt,
                });
            }).catch(() => {});
        }
        if (this.settings?.checkinItemId) {
            const date = toLocalDateKey(options?.occurredAt ? new Date(options.occurredAt) : new Date());
            void logCheckinEventSafely({
                itemId: this.settings.checkinItemId,
                value: 1,
                externalRef: `contacts:${personDocId}:${date}:${options?.occurredAt ?? Date.now()}`,
                note: note ? `与联系人互动：${note}` : "与联系人互动跟进",
            }).catch(() => {});
        }
        if (recordResult.recorded) {
            const lastEvent = recordResult.store.events[recordResult.store.events.length - 1];
            const eventId = lastEvent?.id;
            void this.listContacts().then((roster: ContactSummary[]) => {
                const person = roster.find((p) => p.docId === personDocId);
                const name = person?.name || "联系人";
                const actionLabel = type === "call" ? "电话沟通"
                    : type === "message" ? "线上交流"
                    : type === "email" ? "邮件联络"
                    : type === "meal" ? "聚餐商谈"
                    : "线下会面";
                lvActivity.record({
                    source: "人脉",
                    category: "contact",
                    title: `与 ${name} ${actionLabel}`,
                    detail: note || undefined,
                    linkBlockId: personDocId,
                });
                if (eventId) {
                    lvNotify.card({
                        source: "小驴人脉",
                        message: `已记录与「${name}」的互动`,
                        level: "success",
                        duration: 5000,
                        actions: [
                            {
                                label: "撤销",
                                primary: true,
                                onClick: async () => {
                                    try {
                                        await this.deleteInteraction(personDocId, eventId);
                                        lvNotify.capsule({ source: "小驴人脉", message: `已撤销与「${name}」的互动记录`, level: "info" });
                                    } catch (err) {
                                        lvNotify.card({ source: "小驴人脉", title: "撤销失败", message: `未能撤销互动记录：${err instanceof Error ? err.message : String(err)}`, level: "error" });
                                    }
                                },
                            },
                        ],
                    });
                } else {
                    lvNotify.capsule({ source: "小驴人脉", message: `已记录与「${name}」的互动`, level: "success" });
                }
            }).catch(() => {});
        }
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    },

    async deleteInteraction(this: any, personDocId: string, eventId: string): Promise<void> {
        await deleteInteraction(this, eventId, personDocId);
        await syncInteractionDocSection(this, personDocId).catch(() => {});
        await removeDailyNoteInteractionByEventId(eventId).catch(() => {});
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    },

    async amendInteraction(this: any, personDocId: string, eventId: string, amendment: InteractionAmendment): Promise<void> {
        const res = await amendInteraction(this, eventId, personDocId, amendment);
        await syncInteractionDocSection(this, personDocId).catch(() => {});
        await this.listContacts().then((roster: ContactSummary[]) => {
            const person = roster.find((p) => p.docId === personDocId);
            return updateDailyNoteInteractionByEventId({
                oldEventId: eventId,
                newEventId: res.event.id,
                personDocId,
                personName: person?.name || "联系人",
                type: res.event.type,
                note: res.event.note,
                occurredAt: res.event.occurredAt,
            });
        }).catch(() => {});
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    },

    async syncPersonDocument(this: any, person: ContactSummary): Promise<void> {
        await syncFullPersonDocument(this, person);
    },

    async listPersonExchanges(this: any, personDocId: string) {
        return listPersonExchanges(this, personDocId);
    },

    async createPersonExchange(this: any, input: CreatePersonExchangeInput) {
        const token = this.lifecycleToken;
        const result = await createPersonExchange(this, input);
        emitDataChanged({ topics: ["people"], docIds: [input.personDocId] }, token);
        return result;
    },

    async updatePersonExchange(this: any, id: string, patch: ExchangePatch, expected?: Pick<any, "updatedAt">) {
        const token = this.lifecycleToken;
        const result = await updatePersonExchange(this, id, patch, expected);
        emitDataChanged({ topics: ["people"] }, token);
        return result;
    },

    async changePersonExchangeStatus(this: any, id: string, status: any, settledOn?: string, expected?: Pick<any, "updatedAt">) {
        const token = this.lifecycleToken;
        const result = await changePersonExchangeStatus(this, id, status, settledOn, expected);
        emitDataChanged({ topics: ["people"] }, token);
        return result;
    },

    async listPersonAliases(this: any, personDocId: string) {
        return listPersonAliases(this, personDocId);
    },

    async addPersonAlias(this: any, personDocId: string, alias: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await addPersonAlias(this, personDocId, alias, this.settings);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    },

    async removePersonAlias(this: any, id: string) {
        const token = this.lifecycleToken;
        await removePersonAlias(this, id);
        emitDataChanged({ topics: ["people"] }, token);
    },

    async resolvePersonAlias(this: any, alias: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return resolveAlias(this, alias, this.settings);
    },

    async previewCapture(this: any, docId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewCapture(this.settings, docId);
    },

    async updatePersonFields(this: any, personItemId: string, draft: ContactDraft) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return updateContactFields(this.settings, personItemId, draft);
    },

    async savePersonAvatar(this: any, personDocId: string, avatarDataUrl: string): Promise<void> {
        await setBlockAttrs(personDocId, {
            "custom-lvct-avatar": avatarDataUrl,
            icon: avatarDataUrl,
        });
        await flushBlockIndex();
        invalidateRoster();
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    },

    async loadPersonAvatar(this: any, personDocId: string): Promise<string> {
        await flushBlockIndex();
        const ial = await queryBlockIal(personDocId);
        if (!ial) return "";
        const attrs = organizationIalAttributes(ial);
        return attrs["custom-lvct-avatar"] || attrs["icon"] || "";
    },

    async savePersonChannels(this: any, personDocId: string, channels: ContactChannel[]): Promise<void> {
        const encoded = encodeURIComponent(JSON.stringify(channels));
        await setBlockAttrs(personDocId, {
            "custom-lvct-channels": encoded,
        });

        try {
            await syncChannelsDocSection(personDocId, channels);
        } catch (docErr) {
            console.warn("[LvContacts] 通讯条目落盘至正文未完成:", docErr);
        }

        try {
            if (this.settings?.avId) {
                const primaryPhone = channels.find((c) => c.type === "phone" && c.isPrimary)?.value
                    || channels.find((c) => c.type === "phone")?.value;
                const primaryWechat = channels.find((c) => c.type === "wechat" && c.isPrimary)?.value
                    || channels.find((c) => c.type === "wechat")?.value;
                const primaryEmail = channels.find((c) => c.type === "email" && c.isPrimary)?.value
                    || channels.find((c) => c.type === "email")?.value;

                const mapping: Record<string, string> = await mapBoundDocIds(this.settings.avId, [personDocId]).catch(() => ({}));
                const itemId = mapping[personDocId];
                if (itemId) {
                    const fieldsToWrite: WritableContactField[] = [];
                    const partialDraft: any = { name: "" };
                    if (primaryPhone !== undefined) {
                        partialDraft.phone = primaryPhone;
                        fieldsToWrite.push("phone");
                    }
                    if (primaryWechat !== undefined) {
                        partialDraft.wechat = primaryWechat;
                        fieldsToWrite.push("wechat");
                    }
                    if (primaryEmail !== undefined) {
                        partialDraft.email = primaryEmail;
                        fieldsToWrite.push("email");
                    }
                    if (fieldsToWrite.length > 0) {
                        await updateContactFields(this.settings, itemId, partialDraft, { onlyFields: fieldsToWrite });
                    }
                }
            }
        } catch (avErr) {
            console.warn("[LvContacts] 核心通讯同步回写 AttributeView 数据库未完成:", avErr);
        }

        await flushBlockIndex();
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    },

    async loadPersonChannels(this: any, personDocId: string): Promise<ContactChannel[]> {
        await flushBlockIndex();
        const ial = await queryBlockIal(personDocId);
        let fromAttrs: ContactChannel[] = [];
        if (ial) {
            let attrs: Record<string, string> = {};
            try {
                attrs = organizationIalAttributes(ial);
            } catch {
                const m = ial.match(/custom-lvct-channels="([^"]*)"/);
                if (m) attrs["custom-lvct-channels"] = m[1];
            }
            const raw = attrs["custom-lvct-channels"];
            if (raw) {
                try {
                    fromAttrs = normalizeChannels(JSON.parse(decodeURIComponent(raw)));
                } catch {
                    try {
                        fromAttrs = normalizeChannels(JSON.parse(raw));
                    } catch {}
                }
            }
        }
        if (fromAttrs.length > 0) return fromAttrs;

        try {
            const fromDoc = await loadChannelsFromDoc(personDocId);
            if (fromDoc.length > 0) {
                const encoded = encodeURIComponent(JSON.stringify(fromDoc));
                void setBlockAttrs(personDocId, { "custom-lvct-channels": encoded }).catch(() => {});
                return fromDoc;
            }
        } catch {}

        return [];
    },

    async backfillDataSovereignty(this: any, options?: { onProgress?: (current: number, total: number, docId: string) => void }): Promise<{ total: number; success: number; failed: number }> {
        if (!this.settings) return { total: 0, success: 0, failed: 0 };
        return backfillAllPersonDocuments(this, this.settings, options);
    },

    async savePersonLocations(this: any, personDocId: string, locations: ContactLocations): Promise<void> {
        const normalized = normalizeContactLocations(locations);
        const serialized = serializeContactLocationsAttr(normalized);
        await setBlockAttrs(personDocId, {
            [LOCATIONS_ATTR]: serialized,
        });
        sqlCoalescer.clearCache(personDocId);
        await flushBlockIndex();
        invalidateRoster();
        try {
            if (this.settings) {
                const roster = await getRoster(this.settings);
                const person = roster.find((p) => p.docId === personDocId);
                if (person) {
                    await syncPersonProfileDocSection({ ...person, locations: normalized }, { plugin: this });
                }
            }
        } catch (err) {
            console.warn("[LvContacts] 常住地/籍贯同步正文基本档案未完成:", err);
        }
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    },

    async loadPersonLocations(this: any, personDocId: string): Promise<ContactLocations> {
        await flushBlockIndex();
        const ial = await queryBlockIal(personDocId);
        if (!ial) return {};
        let attrs: Record<string, string> = {};
        try {
            attrs = organizationIalAttributes(ial);
        } catch {
            const m = ial.match(/(?:custom-lv-locations|custom-lvct-locations)="([^"]*)"/);
            if (m) attrs[LOCATIONS_ATTR] = m[1];
        }
        const raw = attrs[LOCATIONS_ATTR] || attrs[LEGACY_LOCATIONS_ATTR];
        return parseContactLocationsAttr(raw);
    },

    async previewOneDocMigration(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewOneDocMigration(this, this.settings);
    },

    async executeOneDocMigration(this: any, options?: { chunkSize?: number; onProgress?: (current: number, total: number, docId: string) => void }) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await executeOneDocMigration(this, this.settings, options);
        emitDataChanged({ topics: ["people", "all"] }, token);
        return result;
    },

    async rollbackOneDocMigration(this: any) {
        const token = this.lifecycleToken;
        const result = await rollbackOneDocMigration(this, this.settings);
        emitDataChanged({ topics: ["people", "all"] }, token);
        return result;
    },

    async savePersonBusinessCard(this: any, personDocId: string, cardDataUrl: string): Promise<void> {
        await setBlockAttrs(personDocId, {
            "custom-lvct-business-card": cardDataUrl || "",
        });
        await flushBlockIndex();
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    },

    async loadPersonBusinessCard(this: any, personDocId: string): Promise<string> {
        await flushBlockIndex();
        const safeDocId = personDocId.replace(/'/g, "''");
        const rows = await querySql<unknown>(`SELECT ial FROM blocks WHERE id = '${safeDocId}' AND type = 'd' LIMIT 1`);
        if (!rows.length) return "";
        const row = assertKernelRecord("/api/query/sql", rows[0]);
        let attrs: Record<string, string> = {};
        try {
            attrs = organizationIalAttributes(typeof row.ial === "string" ? row.ial : "");
        } catch {
            const ialStr = typeof row.ial === "string" ? row.ial : "";
            const m = ialStr.match(/custom-lvct-business-card="([^"]*)"/);
            if (m) attrs["custom-lvct-business-card"] = m[1];
        }
        return attrs["custom-lvct-business-card"] || "";
    },

    async loadSelfIdentity(this: any) {
        return loadSelfIdentity(this);
    },

    async createSelfProfile(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const res = await ensureSelfIdentity(this, this.settings);
        emitDataChanged({ topics: ["people"] }, token);
        return res;
    },

    async designateSelfIdentity(this: any, personItemId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const res = await designateSelfIdentity(this, this.settings, personItemId);
        emitDataChanged({ topics: ["people"] }, token);
        return res;
    },

    async previewSelfIdentityChange(this: any, targetItemId: string | null) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewSelfIdentityChange(this, this.settings, targetItemId);
    },

    async applySelfIdentityChange(this: any, preview: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const res = await applySelfIdentityChange(this, this.settings, preview);
        emitDataChanged({ topics: ["people"] }, token);
        return res;
    },

    async listContacts(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return getRoster(this.settings);
    },

    async loadPersonRelationshipLabels(this: any, personDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadPersonRelationshipLabels(this, this.settings, personDocId);
    },

    async savePersonRelationshipLabels(this: any, personDocId: string, selfDocId: string, labels: string[], expected: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await savePersonRelationshipLabels(this, this.settings, personDocId, selfDocId, labels, expected);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    },

    async updatePersonCandidateFields(this: any, personItemId: string, patches: readonly any[]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return applyContactCandidateFields(this.settings, personItemId, patches);
    },

    async captureDoc(this: any, docId: string, options: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return captureFromDoc(this, this.settings, docId, options);
    },

    async prepareAiExtraction(this: any, docId: string, options?: AiPreflightOptions) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        if (!this.viewPreferences.aiEnabled) throw new AiExtractionError("disabled");
        return prepareAiExtraction(this.settings, docId, options);
    },

    async aiExtractFromDoc(this: any, docId: string, confirmation?: AiExtractionConfirmation) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        if (!this.viewPreferences.aiEnabled) throw new AiExtractionError("disabled");
        const outcome = await extractFromDoc(this.settings, docId, confirmation);
        if (!this.viewPreferences.aiEnabled) throw new AiExtractionError("disabled");
        return outcome;
    },

    async loadPersonInsights(this: any, docId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadPersonInsights(this, this.settings, docId);
    },

    async loadRecentInteractions(this: any) {
        const store = await loadInteractionStoreStrict(this);
        const latest: Record<string, { occurredAt: number; localDate: string; count?: number }> = {};
        for (const event of store.events) {
            const current = latest[event.personDocId];
            if (!current) {
                latest[event.personDocId] = { occurredAt: event.occurredAt, localDate: event.localDate, count: 1 };
            } else {
                current.count = (current.count || 0) + 1;
                if (event.occurredAt > current.occurredAt) {
                    current.occurredAt = event.occurredAt;
                    current.localDate = event.localDate;
                }
            }
        }
        return latest;
    },

    async loadInteractionEvents(this: any) {
        const store = await loadInteractionStoreStrict(this);
        return store.events;
    },

    async checkSettingsHealth(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return checkSettingsHealth(this.settings);
    },

    async runHealthAudit(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return auditWorkspaceData(this, this.settings);
    },

    async runHealthAuditReport(this: any, previous?: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return auditWorkspaceDataReport(this, this.settings, { previous });
    },

    async retryFailedHealthAuditModules(this: any, previous: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return retryFailedHealthAuditModules(this, this.settings, previous);
    },

    async previewMissingFields(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewMissingFields(this, this.settings);
    },

    async rebuildMissingFields(this: any, preview: FieldRebuildPreview) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const settings = await rebuildMissingFields(this, this.settings, preview, () => this.isLifecycleActive(token));
        if (this.isLifecycleActive(token)) this.settings = settings;
        return settings;
    },

    async previewRebindSettings(this: any, patch: any) {
        const settings = this.recoverySettings ?? this.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        return previewRebindSettings(this, settings, patch);
    },

    async rebindSettings(this: any, patch: any, preview: SettingsRebindPreview) {
        const source = this.recoverySettings ?? this.settings;
        if (!source) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const settings = await rebindSettings(this, source, patch, preview, () => this.isLifecycleActive(token));
        if (this.isLifecycleActive(token)) {
            this.recoverySettings = null;
            this.settings = settings;
        }
        return settings;
    },

    async exportInteractionJson(this: any) {
        return exportInteractionJson(this);
    },

    async exportMigrationBundle(this: any) {
        return exportMigrationBundle(this);
    },

    async previewMigrationImport(this: any, text: string) {
        return previewMigrationImport(text);
    },

    async importMigrationBundle(this: any, text: string) {
        return importMigrationBundle(this, text);
    },

    async dumpData(this: any): Promise<Record<string, unknown>> {
        const bundle = await this.exportMigrationBundle();
        const parsed = typeof bundle === "string" ? JSON.parse(bundle) : bundle;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("导出灾备数据包格式无效：预期为 JSON 对象");
        }
        return parsed as Record<string, unknown>;
    },

    async restoreData(this: any, data: Record<string, unknown> | string): Promise<boolean> {
        if (!data) return false;
        let text: string;
        if (typeof data === "string") {
            if (!data.trim()) return false;
            text = data;
        } else if (typeof data === "object" && !Array.isArray(data)) {
            text = JSON.stringify(data);
        } else {
            return false;
        }
        try {
            const result = await this.importMigrationBundle(text);
            if (!result || !Array.isArray(result.failed)) {
                console.error("[LvContacts] lvBackup 灾备恢复返回结构异常:", result);
                return false;
            }
            if (result.failed.length > 0) {
                console.error("[LvContacts] lvBackup 灾备恢复存在失败模块:", result.failed);
                return false;
            }
            return true;
        } catch (e) {
            console.error("[LvContacts] lvBackup 灾备恢复失败:", e);
            return false;
        }
    },

    async listPersonFollowUps(this: any, personDocId: string) {
        await reconcileFollowUpTasksFromDoc(this, personDocId);
        return listPersonFollowUps(this, personDocId);
    },

    async loadPersonNote(this: any, personDocId: string) {
        return loadPersonNote(personDocId);
    },

    async inspectLegacyPersonNote(this: any, personDocId: string) {
        return inspectLegacyPersonNote(personDocId);
    },

    async detachLegacyPersonNote(this: any, personDocId: string, expected: LegacyPersonNoteSnapshot) {
        const token = this.lifecycleToken;
        await detachLegacyPersonNote(personDocId, expected);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
    },

    async loadPersonFields(this: any, personDocId: string) {
        return loadPersonFields(personDocId);
    },

    async savePersonFields(this: any, personDocId: string, snapshot: PersonFieldsSnapshot, expected: PersonFieldsState) {
        const token = this.lifecycleToken;
        const saved = await savePersonFields(personDocId, snapshot, expected);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return saved;
    },

    async savePersonNote(this: any, personDocId: string, note: string, expected?: string) {
        const saved = await savePersonNote(personDocId, note, expected);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] });
        return saved;
    },

    async createFollowUp(this: any, personDocId: string, title: string, dueDate: string, requestId = newFollowUpRequestId()) {
        const token = this.lifecycleToken;
        const item = await createFollowUp(this, { requestId, personDocId, title, dueDate });
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        if (this.settings?.notebookId) {
            const notebookId = this.settings.notebookId;
            void this.listContacts().then((roster: ContactSummary[]) => {
                const person = roster.find((p) => p.docId === personDocId);
                return appendFollowUpToDailyNote(notebookId, {
                    personDocId,
                    personName: person?.name || "联系人",
                    title,
                    dueDate,
                });
            }).catch(() => {});
        }
        return item;
    },

    async retryCreateFollowUp(this: any, requestId: string, personDocId: string, title: string, dueDate: string) {
        if (!this.isLifecycleActive()) throw new Error("插件生命周期已结束，未重试跟进创建");
        const item = await createFollowUp(this, { requestId, personDocId, title, dueDate });
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
        return item;
    },

    async setFollowUpStatus(this: any, id: string, status: "open" | "done" | "cancelled") {
        const token = this.lifecycleToken;
        const item = await setFollowUpStatus(this, id, status);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        if (status === "done" && this.settings?.checkinItemId) {
            const date = toLocalDateKey();
            void logCheckinEventSafely({
                itemId: this.settings.checkinItemId,
                value: 1,
                externalRef: `contacts:${item.personDocId}:${date}:${Date.now()}`,
                note: item.title ? `完成人脉跟进：${item.title}` : "完成人脉跟进任务",
            }).catch(() => {});
        }
    },

    async snoozeFollowUp(this: any, id: string, option: SnoozeOption, customDate?: string) {
        const token = this.lifecycleToken;
        const item = await snoozeFollowUp(this, id, option, customDate);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
    },

    async exportFollowUpsJson(this: any) {
        return exportFollowUpsJson(this);
    },

    async previewFollowUpsImport(this: any, text: string) {
        return previewFollowUpsImport(this, text);
    },

    async importFollowUpsJson(this: any, text: string) {
        return importFollowUpsJson(this, text);
    },

    async getPersonCadence(this: any, personDocId: string) {
        return loadPersonCadence(this, personDocId);
    },

    async savePersonCadence(this: any, personDocId: string, cadence: PersonCadence | null) {
        const token = this.lifecycleToken;
        await savePersonCadence(this, personDocId, cadence);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
    },

    async dismissReminder(this: any, personDocId: string, kind: ReminderKind, until: string) {
        const token = this.lifecycleToken;
        await dismissReminder(this, personDocId, kind, until);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
    },

    async resumeReminder(this: any, personDocId: string, kind: ReminderKind) {
        const token = this.lifecycleToken;
        await resumeReminder(this, personDocId, kind);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
    },

    async loadReminderDismissals(this: any) {
        return loadReminderDismissalsStrict(this);
    },

    async listTemplates(this: any) {
        return listTemplates(this);
    },

    async saveTemplates(this: any, templates: readonly NoteTemplate[], expected: readonly NoteTemplate[]) {
        return saveTemplates(this, templates, expected);
    },

    async loadPersonTopics(this: any, personDocId: string) {
        return loadPersonTopics(this, personDocId);
    },

    async addPersonTopic(this: any, personDocId: string, text: string) {
        const token = this.lifecycleToken;
        const res = await addPersonTopic(this, personDocId, text);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removePersonTopic(this: any, personDocId: string, topicId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonTopic(this, personDocId, topicId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removeContactToTrash(this: any, person: ContactSummary) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        await removeContactToTrash(this, this.settings, person);
        emitDataChanged({ topics: ["people"], docIds: [person.docId] }, token);
    },

    async listTrash(this: any) {
        return listTrash(this);
    },

    async restoreContactFromTrash(this: any, entryId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await restoreContactFromTrash(this, this.settings, entryId);
        emitDataChanged({ topics: ["people"], docIds: [result.docId] }, token);
        return result;
    },

    async emptyTrash(this: any) {
        const token = this.lifecycleToken;
        await emptyTrash(this);
        emitDataChanged({ topics: ["people"] }, token);
    },

    async executeContactMerge(this: any, plan: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return executeContactMerge(this, this.settings, plan);
    },

    async loadPersonGiftIdeas(this: any, personDocId: string) {
        return loadPersonGiftIdeas(this, personDocId);
    },

    async addPersonGiftIdea(this: any, item: any) {
        const token = this.lifecycleToken;
        const res = await addPersonGiftIdea(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    },

    async updatePersonGiftIdea(this: any, personDocId: string, ideaId: string, patch: any) {
        const token = this.lifecycleToken;
        const res = await updatePersonGiftIdea(this, personDocId, ideaId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removePersonGiftIdea(this: any, personDocId: string, ideaId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonGiftIdea(this, personDocId, ideaId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async listOccasions(this: any) {
        return listOccasions(this);
    },

    async createOccasion(this: any, input: any) {
        const token = this.lifecycleToken;
        const res = await createOccasion(this, input);
        emitDataChanged({ topics: ["people"] }, token);
        return res;
    },

    async deleteOccasion(this: any, occasionId: string) {
        const token = this.lifecycleToken;
        await deleteOccasion(this, occasionId);
        emitDataChanged({ topics: ["people"] }, token);
    },

    async loadPersonAnniversaries(this: any, personDocId: string) {
        return loadPersonAnniversaries(this, personDocId);
    },

    async addPersonAnniversary(this: any, item: any) {
        const token = this.lifecycleToken;
        const res = await addPersonAnniversary(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    },

    async updatePersonAnniversary(this: any, personDocId: string, annivId: string, patch: any) {
        const token = this.lifecycleToken;
        const res = await updatePersonAnniversary(this, personDocId, annivId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removePersonAnniversary(this: any, personDocId: string, annivId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonAnniversary(this, personDocId, annivId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async listUpcomingAnniversaries(this: any, windowDays?: number) {
        return listUpcomingAnniversaries(this, windowDays);
    },

    exportPersonAnniversariesIcs(this: any, person: ContactSummary, anniversaries?: readonly any[], options?: any) {
        return exportPersonAnniversariesIcs(person, anniversaries, options);
    },

    async exportAllAnniversariesIcs(this: any, options?: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return exportAllAnniversariesIcs(this, this.settings, options);
    },

    async loadPersonProjects(this: any, personDocId: string) {
        const state = await loadPersonProjectsState(this, personDocId);
        if (state.items.length > 0) return state.items;
        // 显式清空过协作项目（deletedAll 墓碑）与「从未初始化」严格区分，绝不从旧文档投影复活已删项目
        if (state.deletedAll || state.initialized) return [];
        // 仅当从未初始化时，尝试从思源文档「协作项目与主题」受控区块双向恢复
        try {
            const fromDoc = await loadProjectsFromDoc(personDocId);
            if (fromDoc.length > 0) {
                for (const item of fromDoc) {
                    await addPersonProject(this, item).catch(() => {});
                }
                return fromDoc;
            }
        } catch {}
        return [];
    },

    async addPersonProject(this: any, item: any) {
        const token = this.lifecycleToken;
        const res = await addPersonProject(this, item);
        const syncResult = await syncProjectsDocSection(this, item.personDocId, { items: res });
        if (!syncResult.synced) {
            lvNotify.card({
                source: "小驴人脉",
                title: "协作项目正文同步待对账",
                message: syncResult.warning ?? "协作项目已保存至本地索引，但同步思源正文区块失败，已标记待对账。",
                level: "warn",
                duration: 6000,
            });
        }
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    },

    async updatePersonProject(this: any, personDocId: string, projectId: string, patch: any) {
        const token = this.lifecycleToken;
        const res = await updatePersonProject(this, personDocId, projectId, patch);
        const syncResult = await syncProjectsDocSection(this, personDocId, { items: res });
        if (!syncResult.synced) {
            lvNotify.card({
                source: "小驴人脉",
                title: "协作项目正文同步待对账",
                message: syncResult.warning ?? "协作项目已更新至本地索引，但同步思源正文区块失败，已标记待对账。",
                level: "warn",
                duration: 6000,
            });
        }
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removePersonProject(this: any, personDocId: string, projectId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonProject(this, personDocId, projectId);
        const syncResult = await syncProjectsDocSection(this, personDocId, { items: res });
        if (!syncResult.synced) {
            lvNotify.card({
                source: "小驴人脉",
                title: "协作项目删块同步待对账",
                message: syncResult.warning ?? "协作项目已从本地索引删除，但清理思源正文区块失败，已标记待对账，再次打开不会复活已删项目。",
                level: "warn",
                duration: 6000,
            });
        }
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async findCollaboratorsByProject(this: any, matcher: { title?: string; docId?: string }) {
        return findCollaboratorsByProject(this, matcher);
    },

    async loadPersonItineraries(this: any, personDocId: string) {
        return loadPersonItineraries(this, personDocId);
    },

    async savePersonItinerary(this: any, item: any) {
        const token = this.lifecycleToken;
        const res = await savePersonItinerary(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    },

    async removePersonItinerary(this: any, personDocId: string, itineraryId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonItinerary(this, personDocId, itineraryId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async togglePersonItineraryChecklist(this: any, personDocId: string, itineraryId: string, checklistId: string) {
        const token = this.lifecycleToken;
        const res = await togglePersonItineraryChecklist(this, personDocId, itineraryId, checklistId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async loadPersonPromises(this: any, personDocId: string) {
        return loadPersonPromises(this, personDocId);
    },

    async addPersonPromise(this: any, item: any) {
        const token = this.lifecycleToken;
        const res = await addPersonPromise(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    },

    async updatePersonPromise(this: any, personDocId: string, promiseId: string, patch: any) {
        const token = this.lifecycleToken;
        const res = await updatePersonPromise(this, personDocId, promiseId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removePersonPromise(this: any, personDocId: string, promiseId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonPromise(this, personDocId, promiseId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async loadPersonLifecycleStage(this: any, personDocId: string) {
        return loadPersonLifecycleStage(this, personDocId);
    },

    async updatePersonLifecycleStage(this: any, personDocId: string, stage: any, dateStr?: string, note?: string) {
        const token = this.lifecycleToken;
        const res = await updatePersonLifecycleStage(this, personDocId, stage, dateStr, note);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async loadAllLifecycleStages(this: any) {
        return loadAllLifecycleStages(this);
    },

    async batchUpdatePersonLifecycleStages(
        this: any,
        personDocIds: readonly string[],
        stage: any,
        dateStr?: string,
        note?: string,
    ) {
        const token = this.lifecycleToken;
        const res = await batchUpdatePersonLifecycleStages(this, personDocIds, stage, dateStr, note);
        emitDataChanged({ topics: ["people"], docIds: [...personDocIds] }, token);
        return res;
    },

    async loadAllCadences(this: any) {
        return loadCadenceMapStrict(this);
    },

    async loadPersonScratchpads(this: any, personDocId: string) {
        return loadPersonScratchpads(this, personDocId);
    },

    async savePersonScratchpad(this: any, item: any) {
        const token = this.lifecycleToken;
        const res = await savePersonScratchpad(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    },

    async updatePersonScratchpad(this: any, personDocId: string, noteId: string, patch: any) {
        const token = this.lifecycleToken;
        const res = await updatePersonScratchpad(this, personDocId, noteId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removePersonScratchpad(this: any, personDocId: string, noteId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonScratchpad(this, personDocId, noteId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async loadPersonSocialPreferences(this: any, personDocId: string) {
        const list = await loadPersonSocialPreferences(this, personDocId);
        if (list && list.length > 0) return list;
        try {
            const fromDoc = await loadSocialPreferencesFromDoc(personDocId);
            if (fromDoc.length > 0) {
                for (const item of fromDoc) {
                    await addPersonSocialPreference(this, item).catch(() => {});
                }
                return fromDoc;
            }
        } catch {}
        return [];
    },

    async addPersonSocialPreference(this: any, item: any) {
        const token = this.lifecycleToken;
        const res = await addPersonSocialPreference(this, item);
        void syncSocialPreferencesDocSection(this, item.personDocId).catch(() => {});
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    },

    async updatePersonSocialPreference(this: any, personDocId: string, prefId: string, patch: any) {
        const token = this.lifecycleToken;
        const res = await updatePersonSocialPreference(this, personDocId, prefId, patch);
        void syncSocialPreferencesDocSection(this, personDocId).catch(() => {});
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async removePersonSocialPreference(this: any, personDocId: string, prefId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonSocialPreference(this, personDocId, prefId);
        void syncSocialPreferencesDocSection(this, personDocId).catch(() => {});
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    },

    async loadPersonOrigin(this: any, personDocId: string) {
        return loadPersonOrigin(this, personDocId);
    },

    async savePersonOrigin(this: any, origin: PersonOrigin) {
        const token = this.lifecycleToken;
        const res = await savePersonOrigin(this, origin);
        emitDataChanged({ topics: ["people"], docIds: [origin.personDocId] }, token);
        return res;
    },

    async loadAllPersonOrigins(this: any) {
        return loadAllPersonOrigins(this);
    },

    async sendGreetingReminderToHome(this: any, personName: string, daysOverdue: number): Promise<boolean> {
        const today = toLocalDateKey(new Date());
        return callBridge<HomeBridgeApi, boolean>(
            "home",
            "memo",
            async (home) => {
                await home.addMemo(`问候联系人：${personName}（已逾期 ${daysOverdue} 天未联络）`, today);
                return true;
            },
            () => false,
        );
    },

    async syncAnniversariesToHome(this: any, title: string, dueDate: string): Promise<boolean> {
        return callBridge<HomeBridgeApi, boolean>(
            "home",
            "memo",
            async (home) => {
                await home.addMemo(`[人脉纪念日] ${title}`, dueDate);
                return true;
            },
            () => false,
        );
    },

    async loadPersonFacts(this: any, personDocId: string) {
        return loadPersonFactsFromDoc(personDocId);
    },

    async savePersonFacts(this: any, personDocId: string, items: readonly any[]) {
        const token = this.lifecycleToken;
        await savePersonFactsToDoc(personDocId, items);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
    },

    async discoverPotentialConnections(this: any, options?: any) {
        if (!this.settings) return [];
        return discoverConnections(this, this.settings, options);
    },

    async establishPotentialConnection(this: any, firstPersonDocId: string, secondPersonDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const people = await this.listContacts();
        const p1 = people.find((p: any) => p.docId === firstPersonDocId);
        const p2 = people.find((p: any) => p.docId === secondPersonDocId);
        if (!p1 || !p2) throw new Error("未找到关联人物");
        const report = await addRelation(this.settings, p1, p2);
        emitDataChanged({ topics: ["people"], docIds: [firstPersonDocId, secondPersonDocId] }, token);
        lvNotify.card({
            source: "小驴人脉",
            message: `已建立「${p1.name}」与「${p2.name}」的关联关系`,
            level: "success",
            duration: 5000,
            actions: [
                {
                    label: "撤销",
                    primary: true,
                    onClick: async () => {
                        try {
                            if (!this.settings) return;
                            await removeRelation(this.settings, p1, p2);
                            emitDataChanged({ topics: ["people"], docIds: [firstPersonDocId, secondPersonDocId] }, this.lifecycleToken);
                            lvNotify.capsule({
                                source: "小驴人脉",
                                message: `已撤销「${p1.name}」与「${p2.name}」的关联`,
                                level: "info",
                            });
                        } catch (err) {
                            lvNotify.card({
                                source: "小驴人脉",
                                title: "撤销失败",
                                message: `未能撤销关联关系：${err instanceof Error ? err.message : String(err)}`,
                                level: "error",
                            });
                        }
                    },
                },
            ],
        });
        return report;
    },

    async buildReviewReport(this: any, from: string, to: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return buildReview(this, this.settings, { from, to });
    },

    async createReviewReportDoc(this: any, range: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return exportReviewReportToDoc(this, this.settings, range);
    },

    async createWeeklyDigestDoc(this: any, options?: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createWeeklyDigestDoc(this, this.settings, options);
    },

    async createPersonFlashcardsDoc(
        this: any,
        person: ContactSummary,
        facts?: readonly any[],
        topics?: readonly any[],
        options?: any,
    ) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createPersonFlashcardsDoc(this, this.settings, person, facts, topics, options);
    },

    async createBatchFlashcardsDoc(
        this: any,
        people: readonly ContactSummary[],
        options?: any,
    ) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createBatchFlashcardsDoc(this, this.settings, people, options);
    },

    async createBriefingDoc(this: any, input: any, dateStr?: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createBriefingDoc(this, this.settings, input, dateStr);
    },

    async createMilestonesDoc(this: any, person: ContactSummary, milestones: readonly any[]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createMilestonesDoc(this, this.settings, person, milestones);
    },

    async loadExchangesSummary(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadExchangesSummary(this, this.settings);
    },

    async createExchangesLedgerDoc(this: any, options?: { title?: string }) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createExchangesLedgerDoc(this, this.settings, options);
    },

    async loadAllPreMeetingDossiers(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadAllPreMeetingDossiers(this, this.settings);
    },

    async loadCoolingRadarSummary(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadCoolingRadarSummary(this, this.settings);
    },

    async loadExportSummary(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadExportSummary(this, this.settings);
    },

    async exportRosterVcf(this: any) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return exportVcfText(this.settings);
    },

    async previewInteractionImport(this: any, text: string) {
        return previewInteractionImport(this, text);
    },

    async previewInteractionImportDiff(this: any, text: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewInteractionImportDiff(this, this.settings, text);
    },

    async importInteractionJson(this: any, text: string) {
        return importInteractionJson(this, text);
    },

    async repairFieldMap(this: any, patch: Parameters<typeof repairFieldMap>[2]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const settings = await repairFieldMap(this, this.settings, patch, () => this.isLifecycleActive(token));
        if (this.isLifecycleActive(token)) this.settings = settings;
        return settings;
    },

    async checkFollowUpReminders(this: any, force = false): Promise<{ delivered: boolean; count: number; cardId?: string }> {
        if (!this.settings) return { delivered: false, count: 0 };
        if (!force && lvNotify.isMutedToday("contacts-followup")) {
            return { delivered: false, count: 0 };
        }
        try {
            const data = await this.loadDashboard({ birthdayWindowDays: 7 });
            const dueFollowUps = (data.followUps ?? []).filter(
                (f: any) => f.item.status === "open" && (f.bucket === "today" || f.bucket === "overdue")
            );
            const overdueCadences = (data.actions ?? []).filter(
                (a: any) => a.bucket === "overdue" && a.reasons.some((r: any) => r.kind === "stale")
            );

            const totalCount = dueFollowUps.length + overdueCadences.length;
            this.followupDueCount = totalCount;
            this.registerLaunchpad();
            if (totalCount === 0) return { delivered: false, count: 0 };

            const firstPerson = dueFollowUps[0]?.person?.name || overdueCadences[0]?.person?.name || "联系人";
            const firstTitle = dueFollowUps[0]?.item?.title || "定期联络";
            const firstDocId = dueFollowUps[0]?.item?.personDocId || overdueCadences[0]?.person?.docId;

            const message = totalCount === 1
                ? `联系人「${firstPerson}」已到跟进时间：${firstTitle}`
                : `共有 ${totalCount} 位联系人到期需跟进（含「${firstPerson}」等）`;

            const cardId = lvNotify.card({
                source: "小驴人脉",
                category: "contacts-followup",
                title: "人脉跟进到期提醒",
                message,
                level: "warn",
                duration: 10000,
                actions: [
                    {
                        label: "去记录",
                        primary: true,
                        onClick: () => {
                            if (this.isMobile && firstDocId) {
                                this.openPersonDoc(firstDocId);
                            } else {
                                this.openWorkbench("people");
                                if (firstDocId) {
                                    void this.listContacts().then((roster: any[]) => {
                                        const person = roster.find((p: any) => p.docId === firstDocId);
                                        if (person) {
                                            window.dispatchEvent(new CustomEvent("lvct-workbench-person", { detail: { person } }));
                                        }
                                    }).catch(() => {});
                                }
                            }
                        },
                    },
                    {
                        label: "查看工作台",
                        onClick: () => {
                            this.openWorkbench();
                        },
                    },
                ],
                snooze: {
                    options: [
                        { label: "15分钟后再提醒", durationMs: 15 * 60 * 1000 },
                        { label: "1小时后再提醒", durationMs: 60 * 60 * 1000 },
                        { label: "今日免打扰", muteToday: true },
                    ],
                },
            });

            return { delivered: true, count: totalCount, cardId };
        } catch {
            return { delivered: false, count: 0 };
        }
    },

    async checkFollowups(this: any, force = false): Promise<{ delivered: boolean; count: number; cardId?: string }> {
        return this.checkFollowUpReminders(force);
    },

    getEcosystemStatusBadgeText(this: any): string {
        return lvEcosystem.getStatusBadgeText();
    },

    getFollowupDueCount(this: any): number {
        return this.followupDueCount;
    },

    async listOrganizations(this: any, options?: any) {
        return this.orgService.listOrganizations(options);
    },
    async listOrganizationsPage(this: any, options?: any) {
        return this.orgService.listOrganizationsPage(options);
    },
    async createOrganization(this: any, name: string, profile?: any) {
        return this.orgService.createOrganization(name, profile);
    },
    async loadOrganizationProfile(this: any, orgDocId: string) {
        return this.orgService.loadOrganizationProfile(orgDocId);
    },
    async saveOrganizationProfile(this: any, orgDocId: string, profile: any, expected?: any) {
        return this.orgService.saveOrganizationProfile(orgDocId, profile, expected);
    },
    async listOrganizationMembers(this: any, orgDocId: string) {
        return this.orgService.listOrganizationMembers(orgDocId);
    },
    async listOrganizationMembersPage(this: any, orgDocId: string, options?: any) {
        return this.orgService.listOrganizationMembersPage(orgDocId, options);
    },
    async addOrganizationMember(this: any, orgDocId: string, personDocId: string, extra?: any) {
        return this.orgService.addOrganizationMember(orgDocId, personDocId, extra);
    },
    async removeOrganizationMember(this: any, id: string, expected?: any) {
        return this.orgService.removeOrganizationMember(id, expected);
    },
    async updateOrganizationMember(this: any, id: string, patch: any, expected?: any) {
        return this.orgService.updateOrganizationMember(id, patch, expected);
    },
    async moveOrganizationMember(this: any, id: string, targetOrgDocId: string, expected?: any) {
        return this.orgService.moveOrganizationMember(id, targetOrgDocId, expected);
    },
    async replaceOrganizationMember(this: any, formerMembershipId: string, successorPersonDocId: string, extra: any, expected?: any) {
        return this.orgService.replaceOrganizationMember(formerMembershipId, successorPersonDocId, extra, expected);
    },
    async archiveOrganization(this: any, orgDocId: string) {
        return this.orgService.archiveOrganization(orgDocId);
    },
    async restoreOrganization(this: any, orgDocId: string) {
        return this.orgService.restoreOrganization(orgDocId);
    },
    async removeOrganization(this: any, orgDocId: string) {
        return this.orgService.removeOrganization(orgDocId);
    },
    async renameOrganization(this: any, orgDocId: string, name: string) {
        return this.orgService.renameOrganization(orgDocId, name);
    },
    async listPendingOrganizationOperations(this: any) {
        return this.orgService.listPendingOrganizationOperations();
    },
    async inspectOrganizationOperation(this: any, requestId: string) {
        return this.orgService.inspectOrganizationOperation(requestId);
    },
    async resumeOrganizationOperation(this: any, requestId: string) {
        return this.orgService.resumeOrganizationOperation(requestId);
    },
    async removeOrgLinkBlocks(this: any, blockIds: readonly string[]) {
        return this.orgService.removeOrgLinkBlocks(blockIds);
    },
    async listPersonOrgMemberships(this: any, personDocId: string) {
        return this.orgService.listPersonOrgMemberships(personDocId);
    },
    async previewOrganizationProjections(this: any, docIds?: readonly string[]) {
        return this.orgService.previewOrganizationProjections(docIds);
    },
    async repairOrganizationProjection(this: any, preview: any, retryKey: string) {
        return this.orgService.repairOrganizationProjection(preview, retryKey);
    },
    async listCommonOrgBackground(this: any, personDocId: string) {
        return this.orgService.listCommonOrgBackground(personDocId);
    },

    async triggerCityTopicsAutoRebase(this: any) {
        if (!this.settings?.notebookId) return;
        const notebookId = this.settings.notebookId;
        try {
            const current = await this.listContacts();
            if (this.lastRosterForCitySync && this.lastRosterForCitySync.length > 0) {
                const changed = detectChangedCities(this.lastRosterForCitySync, current);
                if (changed.size > 0) {
                    await autoRebaseCityTopics(notebookId, changed, current);
                }
            }
            this.lastRosterForCitySync = current;
        } catch {
            // 增量后台同步静默守护，不阻断主链路
        }
    },

    async loadPersonKinships(this: any, personDocId: string) {
        return this.kinshipService.loadPersonKinships(personDocId);
    },
    async addPersonKinship(this: any, item: any) {
        return this.kinshipService.addPersonKinship(item);
    },
    async removePersonKinship(this: any, personDocId: string, memberId: string) {
        return this.kinshipService.removePersonKinship(personDocId, memberId);
    },
};
