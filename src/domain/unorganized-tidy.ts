/**
 * 待安顿无序联系人智能整理与批量归纳纯函数域模型（E-64）：
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束，node --test 直接可测。
 * 针对无分组、无标签或常驻城市未知的人脉，基于已有履历背景、组织词根与现有分组库，
 * 纯本地智能推断最可能的归属分组、常驻地与推荐标签，实现一键批量安顿治理。
 */
import type { ContactSummary } from "./person.ts";
import { profileText } from "./people-profiles.ts";
import { extractNormalizedRegion } from "./region.ts";
import { inferPersonaTags } from "./tag-inference.ts";

export interface TidyPlanItem {
    person: ContactSummary;
    currentGroup: string;
    currentCity: string;
    currentTags: string[];
    suggestedGroup: string;
    suggestedCity: string;
    suggestedTags: string[];
    isMissingGroup: boolean;
    isMissingTags: boolean;
    isMissingCity: boolean;
}

const COMMON_CITIES = [
    "北京", "上海", "深圳", "广州", "杭州", "南京", "苏州", "成都", "武汉",
    "西安", "重庆", "天津", "长沙", "合肥", "青岛", "厦门", "无锡", "宁波",
    "郑州", "大连", "福州", "济南", "香港", "澳门", "台北", "新加坡",
];

const GROUP_KEYWORD_RULES: readonly { groupPattern: RegExp; defaultGroup: string; keywords: string[] }[] = [
    { groupPattern: /投资|资本|基金|vc|pe/i, defaultGroup: "投资机构", keywords: ["投资", "创投", "资本", "基金", "证券", "资产管理", "vc", "pe", "合伙人"] },
    { groupPattern: /高校|学者|学术|教育|科研/i, defaultGroup: "高校学者", keywords: ["大学", "学院", "研究所", "教授", "讲师", "博导", "硕导", "研究员", "实验室"] },
    { groupPattern: /科技|研发|技术|互联网/i, defaultGroup: "科技研发", keywords: ["科技", "软件", "算法", "互联网", "网络", "系统", "技术顾问", "程序员", "架构师"] },
    { groupPattern: /医疗|健康|生物|医药/i, defaultGroup: "医疗健康", keywords: ["医疗", "生物", "制药", "医院", "临床", "健康", "药业"] },
    { groupPattern: /政府|机关|国企|事业单位/i, defaultGroup: "政企机构", keywords: ["局", "委", "厅", "办", "管委会", "政协", "人大"] },
    { groupPattern: /客户|商业|合作伙伴/i, defaultGroup: "商务客户", keywords: ["客户", "商务", "采购", "战略合作", "供应链"] },
];

/**
 * 从人物组织、职位和姓名中推断最契合的现有分组
 */
export function inferGroupSuggestion(
    person: ContactSummary,
    availableGroups: readonly string[] = [],
): string {
    if (person.group.trim()) return person.group.trim();

    const rawWork = (person as any).company || (person.profile ? profileText(person.profile, "work") : "");
    const workText = rawWork !== "未填写" && rawWork !== "尚未核实" && rawWork !== "组织归属尚未核实" ? rawWork : "";
    const corpus = `${person.name} ${workText} ${person.tags.join(" ")}`.toLowerCase();

    // 1. 优先匹配用户已有分组列表中的关键词
    for (const grp of availableGroups) {
        const cleanGrp = grp.trim();
        if (!cleanGrp || cleanGrp === "未分组") continue;
        if (corpus.includes(cleanGrp.toLowerCase())) {
            return cleanGrp;
        }
    }

    // 2. 根据行业关键词匹配用户现有分组；若暂无该类分组则回退标准默认组名
    for (const rule of GROUP_KEYWORD_RULES) {
        const hasKeyword = rule.keywords.some((kw) => corpus.includes(kw.toLowerCase()));
        if (hasKeyword) {
            const matchedExisting = availableGroups.find((g) => rule.groupPattern.test(g));
            if (matchedExisting) return matchedExisting;
            return rule.defaultGroup;
        }
    }

    return "";
}

/**
 * 从组织经历与文本中推断常驻城市
 */
export function inferCitySuggestion(person: ContactSummary): string {
    const reg = extractNormalizedRegion(person);
    if (reg.city && reg.city !== "未知" && reg.city !== "未填写") {
        return reg.city;
    }

    const rawWork = (person as any).company || (person.profile ? profileText(person.profile, "work") : "");
    const workText = rawWork !== "未填写" && rawWork !== "尚未核实" && rawWork !== "组织归属尚未核实" ? rawWork : "";
    const corpus = `${workText} ${person.name} ${person.tags.join(" ")}`;

    for (const city of COMMON_CITIES) {
        if (corpus.includes(city)) {
            return city;
        }
    }

    return "";
}

/**
 * 判断联系人是否处于“待安顿整理”状态（缺分组、无标签或常驻城市未知）
 */
export function isUnorganizedPerson(person: ContactSummary): boolean {
    const hasNoGroup = !person.group.trim();
    const hasNoTags = person.tags.length === 0;
    const reg = extractNormalizedRegion(person);
    const hasNoCity = !reg.city || reg.city === "未知" || reg.city === "未填写";
    return hasNoGroup || hasNoTags || hasNoCity;
}

/**
 * 为全库待安顿联系人生成结构化整理计划
 */
export function buildTidyPlan(
    people: readonly ContactSummary[],
    availableGroups: readonly string[] = [],
): TidyPlanItem[] {
    const plan: TidyPlanItem[] = [];

    for (const person of people) {
        if (!isUnorganizedPerson(person)) continue;

        const reg = extractNormalizedRegion(person);
        const currentCity = reg.city && reg.city !== "未知" && reg.city !== "未填写" ? reg.city : "";
        const isMissingGroup = !person.group.trim();
        const isMissingTags = person.tags.length === 0;
        const isMissingCity = !currentCity;

        const suggestedGroup = isMissingGroup ? inferGroupSuggestion(person, availableGroups) : "";
        const suggestedCity = isMissingCity ? inferCitySuggestion(person) : "";

        const rawWork = (person as any).company || (person.profile ? profileText(person.profile, "work") : "");
        const workText = rawWork !== "未填写" && rawWork !== "尚未核实" && rawWork !== "组织归属尚未核实" ? rawWork : "";
        const suggestedTags = isMissingTags ? inferPersonaTags({
            name: person.name,
            workText: workText || undefined,
            city: currentCity || suggestedCity,
            existingTags: person.tags,
        }) : [];

        plan.push({
            person,
            currentGroup: person.group,
            currentCity,
            currentTags: [...person.tags],
            suggestedGroup,
            suggestedCity,
            suggestedTags,
            isMissingGroup,
            isMissingTags,
            isMissingCity,
        });
    }

    return plan;
}
