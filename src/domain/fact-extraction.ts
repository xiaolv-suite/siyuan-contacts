/**
 * 沟通与互动文本事实画像智能提炼引擎（Fact & Quote Extraction Engine）：
 * 纯本地离线从交谈备注、会议纪要等自然语言中智能提炼出观点见解、喜好忌口、背景经历与关键事实。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */
import type { FactCategory, PersonFactItem } from "./doc-section.ts";

export interface ExtractedFactCandidate {
    category: FactCategory;
    text: string;
    confidence: "high" | "medium";
}

const PREFERENCE_KEYWORDS = [
    "喜欢", "喜饮", "喜好", "爱好", "爱吃", "爱喝", "偏好", "常喝", "平时喝", "热衷",
    "不吃", "忌口", "过敏", "素食", "吃素", "坚果过敏", "花生过敏", "海鲜过敏",
];

const BACKGROUND_KEYWORDS = [
    "曾就职", "曾任", "曾负责", "曾工作", "毕业于", "校友", "过去在",
    "前任", "早期在", "老家在", "籍贯", "出生于", "考上", "入职", "升任",
];

const QUOTE_KEYWORDS = [
    "认为", "提出", "指出", "强调", "主张", "观点是", "聊到说", "分享道", "总结道",
];

const FACT_KEYWORDS = [
    "计划去", "准备去", "近期计划", "下个月", "出差", "下周前往", "筹备", "下周去",
    "下个月中旬", "下个月底", "即将前往", "安排在",
];

function cleanClause(clause: string): string {
    return clause
        .trim()
        .replace(/^[他她TAta本人的另外而且此外同时还说提到]+/g, "")
        .replace(/^[，,、\s:：]+/g, "")
        .trim();
}

/**
 * 从单段或多段自然语言沟通文本中智能识别并提炼事实候选
 */
export function extractFactCandidates(text: string): ExtractedFactCandidate[] {
    const clean = text.trim();
    if (!clean) return [];

    // 按分句切分
    const clauses = clean.split(/[，。；！!？?\n\r]+/).map(cleanClause).filter((c) => c.length >= 4 && c.length <= 80);
    const results: ExtractedFactCandidate[] = [];
    const seen = new Set<string>();

    for (const clause of clauses) {
        // 1. 喜好/忌口匹配
        if (PREFERENCE_KEYWORDS.some((kw) => clause.includes(kw))) {
            if (!seen.has(clause)) {
                seen.add(clause);
                results.push({ category: "preference", text: clause, confidence: "high" });
                continue;
            }
        }

        // 2. 背景经历匹配
        if (BACKGROUND_KEYWORDS.some((kw) => clause.includes(kw))) {
            if (!seen.has(clause)) {
                seen.add(clause);
                results.push({ category: "background", text: clause, confidence: "high" });
                continue;
            }
        }

        // 3. 观点见解匹配
        if (QUOTE_KEYWORDS.some((kw) => clause.includes(kw))) {
            if (!seen.has(clause)) {
                seen.add(clause);
                results.push({ category: "quote", text: clause, confidence: "high" });
                continue;
            }
        }

        // 4. 行程与关键事实匹配
        if (FACT_KEYWORDS.some((kw) => clause.includes(kw))) {
            if (!seen.has(clause)) {
                seen.add(clause);
                results.push({ category: "fact", text: clause, confidence: "medium" });
                continue;
            }
        }
    }

    return results;
}

/**
 * 将提取的事实候选转换为带时间与唯一 ID 的标准 PersonFactItem 实体
 */
export function extractFactsFromText(
    text: string,
    dateStr: string,
    sourceRef?: string,
): PersonFactItem[] {
    const candidates = extractFactCandidates(text);
    return candidates.map((c, index) => ({
        id: `fact-auto-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        category: c.category,
        text: c.text,
        date: dateStr,
        ...(sourceRef ? { sourceRef } : {}),
    }));
}
