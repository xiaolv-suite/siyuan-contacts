import assert from "node:assert/strict";
import test from "node:test";
import { lvNotify, showMessage } from "../src/libs/lv-notice-kit.ts";

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

test("微胶囊通知：互动记录与关系更新支持附带撤销动作", async () => {
    const { doc, win, storage } = createMockDom();
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    const originalStorage = globalThis.localStorage;

    try {
        (globalThis as any).document = doc;
        (globalThis as any).window = win;
        (globalThis as any).localStorage = storage;

        let undone = false;
        const id = lvNotify.capsule({
            source: "小驴人脉",
            message: "已记录与「王浩然」的互动",
            level: "success",
            action: {
                label: "撤销",
                onClick: () => {
                    undone = true;
                },
            },
        });

        assert.ok(id.startsWith("cap_"));
        const hub = (win as any).__LV_NOTICE_HUB__;
        assert.ok(hub);
        const history = hub.getHistory();
        const packet = history.find((p: any) => p.id === id);
        assert.ok(packet);
        assert.equal(packet.mode, "capsule");
        assert.equal(packet.message, "已记录与「王浩然」的互动");
        assert.equal(packet.actions?.length, 1);
        assert.equal(packet.actions[0].label, "撤销");

        // 执行撤销回调
        await packet.actions[0].onClick();
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

        showMessage("致命系统异常", 5000, "error");
        history = hub.getHistory();
        assert.equal(history[0].mode, "card");
        assert.equal(history[0].level, "error");
        assert.equal(history[0].message, "致命系统异常");
        assert.ok(history[0].duration >= 6000);
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
        (globalThis as any).localStorage = originalStorage;
    }
});
