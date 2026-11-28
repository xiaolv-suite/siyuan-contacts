/**
 * ContactsPluginContext 窄契约接口体系
 *
 * 核心目标：
 * 摆脱组件表现层（Workbench, PersonDetail 等）直接深度依赖上帝类 LvContactsPlugin。
 * 按业务子域将巨型接口切分为清晰的最小职责契约：
 * 1. IRosterContext: 联系人名册只读查询与文档直达；
 * 2. IOrgContext: 组织与成员关系维护；
 * 3. IProtyleStripContext: 编辑器文档条带注入与守护状态；
 * 4. IDataSovereigntyContext: 数据主权与正文受控区块自愈回填；
 * 5. IPersonInteractionContext: 互动事实、洞察与文档私有区块维护；
 * 6. IPersonRelationContext: 社交关系网络、亲属、信诺与人情大盘；
 * 7. IWorkspaceManagementContext: 空间健康度、跟进日程、模板与灾备迁移；
 * 8. ContactsPluginContext: 统一表现层门面契约。
 */

import type { ContactsSettings } from "../domain/model";
import type { ViewPreferences } from "../domain/preferences";
import type { WorkspaceState } from "../domain/workspace-state";
import type { ContactSummary, ContactDraft } from "../domain/person";
import type {
    CommonOrgBackground,
    OrgAffiliationKind,
    OrgMembership,
    OrgMembershipPatch,
    OrgMembershipStatus,
} from "../domain/org-membership";
import type { OrganizationProfileDraft } from "../domain/organization-profile";
import type {
    OrganizationMember,
    OrganizationMemberPage,
    OrganizationPage,
    OrganizationWithMembers,
    PersonOrgMembershipView,
} from "../services/org";
import type { OrgMembershipWriteReport } from "../services/org-member-writes";

export const CONTACTS_CONTEXT_KEY = Symbol("lvct-contacts-context");

/** 名册子域只读契约 */
export interface IRosterContext {
    openPersonDoc(docId: string): void | Promise<void>;
    listContacts(): Promise<ContactSummary[]>;
}

/** 组织子域维护契约 */
export interface IOrgContext {
    listOrganizations(options?: { includeRemoved?: boolean }): Promise<OrganizationWithMembers[]>;
    listOrganizationsPage?(options?: { afterRootId?: string; limit?: number; includeRemoved?: boolean }): Promise<OrganizationPage>;
    createOrganization(name: string, profile?: OrganizationProfileDraft): Promise<{ docId: string; profileSaved?: boolean; profileError?: string }>;
    loadOrganizationProfile?(orgDocId: string): Promise<OrganizationProfileDraft | null>;
    saveOrganizationProfile?(orgDocId: string, profile: OrganizationProfileDraft, expected?: OrganizationProfileDraft | null): Promise<OrganizationProfileDraft>;
    listOrganizationMembers(orgDocId: string): Promise<OrganizationMember[]>;
    listOrganizationMembersPage?(orgDocId: string, options?: { query?: string; status?: "all" | "active" | "former"; offset?: number; limit?: number }): Promise<OrganizationMemberPage>;
    addOrganizationMember(orgDocId: string, personDocId: string, extra?: {
        department?: string;
        title?: string;
        joinedOn?: string;
        leftOn?: string;
        status?: OrgMembershipStatus;
        statusLabel?: string;
        affiliationKind?: OrgAffiliationKind;
        note?: string;
    }): Promise<void | OrgMembershipWriteReport>;
    removeOrganizationMember(id: string, expected?: OrgMembership): Promise<void | OrgMembershipWriteReport>;
    updateOrganizationMember(id: string, patch: OrgMembershipPatch, expected?: OrgMembership): Promise<void | OrgMembershipWriteReport>;
    moveOrganizationMember?(id: string, targetOrgDocId: string, expected?: OrgMembership): Promise<void | OrgMembershipWriteReport>;
    replaceOrganizationMember(formerMembershipId: string, successorPersonDocId: string, extra: {
        department?: string;
        title?: string;
        joinedOn: string;
        leftOn: string;
        affiliationKind?: OrgAffiliationKind;
    }, expected?: OrgMembership): Promise<void | OrgMembershipWriteReport>;
    archiveOrganization(orgDocId: string): Promise<void>;
    restoreOrganization(orgDocId: string): Promise<void>;
    removeOrganization?(orgDocId: string): Promise<void>;
    renameOrganization(orgDocId: string, name: string): Promise<void>;
    listPersonOrgMemberships(personDocId: string): Promise<PersonOrgMembershipView[]>;
    listCommonOrgBackground(personDocId: string): Promise<CommonOrgBackground[]>;
}

/** 编辑器条带子域契约 */
export interface IProtyleStripContext {
    readonly isStripActive?: boolean;
}

