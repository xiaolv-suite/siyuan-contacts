/**
 * 名片语义智能画像标签自动推断引擎（Persona Tag Inference Engine）：
 * 依据联系人的职业背景、组织归属、谈资喜好与事实画像，纯本地智能推导多层级画像标签（如 #行业/科技、#偏好/茶道）。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */

export interface PersonaTagInferenceInput {
    name: string;
    workText?: string;
    organizations?: readonly string[];
    facts?: readonly { text: string; category?: string }[];
    topics?: readonly { text: string }[];
    socialPreferences?: readonly { content: string; category?: string }[];
    promises?: readonly { title: string; detail?: string }[];
    city?: string;
    existingTags?: readonly string[];
}

interface TagRule {
    tag: string;
    keywords: readonly string[];
}

const INDUSTRY_RULES: readonly TagRule[] = [
    { tag: "#行业/人工智能", keywords: ["ai", "大模型", "算法", "深度学习", "机器学习", "llm", "agent"] },
    { tag: "#行业/云计算", keywords: ["云存储", "云计算", "云原生", "ceph", "k8s", "kubernetes", "底层架构"] },
    { tag: "#行业/软件科技", keywords: ["科技", "互联网", "软件", "系统架构", "技术顾问", "程序员", "开发"] },
    { tag: "#行业/金融投资", keywords: ["投资", "创投", "资本", "基金", "证券", "银行", "vc", "pe", "融资", "风控", "资产管理"] },
    { tag: "#行业/医疗健康", keywords: ["医疗", "生物", "制药", "医院", "医生", "临床", "大健康"] },
    { tag: "#行业/高等教育", keywords: ["大学", "高校", "教授", "学术", "博士", "研究员", "学院"] },
    { tag: "#行业/法律合规", keywords: ["律师", "律所", "法务", "合规", "法律顾问"] },
    { tag: "#行业/文化传媒", keywords: ["媒体", "设计", "自媒体", "内容", "艺术", "作家", "出版社"] },
    { tag: "#行业/先进制造", keywords: ["制造", "芯片", "半导体", "硬件", "供应链", "工业"] },
    { tag: "#行业/出海跨境", keywords: ["出海", "跨境", "海外", "外贸", "国际化", "global"] },
];

const ROLE_RULES: readonly TagRule[] = [
    { tag: "#身份/创始人合伙人", keywords: ["创始人", "联合创始人", "合伙人", "ceo", "总裁", "董事长"] },
    { tag: "#身份/技术管理", keywords: ["cto", "技术总监", "架构师", "研发总监", "技术负责人", "tech lead"] },
    { tag: "#身份/专业顾问", keywords: ["顾问", "专家", "咨询师", "独立董事"] },
];

const PREFERENCE_RULES: readonly TagRule[] = [
    { tag: "#偏好/品茶", keywords: ["岩茶", "普洱", "肉桂", "龙井", "饮茶", "茶道", "泡茶", "茶艺"] },
    { tag: "#偏好/精品咖啡", keywords: ["手冲", "咖啡", "冷萃", "拿铁", "咖啡豆"] },
    { tag: "#偏好/户外运动", keywords: ["徒步", "露营", "骑行", "马拉松", "登山", "滑雪", "攀岩"] },
    { tag: "#偏好/健身运动", keywords: ["健身", "游泳", "羽毛球", "网球", "篮球"] },
    { tag: "#偏好/饮食注意", keywords: ["过敏", "忌口", "坚果过敏", "海鲜过敏", "素食", "清淡"] },
    { tag: "#偏好/阅读写作", keywords: ["读书", "写书", "藏书", "书单"] },
];

/**
 * 本地纯函数智能推断多层级画像标签：
 * 分析职业、事实、谈资与城市，自动推导出匹配度最高的画像标签，并排除已有标签。
 */
export function inferPersonaTags(input: PersonaTagInferenceInput): string[] {
    const existing = new Set((input.existingTags || []).map((t) => t.trim()));
    const textCorpus = [
        input.workText || "",
        ...(input.organizations || []),
        ...(input.facts || []).map((f) => f.text),
        ...(input.topics || []).map((t) => t.text),
        ...(input.socialPreferences || []).map((p) => p.content),
        ...(input.promises || []).map((p) => `${p.title} ${p.detail || ""}`),
    ].join(" ").toLowerCase();

    const candidates = new Set<string>();

    // 1. 行业与职业推导
    for (const rule of [...INDUSTRY_RULES, ...ROLE_RULES]) {
        if (rule.keywords.some((kw) => textCorpus.includes(kw.toLowerCase()))) {
            candidates.add(rule.tag);
        }
    }

    // 2. 偏好与生活画像推导（重点从 facts 与 topics 匹配）
    for (const rule of PREFERENCE_RULES) {
        if (rule.keywords.some((kw) => textCorpus.includes(kw.toLowerCase()))) {
            candidates.add(rule.tag);
        }
    }

    // 3. 常驻地域推导
    if (input.city && input.city !== "未知" && input.city.trim().length > 0) {
        const cleanCity = input.city.replace(/市$/, "");
        candidates.add(`#地域/${cleanCity}`);
    }

    // 4. 过滤已存在的标签并排序
    return Array.from(candidates)
        .filter((tag) => !existing.has(tag) && !existing.has(tag.replace(/^#/, "")))
        .slice(0, 8);
}

/**
 * 组装大模型画像标签提取 Prompt（若用户已配置思源内置 AI）
 */
export function buildTagInferencePrompt(input: PersonaTagInferenceInput): string {
    const lines = [
        `分析联系人「${input.name}」的资料，推导推荐 3 到 6 个多层级画像标签（格式如 #行业/科技、#偏好/咖啡、#身份/CTO）。`,
        input.workText ? `职业背景：${input.workText}` : "",
        input.city ? `常驻城市：${input.city}` : "",
        input.facts?.length ? `谈资事实：${input.facts.map((f) => f.text).join("；")}` : "",
        input.topics?.length ? `沟通备忘：${input.topics.map((t) => t.text).join("；")}` : "",
        input.existingTags?.length ? `已有标签（请勿重复）：${input.existingTags.join("、")}` : "",
        "请只输出一个 JSON 数组，例如：[\"#行业/科技\", \"#偏好/品茶\"]",
    ].filter(Boolean);
    return lines.join("\n");
}

export function adoptSuggestedTags(
    currentTags: readonly string[],
    tagsToAdopt: readonly string[],
): string[] {
    const set = new Set(currentTags.map((t) => t.trim()).filter(Boolean));
    for (const tag of tagsToAdopt) {
        const clean = tag.trim();
        if (clean && !set.has(clean)) {
            set.add(clean);
        }
    }
    return Array.from(set);
}
