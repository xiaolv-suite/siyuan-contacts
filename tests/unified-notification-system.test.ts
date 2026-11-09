import assert from "node:assert/strict";
import test from "node:test";
import { lvNotify, lvTicker, withDocLock, lvAi, lvActivity, lvBackup, lvEcosystem, lvLaunchpad, lvOmnisearch, showMessage } from "../src/libs/lv-notice-kit.ts";
import { recordInteractionWithResult } from "../src/data/interactions.ts";

function createMockDom() {
    const elements = new Map<string, any>();
    const storageMap = new Map<string, string>();
    const storage = {
        getItem(k: string) { return storageMap.get(k) ?? null; },
        setItem(k: string, v: string) { storageMap.set(k, String(v)); },
        removeItem(k: string) { storageMap.delete(k); },
        clear() { storageMap.clear(); },
    };

    const doc = {
        getElementById(id: string) {
            return elements.get(id) || null;
        },
        createElement(tag: string) {
            const children: any[] = [];
            const attributes = new Map<string, string>();
            const listeners = new Map<string, Function[]>();
            const element = {
                id: "",
                tagName: tag.toUpperCase(),
                className: "",
                dataset: {} as Record<string, string>,
                innerHTML: "",
                appendChild(child: any) {
                    children.push(child);
                    return child;
                },
                remove() {
                    if (element.id) elements.delete(element.id);
                },
                setAttribute(k: string, v: string) {
                    attributes.set(k, v);
                },
                getAttribute(k: string) {
                    return attributes.get(k) ?? null;
                },
                removeAttribute(k: string) {
                    attributes.delete(k);
                },
                addEventListener(type: string, fn: Function) {
                    if (!listeners.has(type)) listeners.set(type, []);
                    listeners.get(type)!.push(fn);
                },
                removeEventListener(type: string, fn: Function) {
                    const list = listeners.get(type) || [];
                    listeners.set(type, list.filter((l) => l !== fn));
                },
                querySelector(sel: string) {
                    return null;
                },
                querySelectorAll(sel: string) {
                    return [];
                },
                classList: {
                    add(...c: string[]) {},
                    remove(...c: string[]) {},
                },
            };
            return element;
        },
        head: { appendChild(el: any) {} },
        body: {
            appendChild(el: any) {
                if (el.id) elements.set(el.id, el);
                return el;
            },
        },
    };

    const timeouts = new Map<number, Function>();
    let nextTimer = 1;
    const win = {
        addEventListener() {},
        removeEventListener() {},
        setTimeout(fn: Function, ms: number) {
            const id = nextTimer++;
            timeouts.set(id, fn);
            return id;
        },
        clearTimeout(id: number) {
            timeouts.delete(id);
        },
    };

    return { doc, win, storage, elements, timeouts };
}

test("微胶囊通知：轻提示按标准库契约呈现文本，撤销动作由紧凑卡片承载", async () => {
    const { doc, win, storage } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    const originalStorage = globalThis.localStorage;

    try {
        (globalThis as any).document = doc;
        (globalThis as any).window = win;
        (globalThis as any).localStorage = storage;

        let undone = false;
        // 标准库 v1.6.0：capsule 仅承载轻文本提示；需要撤销/跳转动作的确认走 card 承载
        const capsuleId = lvNotify.capsule({
            source: "小驴人脉",
            message: "已记录与「王浩然」的互动",
            level: "success",
        });

        assert.ok(capsuleId.startsWith("cap_"));
        const hub = (win as any).__LV_NOTICE_HUB__;
        assert.ok(hub);
        const history = hub.getHistory();
        const capsule = history.find((p: any) => p.id === capsuleId);
        assert.ok(capsule);
        assert.equal(capsule.mode, "capsule");
        assert.equal(capsule.message, "已记录与「王浩然」的互动");

        const cardId = lvNotify.card({
            source: "小驴人脉",
            message: "已建立与「王浩然」的关联关系",
            level: "success",
            duration: 5000,
            actions: [
                {
                    label: "撤销",
                    onClick: () => {
                        undone = true;
                    },
                },
            ],
        });
        const card = hub.getHistory().find((p: any) => p.id === cardId);
        assert.ok(card);
        assert.equal(card.mode, "card");
        assert.equal(card.message, "已建立与「王浩然」的关联关系");
        assert.equal(card.actions?.length, 1);
        assert.equal(card.actions[0].label, "撤销");

        // 执行撤销回调
        await card.actions[0].onClick();
        assert.equal(undone, true);
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
        (globalThis as any).localStorage = originalStorage;
    }
});

