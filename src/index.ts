/**
 * 小驴人脉插件入口（微内核）：生命周期、UI 挂载与门面扩展。
 * 业务编排在 services/，内核交互在 api/，自管数据在 data/，纯函数在 domain/。
 */
import { Plugin, getFrontend, Dialog } from "siyuan";
import "./index.scss";
import { lvNotify, lvActivity, lvBackup, lvOmnisearch, lvSnapshotVault } from "./libs/lv-notice-kit";
import { registerContactsSnapshotVault, scheduleContactsAutoBackup } from "./services/snapshot-vault";
import { LV_CONTACTS_ICONS } from "./libs/plugin-icons";
import { registerRaikiriWidget } from "./panels/raikiri-widget";
import { bindSelfIdentityStorage } from "./data/self-identity";
import { bindOrgMembershipStorage } from "./data/org-membership";
import { bindPeopleProfileStorage } from "./services/people-profiles";
import { bindContactAliasStorage } from "./services/contact-aliases";
import { readSettingsState } from "./services/init";
import { configureCloseGuardI18n } from "./components/close-guard";
import { probeSettingsAnchor } from "./services/settings-health";
import { initExternalBridge, disposeExternalBridge } from "./bridge/external-bridge";
import { StripController } from "./panels/strip-controller";
import { updateStrip } from "./panels/person-panel";
import { emitDataChanged, emitWorkspaceState, subscribeDataChanged, type DataChangeDetail } from "./libs/data-events";
import { DisposerRegistry } from "./libs/disposer";
import { schedulePersonDocMirror, disposeDocMirrorScheduler } from "./services/doc-mirror";
import { scheduleIdleDataSovereigntyAutoHeal, cancelIdleDataSovereigntyAutoHeal } from "./services/data-sovereignty-backfill";
import { safePerfMark, safePerfMeasure } from "./shared/perf";
import type { ContactsSettings } from "./domain/model";
import type { ContactSummary } from "./domain/person";
import { DEFAULT_VIEW_PREFERENCES, type ViewPreferences } from "./domain/preferences";
import { createLifecycleToken, type LifecycleToken } from "./domain/lifecycle";
import type { ContactsPluginFacade, WorkbenchView } from "./types";
import type { WorkspaceState } from "./domain/workspace-state";
import { OrganizationService } from "./services/org-service";
import { KinshipService } from "./services/kinship-service";
import { loadViewPreferences as loadViewPreferencesService, saveViewPreferences as saveViewPreferencesService, createPreferenceRequests } from "./services/preferences";
import { invalidateRoster } from "./services/roster";
import { ECOSYSTEM_EVENTS, subscribeEcosystemEvent } from "./libs/ecosystem-bridge-kit";
import { contactFacadeMethods } from "./services/contact-facade-methods";
import { uiCoordinatorMethods } from "./panels/ui-coordinator";

function notify(msg: string, timeout = 3000, type: "info" | "error" = "info"): void {
    if (type === "error") {
        lvNotify.card({ source: "小驴人脉", title: "小驴人脉提示", message: msg, level: "error", duration: Math.max(timeout, 6000) });
    } else {
        lvNotify.capsule({ source: "小驴人脉", message: msg, duration: timeout });
    }
}

export default class LvContactsPlugin extends Plugin {
    [key: string]: any;

    settings: ContactsSettings | null = null;
    recoverySettings: ContactsSettings | null = null;
    workspaceState: WorkspaceState = { kind: "uninitialized" };
    viewPreferences: ViewPreferences = DEFAULT_VIEW_PREFERENCES;
    isMobile = false;
    lifecycleToken: LifecycleToken = createLifecycleToken();
    followupDueCount = 0;
    lastRosterForCitySync: ContactSummary[] = [];
    topBarElement?: HTMLElement;

