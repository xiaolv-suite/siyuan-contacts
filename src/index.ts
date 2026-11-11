/**
 * 小驴人脉插件入口（薄壳）：生命周期、UI 挂载。
 * 业务编排在 services/，内核交互在 api/，自管数据在 data/，纯函数在 domain/，
 * 组件只依赖 types.ts 的 facade 接口，不反向 import 本文件（避免循环）。
 */
import { Plugin, getFrontend, openTab, Dialog, getActiveEditor } from "siyuan";
import { mount, unmount } from "svelte";
import "./index.scss";
import { lvNotify, lvTicker, lvActivity, lvAutomation, lvBackup, lvEcosystem, lvLaunchpad, lvOmnisearch, showMessage, type LvSearchResultItem } from "./libs/lv-notice-kit";

function notify(msg: string, timeout = 3000, type: "info" | "error" = "info"): void {
    if (type === "error") {
        lvNotify.card({
            source: "小驴人脉",
            title: "小驴人脉提示",
            message: msg,
            level: "error",
            duration: Math.max(timeout, 6000),
        });
    } else {
        lvNotify.capsule({
            source: "小驴人脉",
            message: msg,
            duration: timeout,
        });
    }
}

import CaptureDialog from "./components/capture/CaptureDialog.svelte";
import OrgManagerDialog from "./components/org/OrgManagerDialog.svelte";
import ContactOrganizationDialog from "./components/org/ContactOrganizationDialog.svelte";
import QuickFillDialog from "./components/people/QuickFillDialog.svelte";
import AddPersonDialog from "./components/people/AddPersonDialog.svelte";
import PreMeetingHubDialog from "./components/dashboard/PreMeetingHubDialog.svelte";
import CoolingRadarDialog from "./components/dashboard/CoolingRadarDialog.svelte";
import SelectionToInteractionModal from "./components/capture/SelectionToInteractionModal.svelte";
import { buildSelectionInteractionPayload, restoreFocusToEditor } from "./domain/selection-resolver.ts";
import type { ContactExtendedDraft } from "./domain/contact-create";
import PersonEditDialog from "./components/people/PersonEditDialog.svelte";
import { parseContactText } from "./domain/quick-fill";
import { invalidateRoster } from "./services/roster";
import { bindSelfIdentityStorage } from "./data/self-identity";
import { bindOrgMembershipStorage } from "./data/org-membership";
import { bindPeopleProfileStorage, loadPersonRelationshipLabels, savePersonRelationshipLabels } from "./services/people-profiles";
import { bindContactAliasStorage } from "./services/contact-aliases";
import { initializeWorkspace, inspectWorkspace, readSettingsState, scanAnchorCandidates } from "./services/init";
import { configureCloseGuardI18n } from "./components/close-guard";
import type { InitProgressStep, WorkspaceSnapshot } from "./services/init";
import { loadDashboard, DEFAULT_DASHBOARD_OPTIONS } from "./services/dashboard";
import { amendInteraction, deleteInteraction, recordInteractionWithResult, loadInteractionStoreStrict, loadInteractionStore } from "./data/interactions";
import { toLocalDateKey, INTERACTION_TYPE_LABELS } from "./domain/interactions";
import type { InteractionAmendment } from "./domain/interactions";
import { captureFromDoc, previewCapture, resolveRecognizeTarget } from "./services/capture";
import { extractFromDoc, prepareAiExtraction } from "./services/ai-extract";
import type { AiExtractionConfirmation } from "./services/ai-extract";
import { AiExtractionError } from "./domain/ai-preflight";
import type { AiPreflightOptions } from "./domain/ai-preflight";
import { loadPersonInsights } from "./services/insights";
import { syncInteractionDocSection, syncFullPersonDocument, loadPersonFactsFromDoc, savePersonFactsToDoc } from "./services/doc-section";
import { detachLegacyPersonNote, inspectLegacyPersonNote, loadPersonNote, savePersonNote } from "./services/person-note";
import type { LegacyPersonNoteSnapshot } from "./domain/person-note";
import { loadPersonFields, savePersonFields } from "./services/person-fields";
import type { PersonFieldsSnapshot, PersonFieldsState } from "./domain/person-fields";
import { checkSettingsHealth, previewMissingFields, previewRebindSettings, probeSettingsAnchor, rebuildMissingFields, rebindSettings, repairFieldMap } from "./services/settings-health";
import type { FieldRebuildPreview, SettingsRebindPreview } from "./services/settings-health";
import { auditWorkspaceData, auditWorkspaceDataReport, retryFailedHealthAuditModules } from "./services/health-audit";
import { reconcileFollowUpTasksFromDoc } from "./services/followup-sync";
import { updateContactFields, applyContactCandidateFields, listContacts as listContactsService, filterContacts } from "./services/contacts";
import { addRelation, removeRelation, discoverConnections } from "./services/relations";
import { detectChangedCities } from "./domain/city-topic";
import { autoRebaseCityTopics } from "./services/city-topic";
import { ensureSelfIdentity, designateSelfIdentity, previewSelfIdentityChange, applySelfIdentityChange } from "./services/self-identity";
import { loadSelfIdentity } from "./data/self-identity";
import {
    ECOSYSTEM_EVENTS,
    subscribeEcosystemEvent,
    logCheckinEventSafely,
    registerRaikiriModuleSafely,
} from "./libs/ecosystem-bridge-kit";
import {
    listOrganizationsWithMembers,
    listOrganizationsPage,
    createOrganization,
    listOrganizationMembers,
    listOrganizationMembersPage,
    archiveOrganization,
    restoreOrganization,
    removeOrganization,
    renameOrganization,
    removeOrgLinkBlocks,
    listPersonOrgMemberships,
    listCommonOrgBackground,
    getOrganizationProfile,
    updateOrganizationProfile,
    ensureDefaultFamilyOrganization,
    invalidateOrganizationScan,
} from "./services/org";
import { exportMigrationBundle, importMigrationBundle, previewMigrationImport } from "./services/migration-bundle";
import { previewOrganizationProjections, repairOrganizationProjection } from "./services/org-projections";
import { listPendingOrganizationOperations, inspectOrganizationOperation, resumeOrganizationOperation } from "./services/organization-writes";
import { saveOrganizationMember, editOrganizationMember, deleteOrganizationMember, replaceOrganizationMemberWithProjection, moveOrganizationMemberWithProjection } from "./services/org-member-writes";
import { loadViewPreferences, saveViewPreferences, createPreferenceRequests } from "./services/preferences";
import { exportInteractionJson } from "./services/interaction-export";
import {
    appendInteractionToDailyNote,
    appendFollowUpToDailyNote,
    removeDailyNoteInteractionByEventId,
    updateDailyNoteInteractionByEventId,
} from "./services/diary";
import { loadExportSummary } from "./services/export-center";
import { exportVcfText } from "./services/vcard";
import {
    createFollowUp,
    exportFollowUpsJson,
    importFollowUpsJson,
    listPersonFollowUps,
    newFollowUpRequestId,
    previewFollowUpsImport,
    setFollowUpStatus,
    snoozeFollowUp,
} from "./services/followups";
import type { SnoozeOption } from "./domain/followups";
import { loadPersonCadence, savePersonCadence, loadCadenceMapStrict } from "./data/cadences";
import { dismissReminder, resumeReminder, loadReminderDismissalsStrict } from "./data/reminder-dismissals";
import type { ReminderKind } from "./data/reminder-dismissals";
import type { PersonCadence } from "./domain/cadence";
import { listTemplates, saveTemplates } from "./services/templates";
import type { NoteTemplate } from "./domain/interaction-templates";
import { loadPersonTopics, addPersonTopic, removePersonTopic } from "./data/topics";
import { listPersonExchanges, createPersonExchange, updatePersonExchange, changePersonExchangeStatus, loadExchangesSummary, createExchangesLedgerDoc } from "./services/exchanges";
import { listPersonAliases, addPersonAlias, removePersonAlias, resolveAlias } from "./services/person-aliases";
import { listTrash, restoreContactFromTrash, removeContactToTrash, emptyTrash } from "./services/trash";
import { executeContactMerge } from "./services/duplicate-merge";
import { loadPersonGiftIdeas, addPersonGiftIdea, updatePersonGiftIdea, removePersonGiftIdea } from "./data/gift-ideas";
import { listOccasions, createOccasion, deleteOccasion } from "./services/occasions";
import { loadPersonAnniversaries, addPersonAnniversary, updatePersonAnniversary, removePersonAnniversary, listUpcomingAnniversaries } from "./data/anniversaries.ts";
import { exportPersonAnniversariesIcs, exportAllAnniversariesIcs } from "./services/ical.ts";
import { loadPersonProjects, addPersonProject, updatePersonProject, removePersonProject, findCollaboratorsByProject } from "./data/projects.ts";
import { loadPersonItineraries, savePersonItinerary, removePersonItinerary, togglePersonItineraryChecklist } from "./data/itineraries.ts";
import { loadPersonKinships, addPersonKinship, removePersonKinship } from "./data/kinship.ts";
import { loadPersonPromises, addPersonPromise, updatePersonPromise, removePersonPromise } from "./data/promises.ts";
import { loadPersonLifecycleStage, updatePersonLifecycleStage, loadAllLifecycleStages, batchUpdatePersonLifecycleStages } from "./data/lifecycle-stage.ts";
import { loadPersonScratchpads, savePersonScratchpad, updatePersonScratchpad, removePersonScratchpad } from "./data/person-scratchpad.ts";
import { normalizeChannels, type ContactChannel } from "./domain/person-channels.ts";
import { loadPersonSocialPreferences, addPersonSocialPreference, updatePersonSocialPreference, removePersonSocialPreference } from "./data/social-preferences.ts";
import { loadPersonOrigin, savePersonOrigin, loadAllPersonOrigins } from "./data/person-origins.ts";
import type { PersonOrigin } from "./domain/person-origin.ts";
import { callBridge, type HomeBridgeApi } from "./libs/ecosystem-bridge-kit.ts";
import { buildReview, exportReviewReportToDoc } from "./services/review-report";
import { createWeeklyDigestDoc } from "./services/weekly-digest";
import { createPersonFlashcardsDoc, createBatchFlashcardsDoc } from "./services/flashcards";
import { createBriefingDoc } from "./services/briefing-doc.ts";
import { createMilestonesDoc } from "./services/milestones-doc.ts";
import { loadAllPreMeetingDossiers } from "./services/pre-meeting.ts";
import { loadCoolingRadarSummary } from "./services/cooling-radar.ts";
import { importInteractionJson, previewInteractionImport } from "./services/interaction-import";
import { previewInteractionImportDiff } from "./services/interaction-import";
import { initExternalBridge, disposeExternalBridge } from "./bridge/external-bridge";
import { handleProtyleEvent, type PanelContext } from "./panels/person-panel";
import { svelteDialog } from "./libs/dialog";
import { openSiYuanDocument, openDocumentContextMenu } from "./libs/open-document";
import { emitDataChanged, emitWorkspaceState, requestWorkbenchNavigation, subscribeDataChanged } from "./libs/data-events";
import { schedulePersonDocMirror, disposeDocMirrorScheduler } from "./services/doc-mirror";
import { syncOrganizationDocSection } from "./services/org-dossier";
import type { ContactsSettings } from "./domain/model";
import { setBlockAttrs, flushBlockIndex } from "./api/blocks";
import { querySql, assertKernelRecord } from "./api/client";
import { organizationIalAttributes } from "./domain/organization-operations";
import type { ContactSummary } from "./domain/person";
import { emptyDraft } from "./domain/person";
import { DEFAULT_VIEW_PREFERENCES, type ViewPreferences } from "./domain/preferences";
import { createLifecycleToken, LIFECYCLE_CONTEXT, type LifecycleToken } from "./domain/lifecycle";
import type { ContactsPluginFacade, WorkbenchView } from "./types";
import type { WorkspaceState } from "./domain/workspace-state";
import WorkbenchRoot from "./components/WorkbenchRoot.svelte";

const TAB_TYPE = "workbench";

interface WorkbenchTabState {
    element: Element;
    __lvctDispose?: (() => void) | null;
}

/** QuickFillDialog 回填补丁（与组件 props 结构一致） */
interface QuickFillPatch {
    name?: string;
    phone?: string;
    email?: string;
    wechat?: string;
    website?: string;
    birthday?: string;
    isLunar?: boolean;
    group?: string;
    tagsAppend: string[];
}

/** FAST-01.3：读限定在指定编辑器内的选区；没有选区或选区在别的窗口时返回空串 */
function readSelectionWithin(scope: HTMLElement): string {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return "";
    const anchor = selection.anchorNode;
    if (!anchor || !scope.contains(anchor)) return "";
    return selection.toString();
}

function visibleEditorRootId(): string | undefined {
    const activeEditor = document.activeElement?.closest<HTMLElement>(".protyle[data-node-id]");
    if (activeEditor && activeEditor.getBoundingClientRect().width > 0 && activeEditor.getBoundingClientRect().height > 0) {
        return activeEditor.dataset.nodeId || undefined;
    }
    const editors = [...document.querySelectorAll<HTMLElement>(".protyle[data-node-id]")]
        .filter((editor) => {
            const rect = editor.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && editor.dataset.nodeId;
        });
    return editors.length === 1 ? editors[0].dataset.nodeId : undefined;
}

export default class LvContactsPlugin extends Plugin implements ContactsPluginFacade {
    isMobile = false;
    settings: ContactsSettings | null = null;
    workspaceState: WorkspaceState = { kind: "uninitialized" };
    /** 锚点失效时仅供显式扫描/重绑使用；普通业务门禁通过 settings=null。 */
    private recoverySettings: ContactsSettings | null = null;
    viewPreferences: ViewPreferences = DEFAULT_VIEW_PREFERENCES;