/** 数据主权子域契约 */
export interface IDataSovereigntyContext {
    backfillDataSovereignty?(options?: {
        onProgress?: (current: number, total: number, docId: string) => void;
    }): Promise<{ total: number; success: number; failed: number }>;
}

/** 个人互动事实与资料文档契约 */
export interface IPersonInteractionContext {
    recordInteraction(personDocId: string, note?: string, type?: any, options?: any): Promise<void>;
    deleteInteraction(personDocId: string, eventId: string): Promise<void>;
    amendInteraction(personDocId: string, eventId: string, amendment: any): Promise<void>;
    loadPersonInsights(docId: string): Promise<any>;
    loadRecentInteractions(): Promise<Record<string, { occurredAt: number; localDate: string; count?: number }>>;
    loadPersonNote(personDocId: string): Promise<string>;
    savePersonNote(personDocId: string, note: string, expected?: string): Promise<string>;
    inspectLegacyPersonNote(personDocId: string): Promise<any>;
    detachLegacyPersonNote(personDocId: string, expected: any): Promise<void>;
    loadPersonFields(personDocId: string): Promise<any>;
    savePersonFields(personDocId: string, snapshot: any, expected: any): Promise<any>;
    loadPersonFacts?(personDocId: string): Promise<any>;
    savePersonFacts?(personDocId: string, items: readonly any[]): Promise<void>;
    loadPersonChannels?(personDocId: string): Promise<any>;
    savePersonChannels?(personDocId: string, channels: any): Promise<void>;
    loadPersonLocations?(personDocId: string): Promise<any>;
    savePersonLocations?(personDocId: string, locations: any): Promise<void>;
    loadPersonAvatar?(personDocId: string): Promise<string>;
    savePersonAvatar?(personDocId: string, avatarDataUrl: string): Promise<void>;
    loadPersonBusinessCard?(personDocId: string): Promise<string>;
    savePersonBusinessCard?(personDocId: string, cardDataUrl: string): Promise<void>;
    syncPersonDocument?(person: ContactSummary): Promise<void>;
    updatePersonFields(personItemId: string, draft: ContactDraft): Promise<any>;
    updatePersonCandidateFields(personItemId: string, patches: readonly any[]): Promise<any>;
    captureDoc(docId: string, options: any): Promise<any>;
    previewCapture(docId: string): Promise<any>;
    prepareAiExtraction(docId: string, options?: any): Promise<any>;
    aiExtractFromDoc(docId: string, confirmation?: any): Promise<any>;
    loadInteractionEvents?(): Promise<any>;
}