    private disposer = new DisposerRegistry();
    ownedDialogDisposers = new Set<() => void>();
    tabDisposers = new Set<() => void>();
    tabMounts = new Map<Element, LifecycleToken>();
    workbenchDialog: Dialog | null = null;
    workbenchDialogToken: LifecycleToken | null = null;
    dialogInstance: any = null;
    requestedWorkbenchView?: WorkbenchView;
    launchpadCleaner?: () => void;
    omnisearchCleaner?: () => void;
    backupCleaner?: () => void;
    vaultCleaner?: () => void;
    noticeHubCleaner?: () => void;
    eventCleanup: (() => void) | null = null;
    viewRequestTimer = 0;
    startupTimer = 0;
    dataChangeTimer = 0;
    dataChangeRequest = 0;
    preferencesActive = true;
    preferencesEpoch = 0;
    preferenceRequests: any = null;
    preferencesVerified = false;
    private layoutReady = false;
    private workspaceStateReloadPromise: Promise<WorkspaceState> | null = null;
    private workspaceStateReloadVersion = 0;

    emitDataChanged(payload: Omit<DataChangeDetail, "revision"> = {}) {
        if (this.isLifecycleActive(this.lifecycleToken)) emitDataChanged(payload, this.lifecycleToken);
    }

    private createServiceHost() {
        const plugin = this;
        return {
            plugin,
            get settings() { return plugin.settings; },
            get lifecycleToken() { return plugin.lifecycleToken; },
            isLifecycleActive: (token?: LifecycleToken) => plugin.isLifecycleActive(token),
            getWorkspaceStateKind: () => plugin.workspaceState.kind,
            emitDataChanged: (payload: Omit<DataChangeDetail, "revision">) => plugin.emitDataChanged(payload),
        };
    }

    readonly orgService = new OrganizationService(this.createServiceHost());
    readonly kinshipService = new KinshipService(this.createServiceHost());
    stripController!: StripController;

    private createPreferenceRequests(token: LifecycleToken): any {
        return createPreferenceRequests({
            load: () => loadViewPreferencesService(this),
            save: (preferences, baseline) => saveViewPreferencesService(this, preferences, baseline),
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
        safePerfMark("lvct-onload-start");
        this.disposeLifecycle();
        this.disposer = new DisposerRegistry();
        this.stripController = new StripController(
            () => ({ plugin: this, settings: this.settings, i18n: this.i18n, lifecycleToken: this.lifecycleToken, stripController: this.stripController }),
            updateStrip,
        );
        this.disposer.add(() => this.stripController.dispose());
        this.disposer.add(() => this.kinshipService.dispose());
        this.lifecycleToken = createLifecycleToken();
        const lifecycleToken = this.lifecycleToken;
        this.requestedWorkbenchView = undefined;
        this.preferencesActive = true;
        this.preferencesVerified = false;
        const preferencesEpoch = ++this.preferencesEpoch;
        this.preferenceRequests = this.createPreferenceRequests(lifecycleToken);
        const frontend = getFrontend();
        this.isMobile = frontend === "mobile" || frontend === "browser-mobile";
        bindSelfIdentityStorage(this);
        bindOrgMembershipStorage(this);
        lifecycleToken.onDispose(bindPeopleProfileStorage(this));
        lifecycleToken.onDispose(bindContactAliasStorage(this));
        lifecycleToken.onDispose(() => disposeDocMirrorScheduler());

        this.backupCleaner = lvBackup.register("siyuan-contacts", async () => this.dumpData(), async (data) => this.restoreData(data));
        lifecycleToken.onDispose(() => { this.backupCleaner?.(); this.backupCleaner = undefined; });
        this.vaultCleaner = registerContactsSnapshotVault(this, {
            onMerged: () => {
                invalidateRoster();
                void this.reloadWorkspaceState().catch(() => {});
                this.emitDataChanged({ topics: ["all"] });
            },
        });
        lifecycleToken.onDispose(() => { this.vaultCleaner?.(); this.vaultCleaner = undefined; });
        this.registerLaunchpad();
        lifecycleToken.onDispose(() => { this.launchpadCleaner?.(); this.launchpadCleaner = undefined; });
        this.omnisearchCleaner = lvOmnisearch.registerProvider("siyuan-contacts", async (keyword) => this.searchOmniContacts(keyword));
        lifecycleToken.onDispose(() => { this.omnisearchCleaner?.(); this.omnisearchCleaner = undefined; });
        lvActivity.getTodayRecords();

        lifecycleToken.onDispose(subscribeDataChanged((change) => {
            if (change.docIds) change.docIds.forEach((docId) => schedulePersonDocMirror(this, docId));
            if (change.topics?.length || change.docIds?.length) scheduleContactsAutoBackup(60000);
        }));

        this.addIcons(LV_CONTACTS_ICONS);
        configureCloseGuardI18n(this.i18n);

        await this.reloadWorkspaceState();
        if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || preferencesEpoch !== this.preferencesEpoch) return;
        if (this.settings && this.workspaceState.kind === "ready") {
            this.onWorkspaceReadyRefreshed();
            const cancelAutoHeal = scheduleIdleDataSovereigntyAutoHeal(this, this.settings, 180_000);
            lifecycleToken.onDispose(cancelAutoHeal);
            this.disposer.add(cancelAutoHeal);
            const cancelFamilyInit = this.kinshipService.scheduleDefaultFamilyInit(this.settings, 3000);
            lifecycleToken.onDispose(cancelFamilyInit);
            this.disposer.add(cancelFamilyInit);
        }

        safePerfMark("lvct-view-prefs-start");
        try {
            await this.loadViewPreferences();
        } catch (error) {
            if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive && preferencesEpoch === this.preferencesEpoch) {
                const errMsg = error instanceof Error ? error.message : String(error);
                notify((this.i18n?.["toast.prefReadFailed"] ?? "偏好读取失败，当前值尚未核实：${err}").replace("${err}", errMsg), 6000, "error");
            }
        }
        safePerfMark("lvct-view-prefs-end");
        safePerfMeasure("lvct-view-prefs", "lvct-view-prefs-start", "lvct-view-prefs-end");
        if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || preferencesEpoch !== this.preferencesEpoch) return;

