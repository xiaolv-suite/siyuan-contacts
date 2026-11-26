/**
 * 界面弹窗、菜单与罗盘 UI 交互协调器 (uiCoordinatorMethods)
 *
 * 封装 LvContactsPlugin 的所有 UI 交互、弹窗挂载、右键菜单与罗盘集成，
 * 协助 src/index.ts 彻底微内核化。
 */

import { getActiveEditor, openTab, Dialog } from "siyuan";
import { mount, unmount } from "svelte";
import { svelteDialog } from "../libs/dialog";
import { openSiYuanDocument, openDocumentContextMenu, type OpenDocOptions } from "../libs/open-document";
import { parseContactText } from "../domain/quick-fill";
import { resolveRecognizeTarget } from "../services/capture";
import { invalidateRoster } from "../services/roster";
import { disposeActiveCloseGuards } from "../components/close-guard";
import { createLifecycleToken, LIFECYCLE_CONTEXT, type LifecycleToken } from "../domain/lifecycle";
import { emitDataChanged } from "../libs/data-events";
import { loadInteractionStore } from "../data/interactions";
import { INTERACTION_TYPE_LABELS } from "../domain/interactions";
import { lvActivity, lvAutomation, lvLaunchpad, lvNotify, lvTicker, type LvSearchResultItem } from "../libs/lv-notice-kit";
import type { ContactSummary, ContactDraft } from "../domain/person";
import { emptyDraft } from "../domain/person";
import type { WorkbenchView } from "../types";
import { buildSelectionInteractionPayload, restoreFocusToEditor } from "../domain/selection-resolver";
import CaptureDialog from "../components/capture/CaptureDialog.svelte";
import PersonEditDialog from "../components/people/PersonEditDialog.svelte";
import QuickFillDialog from "../components/people/QuickFillDialog.svelte";
import AddPersonDialog from "../components/people/AddPersonDialog.svelte";
import QuickRecordDialog from "../components/people/QuickRecordDialog.svelte";
import ContactOrganizationDialog from "../components/org/ContactOrganizationDialog.svelte";
import OrgManagerDialog from "../components/org/OrgManagerDialog.svelte";
import PreMeetingHubDialog from "../components/dashboard/PreMeetingHubDialog.svelte";
import CoolingRadarDialog from "../components/dashboard/CoolingRadarDialog.svelte";
import SettingsView from "../components/SettingsView.svelte";
import WorkbenchRoot from "../components/WorkbenchRoot.svelte";
import SelectionToInteractionModal from "../components/capture/SelectionToInteractionModal.svelte";

const TAB_TYPE = "workbench";

