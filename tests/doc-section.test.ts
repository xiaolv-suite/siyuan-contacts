import { test } from "node:test";
import assert from "node:assert/strict";
import {
    profileSectionMarkdown,
    interactionSectionMarkdown,
    followupsSectionMarkdown,
    exchangesSectionMarkdown,
    anniversariesSectionMarkdown,
    relatedSectionMarkdown,
    PROFILE_SECTION_ATTR,
    INTERACTIONS_SECTION_ATTR,
    RELATED_SECTION_ATTR,
    FOLLOWUPS_SECTION_ATTR,
    EXCHANGES_SECTION_ATTR,
    ANNIVERSARIES_SECTION_ATTR,
    FACTS_SECTION_ATTR,
    buildFactsSectionMarkdown,
    parseFactsSectionMarkdown,
    type PersonFactItem,
} from "../src/domain/doc-section.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { InteractionEvent } from "../src/domain/interactions.ts";
import type { FollowUpItem } from "../src/domain/followups.ts";
import type { ExchangeRecord } from "../src/domain/exchanges.ts";
import type { AnniversaryItem } from "../src/domain/anniversaries.ts";

test("doc-section 属性标记常量契约稳定", () => {
    assert.equal(PROFILE_SECTION_ATTR, "custom-lvct-profile");
    assert.equal(INTERACTIONS_SECTION_ATTR, "custom-lvct-interactions");
    assert.equal(RELATED_SECTION_ATTR, "custom-lvct-related");
    assert.equal(FOLLOWUPS_SECTION_ATTR, "custom-lvct-followups");
    assert.equal(EXCHANGES_SECTION_ATTR, "custom-lvct-exchanges");
    assert.equal(ANNIVERSARIES_SECTION_ATTR, "custom-lvct-anniversaries");
});