/** 社交关系网络与亲属信诺契约 */
export interface IPersonRelationContext {
    loadPersonRelationshipLabels(personDocId: string): Promise<any>;
    savePersonRelationshipLabels(personDocId: string, selfDocId: string, labels: string[], expected: any): Promise<any>;
    listPersonAliases(personDocId: string): Promise<any>;
    addPersonAlias(personDocId: string, alias: string): Promise<any>;
    removePersonAlias(id: string): Promise<void>;
    resolvePersonAlias(alias: string): Promise<any>;
    loadSelfIdentity(): Promise<any>;
    createSelfProfile(): Promise<any>;
    designateSelfIdentity(personItemId: string): Promise<any>;
    previewSelfIdentityChange(targetItemId: string | null): Promise<any>;
    applySelfIdentityChange(preview: any): Promise<any>;
    loadPersonKinships?(personDocId: string): Promise<any>;
    addPersonKinship?(item: any): Promise<any>;
    removePersonKinship?(personDocId: string, memberId: string): Promise<any>;
    loadPersonPromises?(personDocId: string): Promise<any>;
    addPersonPromise?(item: any): Promise<any>;
    updatePersonPromise?(personDocId: string, promiseId: string, patch: any): Promise<any>;
    removePersonPromise?(personDocId: string, promiseId: string): Promise<any>;
    listPersonExchanges(personDocId: string): Promise<any>;
    createPersonExchange(input: any): Promise<any>;
    updatePersonExchange(id: string, patch: any, expected?: any): Promise<any>;
    changePersonExchangeStatus(id: string, status: any, settledOn?: string, expected?: any): Promise<any>;
    loadPersonGiftIdeas?(personDocId: string): Promise<any>;
    addPersonGiftIdea?(item: any): Promise<any>;
    updatePersonGiftIdea?(personDocId: string, ideaId: string, patch: any): Promise<any>;
    removePersonGiftIdea?(personDocId: string, ideaId: string): Promise<any>;
    loadPersonAnniversaries?(personDocId: string): Promise<any>;
    addPersonAnniversary?(item: any): Promise<any>;
    updatePersonAnniversary?(personDocId: string, annivId: string, patch: any): Promise<any>;
    removePersonAnniversary?(personDocId: string, annivId: string): Promise<any>;
    listUpcomingAnniversaries?(windowDays?: number): Promise<any>;
    exportPersonAnniversariesIcs?(person: any, anniversaries?: readonly any[], options?: any): any;
    exportAllAnniversariesIcs?(options?: any): Promise<any>;
    loadPersonProjects?(personDocId: string): Promise<any>;
    addPersonProject?(item: any): Promise<any>;
    updatePersonProject?(personDocId: string, projectId: string, patch: any): Promise<any>;
    removePersonProject?(personDocId: string, projectId: string): Promise<any>;
    findCollaboratorsByProject?(matcher: any): Promise<any>;
    loadPersonItineraries?(personDocId: string): Promise<any>;
    savePersonItinerary?(item: any): Promise<any>;
    removePersonItinerary?(personDocId: string, itineraryId: string): Promise<any>;
    togglePersonItineraryChecklist?(personDocId: string, itineraryId: string, checklistId: string): Promise<any>;
    loadPersonLifecycleStage?(personDocId: string): Promise<any>;
    updatePersonLifecycleStage?(personDocId: string, stage: any, dateStr?: string, note?: string): Promise<any>;
    loadAllLifecycleStages?(): Promise<any>;
    batchUpdatePersonLifecycleStages?(personDocIds: readonly string[], stage: any, dateStr?: string, note?: string): Promise<any>;
    loadAllCadences?(): Promise<any>;
    loadPersonScratchpads?(personDocId: string): Promise<any>;
    savePersonScratchpad?(item: any): Promise<any>;
    updatePersonScratchpad?(personDocId: string, noteId: string, patch: any): Promise<any>;
    removePersonScratchpad?(personDocId: string, noteId: string): Promise<any>;
    loadPersonSocialPreferences?(personDocId: string): Promise<any>;
    addPersonSocialPreference?(item: any): Promise<any>;
    updatePersonSocialPreference?(personDocId: string, prefId: string, patch: any): Promise<any>;
    removePersonSocialPreference?(personDocId: string, prefId: string): Promise<any>;
    loadPersonOrigin?(personDocId: string): Promise<any>;
    savePersonOrigin?(origin: any): Promise<any>;
    loadAllPersonOrigins?(): Promise<any>;
    sendGreetingReminderToHome?(personName: string, daysOverdue: number): Promise<boolean>;
    syncAnniversariesToHome?(title: string, dueDate: string): Promise<boolean>;
    discoverPotentialConnections?(options?: any): Promise<any>;
    establishPotentialConnection?(firstPersonDocId: string, secondPersonDocId: string): Promise<any>;
}

