/**
 * 组织文档全要素档案与人脉名录 Markdown 投影纯函数引擎（思源原生深度联动 P2）
 * 严格遵循 domain/ 架构约束，纯函数，零外部副作用。
 */

export interface OrgMemberDossierItem {
    personDocId: string;
    name: string;
    department?: string;
    title?: string;
    status: "active" | "former";
    startYearMonth?: string;
    endYearMonth?: string;
}

export interface OrganizationDepartmentItem {
    id: string;
    name: string;
    children?: readonly OrganizationDepartmentItem[];
}

export interface OrganizationDossierInput {
    name: string;
    shortName?: string;
    description?: string;
    qccUrl?: string;
    isArchived?: boolean;
    departments?: readonly OrganizationDepartmentItem[];
    members?: readonly OrgMemberDossierItem[];
}

export const ORG_DOSSIER_ATTR = "custom-lvct-org-dossier";

function escapeLinkLabel(text: string): string {
    return text.replace(/[\[\]]/g, "").trim();
}

function cleanLine(text: string | undefined): string {
    if (!text) return "";
    return text.replace(/\r\n/g, " ").replace(/[\r\n]/g, " ").trim();
}

function formatPeriod(start?: string, end?: string): string {
    if (!start && !end) return "";
    if (start && end) return `${start} ~ ${end}`;
    if (start) return `${start} ~ 至今`;
    return `至 ${end}`;
}

function formatMemberDetails(m: OrgMemberDossierItem): string {
    const parts: string[] = [];
    if (m.department) parts.push(m.department);
    if (m.title) parts.push(m.title);
    const period = formatPeriod(m.startYearMonth, m.endYearMonth);
    if (period) parts.push(period);
    if (m.status === "former") parts.push("已离职");
    return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
}

function renderDepartmentTreeLines(depts: readonly OrganizationDepartmentItem[], indent = "  "): string[] {
    const lines: string[] = [];
    for (const d of depts) {
        if (!d.name.trim()) continue;
        lines.push(`${indent}- ${cleanLine(d.name)}`);
        if (d.children && d.children.length > 0) {
            lines.push(...renderDepartmentTreeLines(d.children, `${indent}  `));
        }
    }
    return lines;
}

/**
 * 组装便于在思源组织文档中直接阅读、双向反链打通的组织档案 Markdown
 */
export function buildOrganizationDossierMarkdown(input: OrganizationDossierInput): string {
    const lines: string[] = [
        "## 🏢 机构档案概览",
        "",
    ];

    const short = cleanLine(input.shortName);
    const statusLabel = input.isArchived ? "已归档" : "活跃";
    lines.push(`- **简称 / 状态**：${short ? `${short} · ` : ""}${statusLabel}`);

    if (input.description && input.description.trim()) {
        lines.push(`- **机构简介**：${cleanLine(input.description)}`);
    }

    if (input.qccUrl && input.qccUrl.trim()) {
        lines.push(`- **外部链接**：[企业信息档案](${input.qccUrl.trim()})`);
    }

    if (input.departments && input.departments.length > 0) {
        const deptLines = renderDepartmentTreeLines(input.departments);
        if (deptLines.length > 0) {
            lines.push("- **部门架构**：");
            lines.push(...deptLines);
        }
    }

    lines.push("");
    lines.push("## 👥 关联人脉名录");

    const allMembers = input.members || [];
    const active = allMembers.filter((m) => m.status === "active");
    const former = allMembers.filter((m) => m.status === "former");

    if (active.length > 0) {
        lines.push(`- **在职 / 当前成员（${active.length}）**：`);
        for (const m of active) {
            lines.push(`  - ((${m.personDocId} '${escapeLinkLabel(m.name)}'))${formatMemberDetails(m)}`);
        }
    } else {
        lines.push("- *暂无登记在职成员*");
    }

    if (former.length > 0) {
        lines.push(`- **历史成员 / 前同事校友（${former.length}）**：`);
        for (const m of former) {
            lines.push(`  - ((${m.personDocId} '${escapeLinkLabel(m.name)}'))${formatMemberDetails(m)}`);
        }
    }

    return lines.join("\n");
}