test("卡片通知：定期联络与跟进到期提醒支持【去记录】与【稍后提醒】", async () => {
    const { doc, win, storage } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    const originalStorage = globalThis.localStorage;

    try {
        (globalThis as any).document = doc;
        (globalThis as any).window = win;
        (globalThis as any).localStorage = storage;

        let recordTriggered = false;
        const id = lvNotify.card({
            source: "小驴人脉",
            category: "contacts-followup",
            title: "人脉跟进到期提醒",
            message: "联系人「赵立新」已到跟进时间：定期联络",
            level: "warn",
            duration: 10000,
            actions: [
                {
                    label: "去记录",
                    primary: true,
                    onClick: () => {
                        recordTriggered = true;
                    },
                },
            ],
            snooze: {
                options: [
                    { label: "15分钟后再提醒", durationMs: 15 * 60 * 1000 },
                    { label: "今日免打扰", muteToday: true },
                ],
            },
        });

        assert.ok(id.startsWith("card_"));
        const hub = (win as any).__LV_NOTICE_HUB__;
        const history = hub.getHistory();
        const packet = history.find((p: any) => p.id === id);
        assert.ok(packet);
        assert.equal(packet.mode, "card");
        assert.equal(packet.title, "人脉跟进到期提醒");
        assert.equal(packet.actions?.length, 1);
        assert.equal(packet.actions[0].label, "去记录");
        assert.equal(packet.snooze?.options?.length, 2);

        await packet.actions[0].onClick();
        assert.equal(recordTriggered, true);

        // 免打扰测试
        assert.equal(lvNotify.isMutedToday("contacts-followup"), false);
        lvNotify.muteToday("contacts-followup");
        assert.equal(lvNotify.isMutedToday("contacts-followup"), true);
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
        (globalThis as any).localStorage = originalStorage;
    }
});

test("原位微动效：lvNotify.inline 为目标元素添加动效状态并还原", async () => {
    let activeAdded = false;
    let successAdded = false;
    let activeRemoved = false;
    let titleSet = "";

    const el = {
        classList: {
            add(...classes: string[]) {
                if (classes.includes("lv-inline-feedback-active")) activeAdded = true;
                if (classes.includes("lv-inline-feedback--success")) successAdded = true;
            },
            remove(...classes: string[]) {
                if (classes.includes("lv-inline-feedback-active")) activeRemoved = true;
            },
        },
        getAttribute(k: string) {
            return "原标题";
        },
        setAttribute(k: string, v: string) {
            if (k === "title") titleSet = v;
        },
        removeAttribute() {},
    } as any;

    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    try {
        (globalThis as any).window = {
            setTimeout(fn: Function, ms: number) {
                return setTimeout(fn, ms);
            },
        };
        (globalThis as any).document = {};

        lvNotify.inline(el, "称谓已保存并核实", true);
        assert.equal(activeAdded, true);
        assert.equal(successAdded, true);
        assert.equal(titleSet, "称谓已保存并核实");

        // 等待 1100ms 动效还原
        await new Promise((resolve) => setTimeout(resolve, 1100));
        assert.equal(activeRemoved, true);
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
    }
});

test("统一通知出口：showMessage 智能分流错误升级为卡片，普通提示收敛为微胶囊", async () => {
    const { doc, win, storage } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    const originalStorage = globalThis.localStorage;

    try {
        (globalThis as any).document = doc;
        (globalThis as any).window = win;
        (globalThis as any).localStorage = storage;

        showMessage("普通操作已完成", 2500, "info");
        const hub = (win as any).__LV_NOTICE_HUB__;
        let history = hub.getHistory();
        assert.equal(history[0].mode, "capsule");
        assert.equal(history[0].message, "普通操作已完成");

        // 标准库 v1.6.0：showMessage 的时长透传（>=6000 的兜底由插件层 notify() 负责）
        showMessage("致命系统异常", 6000, "error");
        history = hub.getHistory();
        assert.equal(history[0].mode, "card");
        assert.equal(history[0].level, "error");
        assert.equal(history[0].message, "致命系统异常");
        assert.equal(history[0].duration, 6000);
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
        (globalThis as any).localStorage = originalStorage;
    }
});