/** 工作台管理、导出与健康巡检契约 */
export interface IWorkspaceManagementContext {
    closeWorkbenchDialog?(): void;
    reloadWorkspaceState(): Promise<WorkspaceState>;
    initialize(notebookName: string, onProgress: (step: any) => void, options?: { createSelf?: boolean }): Promise<any>;
    previewInitialize(notebookName: string): Promise<any>;
    scanAnchorCandidates(options?: any): Promise<any>;
    listOccasions?(): Promise<any>;
    createOccasion?(input: any): Promise<any>;
    deleteOccasion?(occasionId: string): Promise<void>;
    executeContactMerge?(plan: any): Promise<any>;
    createBatchFlashcardsDoc?(people: readonly any[], options?: any): Promise<any>;
    createPersonFlashcardsDoc?(person: any, facts?: any, topics?: any, options?: any): Promise<any>;
    createBriefingDoc?(input: any, dateStr?: string): Promise<any>;
    createMilestonesDoc?(person: any, milestones: readonly any[]): Promise<any>;
    listTrash?(): Promise<any>;
    restoreContactFromTrash?(entryId: string): Promise<any>;
    emptyTrash?(): Promise<void>;
    loadDashboard(options?: any): Promise<any>;
    exportRosterVcf(): Promise<string>;
    previewInteractionImport(text: string): Promise<any>;
    importInteractionJson(text: string): Promise<any>;
    previewInteractionImportDiff(text: string): Promise<any>;
    checkSettingsHealth(): Promise<any>;
    runHealthAudit(): Promise<any>;
    runHealthAuditReport(previous?: any): Promise<any>;
    retryFailedHealthAuditModules(previous: any): Promise<any>;
    previewMissingFields(): Promise<any>;
    rebuildMissingFields(preview: any): Promise<any>;
    previewRebindSettings(patch: any): Promise<any>;
    rebindSettings(patch: any, preview: any): Promise<any>;
    repairFieldMap(patch: any): Promise<any>;
    exportInteractionJson(): Promise<string>;
    exportMigrationBundle(): Promise<string>;
    previewMigrationImport(text: string): Promise<any>;
    importMigrationBundle(text: string): Promise<any>;
    getVaultStatus?(): Promise<any>;
    syncVaultNow?(opts?: { force?: boolean }): Promise<any>;
    openVaultRestoreWizard?(): Promise<void>;
    previewRebuildInteractionsFromDocs?(): Promise<any>;
    executeRebuildInteractionsFromDocs?(scannedCandidates?: readonly any[]): Promise<any>;
    previewOneDocMigration?(): Promise<any>;
    executeOneDocMigration?(options?: any): Promise<any>;
    rollbackOneDocMigration?(): Promise<any>;
    dumpData?(): Promise<Record<string, unknown>>;
    restoreData?(data: Record<string, unknown> | string): Promise<boolean>;
    loadExportSummary(): Promise<any>;
    listPersonFollowUps(personDocId: string): Promise<any>;
    createFollowUp(personDocId: string, title: string, dueDate: string, requestId?: string): Promise<any>;
    retryCreateFollowUp(requestId: string, personDocId: string, title: string, dueDate: string): Promise<any>;
    setFollowUpStatus(id: string, status: any): Promise<void>;
    snoozeFollowUp(id: string, option: any, customDate?: string): Promise<void>;
    exportFollowUpsJson(): Promise<string>;
    previewFollowUpsImport(text: string): Promise<any>;
    importFollowUpsJson(text: string): Promise<any>;
    getPersonCadence(personDocId: string): Promise<any>;
    savePersonCadence(personDocId: string, cadence: any): Promise<void>;
    dismissReminder(personDocId: string, kind: any, until: string): Promise<void>;
    resumeReminder(personDocId: string, kind: any): Promise<void>;
    loadReminderDismissals(): Promise<any>;
    listTemplates(): Promise<any>;
    saveTemplates(templates: readonly any[], expected: readonly any[]): Promise<any>;
    loadPersonTopics?(personDocId: string): Promise<any>;
    addPersonTopic?(personDocId: string, text: string): Promise<any>;
    removePersonTopic?(personDocId: string, topicId: string): Promise<any>;
    removeContactToTrash?(person: any): Promise<void>;
    removeContactsToTrash?(people: readonly any[]): Promise<number>;
    openDoc(docId: string, options?: any): void | Promise<void>;
    openDocMenu?(docId: string, event: MouseEvent): Promise<boolean>;
    openHostDoc(): void | Promise<void>;
    previewOrganizationProjections?(docIds?: readonly string[]): Promise<any>;
    repairOrganizationProjection?(preview: any, retryKey: string): Promise<any>;
    openSettings(): void;
    openContactsView?(): void;
    openWorkbench?(view?: any): void;
    handleQuickAction?(action: string): void;
    searchOmniContacts?(keyword: string): Promise<any>;
    getEcosystemStatusBadgeText?(): string;
    getFollowupDueCount?(): number;
    checkFollowUpReminders?(force?: boolean): Promise<any>;
    checkFollowups?(force?: boolean): Promise<any>;
    openSelectionToInteraction?(args: any): Promise<void>;
    openOrgManagerDialog(initialOrgDocId?: string): void;
    listPendingOrganizationOperations?(): Promise<any>;
    inspectOrganizationOperation?(requestId: string): Promise<any>;
    resumeOrganizationOperation?(requestId: string): Promise<any>;
    removeOrgLinkBlocks(blockIds: readonly string[]): Promise<any>;
    removeOrganization?(orgDocId: string): Promise<void>;
    loadExchangesSummary?(): Promise<any>;
    createExchangesLedgerDoc?(options?: any): Promise<any>;
    loadAllPreMeetingDossiers?(): Promise<any>;
    loadCoolingRadarSummary?(): Promise<any>;
    buildReviewReport(from: string, to: string): Promise<any>;
    createReviewReportDoc?(range: any): Promise<any>;
    createWeeklyDigestDoc?(options?: any): Promise<any>;
}

/**
 * 工作台与 Svelte 视图交互核心契约
 */
export interface ContactsPluginContext
    extends IRosterContext,
        IOrgContext,
        IProtyleStripContext,
        IDataSovereigntyContext,
        IPersonInteractionContext,
        IPersonRelationContext,
        IWorkspaceManagementContext {
    readonly i18n?: Readonly<Record<string, string>>;
    readonly settings: ContactsSettings | null;
    readonly isMobile: boolean;
    readonly workspaceState: WorkspaceState;
    readonly viewPreferences: ViewPreferences;

    loadViewPreferences(): Promise<ViewPreferences>;
    saveViewPreferences(prefs: ViewPreferences): Promise<ViewPreferences>;
}
