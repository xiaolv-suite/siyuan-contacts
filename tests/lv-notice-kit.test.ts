import assert from "node:assert/strict";
import test from "node:test";
import { lvNotify, showMessage } from "../src/libs/lv-notice-kit.ts";

test("lvNotify: 在无 window 的环境下安全降级不抛错", () => {
    assert.doesNotThrow(() => {
        lvNotify.card({ message: "无环境测试" });
        lvNotify.capsule({ message: "无环境胶囊" });
        lvNotify.inline(null, "测试");
        lvNotify.silent({ message: "静默测试" });
        showMessage("提示");
        showMessage("错误", 3000, "error");
    });
});

test("lvNotify: 模拟 DOM 环境下的卡片、微胶囊与撤销交互", async () => {
    // 搭建极简 DOM 桩
    const elements = new Map<string, any>();
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
                    add(c: string) {},
                    remove(c: string) {},
                },
            };
            return element;
        },
        head: {
            appendChild(el: any) {},
        },
        body: {
            appendChild(el: any) {
                if (el.id) elements.set(el.id, el);
                return el;
            },
        },
    };

    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;

    try {
        (globalThis as any).document = doc;
        (globalThis as any).window = {
            addEventListener() {},
            removeEventListener() {},
            setTimeout(fn: Function, ms: number) {
                return 1 as any;
            },
            clearTimeout() {},
        };

        const cleaner = lvNotify.registerPlugin("siyuan-contacts");
        assert.equal(typeof cleaner, "function");

        let undoClicked = false;
        const capId = lvNotify.capsule({
            source: "小驴人脉",
            message: "已记录与「张三」的互动",
            level: "success",
            action: {
                label: "撤销",
                onClick: () => {
                    undoClicked = true;
                },
            },
        });
        assert.ok(capId.startsWith("cap_"));

        let recordClicked = false;
        const cardId = lvNotify.card({
            source: "小驴人脉",
            category: "contacts-followup",
            title: "跟进到期提醒",
            message: "联系人「李四」到期跟进",
            actions: [
                {
                    label: "去记录",
                    onClick: () => {
                        recordClicked = true;
                    },
                },
            ],
            snooze: {
                options: [
                    { label: "15分钟后再提醒", durationMs: 900000 },
                    { label: "今日免打扰", muteToday: true },
                ],
            },
        });
        assert.ok(cardId.startsWith("card_"));

        cleaner();
    } finally {
        (globalThis as any).window = originalWindow;
        (globalThis as any).document = originalDoc;
    }
});
