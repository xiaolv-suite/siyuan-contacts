/**
 * 城市人脉专题文档（City Topic Document）纯函数引擎。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */
import type { ContactSummary } from "./person.ts";
import { profileText } from "./people-profiles.ts";
import { escapeLinkLabel } from "./format.ts";
import { extractNormalizedRegion } from "./region.ts";

export interface CityTopicInput {
    city: string;
    contacts: readonly ContactSummary[];
    organizations?: readonly { name: string; docId: string }[];
    generatedDate: string;
}

export const CITY_TOPIC_ATTR = "custom-lvct-city";
export const CITY_CONTACTS_SECTION_ATTR = "custom-lvct-city-contacts";

/**
 * 生成在思源城市文档（以正式市级城市名命名）中维护的独立受控人脉区块 Markdown。
 * 契约：
 * 1. 文档标题即为标准市级城市名（如“深圳”、“南京”）；
 * 2. 插件仅在此独立受控区块内更新人脉双链与关联机构；
 * 3. 严格保留用户在文档其他区域自行添加的城市攻略、酒店餐厅、生活随笔等内容。
 */
export function buildCityTopicSectionMarkdown(input: CityTopicInput): string {
    const lines: string[] = [];
    const orgCount = input.organizations ? input.organizations.length : 0;
    
    lines.push("## 城市人脉网络");
    lines.push(`> 城市人脉全貌：共 ${input.contacts.length} 位好友 · ${orgCount} 家关联机构 · 更新时间：${input.generatedDate}`);
    lines.push("");

    lines.push("### 常驻与同城好友");
    if (input.contacts.length === 0) {
        lines.push("- 当前暂无常驻该城市的联系人");
    } else {
        for (const person of input.contacts) {
            const cleanName = escapeLinkLabel(person.name);
            const link = `[${cleanName}](siyuan://blocks/${person.docId})`;
            const workText = profileText(person.profile, "work");
            const workStr = workText && workText !== "未填写" && workText !== "尚未核实" ? ` · ${workText}` : "";
            const phoneStr = person.phone ? ` · 电话: ${person.phone}` : "";
            const wechatStr = person.wechat ? ` · 微信: ${person.wechat}` : "";
            const groupStr = person.group ? ` [${person.group}]` : "";
            lines.push(`- ${link}${groupStr}${workStr}${phoneStr}${wechatStr}`);
        }
    }
    lines.push("");

    if (input.organizations && input.organizations.length > 0) {
        lines.push("### 关联组织与机构");
        for (const org of input.organizations) {
            const cleanOrgName = escapeLinkLabel(org.name);
            if (org.docId) {
                lines.push(`- [${cleanOrgName}](siyuan://blocks/${org.docId})`);
            } else {
                lines.push(`- ${cleanOrgName}`);
            }
        }
        lines.push("");
    }

    return lines.join("\n");
}

/** 初始新建城市文档时的完整骨架（文档标题即正式城市名，下方接人脉受控区块） */
export function buildCityInitialDocumentMarkdown(input: CityTopicInput): string {
    const cityName = input.city.trim() || "未命名城市";
    const sectionMd = buildCityTopicSectionMarkdown(input);
    return `# ${cityName}\n\n${sectionMd}`;
}

/**
 * 从一组同城联系人中聚合关联组织/机构信息（名称与文档ID）。
 * 纯函数，零外部依赖。
 */
export function extractCityOrganizations(
    contacts: readonly ContactSummary[],
    allOrganizations?: readonly { name: string; docId: string }[],
): Array<{ name: string; docId: string }> {
    const orgDocMap = new Map<string, string>();
    if (allOrganizations) {
        for (const org of allOrganizations) {
            if (org.name?.trim() && org.docId) orgDocMap.set(org.name.trim(), org.docId);
        }
    }

    const orgNames = new Set<string>();

    for (const p of contacts) {
        const affs = p.profile?.affiliations;
        if (affs?.state === "known" && affs.value) {
            const all = [
                ...(affs.value.work || []),
                ...(affs.value.education || []),
                ...(affs.value.family || []),
                ...(affs.value.unspecified || []),
            ];
            for (const item of all) {
                if (item.orgName?.trim()) {
                    const clean = item.orgName.trim();
                    orgNames.add(clean);
                    if (item.orgDocId) orgDocMap.set(clean, item.orgDocId);
                }
            }
        }

        const rawPerson = p as unknown as Record<string, unknown>;
        if (typeof rawPerson.organization === "string" && rawPerson.organization.trim()) orgNames.add(rawPerson.organization.trim());
        if (typeof rawPerson.company === "string" && rawPerson.company.trim()) orgNames.add(rawPerson.company.trim());
        if (typeof rawPerson.school === "string" && rawPerson.school.trim()) orgNames.add(rawPerson.school.trim());
    }

    return Array.from(orgNames).sort().map((name) => ({
        name,
        docId: orgDocMap.get(name) || "",
    }));
}

/**
 * 对比新旧名册，检测常驻城市发生变动的所有受影响城市集合。
 * 纯函数，零外部依赖。
 */
export function detectChangedCities(
    previousContacts: readonly ContactSummary[],
    nextContacts: readonly ContactSummary[],
): Set<string> {
    const prevMap = new Map<string, string>();
    for (const p of previousContacts) {
        const c = extractNormalizedRegion(p).city;
        if (c && c !== "未知") prevMap.set(p.docId, c);
    }

    const nextMap = new Map<string, string>();
    for (const p of nextContacts) {
        const c = extractNormalizedRegion(p).city;
        if (c && c !== "未知") nextMap.set(p.docId, c);
    }

    const affected = new Set<string>();

    for (const [docId, prevCity] of prevMap) {
        const nextCity = nextMap.get(docId);
        if (nextCity !== prevCity) {
            affected.add(prevCity);
            if (nextCity) affected.add(nextCity);
        }
    }

    for (const [docId, nextCity] of nextMap) {
        if (!prevMap.has(docId)) {
            affected.add(nextCity);
        }
    }

    return affected;
}