test("内核排队互斥锁：withDocLock 确保同文档写入串行排队且隔离异常", async () => {
    const docId = "20261103000000-person01";
    const executionOrder: string[] = [];

    let resolveTask1: () => void = () => {};
    const task1Promise = new Promise<void>((resolve) => { resolveTask1 = resolve; });

    // 启动任务 1（挂起等待）
    const p1 = withDocLock(docId, async () => {
        executionOrder.push("task1-start");
        await task1Promise;
        executionOrder.push("task1-end");
        return "result-1";
    });

    // 启动任务 2（必须排队在任务 1 之后）
    const p2 = withDocLock(docId, async () => {
        executionOrder.push("task2-start");
        executionOrder.push("task2-end");
        return "result-2";
    });

    // 等待微任务让任务 1 启动执行
    await new Promise((r) => setTimeout(r, 10));

    // 此时任务 1 正在进行中，任务 2 仍在排队
    assert.deepEqual(executionOrder, ["task1-start"]);

    // 释放任务 1
    resolveTask1();
    const [res1, res2] = await Promise.all([p1, p2]);

    assert.equal(res1, "result-1");
    assert.equal(res2, "result-2");
    assert.deepEqual(executionOrder, [
        "task1-start",
        "task1-end",
        "task2-start",
        "task2-end",
    ]);

    // 测试异常隔离：任务抛错不应阻死后置排队任务
    const pFail = withDocLock(docId, async () => {
        throw new Error("task-error");
    });
    const pSuccess = withDocLock(docId, async () => {
        return "recovered";
    });

    await assert.rejects(pFail, { message: "task-error" });
    const recoveryRes = await pSuccess;
    assert.equal(recoveryRes, "recovered");
});

test("后台主时钟：lvTicker 支持按周期与每小时整点巡检订阅及退订", async () => {
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;

    try {
        let intervalCb: Function = () => {};
        let intervalTimer = 0;
        (globalThis as any).window = {
            setInterval(fn: Function, ms: number) {
                intervalCb = fn;
                return ++intervalTimer;
            },
            clearInterval() {},
        };
        (globalThis as any).document = {
            addEventListener() {},
            removeEventListener() {},
        };

        let hourlyRunCount = 0;
        let dateCrossNewDay = "";

        const unregisterHour = lvTicker.onHour("siyuan-contacts", () => {
            hourlyRunCount += 1;
        });
        const unregisterDateCross = lvTicker.onDateCross("siyuan-contacts", (today) => {
            dateCrossNewDay = today;
        });

        assert.equal(typeof unregisterHour, "function");
        assert.equal(typeof unregisterDateCross, "function");

        // 退订清理
        unregisterHour();
        unregisterDateCross();
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
    }
});

test("统一 AI 网关：lvAi 配置共享与结构化提炼对话调用", async () => {
    lvAi.setConfig({
        endpoint: "https://api.example.com/v1",
        apiKey: "sk-test-token",
        model: "deepseek-chat",
    });
    const cfg = lvAi.getConfig();
    assert.equal(cfg?.apiKey, "sk-test-token");
    assert.equal(cfg?.model, "deepseek-chat");

    const originalFetch = globalThis.fetch;
    try {
        (globalThis as any).fetch = async (url: string, opts: any) => {
            const body = JSON.parse(opts.body);
            assert.equal(body.model, "deepseek-chat");
            assert.equal(body.messages[0].role, "user");
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    choices: [{ message: { content: "提炼联系人：李总 13800000000" } }],
                    usage: { total_tokens: 35 },
                }),
            };
        };

        const res = await lvAi.chat({
            source: "人脉",
            messages: [{ role: "user", content: "请分析这条名片文本" }],
        });
        assert.equal(res.content, "提炼联系人：李总 13800000000");
        assert.equal(res.totalTokens, 35);
    } finally {
        (globalThis as any).fetch = originalFetch;
    }
});

