/**
 * 组织服务统一协调器 (OrganizationService)
 *
 * 彻底从 src/index.ts 上帝类中剥离组织与成员业务逻辑编排：
 * 1. 组织生命周期：创建、改名、归档、恢复、移除与只读 Keys 分页；
 * 2. 组织档案资料：读取、更新与受控 Markdown 文档正文同步；
 * 3. 组织成员管理：添加、编辑、删除、换绑、替补与分页查询；
 * 4. 组织双链投影：全库体检、区块反查、孤儿清理与断点重试。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model";
import type { LifecycleToken } from "../domain/lifecycle";
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
} from "./org";
import {
    archiveOrganization,
    createOrganization,
    getOrganizationProfile,
    listCommonOrgBackground,
    listOrganizationMembers,
    listOrganizationMembersPage,
    listOrganizationsPage,
    listOrganizationsWithMembers,
    listPersonOrgMemberships,
    removeOrganization,
    removeOrgLinkBlocks,
    renameOrganization,
    restoreOrganization,
    updateOrganizationProfile,
} from "./org";
import { invalidateOrganizationScan } from "./org-query";
import type { OrganizationOperationReport } from "../domain/organization-operations";
import {
    inspectOrganizationOperation,
    listPendingOrganizationOperations,
    resumeOrganizationOperation,
} from "./organization-writes";
import type { OrgMembershipWriteReport } from "./org-member-writes";
import {
    deleteOrganizationMember,
    editOrganizationMember,
    moveOrganizationMemberWithProjection,
    replaceOrganizationMemberWithProjection,
    saveOrganizationMember,
} from "./org-member-writes";
import type { OrgProjectionPreview, OrgProjectionRepairResult } from "./org-projections";
import { previewOrganizationProjections, repairOrganizationProjection } from "./org-projections";
import { syncOrganizationDocSection } from "./org-dossier";
import { emitDataChanged } from "../libs/data-events";

export interface OrgServiceHost {
    readonly plugin: Plugin;
    readonly settings: ContactsSettings | null;
    readonly lifecycleToken: LifecycleToken;
    isLifecycleActive(token?: LifecycleToken): boolean;
}

export class OrganizationService {
    constructor(private readonly host: OrgServiceHost) {}

    /** B13.3：组织列举（含成员记录） */
    async listOrganizations(options?: { includeRemoved?: boolean }): Promise<OrganizationWithMembers[]> {
        return listOrganizationsWithMembers(this.host.plugin, options);
    }

    /** B13.5c：组织标记 keyset 分页 */
    async listOrganizationsPage(options?: {
        afterRootId?: string;
        limit?: number;
        includeRemoved?: boolean;
    }): Promise<OrganizationPage> {
        return listOrganizationsPage(this.host.plugin, options);
    }

    /** B13.3：新建组织（文档 + custom-lvct-org 标记区块；同名拒绝） */
    async createOrganization(
        name: string,
        profile?: OrganizationProfileDraft,
    ): Promise<{ docId: string; profileSaved?: boolean; profileError?: string }> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        const result = await createOrganization(settings, name, this.host.plugin, profile);
        emitDataChanged({ topics: ["organizations"] }, token);
        return result;
    }

    /** 读取组织档案扩展属性 */
    async loadOrganizationProfile(orgDocId: string): Promise<OrganizationProfileDraft | null> {
        if (!this.host.isLifecycleActive() || !this.host.settings) throw new Error("人脉工作空间尚未初始化");
        return getOrganizationProfile(this.host.plugin, orgDocId);
    }

    /** 保存组织档案扩展属性并同步受控区块正文 */
    async saveOrganizationProfile(
        orgDocId: string,
        profile: OrganizationProfileDraft,
        expected?: OrganizationProfileDraft | null,
    ): Promise<OrganizationProfileDraft> {
        if (!this.host.isLifecycleActive() || !this.host.settings) throw new Error("人脉工作空间尚未初始化");
        const result = await updateOrganizationProfile(this.host.plugin, orgDocId, profile, expected);
        if (!this.host.isLifecycleActive()) return result;
        await syncOrganizationDocSection(this.host.plugin, orgDocId).catch(() => {});
        emitDataChanged({ topics: ["organizations"] }, this.host.lifecycleToken);
        return result;
    }

    /** B13.3：组织成员列举（join 名册姓名） */
    async listOrganizationMembers(orgDocId: string): Promise<OrganizationMember[]> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        return listOrganizationMembers(this.host.plugin, settings, orgDocId);
    }

    /** B13.5b：组织成员筛选与稳定分页 */
    async listOrganizationMembersPage(
        orgDocId: string,
        options?: { query?: string; status?: "all" | "active" | "former"; offset?: number; limit?: number },
    ): Promise<OrganizationMemberPage> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        return listOrganizationMembersPage(this.host.plugin, settings, orgDocId, options);
    }

    /** B13.3：添加组织成员（active） */
    async addOrganizationMember(
        orgDocId: string,
        personDocId: string,
        extra?: {
            department?: string;
            title?: string;
            joinedOn?: string;
            leftOn?: string;
            status?: OrgMembershipStatus;
            statusLabel?: string;
            affiliationKind?: OrgAffiliationKind;
            note?: string;
        },
    ): Promise<OrgMembershipWriteReport> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        const report = await saveOrganizationMember(this.host.plugin, settings, {
            ...extra,
            orgDocId,
            personDocId,
        });
        await syncOrganizationDocSection(this.host.plugin, orgDocId).catch(() => {});
        emitDataChanged({}, token);
        return report;
    }

    /** B13.3：移除组织成员记录 */
    async removeOrganizationMember(
        id: string,
        expected?: OrgMembership,
    ): Promise<OrgMembershipWriteReport> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        const report = await deleteOrganizationMember(this.host.plugin, settings, id, expected);
        if (expected?.orgDocId) {
            await syncOrganizationDocSection(this.host.plugin, expected.orgDocId).catch(() => {});
        }
        emitDataChanged({}, token);
        return report;
    }

    /** B13.4：更新成员记录字段（部门/职位/入职/离职/状态；身份字段不可变） */
    async updateOrganizationMember(
        id: string,
        patch: OrgMembershipPatch,
        expected?: OrgMembership,
    ): Promise<OrgMembershipWriteReport> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        const report = await editOrganizationMember(this.host.plugin, settings, id, patch, expected);
        if (expected?.orgDocId) {
            await syncOrganizationDocSection(this.host.plugin, expected.orgDocId).catch(() => {});
        }
        emitDataChanged({}, token);
        return report;
    }

    /** 成员调动至新组织 */
    async moveOrganizationMember(
        id: string,
        targetOrgDocId: string,
        expected?: OrgMembership,
    ): Promise<OrgMembershipWriteReport> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        const report = await moveOrganizationMemberWithProjection(
            this.host.plugin,
            settings,
            id,
            targetOrgDocId,
            expected,
        );
        emitDataChanged({}, token);
        return report;
    }

    /** 成员交接与替补 */
    async replaceOrganizationMember(
        formerMembershipId: string,
        successorPersonDocId: string,
        extra: {
            department?: string;
            title?: string;
            joinedOn: string;
            leftOn: string;
            affiliationKind?: OrgAffiliationKind;
        },
        expected?: OrgMembership,
    ): Promise<OrgMembershipWriteReport> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        const report = await replaceOrganizationMemberWithProjection(
            this.host.plugin,
            settings,
            { ...extra, formerId: formerMembershipId, personDocId: successorPersonDocId },
            expected,
        );
        emitDataChanged({}, token);
        return report;
    }

    /** B13：归档组织（标记区块值 archived；文档与成员记录保留可恢复） */
    async archiveOrganization(orgDocId: string): Promise<void> {
        const token = this.host.lifecycleToken;
        await archiveOrganization(orgDocId);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    /** B13：恢复归档组织 */
    async restoreOrganization(orgDocId: string): Promise<void> {
        const token = this.host.lifecycleToken;
        await restoreOrganization(orgDocId);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    /** 从插件移除组织（原生组织文档和成员记录保留，可从组织管理恢复） */
    async removeOrganization(orgDocId: string): Promise<void> {
        if (!this.host.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        await removeOrganization(orgDocId);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    /** B13.4：组织改名（同名检查；标记块文案同步，归档值保持） */
    async renameOrganization(orgDocId: string, name: string): Promise<void> {
        const token = this.host.lifecycleToken;
        await renameOrganization(orgDocId, name, this.host.plugin);
        emitDataChanged({ topics: ["organizations", "memberships"], docIds: [orgDocId] }, token);
    }

    /** 查看待重试或未完成的组织操作 */
    async listPendingOrganizationOperations(): Promise<OrganizationOperationReport[]> {
        return listPendingOrganizationOperations(this.host.plugin);
    }

    /** 检查具体组织操作断点状态 */
    async inspectOrganizationOperation(requestId: string): Promise<OrganizationOperationReport> {
        const report = await inspectOrganizationOperation(this.host.plugin, requestId);
        if (report.status === "complete") invalidateOrganizationScan();
        return report;
    }

    /** 恢复并继续未完成的组织操作 */
    async resumeOrganizationOperation(requestId: string): Promise<OrganizationOperationReport> {
        const settings = this.host.settings;
        if (!settings) throw new Error("人脉工作空间尚未初始化");
        const report = await resumeOrganizationOperation(this.host.plugin, settings, requestId);
        if (report.status === "complete") invalidateOrganizationScan();
        return report;
    }

    /** B13.9：移除悬空的 org-links 区块（体检修复入口；逐块隔离返回失败清单） */
    async removeOrgLinkBlocks(blockIds: readonly string[]): Promise<Array<{ id: string; message: string }>> {
        return removeOrgLinkBlocks(blockIds);
    }

    /** B12：某人的组织归属投影（成员记录 join 组织名） */
    async listPersonOrgMemberships(personDocId: string): Promise<PersonOrgMembershipView[]> {
        if (!this.host.settings) throw new Error("人脉工作空间尚未初始化");
        return listPersonOrgMemberships(this.host.plugin, personDocId);
    }

    /** 组织双链投影预览 */
    async previewOrganizationProjections(docIds?: readonly string[]): Promise<OrgProjectionPreview> {
        if (!this.host.settings) throw new Error("人脉工作空间尚未初始化");
        return previewOrganizationProjections(this.host.plugin, this.host.settings, docIds);
    }

    /** 组织双链投影修复 */
    async repairOrganizationProjection(
        preview: OrgProjectionPreview,
        retryKey: string,
    ): Promise<OrgProjectionRepairResult> {
        if (!this.host.settings) throw new Error("人脉工作空间尚未初始化");
        const token = this.host.lifecycleToken;
        const result = await repairOrganizationProjection(this.host.plugin, this.host.settings, preview, retryKey);
        if (result.status === "applied" || result.status === "unchanged") emitDataChanged({}, token);
        return result;
    }

    /** B13.6：共同背景（同组织联系人，重叠期间/同期口径，零写入） */
    async listCommonOrgBackground(personDocId: string): Promise<CommonOrgBackground[]> {
        if (!this.host.settings) throw new Error("人脉工作空间尚未初始化");
        return listCommonOrgBackground(this.host.plugin, this.host.settings, personDocId);
    }
}