test("profileSectionMarkdown：生成人脉基本档案 Markdown 区块", () => {
    const person: ContactSummary = {
        docId: "20261023000000-doc001",
        itemId: "item-001",
        name: "张三",
        phone: "13800000000",
        wechat: "zhangsan_wx",
        email: "zhangsan@example.com",
        website: "",
        birthday: "1990-05-20",
        isLunar: false,
        group: "同事",
        tags: ["投资", "合伙人"],
        relatedItemIds: [],
    };
    const md = profileSectionMarkdown(person);
    assert.match(md, /## 人脉基本档案/);
    assert.match(md, /- \*\*电话\*\*：13800000000/);
    assert.match(md, /- \*\*微信\*\*：zhangsan_wx/);
    assert.match(md, /- \*\*邮箱\*\*：zhangsan@example\.com/);
    assert.match(md, /- \*\*生日\*\*：1990-05-20/);
    assert.match(md, /- \*\*分组\*\*：同事/);
    assert.match(md, /- \*\*标签\*\*：#投资 #合伙人/);
});

test("思源文档深度联动 P1：profileSectionMarkdown 与 relatedSectionMarkdown 输出思源原生块引用双链 ((((docId 'name'))))", () => {
    const person: ContactSummary = {
        docId: "20261023000000-doc001",
        itemId: "item-001",
        name: "张三",
        phone: "13800000000",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "",
        tags: [],
        relatedItemIds: [],
    };
    const details = {
        origin: {
            metAt: "2024秋季峰会",
            introducedByDocId: "20261001000000-intro01",
            introducedByName: "李四",
        },
        kinships: [
            { relation: "配偶", name: "王小红", linkedDocId: "20261002000000-wife001" },
            { relation: "子女", name: "小明" },
        ],
    };
    const md = profileSectionMarkdown(person, details);
    assert.ok(md.includes("- **初识与引荐**：2024秋季峰会 · 引荐人 ((20261001000000-intro01 '李四'))"), "初识引荐人应生成思源原生块引用双链");
    assert.ok(md.includes("- **家庭亲属**：配偶 ((20261002000000-wife001 '王小红')) · 子女 小明"), "亲属应生成思源原生块引用双链并兼顾未建档亲属");

    const related = [
        { docId: "20261003000000-rel01", itemId: "i1", name: "赵六", phone: "", email: "", wechat: "", website: "", birthday: "", isLunar: false, group: "", tags: [], relatedItemIds: [] },
    ];
    const relatedMd = relatedSectionMarkdown(related);
    assert.equal(relatedMd, "**相关人物**：((20261003000000-rel01 '赵六'))", "相关人物必须生成思源原生块引用以打通原生反向链接面板与局部图谱");
});

test("interactionSectionMarkdown：生成往来记录 Markdown 列表与图标映射", () => {
    const events: InteractionEvent[] = [
        {
            id: "event-1",
            personDocId: "20261023000000-doc001",
            occurredAt: 1761234567000,
            localDate: "2026-10-22",
            type: "meet",
            note: "在金鹰世界见面聊工作",
            source: "manual",
        },
        {
            id: "event-2",
            personDocId: "20261023000000-doc001",
            occurredAt: 1761100000000,
            localDate: "2026-10-20",
            type: "call",
            note: "电话同步进度",
            source: "manual",
        },
    ];
    const md = interactionSectionMarkdown(events);
    assert.match(md, /## 往来记录/);
    assert.match(md, /- 2026-10-22 🤝 见面：在金鹰世界见面聊工作/);
    assert.match(md, /- 2026-10-20 📞 电话：电话同步进度/);
});

test("interactionSectionMarkdown：反链转录条目出处自动升级为思源原生块引深度链接", () => {
    const events: InteractionEvent[] = [
        {
            id: "ev-link",
            personDocId: "20261023000000-doc001",
            occurredAt: 1761234567000,
            localDate: "2026-10-24",
            type: "meeting",
            note: "和张三讨论了产品规划与技术方案（源自笔记《2026-10-24 工作日记》）",
            source: "diary",
            externalRef: "block:20261024100000-blk0001",
        },
    ];
    const md = interactionSectionMarkdown(events);
    assert.match(md, /🤝 见面/);
    assert.match(md, /\[《2026-10-24 工作日记》\]\(siyuan:\/\/blocks\/20261024100000-blk0001\)/);
});

test("followupsSectionMarkdown：生成待办跟进任务 Markdown", () => {
    const items: FollowUpItem[] = [
        {
            id: "fu-1",
            personDocId: "doc-1",
            title: "跟进合同签署",
            dueDate: "2026-10-30",
            status: "open",
        },
        {
            id: "fu-2",
            personDocId: "doc-1",
            title: "已发送初稿",
            dueDate: "2026-10-20",
            status: "done",
        },
        {
            id: "fu-3",
            personDocId: "doc-1",
            title: "已取消事项",
            dueDate: "2026-10-15",
            status: "cancelled",
        },
    ];
    const md = followupsSectionMarkdown(items);
    assert.match(md, /## 待办跟进/);
    assert.match(md, /- \[ \] 📅2026-10-30 跟进合同签署/);
    assert.match(md, /- \[x\] 📅2026-10-20 已发送初稿/);
    assert.equal(md.includes("已取消事项"), false, "已取消事项不应出现在跟进清单中");
});

test("exchangesSectionMarkdown：生成人情往来记录", () => {
    const items: ExchangeRecord[] = [
        {
            id: "ex-1",
            personDocId: "doc-1",
            kind: "item",
            direction: "payable",
            description: "中秋月饼礼盒",
            amount: 398,
            currency: "¥",
            occurredOn: "2026-09-10",
            dueOn: "",
            status: "settled",
            settledOn: "2026-09-10",
            note: "",
            createdAt: 1000,
            updatedAt: 1000,
        },
        {
            id: "ex-2",
            personDocId: "doc-1",
            kind: "item",
            direction: "receivable",
            description: "特级龙井茶",
            currency: "¥",
            occurredOn: "2026-05-20",
            dueOn: "",
            status: "open",
            settledOn: "",
            note: "",
            createdAt: 1000,
            updatedAt: 1000,
        },
    ];
    const md = exchangesSectionMarkdown(items);
    assert.match(md, /## 人情往来/);
    assert.match(md, /- 2026-09-10 应付\/送出：中秋月饼礼盒 \(¥398\) \[已结清\]/);
    assert.match(md, /- 2026-05-20 应收\/收到：特级龙井茶 \[进行中\]/);
});

test("anniversariesSectionMarkdown：生成纪念日记录", () => {
    const items: AnniversaryItem[] = [
        {
            id: "an-1",
            personDocId: "doc-1",
            title: "结婚纪念日",
            date: "05-20",
            isLunar: false,
        },
        {
            id: "an-2",
            personDocId: "doc-1",
            title: "生日",
            date: "1992-08-15",
            isLunar: true,
        },
    ];
    const md = anniversariesSectionMarkdown(items);
    assert.match(md, /## 重要纪念日/);
    assert.match(md, /- 结婚纪念日：05-20/);
    assert.match(md, /- 生日：1992-08-15（农历）/);
});

test("多行备注与标题防裂行转义：自动转为 <br /> 保证 Markdown 列表结构严谨", () => {
    const events: InteractionEvent[] = [{
        id: "ev-multi",
        personDocId: "doc-1",
        occurredAt: 1000,
        localDate: "2026-10-23",
        type: "meet",
        note: "第一行内容\r\n第二行内容\n第三行内容",
        source: "manual",
    }];
    const md = interactionSectionMarkdown(events);
    assert.match(md, /第一行内容 <br \/> 第二行内容 <br \/> 第三行内容/);
    assert.equal(md.split("\n").filter((l) => l.startsWith("- ")).length, 1, "多行备注不应被拆散成多个游离列表项");
});

test("buildFactsSectionMarkdown & parseFactsSectionMarkdown：谈资与事实画像序列化与往返解析", () => {
    assert.equal(FACTS_SECTION_ATTR, "custom-lvct-facts");

    const facts: PersonFactItem[] = [
        {
            id: "fact-01",
            category: "quote",
            date: "2026-10-27",
            text: "私有知识库的治理重在权限边界与最小上下文",
            sourceRef: "2026大模型架构研讨会",
        },
        {
            id: "fact-02",
            category: "preference",
            date: "2026-10-27",
            text: "花生过敏，聚餐避开坚果油；喜饮肉桂岩茶",
        },
        {
            id: "fact-03",
            category: "background",
            date: "2026-10-26",
            text: "曾负责腾讯云存储核心引擎，熟悉底层 Ceph 与 Raft",
        },
        {
            id: "fact-04",
            category: "fact",
            date: "2026-10-25",
            text: "大女儿今年考上浙大数学系",
        },
    ];

    const md = buildFactsSectionMarkdown(facts);
    assert.ok(md.includes("## 谈资与关键事实"));
    assert.ok(md.includes("💡 [观点] 2026-10-27：私有知识库的治理重在权限边界与最小上下文 （出处：2026大模型架构研讨会） <!-- id:fact-01 -->"));
    assert.ok(md.includes("❤️ [喜好/忌口] 2026-10-27：花生过敏"));
    assert.ok(md.includes("💼 [背景经历] 2026-10-26：曾负责腾讯云存储核心引擎"));
    assert.ok(md.includes("📌 [关键事实] 2026-10-25：大女儿今年考上浙大数学系"));

    // 反向解析
    const parsed = parseFactsSectionMarkdown(md);
    assert.equal(parsed.length, 4);
    assert.deepEqual(parsed[0], facts[0]);
    assert.deepEqual(parsed[1], facts[1]);
    assert.deepEqual(parsed[2], facts[2]);
    assert.deepEqual(parsed[3], facts[3]);

    // 容错性测试：无 ID 的手写列表行也能解析
    const handwritten = `- 💡 [观点] 2026-10-27：本地优先才是个人知识库的终局\n- ❤️ [忌口] 2026-10-26：不吃海鲜`;
    const parsedHandwritten = parseFactsSectionMarkdown(handwritten);
    assert.equal(parsedHandwritten.length, 2);
    assert.equal(parsedHandwritten[0].category, "quote");
    assert.equal(parsedHandwritten[0].text, "本地优先才是个人知识库的终局");
    assert.equal(parsedHandwritten[1].category, "preference");
    assert.equal(parsedHandwritten[1].text, "不吃海鲜");

    // D-0040：忌口红线标记往返
    const tabooMd = buildFactsSectionMarkdown([
        { id: "fact-taboo-1", category: "preference", isTaboo: true, date: "2026-10-31", text: "花生严重过敏" },
    ]);
    assert.ok(tabooMd.includes("🚫 [忌口红线] 2026-10-31：花生严重过敏"));
    const parsedTaboo = parseFactsSectionMarkdown(tabooMd);
    assert.equal(parsedTaboo.length, 1);
    assert.equal(parsedTaboo[0].category, "preference");
    assert.equal(parsedTaboo[0].isTaboo, true);
    assert.equal(parsedTaboo[0].text, "花生严重过敏");
});