test("今日活动流：lvActivity 广播人脉交往事实并汇入全家桶活动流", async () => {
    lvActivity.record({
        source: "人脉",
        category: "contact",
        title: "与 赵立新 线下会面",
        detail: "洽谈战略合作",
        linkBlockId: "20261103000000-zhaolixin",
    });

    const records = lvActivity.getTodayRecords();
    const contactAct = records.find((r) => r.title.includes("赵立新"));
    assert.ok(contactAct);
    assert.equal(contactAct.source, "人脉");
    assert.equal(contactAct.category, "contact");
    assert.equal(contactAct.detail, "洽谈战略合作");
    assert.equal(contactAct.linkBlockId, "20261103000000-zhaolixin");

    const markdown = lvActivity.formatAsMarkdown();
    assert.ok(markdown.includes("今日活动汇编"));
    assert.ok(markdown.includes("与 赵立新 线下会面"));
    assert.ok(markdown.includes("洽谈战略合作"));
});

test("全生态灾备切面：lvBackup 支持注册、导出全生态联合备份包与一键恢复", async () => {
    let contactsRestoredData: any = null;
    let habitsRestoredData: any = null;

    // 标准库的联合导出/恢复走 window 宿主单例（node 回退仅注册不导出），用 DOM 桩走真实路径
    const { win } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    (globalThis as any).document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), body: { appendChild() {} }, head: { appendChild() {} }, getElementById: () => null, querySelector: () => null };
    (globalThis as any).window = win;

    // 模拟人脉插件与打卡插件注册灾备切面
    const unregisterContacts = lvBackup.register(
        "siyuan-contacts",
        async () => ({
            schemaVersion: 1,
            peopleCount: 42,
            interactions: [{ id: "int_01", note: "深度会面" }],
        }),
        async (data) => {
            contactsRestoredData = data;
            return true;
        }
    );

    const unregisterHabits = lvBackup.register(
        "siyuan-daily-checkin",
        async () => ({
            schemaVersion: 1,
            checkins: [{ id: "chk_01", name: "晨跑打卡" }],
        }),
        async (data) => {
            habitsRestoredData = data;
            return true;
        }
    );

    try {
        // 导出全量包
        const fullBundle = await lvBackup.exportFull();
        assert.equal(fullBundle.v, 1);
        assert.equal(fullBundle.ecosystem, "xiaolv");
        assert.ok(fullBundle.plugins["siyuan-contacts"]);
        assert.ok(fullBundle.plugins["siyuan-daily-checkin"]);
        assert.equal((fullBundle.plugins["siyuan-contacts"].data as any).peopleCount, 42);

        // 恢复全量包
        const restoreResult = await lvBackup.restoreFull(fullBundle);
        assert.deepEqual(restoreResult.success.sort(), ["siyuan-contacts", "siyuan-daily-checkin"].sort());
        assert.equal(restoreResult.failed.length, 0);
        assert.equal(contactsRestoredData?.peopleCount, 42);
        assert.equal(habitsRestoredData?.checkins?.[0]?.name, "晨跑打卡");
    } finally {
        unregisterContacts();
        unregisterHabits();
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
    }
});

test("全生态自省徽章：lvEcosystem.getStatusBadgeText 动态呈现协同状态胶囊", () => {
    const unregisterA = lvBackup.register("plugin-a", async () => ({}), async () => true);
    const unregisterB = lvBackup.register("plugin-b", async () => ({}), async () => true);

    try {
        const diag = lvEcosystem.getDiagnostics();
        assert.ok(diag.registeredPlugins.includes("plugin-a"));
        assert.ok(diag.registeredPlugins.includes("plugin-b"));

        const badge = lvEcosystem.getStatusBadgeText();
        assert.ok(badge.includes("🐴 小驴全家桶"));
        assert.ok(badge.includes("插件已联结"));
        assert.ok(badge.includes("今日活动"));
    } finally {
        unregisterA();
        unregisterB();
    }
});

