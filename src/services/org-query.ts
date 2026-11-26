import { assertSafeBlockId, querySql } from "../api/client";
import { organizationMarkerStates, organizationsFromDocs } from "../domain/organization-scan";
import type { OrganizationSummary } from "../domain/organization-scan";
import { registerRelatedDocId, unregisterRelatedDocId } from "./roster";

export const ORG_SECTION_ATTR = "custom-lvct-org";

let pendingOrganizationScan: Promise<OrganizationSummary[]> | null = null;

/** 组织标记或文档标题发生写入后调用，丢弃当前共享读取引用。 */
export function invalidateOrganizationScan(): void {
    pendingOrganizationScan = null;
}

/** 全库组织文档列举（单 SQL 找标记含归档值 + 单 SQL 取文档名，性能预算见 §4；零写入） */
export async function scanOrganizations(): Promise<OrganizationSummary[]> {
    if (pendingOrganizationScan) return pendingOrganizationScan;
    const request = (async () => {
        const roots = await querySql<unknown>(
            `SELECT root_id, ial, COUNT(*) AS markerCount FROM blocks WHERE ial LIKE '%${ORG_SECTION_ATTR}="%' GROUP BY root_id, ial ORDER BY root_id, ial LIMIT 2000`,
            { dedupe: false },
        );
        const states = organizationMarkerStates(roots);
        const ids = [...states.keys()];
        if (ids.length === 0) return [];
        ids.forEach((id) => assertSafeBlockId(id, "组织文档 ID"));
        const idList = ids.map((id) => `'${id}'`).join(",");
        const docs = await querySql<unknown>(
            `SELECT id, content, hpath, box FROM blocks WHERE type='d' AND id IN (${idList}) LIMIT 2000`,
            { dedupe: false },
        );
        const orgs = organizationsFromDocs(states, docs);
        for (const org of orgs) {
            if (org.docId) {
                if (!org.removed && !org.archived) {
                    registerRelatedDocId(org.docId);
                } else {
                    unregisterRelatedDocId(org.docId);
                }
            }
        }
        return orgs;
    })();
    pendingOrganizationScan = request;
    try {
        return await request;
    } finally {
        if (pendingOrganizationScan === request) pendingOrganizationScan = null;
    }
}
