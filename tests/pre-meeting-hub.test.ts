import assert from "node:assert/strict";
import test from "node:test";
import {
    buildContactPreMeetingDossier,
    filterPreMeetingDossiers,
    type ContactPreMeetingDossier,
} from "../src/domain/pre-meeting-hub.ts";
import {
    formatPreMeetingBriefCallout,
    formatPreMeetingBriefDailyNote,
    formatPreMeetingBriefText,
} from "../src/domain/pre-meeting-brief.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { PersonSocialPreferenceItem } from "../src/domain/social-preferences.ts";
import type { PersonPromiseItem } from "../src/domain/promises.ts";
import type { PersonTopicItem } from "../src/domain/topics.ts";

test("pre-meeting-hub domain: buildContactPreMeetingDossier 提取雷区与待办承诺", () => {
    const person: ContactSummary = {
        docId: "doc-1",
        itemId: "item-1",
        name: "方总",
        phone: "13800001111",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "投资人",
        tags: ["半导体"],
        relatedItemIds: [],
    };

    const prefs: PersonSocialPreferenceItem[] = [
        { id: "p1", personDocId: "doc-1", category: "dietary", content: "海鲜严重过敏", isTaboo: true, createdAt: 100, updatedAt: 100 },
        { id: "p2", personDocId: "doc-1", category: "beverage", content: "喜美式咖啡", isTaboo: false, createdAt: 100, updatedAt: 100 },
    ];

    const promises: PersonPromiseItem[] = [
        { id: "prm1", personDocId: "doc-1", direction: "i_promised", title: "发送行业报告", promisedOn: "2026-10-20", dueOn: "2026-10-28", status: "pending", createdAt: 100, updatedAt: 100 },
        { id: "prm2", personDocId: "doc-1", direction: "they_promised", title: "介绍专家", promisedOn: "2026-10-15", status: "fulfilled", fulfilledOn: "2026-10-22", createdAt: 100, updatedAt: 100 },
    ];

    const topics: PersonTopicItem[] = [
        { id: "t1", text: "询问下一轮融资意向", createdAt: 100 },
    ];

    const dossier = buildContactPreMeetingDossier(person, prefs, promises, topics, "2026-10-29");
    assert.equal(dossier.taboos.length, 1);
    assert.equal(dossier.taboos[0]?.content, "海鲜严重过敏");
    assert.equal(dossier.normalPreferences.length, 1);
    assert.equal(dossier.normalPreferences[0]?.content, "喜美式咖啡");
    assert.equal(dossier.pendingPromises.length, 1);
    assert.equal(dossier.pendingPromises[0]?.title, "发送行业报告");
    assert.equal(dossier.topics.length, 1);
    assert.equal(dossier.hasUrgentAlerts, true); // 既有红线雷区，又有逾期承诺
});

test("pre-meeting-hub domain: filterPreMeetingDossiers 多维搜索与分类过滤", () => {
    const p1: ContactSummary = { docId: "d1", itemId: "i1", name: "张三", phone: "", email: "", wechat: "", website: "", birthday: "", isLunar: false, group: "朋友", tags: ["AI"], relatedItemIds: [] };
    const p2: ContactSummary = { docId: "d2", itemId: "i2", name: "李四", phone: "", email: "", wechat: "", website: "", birthday: "", isLunar: false, group: "同事", tags: [], relatedItemIds: [] };

    const d1: ContactPreMeetingDossier = {
        person: p1,
        taboos: [{ id: "1", personDocId: "d1", category: "dietary", content: "乳糖不耐受", isTaboo: true, createdAt: 1, updatedAt: 1 }],
        normalPreferences: [],
        pendingPromises: [],
        topics: [],
        hasUrgentAlerts: true,
    };

    const d2: ContactPreMeetingDossier = {
        person: p2,
        taboos: [],
        normalPreferences: [],
        pendingPromises: [{ id: "2", personDocId: "d2", direction: "i_promised", title: "还书", promisedOn: "2026-10-01", status: "pending", createdAt: 1, updatedAt: 1 }],
        topics: [],
        hasUrgentAlerts: false,
    };

    const all = [d1, d2];

    // 关键词搜索
    assert.equal(filterPreMeetingDossiers(all, "乳糖").length, 1);
    assert.equal(filterPreMeetingDossiers(all, "还书").length, 1);
    assert.equal(filterPreMeetingDossiers(all, "张三").length, 1);

    // 类型过滤
    assert.equal(filterPreMeetingDossiers(all, "", "taboo_only").length, 1);
    assert.equal(filterPreMeetingDossiers(all, "", "taboo_only")[0]?.person.name, "张三");
    assert.equal(filterPreMeetingDossiers(all, "", "promise_only").length, 1);
    assert.equal(filterPreMeetingDossiers(all, "", "promise_only")[0]?.person.name, "李四");
});

test("pre-meeting-brief: formatPreMeetingBriefCallout 组装符合思源原生 Callout 引述块规范的 Markdown", () => {
    const brief = {
        personName: "张三",
        lastMetText: "2026-10-15 讨论方案",
        statusSummary: "渐冷 (35 天未联系)",
        originText: "2024-05 行业峰会",
        dietAndPreferences: ["☕ 喜美式咖啡", "🍲 清淡为主"],
        taboos: ["🚫 避免谈论跳槽"],
        sharedNetwork: ["🤝 引荐人: 王五", "李四 (同场 2 次)"],
    };

    const callout = formatPreMeetingBriefCallout(brief);
    assert.ok(callout.startsWith(">>>\n⚡ **会前 30 秒破冰速览 · 张三**"), "引述块应以 >>> 开头并带标题");
    assert.ok(callout.endsWith("\n>>>"), "引述块应以 >>> 结尾闭合");
    assert.ok(callout.includes("- 💬 **上次互动**：2026-10-15 讨论方案"));
    assert.ok(callout.includes("- 📊 **状态近况**：渐冷 (35 天未联系)"));
    assert.ok(callout.includes("- 🌱 **初识溯源**：2024-05 行业峰会"));
    assert.ok(callout.includes("- ❤️ **喜好习惯**：☕ 喜美式咖啡；🍲 清淡为主"));
    assert.ok(callout.includes("- ⚠️ **禁忌雷区**：🚫 避免谈论跳槽"));
    assert.ok(callout.includes("- 👥 **共同熟人**：🤝 引荐人: 王五、李四 (同场 2 次)"));

    const plain = formatPreMeetingBriefText(brief);
    assert.ok(plain.includes("⚡ 会前 30 秒破冰速览 · 张三"));
    assert.ok(!plain.startsWith(">>>"));

    const daily = formatPreMeetingBriefDailyNote(brief);
    assert.ok(daily.includes("### ⚡ 会前 30 秒破冰速览 · [[张三]]"), "日记格式必须包含双链标题");
    assert.ok(daily.includes('{: custom-type="meeting-brief" custom-person="张三" }'), "必须注入标准 IAL 属性");
});
