/**
 * 组织文档全要素档案与名录受控区块同步服务（思源原生深度联动 P2）
 */

import type { Plugin } from "siyuan";
import { readMarkedBlocks, upsertMarkedBlock } from "../api/blocks.ts";
import { loadOrganizationProfile } from "../data/organization-profiles.ts";
import { loadOrgMembershipStore } from "../data/org-membership.ts";
import { getRoster } from "./roster.ts";
import type { ContactsSettings } from "../domain/model.ts";
import {
    buildOrganizationDossierMarkdown,
    ORG_DOSSIER_ATTR,
    type OrgMemberDossierItem,
    type OrganizationDossierInput,
} from "../domain/org-dossier.ts";
import { scanOrganizations } from "./org.ts";

function contentWithoutIal(markdown: string): string {
    return markdown.replace(/\r\n/g, "\n").trim()
        .replace(/\n\s*\{:[^}]*\}\s*$/g, "").trim();
}

/**
 * 将指定组织的全要素简介、部门树与在职/离职成员名录完整同步落盘至思源组织文档中
 */
export async function syncOrganizationDocSection(
    plugin: Plugin,
    orgDocId: string,
    options: { strict?: boolean } = {},
): Promise<void> {
    if (!orgDocId) return;

    try {
        const [orgs, profile, memberStore] = await Promise.all([
            scanOrganizations().catch(() => []),
            loadOrganizationProfile(plugin, orgDocId).catch(() => null),
            loadOrgMembershipStore(plugin).catch(() => ({ schemaVersion: 1, memberships: [] })),
        ]);

        const currentOrg = orgs.find((o) => o.docId === orgDocId);
        const orgName = profile?.name || currentOrg?.name || "未命名组织";
        const isArchived = Boolean(currentOrg?.archived);

        const settings = (plugin as Plugin & { settings?: ContactsSettings }).settings;
        let peopleMap = new Map<string, string>();
        if (settings) {
            const people = await getRoster(settings).catch(() => []);
            peopleMap = new Map(people.map((p) => [p.docId, p.name]));
        }

        const orgMembers = memberStore.memberships.filter((m) => m.orgDocId === orgDocId);
        const dossierMembers: OrgMemberDossierItem[] = orgMembers.map((m) => ({
            personDocId: m.personDocId,
            name: peopleMap.get(m.personDocId) || "联系人",
            department: m.department,
            title: m.title,
            status: m.status,
            startYearMonth: m.joinedOn ? m.joinedOn.slice(0, 7) : undefined,
            endYearMonth: m.leftOn ? m.leftOn.slice(0, 7) : undefined,
        }));

        const input: OrganizationDossierInput = {
            name: orgName,
            shortName: profile?.shortName,
            description: profile?.description,
            qccUrl: profile?.qccUrl,
            isArchived,
            departments: profile?.departments,
            members: dossierMembers,
        };

        const markdown = buildOrganizationDossierMarkdown(input);
        const existing = await readMarkedBlocks(orgDocId, ORG_DOSSIER_ATTR);

        if (existing.length === 0 && !markdown) return;
        if (existing.length === 1 && contentWithoutIal(existing[0].markdown) === markdown) return;

        await upsertMarkedBlock(orgDocId, ORG_DOSSIER_ATTR, markdown, existing[0]?.id);
    } catch (err) {
        if (options.strict) throw err;
        console.warn(`[LvContacts] 组织全要素档案同步未完成 (${orgDocId}):`, err);
    }
}