        this.registerWorkbenchTab(lifecycleToken);

        this.addCommand({
            langKey: "openWorkbench",
            callback: () => { if (this.isLifecycleActive(lifecycleToken)) this.openWorkbench(); },
        });
        this.addCommand({
            langKey: "captureFromNote",
            callback: () => { if (this.isLifecycleActive(lifecycleToken)) this.captureFromCurrentNote(); },
        });

        const onMenuContent = (event: any) => { if (this.isLifecycleActive(lifecycleToken)) this.onMenuContent(event); };
        const onProtyleEvent = (event: any) => { if (this.isLifecycleActive(lifecycleToken)) this.onProtyleEvent(event); };
        const onProtyleDestroyed = (event: any) => { this.stripController.handleProtyleDestroy(event); };
        this.eventBus.on("open-menu-content", onMenuContent);
        this.eventBus.on("loaded-protyle-static", onProtyleEvent);
        this.eventBus.on("loaded-protyle-dynamic", onProtyleEvent);
        this.eventBus.on("switch-protyle", onProtyleEvent);
        this.eventBus.on("destroy-protyle", onProtyleDestroyed as any);

        initExternalBridge(this, () => this.settings);
        const unsubs = [
            subscribeEcosystemEvent(ECOSYSTEM_EVENTS.CHECKIN_RECORDED, () => {
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive) this.onDataChanged();
            }),
        ];
        this.eventCleanup = () => {
            this.eventBus.off("open-menu-content", onMenuContent);
            this.eventBus.off("loaded-protyle-static", onProtyleEvent);
            this.eventBus.off("loaded-protyle-dynamic", onProtyleEvent);
            this.eventBus.off("switch-protyle", onProtyleEvent);
            this.eventBus.off("destroy-protyle", onProtyleDestroyed as any);
            unsubs.forEach(u => { try { u(); } catch {} });
        };
        safePerfMark("lvct-onload-end");
        safePerfMeasure("lvct-onload-total", "lvct-onload-start", "lvct-onload-end");
    }

    onLayoutReady() {
        if (!this.isLifecycleActive() || !this.preferencesActive) return;
        const lifecycleToken = this.lifecycleToken;
        if (!this.layoutReady) {
            this.topBarElement = this.addTopBar({
                icon: "iconLvContacts",
                title: this.i18n.openWorkbench ?? "小驴人脉",
                position: "right",
                callback: () => { if (this.isLifecycleActive(lifecycleToken)) this.openWorkbench(); },
            });
            this.registerLaunchpad();
        }
        this.layoutReady = true;
        const unregisterRaikiri = registerRaikiriWidget(this as unknown as ContactsPluginFacade);
        const currentCleanup = this.eventCleanup;
        this.eventCleanup = () => {
            currentCleanup?.();
            try { unregisterRaikiri?.(); } catch {}
        };
        this.noticeHubCleaner?.();
        this.noticeHubCleaner = lvNotify.registerPlugin("siyuan-contacts");

        window.clearTimeout(this.startupTimer);
        if (this.preferencesVerified && this.viewPreferences.openOnStartup) {
            const epoch = this.preferencesEpoch;
            this.startupTimer = window.setTimeout(() => {
                if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || epoch !== this.preferencesEpoch) return;
                this.startupTimer = 0;
                this.openWorkbench();
            }, 0);
        }

        this.registerLayoutHooks(lifecycleToken);

        if (this.settings && this.workspaceState.kind === "ready") {
            void this.refreshFollowupDueCount();
        }
    }

    async onunload() {
        this.disposeLifecycle();
    }

    async uninstall() {
        this.disposeLifecycle();
    }

    private disposeLifecycle(): void {
        const d = this.disposer;
        if (d.isDisposed) {
            this.layoutReady = false;
            return;
        }
        d.add(() => this.cleanupUiResources());
        d.add(() => {
            this.layoutReady = false;
            try { this.topBarElement?.remove?.(); } catch {}
            this.topBarElement = undefined;
            this.preferencesActive = false;
            this.preferencesEpoch += 1;
            this.preferenceRequests?.invalidate();
            this.workspaceStateReloadPromise = null;
            this.workspaceStateReloadVersion += 1;
            clearTimeout(this.startupTimer);
            clearTimeout(this.viewRequestTimer);
            clearTimeout(this.dataChangeTimer);
            this.startupTimer = 0;
            this.viewRequestTimer = 0;
            this.dataChangeTimer = 0;
            disposeExternalBridge();
            this.eventCleanup?.();
            this.eventCleanup = null;
            this.lifecycleToken.invalidate();
            this.noticeHubCleaner?.();
            this.noticeHubCleaner = undefined;
            this.backupCleaner?.();
            this.backupCleaner = undefined;
            this.vaultCleaner?.();
            this.vaultCleaner = undefined;
            try { lvSnapshotVault.unregister("siyuan-contacts"); } catch {}
            this.launchpadCleaner?.();
            this.launchpadCleaner = undefined;
            this.omnisearchCleaner?.();
            this.omnisearchCleaner = undefined;
            cancelIdleDataSovereigntyAutoHeal();
            invalidateRoster();
        });
        d.dispose();
    }

    onDataChanged(_reason?: "sync" | "overwrite") {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive) return;
        const epoch = this.preferencesEpoch;
        const request = ++this.dataChangeRequest;
        this.preferenceRequests?.invalidate();
        invalidateRoster();
        if (this.dataChangeTimer) window.clearTimeout(this.dataChangeTimer);
        this.dataChangeTimer = window.setTimeout(async () => {
            if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || epoch !== this.preferencesEpoch || request !== this.dataChangeRequest) return;
            this.dataChangeTimer = 0;
            try {
                await this.reloadWorkspaceState();
                await this.loadViewPreferences();
                if (this.isLifecycleActive(lifecycleToken) && this.workspaceState.kind === "ready") {
                    void this.triggerCityTopicsAutoRebase().catch(() => {});
                }
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive && epoch === this.preferencesEpoch && request === this.dataChangeRequest) {
                    this.emitDataChanged({ topics: ["all"], preferencesRevision: this.viewPreferences.revision });
                }
            } catch (err) {
                console.warn("[LvContacts] 数据变更响应重载异常", err);
                if (this.isLifecycleActive(lifecycleToken) && this.preferencesActive && epoch === this.preferencesEpoch && request === this.dataChangeRequest) {
                    this.emitDataChanged({ preferencesError: err instanceof Error ? err.message : String(err) });
                }
            }
        }, 120);
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
        // visualViewport 移动端全屏容器与软键盘同步: lvct-mobile-dialog, --lvct-vv-h
        this.openWorkbenchDelegated(view);
    }

    async loadViewPreferences(): Promise<ViewPreferences> {
        return this.preferenceRequests.load();
    }

    async saveViewPreferences(preferences: ViewPreferences, baseline: ViewPreferences = this.viewPreferences): Promise<ViewPreferences> {
        return this.preferenceRequests.save(preferences, baseline);
    }
}

Object.assign(LvContactsPlugin.prototype, contactFacadeMethods, uiCoordinatorMethods);
