/**
 * 联系人常识复习闪卡（Spaced Repetition Flashcards）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 遵循思源笔记标准 Riff 闪卡规范语法（custom-riff-decks 与 ? 问答分隔），
 * 将联系人核心画像、喜好忌口、经历背景与关键事实自动组装为高效复习卡包。
 */

import type { ContactSummary } from "./person.ts";
import type { PersonFactItem } from "./doc-section.ts";
import type { PersonTopicItem } from "./topics.ts";
import { escapeLinkLabel } from "./format.ts";

export type FlashcardCategory =
    | "profile"
    | "birthday"
    | "preference"
    | "background"
    | "quote"
    | "fact"
    | "topics";

export interface PersonFlashcard {
    id: string;
    category: FlashcardCategory;
    title: string;
    prompt: string;
    answer: string;
}

/**
 * 根据联系人的资料、事实画像与会面谈资生成一组高质量问答闪卡。
 */
export function buildPersonFlashcards(
    person: ContactSummary,
    facts: readonly PersonFactItem[] = [],
    topics: readonly PersonTopicItem[] = [],
): PersonFlashcard[] {
    const name = person.name.trim() || "未命名联系人";
    const cards: PersonFlashcard[] = [];

    // 1. 基本资料与职位卡片
    const orgs: string[] = [];
    const affs = person.profile?.affiliations;
    if (affs?.state === "known" && affs.value) {
        const works = affs.value.work || [];
        for (const w of works) {
            const orgStr = [w.orgName, w.department, w.title].filter(Boolean).join(" · ");
            if (orgStr) orgs.push(orgStr);
        }
    }
    if (person.group) orgs.push(`分组：${person.group}`);
    if (person.tags && person.tags.length > 0) orgs.push(`标签：${person.tags.join("、")}`);

    if (orgs.length > 0 || person.phone || person.wechat) {
        const details: string[] = [...orgs];
        if (person.phone) details.push(`电话：${person.phone}`);
        if (person.wechat) details.push(`微信：${person.wechat}`);

        cards.push({
            id: `card-profile-${person.itemId || person.docId}`,
            category: "profile",
            title: "基本资料与身份画像",
            prompt: `【基本资料】${name} 的组织职位、分组标签与核心联系方式是？`,
            answer: details.join("\n"),
        });
    }

    // 2. 生日与特殊纪念日
    if (person.birthday && person.birthday.trim()) {
        const cal = person.isLunar ? "农历" : "公历";
        cards.push({
            id: `card-bday-${person.itemId || person.docId}`,
            category: "birthday",
            title: "生日与历法",
            prompt: `【重要日期】${name} 的生日是哪一天？历法是什么？`,
            answer: `${cal} ${person.birthday}`,
        });
    }

    // 3. 喜好与忌口（preference）
    const prefFacts = facts.filter((f) => f.category === "preference");
    if (prefFacts.length > 0) {
        cards.push({
            id: `card-pref-${person.itemId || person.docId}`,
            category: "preference",
            title: "喜好忌口与品味偏好",
            prompt: `【喜好偏好】${name} 的饮食忌口、茶酒品味或日常休闲偏好有哪些？`,
            answer: prefFacts.map((f, i) => `${i + 1}. ${f.text}`).join("\n"),
        });
    }

    // 4. 背景经历与家庭履历（background）
    const bgFacts = facts.filter((f) => f.category === "background");
    if (bgFacts.length > 0) {
        cards.push({
            id: `card-bg-${person.itemId || person.docId}`,
            category: "background",
            title: "从业背景与履历细节",
            prompt: `【背景履历】${name} 的过往任职经历、毕业院校或家庭背景是什么？`,
            answer: bgFacts.map((f, i) => `${i + 1}. ${f.text}`).join("\n"),
        });
    }

    // 5. 核心观点与业务主张（quote）
    const quoteFacts = facts.filter((f) => f.category === "quote");
    if (quoteFacts.length > 0) {
        cards.push({
            id: `card-quote-${person.itemId || person.docId}`,
            category: "quote",
            title: "核心观点与行业洞察",
            prompt: `【观点主张】${name} 曾提出过哪些核心业务主张或独到观点？`,
            answer: quoteFacts.map((f, i) => `${i + 1}. ${f.text}`).join("\n"),
        });
    }

    // 6. 关键事实与近期事项（fact）
    const generalFacts = facts.filter((f) => f.category === "fact");
    if (generalFacts.length > 0) {
        cards.push({
            id: `card-fact-${person.itemId || person.docId}`,
            category: "fact",
            title: "关键事实与备忘事项",
            prompt: `【关键事实】关于 ${name} 有哪些需要牢记的事实与近期约定？`,
            answer: generalFacts.map((f, i) => `${i + 1}. ${f.text}`).join("\n"),
        });
    }

    // 7. 会面谈资与承诺备忘（topics）
    if (topics.length > 0) {
        cards.push({
            id: `card-topics-${person.itemId || person.docId}`,
            category: "topics",
            title: "下次会面谈资与承诺",
            prompt: `【会面谈资】下次见到 ${name} 时，建议聊什么话题或落实什么承诺？`,
            answer: topics.map((t, i) => `${i + 1}. ${t.text}`).join("\n"),
        });
    }

    return cards;
}