    private workbenchDialog: Dialog | null = null;
    private dialogInstance: ReturnType<typeof mount> | null = null;
    private requestedWorkbenchView: WorkbenchView | undefined;
    private dataChangeTimer = 0;
    private lastRosterForCitySync: readonly ContactSummary[] = [];
    private startupTimer = 0;
    private viewRequestTimer = 0;
    private lifecycleToken: LifecycleToken = createLifecycleToken();
    private workbenchDialogToken: LifecycleToken | null = null;
    private readonly tabDisposers = new Set<() => void>();
    private readonly tabMounts = new Map<Element, LifecycleToken>();
    private readonly ownedDialogDisposers = new Set<() => void>();
    private eventCleanup: (() => void) | null = null;
    private noticeHubCleaner?: () => void;
    private backupCleaner?: () => void;
    private launchpadCleaner?: () => void;
    private omnisearchCleaner?: () => void;
    private followupDueCount = 0;
    private layoutReady = false;
    private topBarElement?: HTMLElement;
    private preferencesActive = true;
    private preferencesEpoch = 0;
    private dataChangeRequest = 0;
    /** 合并同时触发的工作区核验，避免批量 dataChange 造成并行宿主读取。 */
    private workspaceStateReloadPromise: Promise<WorkspaceState> | null = null;
    private workspaceStateReloadVersion = 0;
    private preferencesVerified = false;
    private preferenceRequests = this.createPreferenceRequests(this.lifecycleToken);

    private createPreferenceRequests(token: LifecycleToken) {
        return createPreferenceRequests({
            load: () => loadViewPreferences(this),
            save: (preferences, baseline) => saveViewPreferences(this, preferences, baseline),
            apply: (preferences) => {
                if (!this.isLifecycleActive(token)) return;
                this.viewPreferences = preferences;
                this.preferencesVerified = true;
            },
            saved: (preferences) => emitDataChanged({ preferencesRevision: preferences.revision }, token),
        });
    }

    private isLifecycleActive(token: LifecycleToken = this.lifecycleToken): boolean {
        return this.lifecycleToken === token && token.isAlive();
    }

