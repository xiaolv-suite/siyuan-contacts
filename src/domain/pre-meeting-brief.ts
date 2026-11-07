/**
 * 会前 30 秒破冰速览纯函数域模型（Monica 标杆融合）。
 * 纯函数：零 DOM、零 IO，node --test 直接可测。
 * 针对即将见面的联系人，极速汇总：上次聊了什么、对方近期近况、喜好忌口与共同熟人。
 */
import type { ContactSummary } from "./person.ts";
import type { PersonOrigin } from "./person-origin.ts";
import type { PersonSocialPreferenceItem } from "./social-preferences.ts";
import type { PersonFactItem } from "./doc-section.ts";
import type { TimelineItem } from "./interactions.ts";
import { computeRelationshipHealth } from "./cadence.ts";

export interface PreMeetingBrief {
    personName: string;
    /** 上次聊了什么（最近互动记录的日期、类型、备注摘要） */
    lastMetText: string;
    /** 关系状态与近期近况（健康度分级、过去 30 天互动频次） */
    statusSummary: string;
    /** 初识溯源与引荐人（如何认识、谁引荐的） */
    originText: string;
    /** 喜好与忌口（饮食、饮品、交往习惯） */
    dietAndPreferences: string[];
    /** 敏感话题与禁忌雷区 */
    taboos: string[];
    /** 共同熟人 / 引荐伙伴 */
    sharedNetwork: string[];
}

export interface BuildPreMeetingBriefOptions {
    person: ContactSummary;
    origin?: PersonOrigin;
    socialPreferences?: readonly PersonSocialPreferenceItem[];
    facts?: readonly PersonFactItem[];
    timeline?: readonly TimelineItem[];
    coAttendance?: readonly { name: string; count: number }[];
    introducerName?: string;
    cadenceDays?: number;
    nowTime?: number;
}

export function buildPreMeetingBrief(options: BuildPreMeetingBriefOptions): PreMeetingBrief {
    const {
        person,
        origin,
        socialPreferences = [],
        facts = [],
        timeline = [],
        coAttendance = [],
        introducerName,
        cadenceDays = 30,
        nowTime = Date.now(),
    } = options;

    // 1. 上次聊了什么
    let lastMetText = "暂无往期互动记录";
    const latest = timeline[0];
    const latestTime = latest?.occurredAt ?? (latest?.localDate ? new Date(latest.localDate.replace(/-/g, "/")).getTime() : undefined);
    if (latest && latestTime !== undefined) {
        const daysAgo = Math.floor(Math.max(0, nowTime - latestTime) / (86400 * 1000));
        const daysDesc = daysAgo === 0 ? "今天" : daysAgo === 1 ? "昨天" : `${daysAgo}天前`;
        const note = latest.note ? `“${latest.note.trim()}”` : "已记录互动";
        const groupDesc = latest.groupSize > 1 ? ` (${latest.groupSize}人同场)` : "";
        lastMetText = `${latest.localDate} (${daysDesc})${groupDesc} · ${note}`;
    }

    // 2. 关系状态与近况
    const health = computeRelationshipHealth({
        cadenceDays,
        lastInteractionTime: latestTime,
        nowTime,
    });
    const levelMap: Record<string, string> = {
        hot: "🔥 温热亲密",
        warm: "🍃 常温良好",
        cool: "🌬️ 微凉逾期",
        cold: "❄️ 渐冻疏离",
        paused: "⏸️ 已暂停提醒",
        unknown: "⚪ 尚未建立联系",
    };
    const thirtyDaysAgo = nowTime - 30 * 86400 * 1000;
    const recent30dCount = timeline.filter((item) => {
        const t = item.occurredAt ?? (item.localDate ? new Date(item.localDate.replace(/-/g, "/")).getTime() : 0);
        return t >= thirtyDaysAgo;
    }).length;
    const statusSummary = `${levelMap[health.level] || "良好"} · 过去30天互动 ${recent30dCount} 次`;

    // 3. 初识溯源
    const originParts: string[] = [];
    if (origin?.metAt) {
        originParts.push(`初识于 ${origin.metAt}`);
    }
    if (introducerName) {
        originParts.push(`由 ${introducerName} 引荐`);
    }
    const originText = originParts.length > 0 ? originParts.join(" · ") : "尚未记录初识场合与引荐人";

    // 4. 喜好忌口与雷区（合并人物文档事实段 preference/isTaboo 与存量社交偏好）
    const dietAndPreferences: string[] = [];
    const taboos: string[] = [];
    const seenPrefTexts = new Set<string>();
    const seenTabooTexts = new Set<string>();

    if (origin?.preferences) {
        const trimmed = origin.preferences.trim();
        if (trimmed) {
            seenPrefTexts.add(trimmed);
            dietAndPreferences.push(trimmed);
        }
    }

    for (const fact of facts) {
        if (fact.category !== "preference") continue;
        const trimmed = fact.text.trim();
        if (!trimmed) continue;
        if (fact.isTaboo) {
            if (!seenTabooTexts.has(trimmed)) {
                seenTabooTexts.add(trimmed);
                taboos.push(`🚫 ${trimmed}`);
            }
        } else if (!seenPrefTexts.has(trimmed)) {
            seenPrefTexts.add(trimmed);
            dietAndPreferences.push(`❤️ ${trimmed}`);
        }
    }

    for (const item of socialPreferences) {
        const trimmed = item.content.trim();
        if (!trimmed) continue;
        if (item.isTaboo || item.category === "taboos") {
            if (!seenTabooTexts.has(trimmed)) {
                seenTabooTexts.add(trimmed);
                taboos.push(`🚫 ${trimmed}`);
            }
        } else if (!seenPrefTexts.has(trimmed)) {
            seenPrefTexts.add(trimmed);
            const icon = item.category === "dietary" ? "🍲" : item.category === "beverage" ? "☕" : "🤝";
            dietAndPreferences.push(`${icon} ${trimmed}`);
        }
    }

    // 5. 共同熟人
    const sharedNetwork: string[] = [];
    if (introducerName) {
        sharedNetwork.push(`🤝 引荐人: ${introducerName}`);
    }
    for (const co of coAttendance.slice(0, 3)) {
        sharedNetwork.push(`${co.name} (同场 ${co.count} 次)`);
    }

    return {
        personName: person.name,
        lastMetText,
        statusSummary,
        originText,
        dietAndPreferences,
        taboos,
        sharedNetwork,
    };
}

