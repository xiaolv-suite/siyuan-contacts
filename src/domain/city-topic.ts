/**
 * 城市人脉专题文档（City Topic Document）纯函数引擎。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */
import type { ContactSummary } from "./person.ts";
import { profileText } from "./people-profiles.ts";
import { escapeLinkLabel } from "./format.ts";

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
            lines.push(`- [${cleanOrgName}](siyuan://blocks/${org.docId})`);
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