    async onload() {
        this.disposeLifecycle();
        this.lifecycleToken = createLifecycleToken();
        const lifecycleToken = this.lifecycleToken;
        this.requestedWorkbenchView = undefined;
        this.preferencesActive = true;
        this.preferencesVerified = false;
        const preferencesEpoch = ++this.preferencesEpoch;
        this.preferenceRequests = this.createPreferenceRequests(lifecycleToken);
        const frontend = getFrontend();
        this.isMobile = frontend === "mobile" || frontend === "browser-mobile";
        bindSelfIdentityStorage(this); /* B11：roster 投影的 isSelf 标记依赖身份存储 */
        bindOrgMembershipStorage(this); /* B12：卡片「单位」行依赖成员索引 */
        lifecycleToken.onDispose(bindPeopleProfileStorage(this));
        lifecycleToken.onDispose(bindContactAliasStorage(this));
        lifecycleToken.onDispose(() => disposeDocMirrorScheduler());

        // Phase 4: 注册全生态一键联合灾备切面 (lvBackup)
        this.backupCleaner = lvBackup.register(
            "siyuan-contacts",
            async () => this.dumpData(),
            async (data) => this.restoreData(data)
        );
        lifecycleToken.onDispose(() => {
            this.backupCleaner?.();
            this.backupCleaner = undefined;
        });

        // Phase 5: 接入小驴罗盘 (lvLaunchpad) 极速弹射坞
        this.registerLaunchpad();
        lifecycleToken.onDispose(() => {
            this.launchpadCleaner?.();
            this.launchpadCleaner = undefined;
        });

        // Phase 7: 注册全局穿透搜索数据提供者 (lvOmnisearch) 与活动流初始化
        this.omnisearchCleaner = lvOmnisearch.registerProvider("siyuan-contacts", async (keyword) => {
            return this.searchOmniContacts(keyword);
        });
        lifecycleToken.onDispose(() => {
            this.omnisearchCleaner?.();
            this.omnisearchCleaner = undefined;
        });
        lvActivity.getTodayRecords();

        const unsubscribeDataMirror = subscribeDataChanged((change) => {
            if (change.docIds && change.docIds.length > 0) {
                for (const docId of change.docIds) {
                    schedulePersonDocMirror(this, docId);
                }
            }
        });
        lifecycleToken.onDispose(unsubscribeDataMirror);

        this.addIcons(`<symbol id="iconLvContacts" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="none"/>
  <circle cx="9" cy="7" r="4" fill="none"/>
  <path d="M22 21v-2a4 4 0 0 0-3-3.87" fill="none"/>
  <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none"/>
</symbol>
<symbol id="icon-lv-contacts" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="none"/>
  <circle cx="9" cy="7" r="4" fill="none"/>
  <path d="M22 21v-2a4 4 0 0 0-3-3.87" fill="none"/>
  <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none"/>
</symbol>
<symbol id="iconHome" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" fill="none"/>
  <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none"/>
</symbol>`);

        configureCloseGuardI18n(this.i18n);

        // 关键设置严格读取并先核验原生锚点；失效时挂载恢复界面，禁止旧工作台继续访问 AV。
        const settingsRead = await readSettingsState(this);
        let settings: ContactsSettings | null = settingsRead.settings;
        if (settingsRead.status === "valid" && settings) {
            const anchor = await probeSettingsAnchor(settings);
            if (anchor.status === "verified") {
                this.workspaceState = { kind: "ready" };
                this.onWorkspaceReadyRefreshed();
            } else {
                this.recoverySettings = settings;
                this.workspaceState = { kind: anchor.status === "missing" ? "anchor-missing" : "anchor-unknown", message: anchor.message };
                settings = null;
            }
        } else if (settingsRead.status === "missing") {
            this.workspaceState = { kind: "uninitialized" };
            settings = null;
        } else if (settingsRead.status === "invalid") {
            this.workspaceState = { kind: "settings-invalid", message: "联系人设置文件格式无效，原文件已保留" };
            settings = null;
        } else {
            this.workspaceState = { kind: "settings-read-failed", message: settingsRead.error?.message ?? "联系人设置文件读取失败" };
            settings = null;
        }
        if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || preferencesEpoch !== this.preferencesEpoch) return;
        this.settings = settings;
        emitWorkspaceState(this.workspaceState);
        if (settings && this.workspaceState.kind === "ready") {
            void ensureDefaultFamilyOrganization(this, settings).then((result) => {
                if (result.created && this.isLifecycleActive(lifecycleToken)) emitDataChanged({ topics: ["organizations"] }, lifecycleToken);
            }).catch((error) => {
                console.warn("[LvContacts] 默认组织“家庭”初始化待续做", error);
            });
        }
        try {
            await this.loadViewPreferences();
        } catch (error) {
            if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive && preferencesEpoch === this.preferencesEpoch) {
                notify(`偏好读取失败，当前值尚未核实：${error instanceof Error ? error.message : String(error)}`, 6000, "error");
            }
        }
        if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || preferencesEpoch !== this.preferencesEpoch) return;

        const plugin = this;
        this.addTab({
            type: TAB_TYPE,
            init() {
                if (!plugin.isLifecycleActive(lifecycleToken)) return;
                const state = this as WorkbenchTabState;
                if (plugin.tabMounts.get(state.element)?.isAlive()) return;
                state.__lvctDispose?.();
                const tabToken = createLifecycleToken(lifecycleToken);
                const container = document.createElement("div");
                container.className = "lvct-tab-root fn__flex-1";
                this.element.appendChild(container);
                const initialView = plugin.requestedWorkbenchView;
                plugin.requestedWorkbenchView = undefined;
                let instance: ReturnType<typeof mount> | null = null;
                const dispose = () => {
                    tabToken.invalidate();
                    const mounted = instance;
                    instance = null;
                    if (mounted) void unmount(mounted);
                    container.remove();
                    if (plugin.tabMounts.get(state.element) === tabToken) plugin.tabMounts.delete(state.element);
                    plugin.tabDisposers.delete(dispose);
                    if (state.__lvctDispose === dispose) state.__lvctDispose = null;
                };
                state.__lvctDispose = dispose;
                plugin.tabMounts.set(state.element, tabToken);
                plugin.tabDisposers.add(dispose);
                void plugin.mountWorkbenchRoot(container, tabToken, initialView,
                    () => tabToken.isAlive() && plugin.tabMounts.get(state.element) === tabToken,
                    (mounted) => { instance = mounted; });
            },
            destroy() {
                if (!plugin.isLifecycleActive(lifecycleToken)) return;
                (this as WorkbenchTabState).__lvctDispose?.();
            },
        });

        this.addCommand({
            langKey: "openWorkbench",
            callback: () => {
                if (this.isLifecycleActive(lifecycleToken)) this.openWorkbench();
            },
        });

        this.addCommand({
            langKey: "captureFromNote",
            callback: () => {
                if (this.isLifecycleActive(lifecycleToken)) this.captureFromCurrentNote();
            },
        });

        // 编辑器右键菜单：捕获本文人员
        const onMenuContent = (event: Parameters<typeof this.onMenuContent>[0]) => {
            if (this.isLifecycleActive(lifecycleToken)) this.onMenuContent(event);
        };
        const onProtyleEvent = (event: Parameters<typeof this.onProtyleEvent>[0]) => {
            if (this.isLifecycleActive(lifecycleToken)) this.onProtyleEvent(event);
        };
        this.eventBus.on("open-menu-content", onMenuContent);

        // 人物文档档案条：文档加载/切换时按 rootID 判定是否注入
        this.eventBus.on("loaded-protyle-static", onProtyleEvent);
        this.eventBus.on("loaded-protyle-dynamic", onProtyleEvent);
        this.eventBus.on("switch-protyle", onProtyleEvent);
        this.eventCleanup = () => {
            this.eventBus.off("open-menu-content", onMenuContent);
            this.eventBus.off("loaded-protyle-static", onProtyleEvent);
            this.eventBus.off("loaded-protyle-dynamic", onProtyleEvent);
            this.eventBus.off("switch-protyle", onProtyleEvent);
        };

        // 对外人员服务桥（任务管理等插件经 window.LvContacts 查人/建人/记交集）
        initExternalBridge(this, () => this.settings);

        // 跨插件生态联动事件监听（打卡、拾遗、闪卡、考试）
        const unsubs = [
            subscribeEcosystemEvent(ECOSYSTEM_EVENTS.CHECKIN_RECORDED, () => {
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive) {
                    this.onDataChanged();
                }
            }),
            subscribeEcosystemEvent(ECOSYSTEM_EVENTS.GLEAN_DATA_CHANGED, () => {
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive) {
                    this.onDataChanged();
                }
            }),
            subscribeEcosystemEvent(ECOSYSTEM_EVENTS.CARDS_REVIEWED, () => {
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive) {
                    this.onDataChanged();
                }
            }),
            subscribeEcosystemEvent(ECOSYSTEM_EVENTS.EXAM_STATS, () => {
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive) {
                    this.onDataChanged();
                }
            }),
        ];
        const prevCleanup = this.eventCleanup;
        this.eventCleanup = () => {
            prevCleanup?.();
            for (const unsub of unsubs) {
                try { unsub(); } catch {}
            }
        };
    }

    onLayoutReady() {
        if (!this.isLifecycleActive() || !this.preferencesActive) return;
        const lifecycleToken = this.lifecycleToken;
        if (!this.layoutReady) {
            this.topBarElement = this.addTopBar({
                icon: "iconLvContacts",
                title: this.i18n.openWorkbench ?? "小驴人脉",
                position: "right",
                callback: () => {
                    if (this.isLifecycleActive(lifecycleToken)) this.openWorkbench();
                },
            });
            this.registerLaunchpad();
        }
        this.layoutReady = true;
        // 注册小驴雷切工作台人脉动态小组件
        const unregisterRaikiri = registerRaikiriModuleSafely({
            moduleId: "contacts-upcoming",
            title: "人脉动态",
            icon: "iconLvContacts",
            category: "人脉",
            description: "近期生日与待跟进人脉",
            source: { pluginId: "siyuan-contacts", name: "小驴人脉" },
            read: async () => {
                if (!this.settings) return { title: "人脉动态", items: [{ label: "工作空间未初始化" }] };
                try {
                    const data = await this.loadDashboard({ birthdayWindowDays: 7 });
                    const items: Array<{ label: string; value?: string; command?: string }> = [];
                    const todayBdays = data.birthdays.filter((b) => b.bucket === "today");
                    if (todayBdays.length > 0) {
                        items.push({
                            label: `🎂 今日生日 (${todayBdays.length})`,
                            value: todayBdays.map((b) => b.person.name).join("、"),
                            command: "contacts:open-people?sort=birthday",
                        });
                    }
                    const weekBdays = data.birthdays.filter((b) => b.bucket === "week");
                    if (weekBdays.length > 0) {
                        items.push({
                            label: `🎉 本周生日 (${weekBdays.length})`,
                            value: weekBdays.map((b) => b.person.name).join("、"),
                            command: "contacts:open-people?sort=birthday",
                        });
                    }
                    const openFus = (data.followUps ?? []).filter((f) => f.item.status === "open");
                    if (openFus.length > 0) {
                        items.push({
                            label: `📌 待跟进事项 (${openFus.length})`,
                            value: openFus.slice(0, 3).map((f) => f.person?.name || f.item.title).join("、"),
                            command: "contacts:open-people?view=followups",
                        });
                    }
                    const overdueItems = (data.actions ?? []).filter((a) => a.bucket === "overdue");
                    if (overdueItems.length > 0) {
                        items.push({
                            label: `⌛ 待问候/逾期 (${overdueItems.length})`,
                            value: overdueItems.slice(0, 3).map((a) => a.person.name).join("、"),
                            command: "contacts:open-people?filter=overdue",
                        });
                    }
                    if (items.length === 0) {
                        items.push({ label: "人脉交往一切就绪", value: "近期无待办与生日" });
                    }
                    return { title: "人脉动态", items };
                } catch {
                    return { title: "人脉动态", items: [{ label: "暂无数据" }] };
                }
            },
            open: () => {
                this.openWorkbench();
            },
        });
        const currentCleanup = this.eventCleanup;
        this.eventCleanup = () => {
            currentCleanup?.();
            try { unregisterRaikiri?.(); } catch {}
        };
        this.noticeHubCleaner = lvNotify.registerPlugin("siyuan-contacts");

        window.clearTimeout(this.startupTimer);
        if (this.preferencesVerified && this.viewPreferences.openOnStartup) {
            const epoch = this.preferencesEpoch;
            const lifecycleToken = this.lifecycleToken;
            this.startupTimer = window.setTimeout(() => {
                if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || epoch !== this.preferencesEpoch) return;
                this.startupTimer = 0;
                this.openWorkbench();
            }, 0);
        }

        // Phase 2: 接入全生态统一后台主时钟 (lvTicker)，消灭高频唤醒，失焦自动休眠降频
        const unregisterFollowupsHour = lvTicker.onHour("siyuan-contacts", () => {
            if (this.isLifecycleActive(lifecycleToken) && this.workspaceState.kind === "ready") {
                void this.checkFollowups();
            }
        });
        lifecycleToken.onDispose(unregisterFollowupsHour);

        const unregisterDateCross = lvTicker.onDateCross("siyuan-contacts", () => {
            if (this.isLifecycleActive(lifecycleToken) && this.workspaceState.kind === "ready") {
                void this.checkFollowups(true);
            }
        });
        lifecycleToken.onDispose(unregisterDateCross);

        // 罗盘全端统一入口挂载 (Protocol v1.7.5 Unified Entry)
        const unregisterMobileEntry = lvLaunchpad.ensureUnifiedEntry();
        lifecycleToken.onDispose(unregisterMobileEntry);

        // Mobile Spec v1：跟进到期提醒注册为全生态自动化规则——任何生态插件触发
        // followup-due（或手动 trigger）时推送到期卡；手机端与桌面端同达。
        const unregisterFollowupRule = lvAutomation.registerRule({
            id: "contacts-followup-due",
            name: "人脉跟进到期提醒",
            desc: "触发时扫描今日到期跟进与定期联络并推送提醒卡（支持稍后提醒与今日免打扰）",
            enabled: true,
            triggerSource: "*",
            triggerType: "followup-due",
            actionPlugin: "siyuan-contacts",
            actionName: "followup-reminder",
            execute: async () => {
                if (!this.isLifecycleActive(lifecycleToken) || this.workspaceState.kind !== "ready") return false;
                const result = await this.checkFollowUpReminders(true);
                return result.delivered || result.count === 0;
            },
        });
        lifecycleToken.onDispose(unregisterFollowupRule);

        // 启动首跑：已初始化工作区时立即计算到期数并刷新罗盘徽章，不等待首个整点心跳
        if (this.settings && this.workspaceState.kind === "ready") {
            void this.refreshFollowupDueCount();
        }
    }

    async onunload() {
        this.disposeLifecycle();
    }

    private disposeLifecycle(): void {
        this.omnisearchCleaner?.();
        this.omnisearchCleaner = undefined;
        this.launchpadCleaner?.();
        this.launchpadCleaner = undefined;
        this.backupCleaner?.();
        this.backupCleaner = undefined;
        this.noticeHubCleaner?.();
        this.noticeHubCleaner = undefined;
        const lifecycleToken = this.lifecycleToken;
        lifecycleToken.invalidate();
        this.preferencesActive = false;
        this.preferencesEpoch += 1;
        this.dataChangeRequest += 1;
        this.workspaceStateReloadVersion += 1;
        this.workspaceStateReloadPromise = null;
        this.requestedWorkbenchView = undefined;
        this.preferenceRequests.dispose();
        this.layoutReady = false;
        window.clearTimeout(this.dataChangeTimer);
        window.clearTimeout(this.startupTimer);
        window.clearTimeout(this.viewRequestTimer);
        this.dataChangeTimer = 0;
        this.startupTimer = 0;
        this.viewRequestTimer = 0;
        disposeExternalBridge();
        const eventCleanup = this.eventCleanup;
        this.eventCleanup = null;
        eventCleanup?.();
        for (const dispose of [...this.tabDisposers]) dispose();
        for (const dispose of [...this.ownedDialogDisposers]) dispose();
        const workbenchDialog = this.workbenchDialog;
        const dialogInstance = this.dialogInstance;
        this.workbenchDialog = null;
        this.dialogInstance = null;
        this.workbenchDialogToken?.invalidate();
        this.workbenchDialogToken = null;
        if (dialogInstance) unmount(dialogInstance);
        workbenchDialog?.destroy();
    }

    private readonly onProtyleEvent = (event: { detail?: { protyle?: { element: HTMLElement; block?: { rootID?: string } } } }): void => {
        if (!this.isLifecycleActive()) return;
        const context: PanelContext = { plugin: this, settings: this.settings, i18n: this.i18n, lifecycleToken: this.lifecycleToken };
        handleProtyleEvent(context, event);
    };

    private readonly onMenuContent = (event: { detail: { protyle?: { element?: HTMLElement; block?: { rootID?: string } }; menu: { addItem: (item: unknown) => void } } }): void => {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken) || !event?.detail?.menu) return;
        const rootId = event.detail.protyle?.block?.rootID;
        if (!rootId) return;
        event.detail.menu.addItem({
            id: "lvct-capture",
            iconHTML: "",
            label: this.i18n.captureFromNote ?? "人脉：捕获本文人员",
            click: () => {
                if (this.isLifecycleActive(lifecycleToken)) this.openCaptureDialog(rootId);
            },
        });
        /* FAST-01.3：识别资料——选中文本（有选区才显示）与整篇文档；选区只读当前编辑器，不误读其他窗口 */
        const protyleElement = event.detail.protyle?.element;
        const selectionText = protyleElement ? readSelectionWithin(protyleElement) : "";
        if (selectionText.trim()) {
            // 断点消除战役：划词直接记一笔互动 (Selection-to-Interaction)
            event.detail.menu.addItem({
                id: "lvct-selection-to-interaction",
                iconHTML: "",
                label: "👥 人脉：记一笔互动",
                click: () => {
                    if (this.isLifecycleActive(lifecycleToken)) {
                        void this.openSelectionToInteraction({
                            rawText: selectionText.trim(),
                            rootId,
                            protyleElement,
                        });
                    }
                },
            });
            event.detail.menu.addItem({
                id: "lvct-recognize-selection",
                iconHTML: "",
                label: `人脉：识别资料（选中文本，${[...selectionText.trim()].length} 字）`,
                click: () => {
                    if (this.isLifecycleActive(lifecycleToken)) void this.openRecognizeDialog(selectionText, rootId);
                },
            });
        }
        event.detail.menu.addItem({
            id: "lvct-recognize-doc",
            iconHTML: "",
            label: "人脉：识别资料（整篇文档）",
            click: () => {
                if (this.isLifecycleActive(lifecycleToken)) void this.openRecognizeDialog(protyleElement?.innerText ?? "", rootId);
            },
        });
    };

    /** 打开"从笔记捕获"：需当前有一篇打开的笔记 */
    captureFromCurrentNote(): void {
        if (!this.isLifecycleActive()) return;
        const editor = getActiveEditor(true);
        const rootId = editor?.protyle?.block?.rootID || visibleEditorRootId();
        if (!rootId) {
            notify("请先打开一篇笔记再捕获人员", 3000);
            return;
        }
        this.openCaptureDialog(rootId);
    }

    private openCaptureDialog(docId: string): void {
        if (!this.isLifecycleActive()) return;
        if (!this.settings) {
            notify("请先完成人脉工作空间初始化", 3000);
            return;
        }
        this.openOwnedDialog({
            title: "从笔记捕获人脉",
            width: "560px",
            component: CaptureDialog,
            props: { facade: this, i18n: this.i18n, docId },
        });
    }

    /** FAST-01.3：识别资料 → 预览确认 → 目标落点（人物文档=补充此联系人；普通笔记=新建） */
    private async openRecognizeDialog(rawText: string, rootDocId: string): Promise<void> {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (!this.settings) {
            notify("请先完成人脉工作空间初始化", 3000);
            return;
        }
        const text = rawText.trim();
        if (!text) {
            notify("没有可识别的内容", 3000);
            return;
        }
        const result = parseContactText(text);
        if (result.items.length === 0) {
            notify("未识别到可填充的资料字段（原文已保留，未做任何写入）", 3000);
            return;
        }
        /* FAST-01.3a：识别目标裁决——名册读取失败（自动重试一次仍失败）时整单取消：零写入、
           零弹窗，不按「普通笔记新建」处理（会把已绑定人物的笔记建成重复联系人） */
        const resolution = await resolveRecognizeTarget(this.settings, rootDocId);
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (resolution.status === "failed") {
            notify("人脉名册读取失败，本次识别已取消（未做任何写入）；请稍后重新触发「识别资料」", 6000);
            return;
        }
        const person = resolution.status === "bound" ? resolution.person : null;
        const existing = person
            ? { name: person.name, phone: person.phone, email: person.email, wechat: person.wechat, website: person.website, birthday: person.birthday, isLunar: person.isLunar, group: person.group, tags: person.tags }
            : { name: "", phone: "", email: "", wechat: "", website: "", birthday: "", group: "", tags: [] as string[] };
        const container = document.createElement("div");
        container.className = "lvct-dialog-root";
        document.body.appendChild(container);
        const dialogToken = createLifecycleToken(lifecycleToken);
        let closed = false;
        let component: ReturnType<typeof mount> | null = null;
        const close = () => {
            if (closed) return;
            closed = true;
            dialogToken.invalidate();
            if (component) void unmount(component);
            component = null;
            container.remove();
            this.ownedDialogDisposers.delete(close);
        };
        this.ownedDialogDisposers.add(close);
        component = mount(QuickFillDialog, {
            target: container,
            props: {
                i18n: this.i18n,
                existing,
                initialResult: result,
                initialText: rawText,
                onApply: (patch: QuickFillPatch) => {
                    if (!this.isLifecycleActive(lifecycleToken) || !dialogToken.isAlive()) return;
                    close();
                    if (person) this.openPersonEditPrefilled(person, patch);
                    else this.openPersonCreatePrefilled(patch);
                },
                onClose: close,
            },
        });
    }

    /** Selection-to-Interaction: 划词直接记一笔互动 */
    async openSelectionToInteraction(args: {
        rawText: string;
        rootId: string;
        protyleElement?: HTMLElement;
    }): Promise<void> {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (!this.settings) {
            notify("请先完成人脉工作空间初始化", 3000);
            return;
        }

        const text = args.rawText.trim();
        if (!text) {
            notify("没有选中的互动内容", 3000);
            return;
        }

        const previousActive = typeof document !== "undefined" ? document.activeElement as HTMLElement | null : null;
        let rect: DOMRect | null = null;
        let blockId = args.rootId;
        const selection = typeof window !== "undefined" ? window.getSelection() : null;
        if (selection && selection.rangeCount > 0) {
            try {
                const range = selection.getRangeAt(0);
                rect = range.getBoundingClientRect();
                const anchor = selection.anchorNode;
                const anchorEl = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
                const blockEl = anchorEl?.closest<HTMLElement>("[data-node-id]");
                if (blockEl?.dataset?.nodeId) {
                    blockId = blockEl.dataset.nodeId;
                }
            } catch {}
        }

        let people: ContactSummary[] = [];
        try {
            people = await this.listContacts();
        } catch (err) {
            console.warn("[LvContacts] 读取名册失败", err);
        }
        if (!this.isLifecycleActive(lifecycleToken)) return;

        const isMobile = this.isMobile || lvLaunchpad.isMobileFrontend() || (typeof window !== "undefined" && window.innerWidth <= 640);
        const container = document.createElement("div");
        container.className = "lvct-dialog-root";
        document.body.appendChild(container);

        let closed = false;
        let component: ReturnType<typeof mount> | null = null;
        const close = () => {
            if (closed) return;
            closed = true;
            if (component) void unmount(component);
            component = null;
            container.remove();
            this.ownedDialogDisposers.delete(close);
            restoreFocusToEditor(previousActive, args.protyleElement);
        };
        this.ownedDialogDisposers.add(close);

        component = mount(SelectionToInteractionModal, {
            target: container,
            props: {
                initialText: text,
                blockId,
                people,
                isMobile,
                rect,
                onSave: async (payload: { person: ContactSummary; note: string; type: import("./domain/interactions").InteractionType; blockId?: string }) => {
                    if (!this.isLifecycleActive(lifecycleToken)) return;
                    try {
                        const occurredAt = Date.now();
                        const payloadData = buildSelectionInteractionPayload({
                            person: payload.person,
                            note: payload.note,
                            type: payload.type,
                            blockId: payload.blockId,
                            occurredAt,
                        });

                        await this.recordInteraction(
                            payloadData.personDocId,
                            payloadData.note,
                            payloadData.type,
                            {
                                occurredAt: payloadData.occurredAt,
                                externalRef: payloadData.externalRef,
                                source: "manual",
                            },
                        );

                        lvLaunchpad.haptic(10);
                        lvNotify.capsule({
                            source: "小驴人脉",
                            message: `已记录与「${payload.person.name}」的互动`,
                            level: "success",
                        });

                        lvActivity.record({
                            source: "人脉",
                            category: "contact",
                            title: `互动记录: ${payload.person.name}`,
                            detail: payloadData.note,
                            linkBlockId: payload.person.docId,
                        });

                        close();
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        lvNotify.card({
                            source: "小驴人脉",
                            title: "记录互动失败",
                            message: `未能保存互动：${msg}`,
                            level: "error",
                        });
                        throw err;
                    }
                },
                onClose: close,
            },
        });
    }

    private openOwnedDialog(args: Parameters<typeof svelteDialog>[0]): void {
        if (!this.isLifecycleActive()) return;
        const dialogToken = createLifecycleToken(this.lifecycleToken);
        const props = { ...args.props };
        for (const name of ["onSaved", "onCreated", "onChanged", "onSaveExtended"]) {
            const callback = props[name];
            if (typeof callback === "function") {
                props[name] = (...values: unknown[]) => {
                    if (dialogToken.isAlive()) return callback(...values);
                };
            }
        }
        let closed = false;
        const owned = svelteDialog({
            ...args,
            props,
            callback: () => {
                if (closed) return;
                closed = true;
                dialogToken.invalidate();
                this.ownedDialogDisposers.delete(dispose);
                args.callback?.();
            },
        });
        const dispose = () => {
            if (!closed) owned.close();
        };
        this.ownedDialogDisposers.add(dispose);
    }

    /** 新建组织结束后返回原联系人草稿，并仅以已核实的文档身份回填候选。 */
    private openCreateOrganizationForContact(initialName?: string): Promise<void | { docId: string; name: string }> {
        if (!this.isLifecycleActive()) return Promise.resolve();
        if (document.querySelector(".lvct-workbench")) {
            return new Promise((resolve) => {
                window.dispatchEvent(new CustomEvent("lvct-workbench-create-organization", {
                    detail: { facade: this, returnToContact: true, initialName, completion: resolve },
                }));
            });
        }
        return new Promise((resolve) => {
            let settled = false;
            const finish = (created?: { docId: string; name: string }) => {
                if (settled) return;
                settled = true;
                resolve(created);
            };
            this.openOwnedDialog({
                title: "新建组织",
                width: "760px",
                component: ContactOrganizationDialog,
                props: { facade: this, initialName, onCreated: finish },
                callback: () => finish(),
            });
        });
    }

    /** 统一挂载完整回调的联系人编辑弹窗（供文档档案条与识别补充复用，含组织归属与关系称谓全套回调及数据广播） */
    openPersonEditDialog(
        person: ContactSummary,
        options: {
            title?: string;
            width?: string;
            initialPatch?: Partial<import("./domain/person").ContactDraft>;
            onSaved?: () => void;
        } = {},
    ): void {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (!this.settings) return;
        this.openOwnedDialog({
            title: options.title ?? `编辑资料 · ${person.name}`,
            width: options.width ?? "620px",
            component: PersonEditDialog,
            props: {
                settings: this.settings,
                i18n: this.i18n,
                person,
                initialPatch: options.initialPatch,
                onLoadRelationshipLabels: (docId: string) => this.loadPersonRelationshipLabels(docId),
                onSaveRelationshipLabels: (docId: string, selfDocId: string, labels: string[], expected: import("./domain/person-relationship-labels").PersonRelationshipLabels | null) =>
                    this.savePersonRelationshipLabels(docId, selfDocId, labels, expected),
                onLoadOrgMemberships: (docId: string) => this.listPersonOrgMemberships(docId),
                onLoadOrgCandidates: async () => (await this.listOrganizations()).map((org) => ({ docId: org.docId, name: org.name, archived: org.archived })),
                onCreateOrganization: (initialName?: string) => this.openCreateOrganizationForContact(initialName),
                onAddOrgMembership: (personDocId: string, orgDocId: string, extra?: { department?: string; title?: string; joinedOn?: string; leftOn?: string; status?: import("./domain/org-membership").OrgMembershipStatus; statusLabel?: string; affiliationKind?: import("./domain/org-membership").OrgAffiliationKind; note?: string }) =>
                    this.addOrganizationMember(orgDocId, personDocId, extra),
                onUpdateOrgMembership: (membershipId: string, patch: import("./domain/org-membership").OrgMembershipPatch, expected?: import("./domain/org-membership").OrgMembership) =>
                    this.updateOrganizationMember(membershipId, patch, expected),
                onRemoveOrgMembership: (membershipId: string, expected?: import("./domain/org-membership").OrgMembership) =>
                    this.removeOrganizationMember(membershipId, expected),
                onSaved: () => {
                    if (this.isLifecycleActive(lifecycleToken)) {
                        emitDataChanged({ topics: ["people"], docIds: [person.docId] }, lifecycleToken);
                        options.onSaved?.();
                    }
                },
            },
        });
    }

    /** 识别结果落到既有联系人：编辑弹窗预填勾选值，保存仍走既有 updateContactFields 与 B06 守卫 */
    private openPersonEditPrefilled(person: ContactSummary, patch: QuickFillPatch): void {
        const { tagsAppend, ...fields } = patch;
        const initialPatch: Partial<import("./domain/person").ContactDraft> = {
            ...fields,
            tags: [...new Set([...person.tags, ...tagsAppend])],
        };
        this.openPersonEditDialog(person, {
            title: `识别资料 · 补充「${person.name}」`,
            width: "560px",
            initialPatch,
        });
    }

    /** 识别结果落到新建：预填草稿（识别后继续编辑），创建仍走既有 createContact 查重路径 */
    private openPersonCreatePrefilled(patch: QuickFillPatch): void {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (!this.settings) return;
        const draft = emptyDraft();
        if (patch.name !== undefined) draft.name = patch.name;
        if (patch.phone !== undefined) draft.phone = patch.phone;
        if (patch.email !== undefined) draft.email = patch.email;
        if (patch.wechat !== undefined) draft.wechat = patch.wechat;
        if (patch.website !== undefined) draft.website = patch.website;
        if (patch.birthday !== undefined) draft.birthday = patch.birthday;
        draft.isLunar = Boolean(patch.isLunar);
        if (patch.group !== undefined) draft.group = patch.group;
        draft.tags = [...patch.tagsAppend];
        this.openOwnedDialog({
            title: "识别资料 · 新建联系人",
            width: "560px",
            component: AddPersonDialog,
            props: {
                settings: this.settings,
                i18n: this.i18n,
                initial: draft,
                onLoadOrgCandidates: async () => (await this.listOrganizations()).map((org) => ({ docId: org.docId, name: org.name, archived: org.archived })),
                onCreateOrganization: (initialName?: string) => this.openCreateOrganizationForContact(initialName),
                onValidateExtended: async (details: ContactExtendedDraft) => {
                    if (details.orgMemberships.length) {
                        const organizations = await this.listOrganizations();
                        for (const affiliation of details.orgMemberships) {
                            const organization = organizations.find((entry) => entry.docId === affiliation.orgDocId);
                            if (!organization || (affiliation.orgStatus === "active" && organization.archived)) {
                                throw new Error(`组织 ${affiliation.orgDocId} 不可用；当前归属不能加入已归档组织，请重新读取并选择`);
                            }
                        }
                    }
                    if (details.relationshipLabels.trim() && !await this.loadSelfIdentity()) {
                        throw new Error("请先在设置中指定“我”的档案，再创建并填写与我的关系称谓");
                    }
                },
                onSaveExtended: async (person: ContactSummary, details: ContactExtendedDraft) => {
                    if (details.orgMemberships.length) {
                        const memberships = await this.listPersonOrgMemberships(person.docId);
                        for (const affiliation of details.orgMemberships) {
                            const same = (membership: typeof memberships[number]) => membership.orgDocId === affiliation.orgDocId
                                && membership.status === affiliation.orgStatus && membership.statusLabel === (affiliation.orgStatusLabel.trim() || undefined)
                                && membership.affiliationKind === affiliation.orgAffiliationKind && membership.department === affiliation.orgDepartment.trim()
                                && membership.title === affiliation.orgTitle.trim() && membership.joinedOn === affiliation.orgJoinedOn && membership.leftOn === affiliation.orgLeftOn;
                            if (memberships.some(same)) continue;
                            if (affiliation.orgStatus === "active" && memberships.some((membership) => membership.orgDocId === affiliation.orgDocId && membership.status === "active")) {
                                throw new Error(`组织 ${affiliation.orgDocId} 已有当前归属，请核对原记录；未覆盖它`);
                            }
                            await this.addOrganizationMember(affiliation.orgDocId, person.docId, {
                                department: affiliation.orgDepartment, title: affiliation.orgTitle, joinedOn: affiliation.orgJoinedOn,
                                leftOn: affiliation.orgLeftOn, status: affiliation.orgStatus,
                                statusLabel: affiliation.orgStatusLabel.trim(), affiliationKind: affiliation.orgAffiliationKind,
                            });
                            memberships.push({ id: "", orgDocId: affiliation.orgDocId, orgName: "", department: affiliation.orgDepartment.trim(),
                                title: affiliation.orgTitle.trim(), joinedOn: affiliation.orgJoinedOn, leftOn: affiliation.orgLeftOn,
                                status: affiliation.orgStatus, statusLabel: affiliation.orgStatusLabel.trim() || undefined,
                                affiliationKind: affiliation.orgAffiliationKind, archived: false, reachable: true });
                        }
                    }
                    if (details.relationshipLabels.trim()) {
                        const identity = await this.loadSelfIdentity();
                        if (!identity) throw new Error("请先在设置中指定“我”的档案，再保存与我的关系称谓");
                        const labels = details.relationshipLabels.split(/[、,，\n]/).map((label: string) => label.trim()).filter(Boolean);
                        const current = await this.loadPersonRelationshipLabels(person.docId);
                        if (current.selfDocId !== identity.selfDocId || JSON.stringify(current.record?.labels ?? []) !== JSON.stringify(labels)) {
                            await this.savePersonRelationshipLabels(person.docId, identity.selfDocId, labels, current.record);
                        }
                    }
                    if (details.aliases.trim()) {
                        const existingAliases = await this.listPersonAliases(person.docId);
                        const existing = new Set(existingAliases.map((alias) => alias.alias.trim().toLocaleLowerCase()));
                        const aliases = details.aliases.split(/[、,，\n]/).map((alias: string) => alias.trim()).filter(Boolean);
                        for (const alias of aliases) {
                            const key = alias.toLocaleLowerCase();
                            if (!existing.has(key)) {
                                await this.addPersonAlias(person.docId, alias);
                                existing.add(key);
                            }
                        }
                    }
                    if (details.note.trim()) {
                        const currentNote = await this.loadPersonNote(person.docId);
                        if (currentNote !== details.note.trim()) await this.savePersonNote(person.docId, details.note.trim(), currentNote);
                    }
                },
                onCreated: () => {
                    if (this.isLifecycleActive(lifecycleToken)) emitDataChanged({}, lifecycleToken);
                },
            },
        });
    }

    /**
     * 覆写 onDataChanged：不覆写时宿主在同步 dataChange 后会整插件重载（打卡库 D-222）。
     * 遵循思源 Petal Lifecycle 核心契约：接收 reason ("sync" | "overwrite")；
     * FUNC-01.7-a：先失效名册缓存（缓存可随时重建，不等 30s TTL），再防抖合并广播给
     * 本窗口工作台/档案条原地刷新（libs/data-events）；跨窗口投递依赖宿主对每个窗口
     * 实例的推送（Host pending）。
     */
    onDataChanged(reason?: "sync" | "overwrite") {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive) return;
        const epoch = this.preferencesEpoch;
        const request = ++this.dataChangeRequest;
        this.preferenceRequests.invalidate();
        console.debug(`[LvContacts] storage data changed${reason ? ` (source: ${reason})` : ""}`);
        invalidateRoster();
        if (this.dataChangeTimer) window.clearTimeout(this.dataChangeTimer);
        this.dataChangeTimer = window.setTimeout(async () => {
            if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || epoch !== this.preferencesEpoch || request !== this.dataChangeRequest) return;
            this.dataChangeTimer = 0;
            try {
                await this.reloadWorkspaceState();
                await this.loadViewPreferences();
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive && epoch === this.preferencesEpoch && request === this.dataChangeRequest) {
                    emitDataChanged({ preferencesRevision: this.viewPreferences.revision }, lifecycleToken);
                    void this.triggerCityTopicsAutoRebase().catch(() => {});
                }
            } catch (error) {
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive && epoch === this.preferencesEpoch && request === this.dataChangeRequest) {
                    emitDataChanged({ preferencesError: error instanceof Error ? error.message : String(error) }, lifecycleToken);
                }
            }
        }, 600);
    }

    async triggerCityTopicsAutoRebase() {
        if (!this.settings?.notebookId) return;
        const notebookId = this.settings.notebookId;
        try {
            const current = await this.listContacts();
            if (this.lastRosterForCitySync.length > 0) {
                const changed = detectChangedCities(this.lastRosterForCitySync, current);
                if (changed.size > 0) {
                    await autoRebaseCityTopics(notebookId, changed, current);
                }
            }
            this.lastRosterForCitySync = current;
        } catch {
            // 增量后台同步静默守护，不阻断主链路
        }
    }

    async reloadWorkspaceState(): Promise<WorkspaceState> {
        this.workspaceStateReloadVersion += 1;
        if (this.workspaceStateReloadPromise) return this.workspaceStateReloadPromise;
        const lifecycleToken = this.lifecycleToken;
        const reloadPromise = (async (): Promise<WorkspaceState> => {
            while (this.isLifecycleActive(lifecycleToken)) {
                const observedVersion = this.workspaceStateReloadVersion;
                const read = await readSettingsState(this);
                if (!this.isLifecycleActive(lifecycleToken)) return this.workspaceState;
                let next: WorkspaceState;
                let nextSettings: ContactsSettings | null;
                let nextRecoverySettings: ContactsSettings | null;
                if (read.status === "valid" && read.settings) {
                    const anchor = await probeSettingsAnchor(read.settings);
                    if (!this.isLifecycleActive(lifecycleToken)) return this.workspaceState;
                    if (anchor.status === "verified") {
                        nextRecoverySettings = null;
                        nextSettings = read.settings;
                        next = { kind: "ready" };
                    } else {
                        nextRecoverySettings = read.settings;
                        nextSettings = null;
                        next = { kind: anchor.status === "missing" ? "anchor-missing" : "anchor-unknown", message: anchor.message };
                    }
                } else if (read.status === "missing") {
                    nextRecoverySettings = null;
                    nextSettings = null;
                    next = { kind: "uninitialized" };
                } else if (read.status === "invalid") {
                    nextRecoverySettings = null;
                    nextSettings = null;
                    next = { kind: "settings-invalid", message: "联系人设置文件格式无效，原文件已保留" };
                } else {
                    nextRecoverySettings = null;
                    nextSettings = null;
                    next = { kind: "settings-read-failed", message: read.error?.message ?? "联系人设置文件读取失败" };
                }
                if (observedVersion !== this.workspaceStateReloadVersion) continue;
                this.recoverySettings = nextRecoverySettings;
                this.settings = nextSettings;
                this.workspaceState = next;
                emitWorkspaceState(next);
                return next;
            }
            return this.workspaceState;
        })();
        this.workspaceStateReloadPromise = reloadPromise;
        try {
            return await reloadPromise;
        } finally {
            if (this.workspaceStateReloadPromise === reloadPromise) this.workspaceStateReloadPromise = null;
        }
    }

    openWorkbench(view?: WorkbenchView) {
        if (!this.isLifecycleActive()) return;
        window.clearTimeout(this.viewRequestTimer);
        this.viewRequestTimer = 0;
        if (this.isMobile) {
            this.openWorkbenchDialog(view);
        } else {
            this.requestedWorkbenchView = view;
            openTab({
                app: this.app,
                custom: {
                    icon: "iconLvContacts",
                    title: this.i18n.tabTitle ?? "小驴人脉",
                    id: `${this.name}${TAB_TYPE}`,
                },
            });
            if (view) {
                const epoch = this.preferencesEpoch;
                const lifecycleToken = this.lifecycleToken;
                const tabToken = [...this.tabMounts.values()].at(-1);
                this.viewRequestTimer = window.setTimeout(() => {
                    if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || epoch !== this.preferencesEpoch) return;
                    this.viewRequestTimer = 0;
                    if (!tabToken?.isAlive()) return;
                    window.dispatchEvent(new CustomEvent("lvct-workbench-view", { detail: { view, facade: this, token: tabToken } }));
                    if (this.requestedWorkbenchView === view) this.requestedWorkbenchView = undefined;
                }, 0);
            }
        }
    }

    async initialize(
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
            const wb = document.querySelector(".lvct-workbench");
            if (!this.isMobile && wb && wb.getBoundingClientRect().width === 0) {
                this.openWorkbench();
            }
        }
        return settings;
    }

    async previewInitialize(notebookName: string): Promise<WorkspaceSnapshot> {
        return inspectWorkspace(notebookName);
    }

    async scanAnchorCandidates(options?: import("./services/init").AnchorScanOptions) {
        return scanAnchorCandidates(options);
    }

    async loadDashboard(options?: Partial<typeof DEFAULT_DASHBOARD_OPTIONS>) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadDashboard(this, this.settings, { ...DEFAULT_DASHBOARD_OPTIONS, ...options });
    }

    async recordInteraction(
        personDocId: string,
        note?: string,
        type?: import("./domain/interactions").InteractionType,
        options?: { occurredAt?: number; source?: import("./domain/interactions").InteractionSource; externalRef?: string; skipDocSync?: boolean; skipDailyNoteSync?: boolean },
    ): Promise<void> {
        const recordResult = await recordInteractionWithResult(this, { personDocId, note, type, ...options });
        if (!options?.skipDocSync) {
            await syncInteractionDocSection(this, personDocId).catch(() => {});
        }
        if (!options?.skipDailyNoteSync && this.settings?.notebookId) {
            const notebookId = this.settings.notebookId;
            const date = toLocalDateKey(options?.occurredAt ? new Date(options.occurredAt) : new Date());
            const lastEvent = recordResult.store.events[recordResult.store.events.length - 1];
            await this.listContacts().then((roster) => {
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
            void this.listContacts().then((roster) => {
                const person = roster.find((p) => p.docId === personDocId);
                const name = person?.name || "联系人";

                // Phase 3: 今日全生态活动流广播 (lvActivity)
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

                // 标准库 v1.6.0：capsule 不承载动作按钮，撤销确认改由紧凑卡片承载
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
                                        lvNotify.capsule({
                                            source: "小驴人脉",
                                            message: `已撤销与「${name}」的互动记录`,
                                            level: "info",
                                        });
                                    } catch (err) {
                                        lvNotify.card({
                                            source: "小驴人脉",
                                            title: "撤销失败",
                                            message: `未能撤销互动记录：${err instanceof Error ? err.message : String(err)}`,
                                            level: "error",
                                        });
                                    }
                                },
                            },
                        ],
                    });
                } else {
                    lvNotify.capsule({
                        source: "小驴人脉",
                        message: `已记录与「${name}」的互动`,
                        level: "success",
                    });
                }
            }).catch(() => {});
        }
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    }

    async deleteInteraction(personDocId: string, eventId: string): Promise<void> {
        await deleteInteraction(this, eventId, personDocId);
        await syncInteractionDocSection(this, personDocId).catch(() => {});
        await removeDailyNoteInteractionByEventId(eventId).catch(() => {});
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    }

    async amendInteraction(personDocId: string, eventId: string, amendment: InteractionAmendment): Promise<void> {
        const res = await amendInteraction(this, eventId, personDocId, amendment);
        await syncInteractionDocSection(this, personDocId).catch(() => {});
        await this.listContacts().then((roster) => {
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
    }

    async syncPersonDocument(person: ContactSummary): Promise<void> {
        await syncFullPersonDocument(this, person);
    }

    async listPersonExchanges(personDocId: string) {
        return listPersonExchanges(this, personDocId);
    }

    async createPersonExchange(input: import("./services/exchanges").CreatePersonExchangeInput) {
        const token = this.lifecycleToken;
        const result = await createPersonExchange(this, input);
        emitDataChanged({ topics: ["people"], docIds: [input.personDocId] }, token);
        return result;
    }

    async updatePersonExchange(id: string, patch: import("./domain/exchanges").ExchangePatch, expected?: Pick<import("./domain/exchanges").ExchangeRecord, "updatedAt">) {
        const token = this.lifecycleToken;
        const result = await updatePersonExchange(this, id, patch, expected);
        emitDataChanged({ topics: ["people"] }, token);
        return result;
    }

    async changePersonExchangeStatus(id: string, status: import("./domain/exchanges").ExchangeStatus, settledOn?: string, expected?: Pick<import("./domain/exchanges").ExchangeRecord, "updatedAt">) {
        const token = this.lifecycleToken;
        const result = await changePersonExchangeStatus(this, id, status, settledOn, expected);
        emitDataChanged({ topics: ["people"] }, token);
        return result;
    }

    async listPersonAliases(personDocId: string) {
        return listPersonAliases(this, personDocId);
    }

    async addPersonAlias(personDocId: string, alias: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await addPersonAlias(this, personDocId, alias, this.settings);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async removePersonAlias(id: string) {
        const token = this.lifecycleToken;
        await removePersonAlias(this, id);
        emitDataChanged({ topics: ["people"] }, token);
    }

    async resolvePersonAlias(alias: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return resolveAlias(this, alias, this.settings);
    }

    async previewCapture(docId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewCapture(this.settings, docId);
    }

    async updatePersonFields(personItemId: string, draft: import("./domain/person").ContactDraft) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return updateContactFields(this.settings, personItemId, draft);
    }

    async savePersonAvatar(personDocId: string, avatarDataUrl: string): Promise<void> {
        await setBlockAttrs(personDocId, {
            "custom-lvct-avatar": avatarDataUrl,
            icon: avatarDataUrl,
        });
        await flushBlockIndex();
        invalidateRoster();
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    }

    async loadPersonAvatar(personDocId: string): Promise<string> {
        await flushBlockIndex();
        const rows = await querySql<unknown>(`SELECT ial FROM blocks WHERE id = '${personDocId}' AND type = 'd' LIMIT 1`);
        if (!rows.length) return "";
        const row = assertKernelRecord("/api/query/sql", rows[0]);
        const attrs = organizationIalAttributes(typeof row.ial === "string" ? row.ial : "");
        return attrs["custom-lvct-avatar"] || attrs["icon"] || "";
    }

    async savePersonChannels(personDocId: string, channels: ContactChannel[]): Promise<void> {
        const encoded = encodeURIComponent(JSON.stringify(channels));
        await setBlockAttrs(personDocId, {
            "custom-lvct-channels": encoded,
        });
        await flushBlockIndex();
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    }

    async loadPersonChannels(personDocId: string): Promise<ContactChannel[]> {
        await flushBlockIndex();
        const rows = await querySql<unknown>(`SELECT ial FROM blocks WHERE id = '${personDocId}' AND type = 'd' LIMIT 1`);
        if (!rows.length) return [];
        const row = assertKernelRecord("/api/query/sql", rows[0]);
        let attrs: Record<string, string> = {};
        try {
            attrs = organizationIalAttributes(typeof row.ial === "string" ? row.ial : "");
        } catch {
            const ialStr = typeof row.ial === "string" ? row.ial : "";
            const m = ialStr.match(/custom-lvct-channels="([^"]*)"/);
            if (m) attrs["custom-lvct-channels"] = m[1];
        }
        const raw = attrs["custom-lvct-channels"];
        if (!raw) return [];
        try {
            return normalizeChannels(JSON.parse(decodeURIComponent(raw)));
        } catch {
            try {
                return normalizeChannels(JSON.parse(raw));
            } catch {
                return [];
            }
        }
    }

    async savePersonBusinessCard(personDocId: string, cardDataUrl: string): Promise<void> {
        await setBlockAttrs(personDocId, {
            "custom-lvct-business-card": cardDataUrl || "",
        });
        await flushBlockIndex();
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
    }

    async loadPersonBusinessCard(personDocId: string): Promise<string> {
        await flushBlockIndex();
        const rows = await querySql<unknown>(`SELECT ial FROM blocks WHERE id = '${personDocId}' AND type = 'd' LIMIT 1`);
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
    }

    /** B11：本人身份读取（null = 未建立） */
    async loadSelfIdentity() {
        return loadSelfIdentity(this);
    }

    /** B11.3：确保本人档案「我自己」存在（幂等；失败返回 null 不抛） */
    async createSelfProfile() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const identity = await ensureSelfIdentity(this, this.settings);
        emitDataChanged({}, token);
        return identity;
    }

    /** B11.3/B11.5：把本人身份显式指定到一名已有联系人（显式改绑） */
    async designateSelfIdentity(personItemId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const identity = await designateSelfIdentity(this, this.settings, personItemId);
        emitDataChanged({}, token);
        return identity;
    }

    async previewSelfIdentityChange(targetItemId: string | null) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewSelfIdentityChange(this, this.settings, targetItemId);
    }

    async applySelfIdentityChange(preview: import("./domain/self-identity").SelfIdentityChangePreview) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const identity = await applySelfIdentityChange(this, this.settings, preview);
        emitDataChanged({}, token);
        return identity;
    }

    /** B11.3：全量名册（设置页本人档案指定用；未初始化返回空） */
    async listContacts() {
        if (!this.settings) return [];
        return listContactsService(this.settings);
    }

    async loadPersonRelationshipLabels(personDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadPersonRelationshipLabels(this, this.settings, personDocId);
    }

    async savePersonRelationshipLabels(personDocId: string, selfDocId: string, labels: string[], expected: import("./domain/person-relationship-labels").PersonRelationshipLabels | null) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await savePersonRelationshipLabels(this, this.settings, personDocId, selfDocId, labels, expected);
        invalidateRoster();
        emitDataChanged({}, token);
        return result;
    }

    /** B13.3：组织列举（含成员记录） */
    async listOrganizations(options?: { includeRemoved?: boolean }) {
        return listOrganizationsWithMembers(this, options);
    }

    /** B13.5c：组织标记 keyset 分页 */
    async listOrganizationsPage(options?: { afterRootId?: string; limit?: number; includeRemoved?: boolean }) {
        return listOrganizationsPage(this, options);
    }

    /** B13.3：新建组织（文档 + custom-lvct-org 标记区块；同名拒绝） */
    async createOrganization(name: string, profile?: import("./domain/organization-profile").OrganizationProfileDraft) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await createOrganization(this.settings, name, this, profile);
        emitDataChanged({ topics: ["organizations"] }, token);
        return result;
    }

    async loadOrganizationProfile(orgDocId: string) {
        if (!this.isLifecycleActive() || !this.settings) throw new Error("人脉工作空间尚未初始化");
        return getOrganizationProfile(this, orgDocId);
    }

    async saveOrganizationProfile(orgDocId: string, profile: import("./domain/organization-profile").OrganizationProfileDraft, expected?: import("./domain/organization-profile").OrganizationProfileDraft | null) {
        if (!this.isLifecycleActive() || !this.settings) throw new Error("人脉工作空间尚未初始化");
        const result = await updateOrganizationProfile(this, orgDocId, profile, expected);
        if (!this.isLifecycleActive()) return result;
        await syncOrganizationDocSection(this, orgDocId).catch(() => {});
        emitDataChanged({ topics: ["organizations"] }, this.lifecycleToken);
        return result;
    }

    /** B13.3：组织成员列举（join 名册姓名） */
    async listOrganizationMembers(orgDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return listOrganizationMembers(this, this.settings, orgDocId);
    }

    /** B13.5b：组织成员筛选与稳定分页 */
    async listOrganizationMembersPage(orgDocId: string, options?: { query?: string; status?: "all" | "active" | "former"; offset?: number; limit?: number }) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return listOrganizationMembersPage(this, this.settings, orgDocId, options);
    }

    /** B13.3：添加组织成员（active） */
    async addOrganizationMember(orgDocId: string, personDocId: string, extra?: { department?: string; title?: string; joinedOn?: string; leftOn?: string; status?: import("./domain/org-membership").OrgMembershipStatus; statusLabel?: string; affiliationKind?: import("./domain/org-membership").OrgAffiliationKind; note?: string }) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const report = await saveOrganizationMember(this, this.settings, { ...extra, orgDocId, personDocId });
        await syncOrganizationDocSection(this, orgDocId).catch(() => {});
        emitDataChanged({}, token);
        return report;
    }

    /** B13.3：移除组织成员记录 */
    async removeOrganizationMember(id: string, expected?: import("./domain/org-membership").OrgMembership) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const report = await deleteOrganizationMember(this, this.settings, id, expected);
        if (expected?.orgDocId) {
            await syncOrganizationDocSection(this, expected.orgDocId).catch(() => {});
        }
        emitDataChanged({}, token);
        return report;
    }

    /** B13.4：更新成员记录字段（部门/职位/入职/离职/状态；身份字段不可变） */
    async updateOrganizationMember(id: string, patch: import("./domain/org-membership").OrgMembershipPatch, expected?: import("./domain/org-membership").OrgMembership) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const report = await editOrganizationMember(this, this.settings, id, patch, expected);
        if (expected?.orgDocId) {
            await syncOrganizationDocSection(this, expected.orgDocId).catch(() => {});
        }
        emitDataChanged({}, token);
        return report;
    }

    async moveOrganizationMember(id: string, targetOrgDocId: string, expected?: import("./domain/org-membership").OrgMembership) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const report = await moveOrganizationMemberWithProjection(this, this.settings, id, targetOrgDocId, expected);
        emitDataChanged({}, token);
        return report;
    }

    async replaceOrganizationMember(formerMembershipId: string, successorPersonDocId: string, extra: { department?: string; title?: string; joinedOn: string; leftOn: string; affiliationKind?: import("./domain/org-membership").OrgAffiliationKind }, expected?: import("./domain/org-membership").OrgMembership) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const report = await replaceOrganizationMemberWithProjection(this, this.settings, { ...extra, formerId: formerMembershipId, personDocId: successorPersonDocId }, expected);
        emitDataChanged({}, token);
        return report;
    }

    /** B13：归档组织（标记区块值 archived；文档与成员记录保留可恢复） */
    async archiveOrganization(orgDocId: string) {
        const token = this.lifecycleToken;
        await archiveOrganization(orgDocId);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    /** B13：恢复归档组织 */
    async restoreOrganization(orgDocId: string) {
        const token = this.lifecycleToken;
        await restoreOrganization(orgDocId);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    /** 从插件移除，原生组织文档和成员记录保留，可从组织管理恢复。 */
    async removeOrganization(orgDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        await removeOrganization(orgDocId);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    /** B13.4：组织改名（同名检查；标记块文案同步，归档值保持） */
    async renameOrganization(orgDocId: string, name: string) {
        const token = this.lifecycleToken;
        await renameOrganization(orgDocId, name, this);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    async listPendingOrganizationOperations() {
        return listPendingOrganizationOperations(this);
    }

    async inspectOrganizationOperation(requestId: string) {
        const report = await inspectOrganizationOperation(this, requestId);
        if (report.status === "complete") invalidateOrganizationScan();
        return report;
    }

    async resumeOrganizationOperation(requestId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const report = await resumeOrganizationOperation(this, this.settings, requestId);
        if (report.status === "complete") invalidateOrganizationScan();
        return report;
    }

    /** B13.9：移除悬空的 org-links 区块（体检修复入口；逐块隔离返回失败清单） */
    async removeOrgLinkBlocks(blockIds: readonly string[]) {
        return removeOrgLinkBlocks(blockIds);
    }

    /** B12：某人的组织归属投影（成员记录 join 组织名） */
    async listPersonOrgMemberships(personDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return listPersonOrgMemberships(this, personDocId);
    }

    async previewOrganizationProjections(docIds?: readonly string[]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewOrganizationProjections(this, this.settings, docIds);
    }

    async repairOrganizationProjection(preview: import("./services/org-projections").OrgProjectionPreview, retryKey: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await repairOrganizationProjection(this, this.settings, preview, retryKey);
        if (result.status === "applied" || result.status === "unchanged") emitDataChanged({}, token);
        return result;
    }

    /** B13.6：共同背景（同组织联系人，重叠期间/同期口径，零写入） */
    async listCommonOrgBackground(personDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return listCommonOrgBackground(this, this.settings, personDocId);
    }

    /** B13.3：打开组织管理弹窗（B13.6a：携目标组织定位；成员行可跨弹窗导航到工作台人物详情） */
    openOrgManagerDialog(initialOrgDocId?: string, onCreated?: (docId: string) => void, onDone?: () => void): void {
        if (!this.isLifecycleActive()) {
            onDone?.();
            return;
        }
        if (!this.settings) {
            showMessage("请先完成人脉工作空间初始化", 3000);
            onDone?.();
            return;
        }
        this.openOwnedDialog({
            title: this.i18n.orgManagerTitle ?? "组织管理",
            /* H-01/V-02：宽屏响应式（原固定 620px 左栏挤迫）；min() 兼顾窄视口不溢出 */
            width: "min(920px, 92vw)",
            component: OrgManagerDialog,
            props: {
                facade: this,
                i18n: this.i18n,
                initialOrgDocId,
                onCreated,
                onEditOrganization: (docId: string) => {
                    requestWorkbenchNavigation(this, { view: "orgs", editOrgDocId: docId }, this.lifecycleToken);
                    this.openWorkbench();
                },
                onOpenPerson: (person: unknown) => {
                    /* 组织弹窗为宿主级弹窗，人物详情 Peek 由工作台承载：
                       经窗口事件交给已挂载的工作台打开（组织弹窗先于 Peek 关闭，避免遮挡） */
                    window.dispatchEvent(new CustomEvent("lvct-workbench-person", { detail: { person } }));
                },
            },
            callback: onDone,
        });
    }

    /** FUNC-01.14：AI 资料候选受限补丁写（只写补丁字段，最新名册回读逐字段冲突核对） */
    async updatePersonCandidateFields(personItemId: string, patches: readonly import("./domain/contact-patch").CandidateFieldPatch[]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return applyContactCandidateFields(this.settings, personItemId, patches);
    }

    async captureDoc(docId: string, options: Parameters<typeof captureFromDoc>[3]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return captureFromDoc(this, this.settings, docId, options);
    }

    async prepareAiExtraction(docId: string, options?: AiPreflightOptions) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        if (!this.viewPreferences.aiEnabled) throw new AiExtractionError("disabled");
        return prepareAiExtraction(this.settings, docId, options);
    }

    async aiExtractFromDoc(docId: string, confirmation?: AiExtractionConfirmation) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        if (!this.viewPreferences.aiEnabled) throw new AiExtractionError("disabled");
        const outcome = await extractFromDoc(this.settings, docId, confirmation);
        if (!this.viewPreferences.aiEnabled) throw new AiExtractionError("disabled");
        return outcome;
    }

    async loadPersonInsights(docId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadPersonInsights(this, this.settings, docId);
    }

    async loadRecentInteractions() {
        /* 人物列表的最近互动排序是严格展示读；读取失败必须让 UI
         * 进入 recentError 重试态，不能伪装成所有联系人从未互动。 */
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
    }

    async loadInteractionEvents() {
        const store = await loadInteractionStoreStrict(this);
        return store.events;
    }

    async checkSettingsHealth() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return checkSettingsHealth(this.settings);
    }

    async runHealthAudit() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return auditWorkspaceData(this, this.settings);
    }

    async runHealthAuditReport(previous?: import("./domain/health-audit").HealthAuditReport) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return auditWorkspaceDataReport(this, this.settings, { previous });
    }

    async retryFailedHealthAuditModules(previous: import("./domain/health-audit").HealthAuditReport) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return retryFailedHealthAuditModules(this, this.settings, previous);
    }

    async previewMissingFields() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewMissingFields(this, this.settings);
    }

    async rebuildMissingFields(preview: FieldRebuildPreview) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const settings = await rebuildMissingFields(this, this.settings, preview, () => this.isLifecycleActive(token));
        if (this.isLifecycleActive(token)) this.settings = settings;
        return settings;
    }

    async previewRebindSettings(patch: Parameters<typeof rebindSettings>[2]) {
        const settings = this.recoverySettings ?? this.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        return previewRebindSettings(this, settings, patch);
    }

    async rebindSettings(patch: Parameters<typeof rebindSettings>[2], preview: SettingsRebindPreview) {
        const source = this.recoverySettings ?? this.settings;
        if (!source) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const settings = await rebindSettings(this, source, patch, preview, () => this.isLifecycleActive(token));
        if (this.isLifecycleActive(token)) {
            this.recoverySettings = null;
            this.settings = settings;
            this.workspaceState = { kind: "ready" };
            emitWorkspaceState(this.workspaceState);
            this.onWorkspaceReadyRefreshed();
        }
        return settings;
    }

    async exportInteractionJson() {
        return exportInteractionJson(this);
    }

    async exportMigrationBundle() {
        return exportMigrationBundle(this);
    }

    async previewMigrationImport(text: string) {
        return previewMigrationImport(text);
    }

    async importMigrationBundle(text: string) {
        return importMigrationBundle(this, text);
    }

    async dumpData(): Promise<Record<string, unknown>> {
        const bundleJson = await this.exportMigrationBundle();
        return JSON.parse(bundleJson) as Record<string, unknown>;
    }

    async restoreData(data: Record<string, unknown>): Promise<boolean> {
        try {
            const bundleText = JSON.stringify(data);
            const result = await this.importMigrationBundle(bundleText);
            return result.failed.length === 0;
        } catch (err) {
            console.error("[LvContacts] 全生态灾备恢复失败", err);
            return false;
        }
    }

    getEcosystemStatusBadgeText(): string {
        return lvEcosystem.getStatusBadgeText();
    }

    getFollowupDueCount(): number {
        return this.followupDueCount;
    }

    openContactsView(): void {
        this.openWorkbench();
    }

    openNewContactDialog(patch?: Partial<QuickFillPatch>): void {
        if (!this.settings) {
            this.openWorkbench();
            return;
        }
        this.openPersonCreatePrefilled({
            tagsAppend: [],
            ...patch,
        });
    }

    openPreMeetingDialog(): void {
        if (!this.settings) {
            this.openWorkbench();
            return;
        }
        this.openOwnedDialog({
            title: "🛡️ 会前速查与偏好雷区大盘",
            width: "800px",
            component: PreMeetingHubDialog,
            props: {
                facade: this,
                i18n: this.i18n,
                onOpenPerson: (docId: string) => {
                    if (!this.isMobile) this.openWorkbench("people");
                    this.openPersonDoc(docId);
                    emitDataChanged({ topics: ["people"], docIds: [docId] }, this.lifecycleToken);
                },
            },
        });
    }

    openCoolingRadarDialog(): void {
        if (!this.settings) {
            this.openWorkbench();
            return;
        }
        this.openOwnedDialog({
            title: "🧊 关系降温预警与破冰重联中枢",
            width: "800px",
            component: CoolingRadarDialog,
            props: {
                facade: this,
                i18n: this.i18n,
                onOpenPerson: (docId: string) => {
                    if (!this.isMobile) this.openWorkbench("people");
                    this.openPersonDoc(docId);
                    emitDataChanged({ topics: ["people"], docIds: [docId] }, this.lifecycleToken);
                },
            },
        });
    }

    /** 刷新待跟进人脉到期计数并同步更新小驴罗盘徽章（纯算不弹卡） */
    async refreshFollowupDueCount(): Promise<number> {
        if (!this.settings) return 0;
        try {
            const data = await this.loadDashboard({ birthdayWindowDays: 7 });
            const dueFollowUps = (data.followUps ?? []).filter(
                (f) => f.item.status === "open" && (f.bucket === "today" || f.bucket === "overdue")
            );
            const overdueCadences = (data.actions ?? []).filter(
                (a) => a.bucket === "overdue" && a.reasons.some((r) => r.kind === "stale")
            );
            const totalCount = dueFollowUps.length + overdueCadences.length;
            this.followupDueCount = totalCount;
            this.registerLaunchpad();
            return totalCount;
        } catch {
            return 0;
        }
    }

    /** 工作区变为 ready（启动核验/初始化完成/重绑恢复）后的统一刷新：徽章重建 + 待办计数刷新 */
    private onWorkspaceReadyRefreshed(): void {
        if (!this.isLifecycleActive()) return;
        this.registerLaunchpad();
        void this.refreshFollowupDueCount();
    }

    /** 关闭移动端全屏工作台 Dialog（下滑手势与罗盘返回共用出口；桌面 Tab 形态为 no-op） */
    closeWorkbenchDialog(): void {
        this.workbenchDialog?.destroy();
    }

    handleQuickAction(action: string): void {
        switch (action) {
            case "速查联系人":
                this.openWorkbench("people");
                break;
            case "今日待联络":
                this.openCoolingRadarDialog();
                break;
            case "新增联系人":
                this.openNewContactDialog();
                break;
            case "会前速览":
                this.openPreMeetingDialog();
                break;
            // 兼容 v0.7.8 及更早版本的罗盘二级行动文案
            case "快速记录一次人际互动":
                this.openWorkbench("home");
                break;
            case "会前30秒关系档案速览卡":
                this.openPreMeetingDialog();
                break;
            case "新建联系人与圈层标签":
                this.openNewContactDialog();
                break;
            case "查看近期需要联络预警名单":
                this.openCoolingRadarDialog();
                break;
            default:
                this.openWorkbench();
                break;
        }
    }

    private registerLaunchpad(): void {
        this.launchpadCleaner?.();
        const dueCount = this.getFollowupDueCount();
        this.launchpadCleaner = lvLaunchpad.register({
            id: "siyuan-contacts",
            name: "人脉",
            fullName: "小驴人脉",
            svgIcon: "iconLvContacts",
            color: "#f97316",
            desc: "关系图谱 · 联络提醒",
            digit: 7,
            badge: dueCount > 0 ? `${dueCount} 位需联络` : undefined,
            badgeType: "warn",
            // Mobile Spec v1：手机直办动作（速查 / 今日待联络 / 新增 / 会前速览）
            actions: ["速查联系人", "今日待联络", "新增联系人", "会前速览"],
            topBarElement: this.topBarElement,
            onClick: () => this.openContactsView(),
            onAction: (action) => this.handleQuickAction(action),
        });
    }

    /**
     * Phase 7: 全生态穿透搜索切面实现
     * 支持联系人姓名、圈层标签、别名及互动记录全文秒级检索
     */
    async searchOmniContacts(keyword: string): Promise<LvSearchResultItem[]> {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return [];

        const results: LvSearchResultItem[] = [];
        // Mobile Spec v1：手机端宿主下点击结果直接打开对应思源文档，
        // 不再叠加弹出全屏工作台（避免「文档压在全屏工作台底下」的双面叠加）。
        const mobileFrontend = lvLaunchpad.isMobileFrontend();
        const openResultDoc = (docId: string) => {
            if (!this.settings) {
                this.openWorkbench();
                return;
            }
            if (!mobileFrontend) this.openWorkbench("people");
            this.openPersonDoc(docId);
        };

        try {
            // 1. 检索联系人名册（姓名、圈层标签、别名、电话/微信）
            const roster = await this.listContacts();
            const matchedPeople = filterContacts(roster, kw).slice(0, 15);
            for (const person of matchedPeople) {
                const snippets: string[] = [];
                if (person.tags.length > 0) snippets.push(`标签: ${person.tags.join("、")}`);
                if (person.group) snippets.push(`分组: ${person.group}`);
                if (person.phone) snippets.push(`电话: ${person.phone}`);
                if (person.wechat) snippets.push(`微信: ${person.wechat}`);

                results.push({
                    id: `contact_${person.docId}`,
                    source: "人脉",
                    category: person.group || "联系人",
                    title: person.name,
                    snippet: snippets.join(" · ") || "人脉档案卡片",
                    badge: person.group || "联系人",
                    linkBlockId: person.docId,
                    onClick: () => {
                        openResultDoc(person.docId);
                        emitDataChanged({ topics: ["people"], docIds: [person.docId] }, this.lifecycleToken);
                    },
                });
            }

            // 2. 检索互动记录
            const interactionStore = await loadInteractionStore(this);
            const tombstones = new Set(interactionStore.tombstones);
            const matchedEvents = interactionStore.events
                .filter((e) => !tombstones.has(e.id) && e.note && e.note.toLowerCase().includes(kw))
                .slice(0, 10);

            for (const event of matchedEvents) {
                const person = roster.find((p) => p.docId === event.personDocId);
                const personName = person?.name || "联系人";
                const typeLabel = (event.type && INTERACTION_TYPE_LABELS[event.type]?.label) || "互动";

                results.push({
                    id: `interaction_${event.id}`,
                    source: "人脉",
                    category: "互动记录",
                    title: `${personName} · ${event.localDate}`,
                    snippet: event.note,
                    badge: typeLabel,
                    linkBlockId: event.personDocId,
                    onClick: () => {
                        openResultDoc(event.personDocId);
                        emitDataChanged({ topics: ["people"], docIds: [event.personDocId] }, this.lifecycleToken);
                    },
                });
            }

            // 3. 检索组织机构
            const orgs = await this.listOrganizations().catch(() => []);
            const matchedOrgs = orgs.filter((org) =>
                org.name.toLowerCase().includes(kw) ||
                (org.profile?.shortName && org.profile.shortName.toLowerCase().includes(kw)) ||
                (org.profile?.description && org.profile.description.toLowerCase().includes(kw))
            ).slice(0, 10);

            for (const org of matchedOrgs) {
                const memberCount = org.memberships?.length ?? 0;
                results.push({
                    id: `org_${org.docId}`,
                    source: "人脉",
                    category: "组织机构",
                    title: org.name,
                    snippet: `${org.profile?.shortName ? `简称: ${org.profile.shortName} · ` : ""}${memberCount > 0 ? `${memberCount} 位成员` : "暂无成员"}${org.profile?.description ? ` · 简介: ${org.profile.description}` : ""}`,
                    badge: org.archived ? "已归档" : "组织",
                    linkBlockId: org.docId,
                    onClick: () => {
                        if (!this.settings) {
                            this.openWorkbench();
                            return;
                        }
                        if (!mobileFrontend) this.openWorkbench("orgs");
                        this.openPersonDoc(org.docId);
                    },
                });
            }
        } catch (err) {
            console.warn("[LvContacts] 穿透搜索失败", err);
        }

        return results;
    }

    async listPersonFollowUps(personDocId: string) {
        /* B07：人物详情打开时读侧对账；失败上抛，由详情页显示未对账并提供重试。 */
        await reconcileFollowUpTasksFromDoc(this, personDocId);
        return listPersonFollowUps(this, personDocId);
    }

    async loadPersonNote(personDocId: string) {
        return loadPersonNote(personDocId);
    }

    async inspectLegacyPersonNote(personDocId: string) {
        return inspectLegacyPersonNote(personDocId);
    }

    async detachLegacyPersonNote(personDocId: string, expected: LegacyPersonNoteSnapshot) {
        const token = this.lifecycleToken;
        await detachLegacyPersonNote(personDocId, expected);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
    }

    async loadPersonFields(personDocId: string) {
        return loadPersonFields(personDocId);
    }

    async savePersonFields(personDocId: string, snapshot: PersonFieldsSnapshot, expected: PersonFieldsState) {
        const token = this.lifecycleToken;
        const saved = await savePersonFields(personDocId, snapshot, expected);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return saved;
    }

    async savePersonNote(personDocId: string, note: string, expected?: string) {
        const saved = await savePersonNote(personDocId, note, expected);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] });
        return saved;
    }

    async createFollowUp(personDocId: string, title: string, dueDate: string, requestId = newFollowUpRequestId()) {
        const token = this.lifecycleToken;
        const item = await createFollowUp(this, { requestId, personDocId, title, dueDate });
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        if (this.settings?.notebookId) {
            const notebookId = this.settings.notebookId;
            void this.listContacts().then((roster) => {
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
    }

    async retryCreateFollowUp(requestId: string, personDocId: string, title: string, dueDate: string) {
        if (!this.isLifecycleActive()) throw new Error("插件生命周期已结束，未重试跟进创建");
        const item = await createFollowUp(this, { requestId, personDocId, title, dueDate });
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, this.lifecycleToken);
        return item;
    }

    async setFollowUpStatus(id: string, status: "open" | "done" | "cancelled") {
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
    }

    async snoozeFollowUp(id: string, option: SnoozeOption, customDate?: string) {
        const token = this.lifecycleToken;
        const item = await snoozeFollowUp(this, id, option, customDate);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
    }

    async exportFollowUpsJson() {
        return exportFollowUpsJson(this);
    }

    async previewFollowUpsImport(text: string) {
        return previewFollowUpsImport(this, text);
    }

    async importFollowUpsJson(text: string) {
        const token = this.lifecycleToken;
        const result = await importFollowUpsJson(this, text);
        if (result.added > 0) emitDataChanged({ topics: ["people"] }, token);
        return result;
    }

    async getPersonCadence(personDocId: string) {
        return loadPersonCadence(this, personDocId);
    }

    async savePersonCadence(personDocId: string, cadence: PersonCadence | null) {
        await savePersonCadence(this, personDocId, cadence);
    }

    async dismissReminder(personDocId: string, kind: ReminderKind, until: string) {
        await dismissReminder(this, personDocId, kind, until);
    }

    async resumeReminder(personDocId: string, kind: ReminderKind) {
        await resumeReminder(this, personDocId, kind);
    }

    async loadReminderDismissals() {
        return loadReminderDismissalsStrict(this);
    }

    async listTemplates() {
        return listTemplates(this);
    }

    async saveTemplates(templates: readonly NoteTemplate[], expected: readonly NoteTemplate[]) {
        return saveTemplates(this, templates, expected);
    }

    async loadPersonTopics(personDocId: string) {
        return loadPersonTopics(this, personDocId);
    }

    async addPersonTopic(personDocId: string, text: string) {
        const token = this.lifecycleToken;
        const result = await addPersonTopic(this, personDocId, text);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async removePersonTopic(personDocId: string, topicId: string) {
        const token = this.lifecycleToken;
        const result = await removePersonTopic(this, personDocId, topicId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async removeContactToTrash(person: ContactSummary) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        await removeContactToTrash(this, this.settings, person);
        emitDataChanged({ topics: ["people"], docIds: [person.docId] }, token);
    }

    async listTrash() {
        return listTrash(this);
    }

    async restoreContactFromTrash(entryId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const result = await restoreContactFromTrash(this, this.settings, entryId);
        emitDataChanged({ topics: ["people"], docIds: [result.docId] }, token);
        return result;
    }

    async emptyTrash() {
        const token = this.lifecycleToken;
        await emptyTrash(this);
        emitDataChanged({ topics: ["people"] }, token);
    }

    async executeContactMerge(plan: import("./domain/duplicate-merge").ContactMergePlan) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return executeContactMerge(this, this.settings, plan);
    }

    async loadPersonGiftIdeas(personDocId: string) {
        return loadPersonGiftIdeas(this, personDocId);
    }

    async addPersonGiftIdea(item: import("./domain/gift-ideas").GiftIdeaItem) {
        const token = this.lifecycleToken;
        const result = await addPersonGiftIdea(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return result;
    }

    async updatePersonGiftIdea(personDocId: string, ideaId: string, patch: Partial<import("./domain/gift-ideas").GiftIdeaItem>) {
        const token = this.lifecycleToken;
        const result = await updatePersonGiftIdea(this, personDocId, ideaId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async removePersonGiftIdea(personDocId: string, ideaId: string) {
        const token = this.lifecycleToken;
        const result = await removePersonGiftIdea(this, personDocId, ideaId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async listOccasions() {
        return listOccasions(this);
    }

    async createOccasion(input: import("./services/occasions").CreateOccasionInput) {
        const token = this.lifecycleToken;
        const result = await createOccasion(this, input);
        const attendeeDocIds = input.attendees.map((a) => a.personDocId).filter(Boolean);
        emitDataChanged({ topics: ["people"], docIds: attendeeDocIds }, token);
        return result;
    }

    async deleteOccasion(occasionId: string) {
        const token = this.lifecycleToken;
        await deleteOccasion(this, occasionId);
        emitDataChanged({ topics: ["people"] }, token);
    }

    async loadPersonAnniversaries(personDocId: string) {
        return loadPersonAnniversaries(this, personDocId);
    }

    async addPersonAnniversary(item: import("./domain/anniversaries").AnniversaryItem) {
        const token = this.lifecycleToken;
        const result = await addPersonAnniversary(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return result;
    }

    async updatePersonAnniversary(personDocId: string, annivId: string, patch: Partial<import("./domain/anniversaries").AnniversaryItem>) {
        const token = this.lifecycleToken;
        const result = await updatePersonAnniversary(this, personDocId, annivId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async removePersonAnniversary(personDocId: string, annivId: string) {
        const token = this.lifecycleToken;
        const result = await removePersonAnniversary(this, personDocId, annivId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async listUpcomingAnniversaries(windowDays?: number) {
        return listUpcomingAnniversaries(this, windowDays);
    }

    /** E-43：导出单人物重要日期/纪念日为 iCalendar (.ics) 标准日历文本 */
    exportPersonAnniversariesIcs(person: import("./domain/person").ContactSummary, anniversaries?: readonly import("./domain/anniversaries").AnniversaryItem[], options?: import("./domain/ical-export").IcsExportOptions) {
        return exportPersonAnniversariesIcs(person, anniversaries, options);
    }

    /** E-43：导出全库重要日期/纪念日为全量 iCalendar (.ics) 标准日历文件 */
    async exportAllAnniversariesIcs(options?: import("./domain/ical-export").IcsExportOptions) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return exportAllAnniversariesIcs(this, this.settings, options);
    }

    async loadPersonProjects(personDocId: string) {
        return loadPersonProjects(this, personDocId);
    }

    async addPersonProject(item: import("./domain/projects").PersonProjectItem) {
        const token = this.lifecycleToken;
        const result = await addPersonProject(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return result;
    }

    async updatePersonProject(personDocId: string, projectId: string, patch: Partial<import("./domain/projects").PersonProjectItem>) {
        const token = this.lifecycleToken;
        const result = await updatePersonProject(this, personDocId, projectId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async removePersonProject(personDocId: string, projectId: string) {
        const token = this.lifecycleToken;
        const result = await removePersonProject(this, personDocId, projectId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return result;
    }

    async findCollaboratorsByProject(matcher: { title?: string; docId?: string }) {
        return findCollaboratorsByProject(this, matcher);
    }

    /** E-54：会客拜访行程备忘与准备清单 */
    async loadPersonItineraries(personDocId: string) {
        return loadPersonItineraries(this, personDocId);
    }

    async savePersonItinerary(item: import("./domain/itineraries").PersonItineraryItem) {
        const token = this.lifecycleToken;
        const res = await savePersonItinerary(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    }

    async removePersonItinerary(personDocId: string, itineraryId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonItinerary(this, personDocId, itineraryId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    async togglePersonItineraryChecklist(personDocId: string, itineraryId: string, checklistId: string) {
        const token = this.lifecycleToken;
        const res = await togglePersonItineraryChecklist(this, personDocId, itineraryId, checklistId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    /** E-38：人物家庭与重要亲属关系 */
    async loadPersonKinships(personDocId: string) {
        return loadPersonKinships(this, personDocId);
    }

    async addPersonKinship(item: import("./domain/kinship").KinshipMemberItem) {
        const token = this.lifecycleToken;
        const res = await addPersonKinship(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    }

    async removePersonKinship(personDocId: string, memberId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonKinship(this, personDocId, memberId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    /** E-39：双向承诺与信诺履约追踪（Mutual Promises & Commitments） */
    async loadPersonPromises(personDocId: string) {
        return loadPersonPromises(this, personDocId);
    }

    async addPersonPromise(item: import("./domain/promises").PersonPromiseItem) {
        const token = this.lifecycleToken;
        const res = await addPersonPromise(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    }

    async updatePersonPromise(personDocId: string, promiseId: string, patch: Partial<import("./domain/promises").PersonPromiseItem>) {
        const token = this.lifecycleToken;
        const res = await updatePersonPromise(this, personDocId, promiseId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    async removePersonPromise(personDocId: string, promiseId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonPromise(this, personDocId, promiseId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    /** E-40：交往生命周期阶段与历程演进 */
    async loadPersonLifecycleStage(personDocId: string) {
        return loadPersonLifecycleStage(this, personDocId);
    }

    async updatePersonLifecycleStage(personDocId: string, stage: import("./domain/lifecycle-stage").RelationshipStageKey, dateStr?: string, note?: string) {
        const token = this.lifecycleToken;
        const res = await updatePersonLifecycleStage(this, personDocId, stage, dateStr, note);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    async loadAllLifecycleStages() {
        return loadAllLifecycleStages(this);
    }

    async batchUpdatePersonLifecycleStages(
        personDocIds: readonly string[],
        stage: import("./domain/lifecycle-stage").RelationshipStageKey,
        dateStr?: string,
        note?: string,
    ) {
        const token = this.lifecycleToken;
        const res = await batchUpdatePersonLifecycleStages(this, personDocIds, stage, dateStr, note);
        emitDataChanged({ topics: ["people"], docIds: [...personDocIds] }, token);
        return res;
    }

    async loadAllCadences() {
        return loadCadenceMapStrict(this);
    }

    /** E-42：联系人自管闪念速记便签板 */
    async loadPersonScratchpads(personDocId: string) {
        return loadPersonScratchpads(this, personDocId);
    }

    async savePersonScratchpad(item: import("./domain/person-scratchpad").PersonScratchpadItem) {
        const token = this.lifecycleToken;
        const res = await savePersonScratchpad(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    }

    async updatePersonScratchpad(personDocId: string, noteId: string, patch: Partial<import("./domain/person-scratchpad").PersonScratchpadItem>) {
        const token = this.lifecycleToken;
        const res = await updatePersonScratchpad(this, personDocId, noteId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    async removePersonScratchpad(personDocId: string, noteId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonScratchpad(this, personDocId, noteId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    /** E-49：联系人自管社交偏好与交往忌口档案 */
    async loadPersonSocialPreferences(personDocId: string) {
        return loadPersonSocialPreferences(this, personDocId);
    }

    async addPersonSocialPreference(item: import("./domain/social-preferences").PersonSocialPreferenceItem) {
        const token = this.lifecycleToken;
        const res = await addPersonSocialPreference(this, item);
        emitDataChanged({ topics: ["people"], docIds: [item.personDocId] }, token);
        return res;
    }

    async updatePersonSocialPreference(personDocId: string, prefId: string, patch: Partial<import("./domain/social-preferences").PersonSocialPreferenceItem>) {
        const token = this.lifecycleToken;
        const res = await updatePersonSocialPreference(this, personDocId, prefId, patch);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    async removePersonSocialPreference(personDocId: string, prefId: string) {
        const token = this.lifecycleToken;
        const res = await removePersonSocialPreference(this, personDocId, prefId);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
        return res;
    }

    /** Monica 对标：初识溯源与引荐人档案（How We Met / Introduced by） */
    async loadPersonOrigin(personDocId: string) {
        return loadPersonOrigin(this, personDocId);
    }

    async savePersonOrigin(origin: PersonOrigin) {
        const token = this.lifecycleToken;
        const res = await savePersonOrigin(this, origin);
        emitDataChanged({ topics: ["people"], docIds: [origin.personDocId] }, token);
        return res;
    }

    async loadAllPersonOrigins() {
        return loadAllPersonOrigins(this);
    }

    /** Simple-PRM / Monica 对标：向小驴管家输出到期问候提醒 */
    async sendGreetingReminderToHome(personName: string, daysOverdue: number): Promise<boolean> {
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
    }

    /** IDEA-17：将重要相识/相聚纪念日及生日自动同步至小驴管家日历日程 */
    async syncAnniversariesToHome(title: string, dueDate: string): Promise<boolean> {
        return callBridge<HomeBridgeApi, boolean>(
            "home",
            "memo",
            async (home) => {
                await home.addMemo(`[人脉纪念日] ${title}`, dueDate);
                return true;
            },
            () => false,
        );
    }

    /** RF-09 / Issue #135：谈资备忘与关键事实画像（Person Facts & Quotes） */
    async loadPersonFacts(personDocId: string) {
        return loadPersonFactsFromDoc(personDocId);
    }

    async savePersonFacts(personDocId: string, items: readonly import("./domain/doc-section").PersonFactItem[]) {
        const token = this.lifecycleToken;
        await savePersonFactsToDoc(personDocId, items);
        emitDataChanged({ topics: ["people"], docIds: [personDocId] }, token);
    }

    /** RF-10 / 3.2：潜在人脉关联智能挖掘与建立 */
    async discoverPotentialConnections(options?: import("./domain/connections-discovery").DiscoverConnectionsOptions) {
        if (!this.settings) return [];
        return discoverConnections(this, this.settings, options);
    }

    async establishPotentialConnection(firstPersonDocId: string, secondPersonDocId: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const people = await this.listContacts();
        const p1 = people.find((p) => p.docId === firstPersonDocId);
        const p2 = people.find((p) => p.docId === secondPersonDocId);
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
                                title: "撤销关系失败",
                                message: `未能撤销关联关系：${err instanceof Error ? err.message : String(err)}`,
                                level: "error",
                            });
                        }
                    },
                },
            ],
        });
        return report;
    }

    /**
     * 跟进日程与定期联络到期卡片提醒 (Epoch 7 Standard)
     * 支持【去记录】、【稍后提醒】与今日免打扰
     */
    async checkFollowUpReminders(force = false): Promise<{ delivered: boolean; count: number; cardId?: string }> {
        if (!this.settings) return { delivered: false, count: 0 };
        if (!force && lvNotify.isMutedToday("contacts-followup")) {
            return { delivered: false, count: 0 };
        }
        try {
            const data = await this.loadDashboard({ birthdayWindowDays: 7 });
            const dueFollowUps = (data.followUps ?? []).filter(
                (f) => f.item.status === "open" && (f.bucket === "today" || f.bucket === "overdue")
            );
            const overdueCadences = (data.actions ?? []).filter(
                (a) => a.bucket === "overdue" && a.reasons.some((r) => r.kind === "stale")
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
                                    void this.listContacts().then((roster) => {
                                        const person = roster.find((p) => p.docId === firstDocId);
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
    }

    /**
     * 定期扫描联系人跟进日程 (Phase 2 统一心跳调度出口)
     */
    async checkFollowups(force = false): Promise<{ delivered: boolean; count: number; cardId?: string }> {
        return this.checkFollowUpReminders(force);
    }

    async buildReviewReport(from: string, to: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return buildReview(this, this.settings, { from, to });
    }

    /** RF-03：将交往回顾沉淀为思源实体文档 */
    async createReviewReportDoc(range: import("./domain/review-report").ReviewRange) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return exportReviewReportToDoc(this, this.settings, range);
    }

    /** 周度人脉交往简报（Weekly Social Review）：沉淀为思源实体文档 */
    async createWeeklyDigestDoc(options?: import("./services/weekly-digest").CreateWeeklyDigestDocOptions) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createWeeklyDigestDoc(this, this.settings, options);
    }

    /** 人脉记忆复习闪卡（Spaced Repetition Flashcards）：沉淀为思源实体文档 */
    async createPersonFlashcardsDoc(
        person: import("./domain/person").ContactSummary,
        facts?: readonly import("./domain/doc-section").PersonFactItem[],
        topics?: readonly import("./domain/topics").PersonTopicItem[],
        options?: import("./services/flashcards").CreateFlashcardsDocOptions,
    ) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createPersonFlashcardsDoc(this, this.settings, person, facts, topics, options);
    }

    /** 批量联系人常识复习闪卡（Batch Flashcards Deck）：沉淀为思源实体文档 */
    async createBatchFlashcardsDoc(
        people: readonly import("./domain/person").ContactSummary[],
        options?: import("./services/flashcards").CreateBatchFlashcardsDocOptions,
    ) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createBatchFlashcardsDoc(this, this.settings, people, options);
    }

    /** 会面准备简报：沉淀为思源实体文档 */
    async createBriefingDoc(input: import("./domain/briefing-export").BriefingExportInput, dateStr?: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createBriefingDoc(this, this.settings, input, dateStr);
    }

    /** E-46：人脉交往编年史里程碑实体文档生成 */
    async createMilestonesDoc(person: import("./domain/person").ContactSummary, milestones: readonly import("./domain/timeline-milestones").MilestoneEvent[]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createMilestonesDoc(this, this.settings, person, milestones);
    }

    async loadExchangesSummary() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadExchangesSummary(this, this.settings);
    }

    async createExchangesLedgerDoc(options?: { title?: string }) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return createExchangesLedgerDoc(this, this.settings, options);
    }

    /** E-50：会前速查与偏好雷区大盘 */
    async loadAllPreMeetingDossiers() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadAllPreMeetingDossiers(this, this.settings);
    }

    /** E-53：关系降温预警与破冰重联服务 */
    async loadCoolingRadarSummary() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadCoolingRadarSummary(this, this.settings);
    }

    async loadExportSummary() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return loadExportSummary(this, this.settings);
    }

    async exportRosterVcf() {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return exportVcfText(this.settings);
    }

    async previewInteractionImport(text: string) {
        return previewInteractionImport(this, text);
    }

    async previewInteractionImportDiff(text: string) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        return previewInteractionImportDiff(this, this.settings, text);
    }

    async importInteractionJson(text: string) {
        return importInteractionJson(this, text);
    }

    async repairFieldMap(patch: Parameters<typeof repairFieldMap>[2]) {
        if (!this.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.lifecycleToken;
        const settings = await repairFieldMap(this, this.settings, patch, () => this.isLifecycleActive(token));
        if (this.isLifecycleActive(token)) this.settings = settings;
        return settings;
    }

    async loadViewPreferences() {
        return this.preferenceRequests.load();
    }

    async saveViewPreferences(preferences: ViewPreferences, baseline: ViewPreferences = this.viewPreferences) {
        return this.preferenceRequests.save(preferences, baseline);
    }

    openHostDoc() {
        if (!this.isLifecycleActive() || !this.settings) return;
        return this.openDoc(this.settings.hostDocId);
    }

    openDoc(docId: string, options?: import("./libs/open-document").OpenDocOptions) {
        if (!this.isLifecycleActive() || !docId) return;
        // 手机端：打开具体文档后主动关闭全屏工作台弹窗，让底层打开的人物文档清晰呈现给用户
        if (this.isMobile && this.workbenchDialog) {
            try {
                this.closeWorkbenchDialog();
            } catch { /* soft */ }
        }
        const opening = openSiYuanDocument(this.app, docId, options);
        // 按钮旧入口可能没有 await：旁路处理避免未处理拒绝，原 Promise 仍供图谱等调用方捕获。
        void opening.catch((error: unknown) => {
            if (!this.isLifecycleActive()) return;
            notify(`打开文档失败，请重试：${error instanceof Error ? error.message : String(error)}`, 6000, "error");
        });
        return opening;
    }

    openPersonDoc(docId: string, options?: import("./libs/open-document").OpenDocOptions) {
        return this.openDoc(docId, options);
    }

    async openDocMenu(docId: string, event: MouseEvent): Promise<boolean> {
        if (!this.isLifecycleActive() || !docId) return false;
        return openDocumentContextMenu(docId, event, this.settings?.notebookId);
    }

    openSetting(): void {
        this.openSettings();
    }

    openSettings() {
        if (!this.settings) {
            notify("请先完成人脉工作空间初始化", 3000);
            return;
        }
        this.openWorkbench("settings");
    }

    private openWorkbenchDialog(initialView?: WorkbenchView) {
        if (!this.isLifecycleActive()) return;
        if (this.workbenchDialog) {
            if (initialView) {
                window.clearTimeout(this.viewRequestTimer);
                const epoch = this.preferencesEpoch;
                const lifecycleToken = this.lifecycleToken;
                const dialogToken = this.workbenchDialogToken;
                this.viewRequestTimer = window.setTimeout(() => {
                    if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || epoch !== this.preferencesEpoch
                        || !dialogToken?.isAlive() || this.workbenchDialogToken !== dialogToken) return;
                    this.viewRequestTimer = 0;
                    window.dispatchEvent(new CustomEvent("lvct-workbench-view", { detail: { view: initialView, facade: this, token: dialogToken } }));
                }, 0);
            }
            return;
        }
        const dialogToken = createLifecycleToken(this.lifecycleToken);
        this.workbenchDialogToken = dialogToken;
        let unbindMobileViewport: (() => void) | null = null;
        this.workbenchDialog = new Dialog({
            title: this.i18n.tabTitle ?? "小驴人脉",
            content: '<div class="lvct-dialog-root" style="height:100%;"></div>',
            width: "100vw",
            height: "100%",
            destroyCallback: () => {
                unbindMobileViewport?.();
                unbindMobileViewport = null;
                if (this.workbenchDialogToken !== dialogToken) return;
                dialogToken.invalidate();
                window.clearTimeout(this.viewRequestTimer);
                this.viewRequestTimer = 0;
                if (this.dialogInstance) {
                    unmount(this.dialogInstance);
                    this.dialogInstance = null;
                }
                this.workbenchDialog = null;
                this.workbenchDialogToken = null;
            },
        });
        const dialogContainer = this.workbenchDialog.element.querySelector<HTMLElement>(".b3-dialog__container");
        if (typeof window !== "undefined") {
            const vv = window.visualViewport;
            const mql = window.matchMedia?.("(max-width: 680px)");
            let baselineHeight = Math.max(window.innerHeight || 0, Math.round(vv?.height ?? 0));
            const syncMobileDialog = () => {
                const isMobileOrNarrow = Boolean(this.isMobile || lvLaunchpad.isMobileFrontend() || mql?.matches);
                dialogContainer?.classList.toggle("lvct-mobile-dialog", isMobileOrNarrow);
                const innerH = window.innerHeight || 0;
                const rawH = vv ? vv.height : innerH;
                const vvH = Math.max(180, Math.round(rawH || innerH));
                if (vvH > baselineHeight) baselineHeight = vvH;
                this.workbenchDialog?.element.style.setProperty("--lvct-vv-h", `${vvH}px`);
                dialogContainer?.style.setProperty("--lvct-vv-h", `${vvH}px`);
                const kbOpen = Math.max(baselineHeight, innerH) - vvH > 110;
                dialogContainer?.classList.toggle("lvct-vv-keyboard-open", kbOpen);
            };
            syncMobileDialog();
            vv?.addEventListener("resize", syncMobileDialog);
            vv?.addEventListener("scroll", syncMobileDialog, { passive: true });
            window.addEventListener("resize", syncMobileDialog);
            mql?.addEventListener?.("change", syncMobileDialog);
            unbindMobileViewport = () => {
                vv?.removeEventListener("resize", syncMobileDialog);
                vv?.removeEventListener("scroll", syncMobileDialog);
                window.removeEventListener("resize", syncMobileDialog);
                mql?.removeEventListener?.("change", syncMobileDialog);
            };
        } else if (this.isMobile || lvLaunchpad.isMobileFrontend()) {
            dialogContainer?.classList.add("lvct-mobile-dialog");
        }
        this.workbenchDialog.element.addEventListener("click", (e) => {
            if (e.target === this.workbenchDialog?.element || (e.target as HTMLElement).classList?.contains("b3-dialog__scrim")) {
                this.workbenchDialog?.destroy();
            }
        });
        const target = this.workbenchDialog.element.querySelector<HTMLElement>(".lvct-dialog-root");
        // Esc-only 关闭面审计：移动端补充可见关闭按钮（思源手机端 Dialog 无关闭钮、手机无 Esc 键）
        const header = this.workbenchDialog.element.querySelector(".b3-dialog__header");
        if (header && !header.querySelector(".b3-dialog__close, .lvct-mobile-dialog-close")) {
            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.className = "b3-dialog__close lvct-mobile-dialog-close";
            closeBtn.setAttribute("aria-label", "关闭工作台");
            closeBtn.innerHTML = "✕";
            closeBtn.style.cssText = "display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:18px;border:none;background:transparent;color:var(--b3-theme-on-surface,#5f6368);cursor:pointer;touch-action:manipulation;";
            closeBtn.onclick = () => this.workbenchDialog?.destroy();
            header.appendChild(closeBtn);
        }
        try {
            if (!target) throw new Error("dialog 容器缺失");
            void this.mountWorkbenchRoot(target, dialogToken, initialView,
                () => dialogToken.isAlive() && this.workbenchDialogToken === dialogToken,
                (instance) => { this.dialogInstance = instance; });
        } catch (error) {
            this.workbenchDialog?.destroy();
            throw error;
        }
    }

    private async mountWorkbenchRoot(
        target: HTMLElement,
        token: LifecycleToken,
        initialView: WorkbenchView | undefined,
        isCurrent: () => boolean,
        onMounted: (instance: ReturnType<typeof mount>) => void,
    ): Promise<void> {
        const loadState = document.createElement("div");
        loadState.className = "lvct-workbench-load-state";
        loadState.setAttribute("role", "status");
        loadState.textContent = "正在载入小驴人脉…";
        target.replaceChildren(loadState);
        try {
            if (!isCurrent()) return;
            target.replaceChildren();
            onMounted(mount(WorkbenchRoot, {
                target,
                props: { facade: this, initialView },
                context: new Map([[LIFECYCLE_CONTEXT, token]]),
            }));
        } catch (error) {
            if (!isCurrent()) return;
            loadState.textContent = `工作台载入失败：${error instanceof Error ? error.message : String(error)}`;
            loadState.setAttribute("role", "alert");
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "b3-button b3-button--outline";
            retry.textContent = "重试载入";
            retry.onclick = () => {
                retry.disabled = true;
                void this.mountWorkbenchRoot(target, token, initialView, isCurrent, onMounted);
            };
            loadState.append(document.createTextNode(" "), retry);
        }
    }
}