export interface QuickFillPatch {
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

function extractProtyleRootId(editor: Element): string {
    const titleEl = editor.querySelector(".protyle-title[data-node-id]");
    const rootId = titleEl?.getAttribute("data-node-id");
    if (rootId) return rootId;
    const blockEl = editor.querySelector(".protyle-wysiwyg > [data-node-id]");
    const blockRootId = blockEl?.getAttribute("data-node-id");
    return blockRootId || "";
}

function visibleEditorRootId(): string {
    const activeEditors = document.querySelectorAll(".layout__wnd--active .protyle:not(.fn__none)");
    for (const editor of activeEditors) {
        const rootId = extractProtyleRootId(editor);
        if (rootId) return rootId;
    }
    const editors = document.querySelectorAll(".protyle:not(.fn__none)");
    for (const editor of editors) {
        const rootId = extractProtyleRootId(editor);
        if (rootId) return rootId;
    }
    return "";
}

export function readSelectionWithin(scope: HTMLElement): string {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return "";
    const anchor = selection.anchorNode;
    if (!anchor || !scope.contains(anchor)) return "";
    return selection.toString().trim();
}

export const uiCoordinatorMethods = {
    /** 打开受控宿主弹窗 */
    openOwnedDialog(this: any, args: Parameters<typeof svelteDialog>[0]): () => void {
        if (!this.isLifecycleActive()) return () => {};
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
        return dispose;
    },

    captureFromCurrentNote(this: any): void {
        if (!this.isLifecycleActive()) return;
        const editor = getActiveEditor(true);
        const rootId = editor?.protyle?.block?.rootID || visibleEditorRootId();
        if (!rootId) {
            notify(this.i18n?.["toast.openNoteFirst"] ?? "请先打开一篇笔记再捕获人员", 3000);
            return;
        }
        this.openCaptureDialog(rootId);
    },

    openCaptureDialog(this: any, docId: string): void {
        if (!this.isLifecycleActive()) return;
        if (!this.settings) {
            notify(this.i18n?.["toast.workspaceNotReady"] ?? "请先完成人脉工作空间初始化", 3000);
            return;
        }
        this.openOwnedDialog({
            title: "从笔记捕获人脉",
            width: "560px",
            component: CaptureDialog,
            props: { facade: this, i18n: this.i18n, docId },
        });
    },

    async openRecognizeDialog(this: any, rawText: string, rootDocId: string): Promise<void> {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (!this.settings) {
            notify(this.i18n?.["toast.workspaceNotReady"] ?? "请先完成人脉工作空间初始化", 3000);
            return;
        }
        const text = rawText.trim();
        if (!text) {
            notify(this.i18n?.["toast.noRecognizableContent"] ?? "没有可识别的内容", 3000);
            return;
        }
        const result = parseContactText(text);
        if (result.items.length === 0) {
            notify(this.i18n?.["toast.noFillableFields"] ?? "未识别到可填充的资料字段（原文已保留，未做任何写入）", 3000);
            return;
        }
        const resolution = await resolveRecognizeTarget(this.settings, rootDocId);
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (resolution.status === "failed") {
            notify(this.i18n?.["toast.rosterReadFailed"] ?? "人脉名册读取失败，本次识别已取消（未做任何写入）；请稍后重新触发「识别资料」", 6000);
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
    },

    async openSelectionToInteraction(this: any, args: {
        rawText: string;
        rootId: string;
        protyleElement?: HTMLElement;
    }): Promise<void> {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken)) return;
        if (!this.settings) {
            notify(this.i18n?.["toast.workspaceNotReady"] ?? "请先完成人脉工作空间初始化", 3000);
            return;
        }

        const text = args.rawText.trim();
        if (!text) {
            notify(this.i18n?.["toast.noSelectedInteraction"] ?? "没有选中的互动内容", 3000);
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
                onSave: async (payload: { person: ContactSummary; note: string; type: import("../domain/interactions").InteractionType; blockId?: string }) => {
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
    },

    openCreateOrganizationForContact(this: any, initialName?: string): Promise<void | { docId: string; name: string }> {
        if (!this.isLifecycleActive()) return Promise.resolve();
        if (typeof document !== "undefined" && document.querySelector(".lvct-workbench")) {
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
    },

    openPersonEditDialog(
        this: any,
        person: ContactSummary,
        options: {
            title?: string;
            width?: string;
            initialPatch?: Partial<ContactDraft>;
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
                onSaveRelationshipLabels: (docId: string, selfDocId: string, labels: string[], expected: any) =>
                    this.savePersonRelationshipLabels(docId, selfDocId, labels, expected),
                onLoadOrgMemberships: (docId: string) => this.listPersonOrgMemberships(docId),
                onLoadOrgCandidates: async () => (await this.listOrganizations()).map((org: any) => ({ docId: org.docId, name: org.name, archived: org.archived })),
                onCreateOrganization: (initialName?: string) => this.openCreateOrganizationForContact(initialName),
                onAddOrgMembership: (personDocId: string, orgDocId: string, extra?: any) =>
                    this.addOrganizationMember(orgDocId, personDocId, extra),
                onUpdateOrgMembership: (membershipId: string, patch: any, expected?: any) =>
                    this.updateOrganizationMember(membershipId, patch, expected),
                onRemoveOrgMembership: (membershipId: string, expected?: any) =>
                    this.removeOrganizationMember(membershipId, expected),
                onSaved: () => {
                    if (this.isLifecycleActive(lifecycleToken)) {
                        emitDataChanged({ topics: ["people"], docIds: [person.docId] }, lifecycleToken);
                        options.onSaved?.();
                    }
                },
            },
        });
    },

    openPersonEditPrefilled(this: any, person: ContactSummary, patch: QuickFillPatch): void {
        const { tagsAppend, ...fields } = patch;
        const initialPatch: Partial<ContactDraft> = {
            ...fields,
            tags: [...new Set([...person.tags, ...tagsAppend])],
        };
        this.openPersonEditDialog(person, {
            title: `识别资料 · 补充「${person.name}」`,
            width: "560px",
            initialPatch,
        });
    },

    openPersonCreatePrefilled(this: any, patch: QuickFillPatch): void {
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
        let closeDialog = () => {};
        closeDialog = this.openOwnedDialog({
            title: "识别资料 · 新建联系人",
            width: "560px",
            component: AddPersonDialog,
            props: {
                settings: this.settings,
                i18n: this.i18n,
                initial: draft,
                onLoadOrgCandidates: async () => (await this.listOrganizations()).map((org: any) => ({ docId: org.docId, name: org.name, archived: org.archived })),
                onCreateOrganization: (initialName?: string) => this.openCreateOrganizationForContact(initialName),
                onCreateSelfProfile: () => this.ensureSelfIdentity(),
                onLoadSelfCandidates: () => this.listContacts(),
                onPreviewSelfIdentityChange: (personItemId: string) => this.previewSelfIdentityChange(personItemId),
                onApplySelfIdentityChange: (preview: any) => this.applySelfIdentityChange(preview),
                onValidateExtended: async (details: any) => {
                    if (details.orgMemberships?.length) {
                        const organizations = await this.listOrganizations();
                        for (const membership of details.orgMemberships) {
                            const selected = organizations.find((org: any) => org.docId === membership.orgDocId);
                            if (!selected || (membership.orgStatus === "active" && selected.archived)) {
                                throw new Error(`组织 ${membership.orgDocId} 不可用；当前归属不能加入已归档组织，请重新读取并选择`);
                            }
                        }
                    }
                    if (details.relationshipLabels?.trim() && !(await this.loadSelfIdentity())) {
                        throw new Error("请先在设置中指定“我”的档案，再创建并填写与我的关系称谓");
                    }
                },
                onSaveExtended: async (person: ContactSummary, details: any) => {
                    if (details.orgMemberships?.length) {
                        const memberships = await this.listPersonOrgMemberships(person.docId);
                        for (const affiliation of details.orgMemberships) {
                            const same = (membership: any) => membership.orgDocId === affiliation.orgDocId
                                && membership.status === affiliation.orgStatus && membership.statusLabel === (affiliation.orgStatusLabel.trim() || undefined)
                                && membership.affiliationKind === affiliation.orgAffiliationKind && membership.department === affiliation.orgDepartment.trim()
                                && membership.title === affiliation.orgTitle.trim() && membership.joinedOn === affiliation.orgJoinedOn && membership.leftOn === affiliation.orgLeftOn
                                && (membership.note ?? "") === (affiliation.orgNote?.trim() ?? "");
                            if (memberships.some(same)) continue;
                            if (affiliation.orgStatus === "active" && memberships.some((membership: any) => membership.orgDocId === affiliation.orgDocId && membership.status === "active")) {
                                throw new Error(`组织 ${affiliation.orgDocId} 已有当前归属，请核对原记录；未覆盖它`);
                            }
                            await this.addOrganizationMember(affiliation.orgDocId, person.docId, {
                                department: affiliation.orgDepartment, title: affiliation.orgTitle, joinedOn: affiliation.orgJoinedOn,
                                leftOn: affiliation.orgLeftOn, status: affiliation.orgStatus,
                                statusLabel: affiliation.orgStatusLabel.trim(), affiliationKind: affiliation.orgAffiliationKind, note: affiliation.orgNote?.trim() ?? "",
                            });
                            memberships.push({ id: "", orgDocId: affiliation.orgDocId, orgName: "", department: affiliation.orgDepartment.trim(),
                                title: affiliation.orgTitle.trim(), joinedOn: affiliation.orgJoinedOn, leftOn: affiliation.orgLeftOn,
                                status: affiliation.orgStatus, statusLabel: affiliation.orgStatusLabel.trim() || undefined,
                                affiliationKind: affiliation.orgAffiliationKind, note: affiliation.orgNote?.trim() || undefined, archived: false, reachable: true });
                        }
                    }
                    if (details.relationshipLabels?.trim()) {
                        const identity = await this.loadSelfIdentity();
                        if (!identity) throw new Error("请先在设置中指定“我”的档案，再保存与我的关系称谓");
                        const labels = details.relationshipLabels.split(/[、,，\n]/).map((label: string) => label.trim()).filter(Boolean);
                        const current = await this.loadPersonRelationshipLabels(person.docId);
                        if (current.selfDocId !== identity.selfDocId || JSON.stringify(current.record?.labels ?? []) !== JSON.stringify(labels)) {
                            await this.savePersonRelationshipLabels(person.docId, identity.selfDocId, labels, current.record);
                        }
                    }
                    if (details.aliases?.trim()) {
                        const existingAliases = await this.listPersonAliases(person.docId);
                        const existing = new Set(existingAliases.map((alias: any) => alias.alias.trim().toLocaleLowerCase()));
                        const aliases = details.aliases.split(/[、,，\n]/).map((alias: string) => alias.trim()).filter(Boolean);
                        for (const alias of aliases) {
                            const key = alias.toLocaleLowerCase();
                            if (!existing.has(key)) {
                                await this.addPersonAlias(person.docId, alias);
                                existing.add(key);
                            }
                        }
                    }
                    if (details.locations && (details.locations.resident || details.locations.hometown) && this.savePersonLocations) {
                        await this.savePersonLocations(person.docId, details.locations);
                    }
                    if (details.note?.trim()) {
                        const currentNote = await this.loadPersonNote(person.docId);
                        if (currentNote !== details.note.trim()) await this.savePersonNote(person.docId, details.note.trim(), currentNote);
                    }
                },
                onCreated: (person: ContactSummary) => {
                    if (this.isLifecycleActive(lifecycleToken)) {
                        invalidateRoster();
                        emitDataChanged({ topics: ["people"], docIds: [person.docId] }, lifecycleToken);
                        notify(`已新建联系人「${person.name}」`, 3000);
                    }
                },
                onClose: () => closeDialog(),
            },
        });
    },

    openQuickRecordDialog(this: any, options: {
        currentPerson?: ContactSummary;
        defaultType?: any;
        defaultNote?: string;
        onSaved?: () => void;
    } = {}): void {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken) || !this.settings) return;
        this.openOwnedDialog({
            title: "记一笔互动",
            width: "540px",
            component: QuickRecordDialog,
            props: {
                facade: this,
                currentPerson: options.currentPerson,
                defaultType: options.defaultType,
                defaultNote: options.defaultNote,
                onSaved: () => {
                    options.onSaved?.();
                },
            },
        });
    },

    openOrgManagerDialog(this: any, initialOrgDocId?: string, onCreated?: (docId: string) => void, onDone?: () => void): void {
        if (!this.isLifecycleActive()) return;
        this.openOwnedDialog({
            title: "组织管理",
            width: "min(1080px, 96vw)",
            component: OrgManagerDialog,
            props: {
                facade: this,
                initialOrgDocId,
                onCreated,
                onDone,
            },
        });
    },

    openContactsView(this: any): void {
        this.openWorkbench();
    },

    openNewContactDialog(this: any, patch?: Partial<QuickFillPatch>): void {
        if (!this.settings) {
            this.openWorkbench();
            return;
        }
        this.openPersonCreatePrefilled({
            tagsAppend: [],
            ...patch,
        });
    },

    openPreMeetingDialog(this: any): void {
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
    },

    openCoolingRadarDialog(this: any): void {
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
    },

    async refreshFollowupDueCount(this: any): Promise<number> {
        if (!this.settings) return 0;
        try {
            const data = await this.loadDashboard({ birthdayWindowDays: 7 });
            const dueFollowUps = (data.followUps ?? []).filter(
                (f: any) => f.item.status === "open" && (f.bucket === "today" || f.bucket === "overdue"),
            );
            const overdueCadences = (data.actions ?? []).filter(
                (a: any) => a.bucket === "overdue" && a.reasons.some((r: any) => r.kind === "stale"),
            );
            const totalCount = dueFollowUps.length + overdueCadences.length;
            this.followupDueCount = totalCount;
            this.registerLaunchpad();
            return totalCount;
        } catch {
            return 0;
        }
    },

    onWorkspaceReadyRefreshed(this: any): void {
        if (!this.isLifecycleActive()) return;
        this.registerLaunchpad();
        void this.refreshFollowupDueCount();
    },

    closeWorkbenchDialog(this: any): void {
        this.workbenchDialog?.destroy();
    },

    handleQuickAction(this: any, action: string): void {
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
    },

    registerLaunchpad(this: any): void {
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
            badge: dueCount > 0 ? `${dueCount} 位需联络` : "已就绪",
            badgeType: dueCount > 0 ? "warn" : "success",
            badgeProvider: () => {
                const n = this.getFollowupDueCount();
                return n > 0 ? `${n} 位需联络` : "已就绪";
            },
            actions: ["速查联系人", "今日待联络", "新增联系人", "会前速览"],
            onAction: (act: string) => this.handleQuickAction(act),
            onClick: () => {
                this.openWorkbench();
            },
        });
    },

    async searchOmniContacts(this: any, keyword: string): Promise<LvSearchResultItem[]> {
        if (!keyword.trim() || !this.settings) return [];
        const kw = keyword.trim().toLowerCase();
        const results: LvSearchResultItem[] = [];
        const mobileFrontend = this.isMobile;
        const openResultDoc = (docId: string) => {
            if (!this.settings) {
                this.openWorkbench();
                return;
            }
            if (!mobileFrontend) this.openWorkbench("people");
            this.openPersonDoc(docId);
        };
        try {
            const roster = await this.listContacts();
            const matchedPeople = roster
                .filter((p: any) =>
                    p.name.toLowerCase().includes(kw) ||
                    p.phone.includes(kw) ||
                    p.wechat.toLowerCase().includes(kw) ||
                    p.email.toLowerCase().includes(kw) ||
                    p.group.toLowerCase().includes(kw) ||
                    p.tags.some((t: string) => t.toLowerCase().includes(kw)),
                )
                .slice(0, 15);
            for (const person of matchedPeople) {
                results.push({
                    id: `contact_${person.docId}`,
                    source: "人脉",
                    category: "联系人",
                    title: person.name,
                    snippet: [person.group, person.phone, person.wechat, ...person.tags].filter(Boolean).join(" · "),
                    badge: person.group || "联系人",
                    linkBlockId: person.docId,
                    onClick: () => {
                        openResultDoc(person.docId);
                        emitDataChanged({ topics: ["people"], docIds: [person.docId] }, this.lifecycleToken);
                    },
                });
            }
            const interactionStore = await loadInteractionStore(this);
            const tombstones = new Set(interactionStore.tombstones);
            const matchedEvents = interactionStore.events
                .filter((e: any) => !tombstones.has(e.id) && e.note && e.note.toLowerCase().includes(kw))
                .slice(0, 10);
            for (const event of matchedEvents) {
                const person = roster.find((p: any) => p.docId === event.personDocId);
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
            const orgs = await this.listOrganizations().catch(() => []);
            const matchedOrgs = orgs.filter((org: any) =>
                org.name.toLowerCase().includes(kw) ||
                (org.profile?.shortName && org.profile.shortName.toLowerCase().includes(kw)) ||
                (org.profile?.description && org.profile.description.toLowerCase().includes(kw)),
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
    },

    openHostDoc(this: any) {
        if (!this.isLifecycleActive() || !this.settings) return;
        return this.openDoc(this.settings.hostDocId);
    },

    openDoc(this: any, docId: string, options?: OpenDocOptions) {
        if (!this.isLifecycleActive() || !docId) return;
        if (this.isMobile && this.workbenchDialog) {
            try {
                this.closeWorkbenchDialog();
            } catch { /* soft */ }
        }
        const opening = openSiYuanDocument(this.app, docId, options);
        void opening.catch((error: unknown) => {
            if (!this.isLifecycleActive()) return;
            notify((this.i18n?.["toast.openDocFailed"] ?? "打开文档失败，请重试：${err}").replace("${err}", error instanceof Error ? error.message : String(error)), 6000, "error");
        });
        return opening;
    },

    openPersonDoc(this: any, docId: string, options?: OpenDocOptions) {
        return this.openDoc(docId, options);
    },

    async openDocMenu(this: any, docId: string, event: MouseEvent): Promise<boolean> {
        if (!this.isLifecycleActive() || !docId) return false;
        return openDocumentContextMenu(docId, event, this.settings?.notebookId);
    },

    openSetting(this: any): void {
        this.openSettings();
    },

    openSettings(this: any) {
        if (!this.settings) {
            notify(this.i18n?.["toast.workspaceNotReady"] ?? "请先完成人脉工作空间初始化", 3000);
            return;
        }
        this.openOwnedDialog({
            title: this.i18n?.settingsTitle ?? "小驴人脉 · 设置与健康度",
            component: SettingsView,
            props: { facade: this, settings: this.settings, i18n: this.i18n },
            width: "min(880px, 94vw)",
        });
    },

    openWorkbenchDelegated(this: any, view?: WorkbenchView) {
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
                    title: this.i18n?.tabTitle ?? "小驴人脉",
                    id: `${this.name}${TAB_TYPE}`,
                },
            });
            if (view) {
                const epoch = this.preferencesEpoch;
                const lifecycleToken = this.lifecycleToken;
                const tabToken = [...this.tabMounts.values()].at(-1);
                this.viewRequestTimer = window.setTimeout(() => {
                    if (!this.isLifecycleActive(lifecycleToken) || !this.preferencesActive || epoch !== this.preferencesEpoch
                        || !tabToken?.isAlive()) return;
                    this.viewRequestTimer = 0;
                    window.dispatchEvent(new CustomEvent("lvct-workbench-view", { detail: { view, facade: this, token: tabToken } }));
                    if (this.requestedWorkbenchView === view) this.requestedWorkbenchView = undefined;
                }, 0);
            }
        }
    },

    openWorkbenchDialog(this: any, initialView?: WorkbenchView): void {
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
            title: this.i18n?.tabTitle ?? "小驴人脉",
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
        this.workbenchDialog.element.classList.add("lvct-dialog-host");
        const dialogContainer = this.workbenchDialog.element.querySelector(".b3-dialog__container") as HTMLElement | null;
        dialogContainer?.classList.add("lvct-dialog");
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
        const target = this.workbenchDialog.element.querySelector(".lvct-dialog-root") as HTMLElement | null;
        const header = this.workbenchDialog.element.querySelector(".b3-dialog__header") as HTMLElement | null;
        if (header && !header.querySelector(".lvct-mobile-dialog-close")) {
            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.className = "b3-dialog__close lvct-mobile-dialog-close";
            closeBtn.setAttribute("aria-label", "关闭工作台");
            closeBtn.innerHTML = "✕";
            closeBtn.style.cssText = "display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:18px;border:none;background:transparent;color:var(--lvct-text-2,#5f6368);cursor:pointer;touch-action:manipulation;";
            closeBtn.onclick = () => this.workbenchDialog?.destroy();
            header.appendChild(closeBtn);
        }
        try {
            if (!target) throw new Error("dialog 容器缺失");
            void this.mountWorkbenchRoot(target, dialogToken, initialView,
                () => dialogToken.isAlive() && this.workbenchDialogToken === dialogToken,
                (instance: any) => { this.dialogInstance = instance; });
        } catch (error) {
            this.workbenchDialog?.destroy();
            throw error;
        }
    },

    async mountWorkbenchRoot(
        this: any,
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
    },

    onMenuContent(this: any, event: { detail: { protyle?: { element?: HTMLElement; block?: { rootID?: string } }; menu: { addItem: (item: unknown) => void } } }): void {
        const lifecycleToken = this.lifecycleToken;
        if (!this.isLifecycleActive(lifecycleToken) || !event?.detail?.menu) return;
        const rootId = event.detail.protyle?.block?.rootID;
        if (!rootId) return;
        event.detail.menu.addItem({
            id: "lvct-capture",
            iconHTML: "",
            label: this.i18n?.captureFromNote ?? "小驴人脉：捕获本文人员",
            click: () => {
                if (this.isLifecycleActive(lifecycleToken)) this.openCaptureDialog(rootId);
            },
        });
        const protyleElement = event.detail.protyle?.element;
        const selectionText = protyleElement ? readSelectionWithin(protyleElement) : "";
        if (selectionText.trim()) {
            event.detail.menu.addItem({
                id: "lvct-selection-to-interaction",
                iconHTML: "",
                label: "👥 小驴人脉：记一笔互动",
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
                label: `小驴人脉：识别资料（选中文本，${[...selectionText.trim()].length} 字）`,
                click: () => {
                    if (this.isLifecycleActive(lifecycleToken)) void this.openRecognizeDialog(selectionText, rootId);
                },
            });
        }
        event.detail.menu.addItem({
            id: "lvct-recognize-doc",
            iconHTML: "",
            label: "小驴人脉：识别资料（整篇文档）",
            click: () => {
                if (this.isLifecycleActive(lifecycleToken)) {
                    let text = "";
                    if (protyleElement) {
                        const clone = protyleElement.cloneNode(true) as HTMLElement;
                        clone.querySelectorAll(".protyle-attr, .protyle-action, .protyle-gutters, .lv-card-badge-pill").forEach(n => n.remove());
                        text = (clone.innerText ?? clone.textContent ?? "").trim();
                    }
                    void this.openRecognizeDialog(text, rootId);
                }
            },
        });
    },

    onProtyleEvent(this: any, event: { detail?: { protyle?: { element: HTMLElement; block?: { rootID?: string } } } }): void {
        if (!this.isLifecycleActive()) return;
        this.stripController.handleProtyleEvent(event);
    },

    registerWorkbenchTab(this: any, lifecycleToken: any): void {
        const plugin = this;
        this.addTab({
            type: TAB_TYPE,
            init() {
                if (!plugin.isLifecycleActive(lifecycleToken)) return;
                const state = this as any;
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
                    (mounted: any) => { instance = mounted; });
            },
            destroy() {
                if (!plugin.isLifecycleActive(lifecycleToken)) return;
                (this as any).__lvctDispose?.();
            },
        });
    },

    registerLayoutHooks(this: any, lifecycleToken: any): void {
        lifecycleToken.onDispose(lvTicker.onHour("siyuan-contacts", () => {
            if (this.isLifecycleActive(lifecycleToken) && this.workspaceState.kind === "ready") void this.checkFollowups();
        }));
        lifecycleToken.onDispose(lvTicker.onDateCross("siyuan-contacts", () => {
            if (this.isLifecycleActive(lifecycleToken) && this.workspaceState.kind === "ready") void this.checkFollowups(true);
        }));

        lifecycleToken.onDispose(lvLaunchpad.ensureUnifiedEntry(this));
        lvLaunchpad.registerHostApi({ openTab, app: this.app });

        lifecycleToken.onDispose(lvAutomation.registerRule({
            id: "contacts-followup-due",
            name: "人脉跟进到期提醒",
            desc: "触发时扫描今日到期跟进与定期联络并推送提醒卡",
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
        }));
    },

    cleanupUiResources(this: any): void {
        disposeActiveCloseGuards();
        const wbDialog = this.workbenchDialog;
        const dlgInst = this.dialogInstance;
        this.workbenchDialog = null;
        this.dialogInstance = null;
        this.workbenchDialogToken?.invalidate();
        this.workbenchDialogToken = null;
        if (dlgInst) unmount(dlgInst);
        wbDialog?.destroy();
        for (const dispose of [...this.ownedDialogDisposers]) dispose();
        for (const dispose of [...this.tabDisposers]) dispose();
    },
};
