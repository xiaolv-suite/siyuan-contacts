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

/**
 * 生成在思源笔记中沉淀为《城市人脉 · {城市}》文档的正文 Markdown。
 * 包含常驻好友双链、关联机构双链与统计指标，在思源知识图谱中形成以城市为枢纽的星系拓扑。
 */
export function buildCityTopicDocumentMarkdown(input: CityTopicInput): string {
    const lines: string[] = [];
    const cityName = input.city.trim() || "未命名城市";
    const orgCount = input.organizations ? input.organizations.length : 0;
    
    lines.push(`# 📍 城市人脉 · ${cityName}`);
    lines.push(`> 城市人脉全貌：共 ${input.contacts.length} 位好友 · ${orgCount} 家关联机构 · 更新时间：${input.generatedDate}`);
    lines.push("");

    lines.push("## 常驻与同城好友");
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
        lines.push("## 关联组织与机构");
        for (const org of input.organizations) {
            const cleanOrgName = escapeLinkLabel(org.name);
            lines.push(`- [${cleanOrgName}](siyuan://blocks/${org.docId})`);
        }
        lines.push("");
    }

    return lines.join("\n");
}