test("小驴罗盘：lvLaunchpad 支持注册、获取已注册项与状态切换（手机端三态持久化）", () => {
    let clicked = false;
    let selectedAction = "";

    // 标准库的三态状态持久化走 localStorage（node 回退不持久化），用 DOM 桩走真实路径
    const { win, storage } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    const originalStorage = globalThis.localStorage;
    (globalThis as any).document = { getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), body: { appendChild() {} }, head: { appendChild() {} }, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
    (globalThis as any).window = win;
    (globalThis as any).localStorage = storage;

    const unregister = lvLaunchpad.register({
        id: "siyuan-contacts",
        name: "人脉",
        fullName: "小驴人脉",
        svgIcon: "iconLvContacts",
        color: "#f97316",
        desc: "关系图谱 · 联络提醒",
        digit: 7,
        badge: "3 位需联络",
        badgeType: "warn",
        actions: ["速查联系人", "今日待联络", "新增联系人", "会前速览"],
        onClick: () => { clicked = true; },
        onAction: (act) => { selectedAction = act; },
    });

    try {
        const items = lvLaunchpad.getItems();
        const contactItem = items.find((i) => i.id === "siyuan-contacts");
        assert.ok(contactItem);
        assert.equal(contactItem.name, "人脉");
        assert.equal(contactItem.fullName, "小驴人脉");
        assert.equal(contactItem.color, "#f97316");
        assert.equal(contactItem.badge, "3 位需联络");
        assert.equal(contactItem.badgeType, "warn");
        assert.equal(contactItem.digit, 7);
        assert.equal(contactItem.state, "docked");
        assert.equal(contactItem.actions?.length, 4);

        // 点击与行动测试
        contactItem.onClick();
        assert.equal(clicked, true);

        contactItem.onAction?.("会前速览");
        assert.equal(selectedAction, "会前速览");

        // 状态切换测试（写入并经 localStorage 持久化回读）
        lvLaunchpad.setPluginState("siyuan-contacts", "pinned");
        const itemsAfter = lvLaunchpad.getItems();
        assert.equal(itemsAfter.find((i) => i.id === "siyuan-contacts")?.state, "pinned");
    } finally {
        unregister();
        const itemsCleaned = lvLaunchpad.getItems();
        assert.equal(itemsCleaned.some((i) => i.id === "siyuan-contacts"), false);
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
        (globalThis as any).localStorage = originalStorage;
    }
});

test("穿透搜索：lvOmnisearch 支持联系人姓名、圈层标签与互动记录检索切面", async () => {
    let clickedId = "";

    // 标准库的检索执行走 window 宿主单例（node 回退只注册不检索），用 DOM 桩走真实路径
    const { win } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    (globalThis as any).document = { getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), body: { appendChild() {} }, head: { appendChild() {} }, querySelector: () => null };
    (globalThis as any).window = win;

    // 模拟注册人脉穿透搜索切面（包含姓名、标签与互动记录）
    const unregister = lvOmnisearch.registerProvider("siyuan-contacts", async (keyword) => {
        const kw = keyword.toLowerCase();
        const items = [];

        // 模拟联系人
        if ("张三".includes(kw) || "核心圈".includes(kw)) {
            items.push({
                id: "contact_doc_001",
                source: "人脉",
                category: "挚友",
                title: "张三",
                snippet: "标签: 核心圈、技术合伙人 · 单位: 极客科技",
                badge: "挚友",
                linkBlockId: "20261103000000-doc001",
                onClick: () => { clickedId = "contact_doc_001"; },
            });
        }

        // 模拟互动记录
        if ("洽谈合作".includes(kw)) {
            items.push({
                id: "interaction_evt_001",
                source: "人脉",
                category: "互动记录",
                title: "张三 · 2026-11-03",
                snippet: "在科技园咖啡厅洽谈战略合作与天使轮融资",
                badge: "会面",
                linkBlockId: "20261103000000-doc001",
                onClick: () => { clickedId = "interaction_evt_001"; },
            });
        }

        // 模拟组织机构
        if ("极客科技".includes(kw)) {
            items.push({
                id: "org_doc_001",
                source: "人脉",
                category: "组织机构",
                title: "极客科技",
                snippet: "简称: 极客 · 3 位成员 · 行业: 人工智能",
                badge: "组织",
                linkBlockId: "20261103000000-org001",
                onClick: () => { clickedId = "org_doc_001"; },
            });
        }

        return items;
    });

    try {
        // 1. 按姓名检索
        const nameResults = await lvOmnisearch.search("张三");
        assert.equal(nameResults.length, 1);
        assert.equal(nameResults[0].title, "张三");
        assert.equal(nameResults[0].source, "人脉");
        assert.equal(nameResults[0].linkBlockId, "20261103000000-doc001");

        // 点击穿透
        nameResults[0].onClick();
        assert.equal(clickedId, "contact_doc_001");

        // 2. 按圈层标签检索
        const tagResults = await lvOmnisearch.search("核心圈");
        assert.equal(tagResults.length, 1);
        assert.ok(tagResults[0].snippet?.includes("核心圈"));

        // 3. 按互动记录内容检索
        const interactionResults = await lvOmnisearch.search("洽谈合作");
        assert.equal(interactionResults.length, 1);
        assert.equal(interactionResults[0].category, "互动记录");
        assert.ok(interactionResults[0].snippet?.includes("洽谈战略合作"));

        interactionResults[0].onClick();
        assert.equal(clickedId, "interaction_evt_001");

        // 4. 按组织机构检索
        const orgResults = await lvOmnisearch.search("极客科技");
        assert.equal(orgResults.length, 1);
        assert.equal(orgResults[0].category, "组织机构");
        assert.equal(orgResults[0].title, "极客科技");
        orgResults[0].onClick();
        assert.equal(clickedId, "org_doc_001");

        // 5. 空关键词预检
        const emptyResults = await lvOmnisearch.search("   ");
        assert.equal(emptyResults.length, 0);
    } finally {
        unregister();
        const afterClean = await lvOmnisearch.search("张三");
        assert.equal(afterClean.length, 0);
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
    }
});