/**
 * 组装便于一键复制的 Markdown 纯文本会前备忘录
 */
export function formatPreMeetingBriefText(brief: PreMeetingBrief): string {
    const lines: string[] = [
        `⚡ 会前 30 秒破冰速览 · ${brief.personName}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `💬 上次互动: ${brief.lastMetText}`,
        `📊 状态近况: ${brief.statusSummary}`,
        `🌱 初识溯源: ${brief.originText}`,
    ];

    if (brief.dietAndPreferences.length > 0) {
        lines.push(`❤️ 喜好习惯: ${brief.dietAndPreferences.join("；")}`);
    }
    if (brief.taboos.length > 0) {
        lines.push(`⚠️ 禁忌雷区: ${brief.taboos.join("；")}`);
    }
    if (brief.sharedNetwork.length > 0) {
        lines.push(`👥 共同熟人: ${brief.sharedNetwork.join("、")}`);
    }

    return lines.join("\n");
}

/**
 * 组装便于直接粘贴入思源笔记会议纪要的 Callout 引述块 Markdown（>>> 语法）
 */
export function formatPreMeetingBriefCallout(brief: PreMeetingBrief): string {
    const lines: string[] = [
        ">>>",
        `⚡ **会前 30 秒破冰速览 · ${brief.personName}**`,
        "",
        `- 💬 **上次互动**：${brief.lastMetText}`,
        `- 📊 **状态近况**：${brief.statusSummary}`,
        `- 🌱 **初识溯源**：${brief.originText}`,
    ];

    if (brief.dietAndPreferences.length > 0) {
        lines.push(`- ❤️ **喜好习惯**：${brief.dietAndPreferences.join("；")}`);
    }
    if (brief.taboos.length > 0) {
        lines.push(`- ⚠️ **禁忌雷区**：${brief.taboos.join("；")}`);
    }
    if (brief.sharedNetwork.length > 0) {
        lines.push(`- 👥 **共同熟人**：${brief.sharedNetwork.join("、")}`);
    }

    lines.push(">>>");
    return lines.join("\n");
}

/**
 * 组装便于直接追加进今日日记（Daily Note）的结构化速览块（带原生双链与 IAL 标记）
 */
export function formatPreMeetingBriefDailyNote(brief: PreMeetingBrief): string {
    const safeName = (brief.personName || "联系人").trim().replace("[", "【").replace("]", "】");
    const lines: string[] = [
        `### ⚡ 会前 30 秒破冰速览 · [[${safeName}]]`,
        "",
        `- 💬 **上次互动**：${brief.lastMetText}`,
        `- 📊 **状态近况**：${brief.statusSummary}`,
        `- 🌱 **初识溯源**：${brief.originText}`,
    ];

    if (brief.dietAndPreferences.length > 0) {
        lines.push(`- ❤️ **喜好习惯**：${brief.dietAndPreferences.join("；")}`);
    }
    if (brief.taboos.length > 0) {
        lines.push(`- ⚠️ **禁忌雷区**：${brief.taboos.join("；")}`);
    }
    if (brief.sharedNetwork.length > 0) {
        lines.push(`- 👥 **共同熟人**：${brief.sharedNetwork.join("、")}`);
    }

    lines.push(`{: custom-type="meeting-brief" custom-person="${safeName.replace(/"/g, "")}" }`);
    return lines.join("\n");
}