/**
 * 组装符合思源笔记标准的闪卡 Markdown 实体文档。
 */
export function buildFlashcardDocumentMarkdown(
    person: ContactSummary,
    cards: readonly PersonFlashcard[],
    deckName: string = "人脉记忆",
): string {
    const name = person.name.trim() || "未命名联系人";
    const cleanName = escapeLinkLabel(name);
    const lines: string[] = [];

    lines.push(`# 🎴 人脉记忆闪卡 · ${cleanName}`);
    lines.push("");
    lines.push(`> 👥 归属人物：[${cleanName}](siyuan://blocks/${person.docId})`);
    lines.push(`> 💡 本文档包含 **${cards.length}** 张人脉复习闪卡，已标记入「${deckName}」卡包。`);
    lines.push(`> 📖 可在思源笔记【闪卡】面板中选择「${deckName}」进行间隔重复复习，牢记社交细节。`);
    lines.push("");

    if (cards.length === 0) {
        lines.push("*暂无可用闪卡。请先在人物详情中补充基本资料、记互动提炼事实画像或添加会面谈资。*");
        lines.push("");
        return lines.join("\n");
    }

    for (const card of cards) {
        lines.push(`### 🎴 ${card.title}`);
        lines.push("");
        lines.push(card.prompt);
        lines.push(`{: custom-riff-decks="${deckName}" }`);
        lines.push("?");
        lines.push(card.answer);
        lines.push("");
    }

    return lines.join("\n");
}

export interface BatchPersonFlashcardInput {
    person: ContactSummary;
    facts?: readonly PersonFactItem[];
    topics?: readonly PersonTopicItem[];
}

/**
 * 组装针对多个联系人的批量复习闪卡 Markdown 实体文档。
 * 纯函数：零外部依赖。
 */
export function buildBatchFlashcardsDocumentMarkdown(
    batch: readonly BatchPersonFlashcardInput[],
    deckName: string = "人脉记忆",
    batchTitle?: string,
): string {
    const title = batchTitle?.trim() || `批量汇编（${batch.length} 人）`;
    const cleanTitle = escapeLinkLabel(title);

    // 统计总卡片数
    const entries: Array<{ person: ContactSummary; cards: PersonFlashcard[] }> = [];
    let totalCards = 0;

    for (const item of batch) {
        const cards = buildPersonFlashcards(item.person, item.facts ?? [], item.topics ?? []);
        if (cards.length > 0) {
            entries.push({ person: item.person, cards });
            totalCards += cards.length;
        }
    }

    const lines: string[] = [];
    lines.push(`# 🎴 人脉记忆闪卡 · ${cleanTitle}`);
    lines.push("");
    lines.push(`> 👥 涵盖联系人：共 **${batch.length}** 位（其中 **${entries.length}** 位包含记忆细节）`);
    lines.push(`> 💡 本合辑共汇编 **${totalCards}** 张复习闪卡，已标记入「${deckName}」卡包。`);
    lines.push(`> 📖 可在思源笔记【闪卡】面板中选择「${deckName}」进行集中间隔重复复习。`);
    lines.push("");

    if (entries.length === 0) {
        lines.push("*所选联系人暂无可提取的有效闪卡细节。*");
        lines.push("");
        return lines.join("\n");
    }

    for (const entry of entries) {
        const name = entry.person.name.trim() || "未命名联系人";
        const cleanName = escapeLinkLabel(name);
        lines.push(`## 👤 [${cleanName}](siyuan://blocks/${entry.person.docId})`);
        lines.push("");

        for (const card of entry.cards) {
            lines.push(`### 🎴 ${card.title}（${cleanName}）`);
            lines.push("");
            lines.push(card.prompt);
            lines.push(`{: custom-riff-decks="${deckName}" }`);
            lines.push("?");
            lines.push(card.answer);
            lines.push("");
        }
    }

    return lines.join("\n");
}