test("互动记录原子写入：recordInteractionWithResult 成功追加时直接返回新事件实体", async () => {
    const memoryStorage = new Map<string, any>();
    const mockPlugin: any = {
        async loadData(key: string) {
            return memoryStorage.get(key) ?? null;
        },
        async saveData(key: string, data: any) {
            memoryStorage.set(key, data);
        },
    };

    const docId = "20261103000000-abcdef1";
    const result = await recordInteractionWithResult(mockPlugin, {
        personDocId: docId,
        note: "周三商务洽谈",
        type: "meeting",
        externalRef: "test-ref-123",
    });

    assert.equal(result.recorded, true);
    assert.ok(result.event);
    assert.equal(result.event.personDocId, docId);
    assert.equal(result.event.note, "周三商务洽谈");
    assert.equal(result.event.type, "meeting");
    assert.ok(result.event.id);
    assert.equal(result.store.events[result.store.events.length - 1].id, result.event.id);

    // 幂等写入相同事件（基于 externalRef）不应重复记录
    const dupResult = await recordInteractionWithResult(mockPlugin, {
        personDocId: docId,
        note: "周三商务洽谈",
        type: "meeting",
        source: result.event.source,
        externalRef: "test-ref-123",
    });
    assert.equal(dupResult.recorded, false);
    assert.equal(dupResult.event, undefined);
});

test("通知防打扰：重复通知到达时刷新自动关闭计时器并继承最新按钮", async () => {
    const { doc, win, storage } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    const originalStorage = globalThis.localStorage;

    try {
        (globalThis as any).document = doc;
        (globalThis as any).window = win;
        (globalThis as any).localStorage = storage;

        let actionClicked = false;
        lvNotify.card({
            source: "小驴人脉",
            category: "test-dup",
            message: "重复内容提醒",
            duration: 4000,
        });

        // 紧接着触发带有撤销按钮的重复通知
        lvNotify.card({
            source: "小驴人脉",
            category: "test-dup",
            message: "重复内容提醒",
            duration: 8000,
            actions: [
                {
                    label: "立刻处理",
                    onClick: () => { actionClicked = true; },
                },
            ],
        });

        const hub = (win as any).__LV_NOTICE_HUB__;
        const history = hub.getHistory();
        assert.ok(history.length >= 1);
        const latest = history[0];
        assert.equal(latest.repeatCount, 2);

        // 测试 dismiss 在有 window 下安全调用
        lvNotify.dismiss(latest.id);
        hub.destroy();
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
        (globalThis as any).localStorage = originalStorage;
    }
});



