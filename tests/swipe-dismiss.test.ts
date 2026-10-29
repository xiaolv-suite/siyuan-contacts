import assert from "node:assert/strict";
import test from "node:test";
import { swipeDismiss } from "../src/shared/swipe-dismiss.ts";

function createMockElement(): HTMLElement {
    const listeners = new Map<string, Array<(event: unknown) => void>>();
    return {
        style: {
            transform: "",
            transition: "",
        },
        addEventListener(type: string, listener: (event: unknown) => void) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type)!.push(listener);
        },
        removeEventListener(type: string, listener: (event: unknown) => void) {
            const arr = listeners.get(type) || [];
            listeners.set(type, arr.filter((l) => l !== listener));
        },
        dispatchEvent(event: { type: string }) {
            const arr = listeners.get(event.type) || [];
            for (const l of arr) l(event);
            return true;
        },
    } as unknown as HTMLElement;
}

test("swipeDismiss: 手指向下滑动超过阈值触发 onDismiss 回调", async () => {
    const el = createMockElement();
    let dismissed = false;

    const action = swipeDismiss(el, {
        threshold: 60,
        onDismiss: () => {
            dismissed = true;
        },
        enabled: true,
    });

    // 1. touchstart
    el.dispatchEvent({
        type: "touchstart",
        touches: [{ clientY: 100 }],
        target: el,
    });
    assert.equal(el.style.transition, "none");

    // 2. touchmove 向下移动 80px (大于阈值 60)
    el.dispatchEvent({
        type: "touchmove",
        touches: [{ clientY: 180 }],
        cancelable: true,
        preventDefault() {},
    });
    assert.equal(el.style.transform, "translateY(80px)");

    // 3. touchend 释放
    el.dispatchEvent({
        type: "touchend",
        touches: [],
    });
    assert.equal(el.style.transform, "translateY(100%)");

    await new Promise((resolve) => setTimeout(resolve, 220));
    assert.equal(dismissed, true, "应成功触发 onDismiss 回调");

    action.destroy();
});

test("swipeDismiss: 下拉未达阈值时平滑回弹，不触发 onDismiss", async () => {
    const el = createMockElement();
    let dismissed = false;

    const action = swipeDismiss(el, {
        threshold: 80,
        onDismiss: () => {
            dismissed = true;
        },
    });

    // 1. touchstart
    el.dispatchEvent({
        type: "touchstart",
        touches: [{ clientY: 100 }],
        target: el,
    });

    // 2. touchmove 仅滑动 30px (小于 80)
    el.dispatchEvent({
        type: "touchmove",
        touches: [{ clientY: 130 }],
        cancelable: true,
        preventDefault() {},
    });
    assert.equal(el.style.transform, "translateY(30px)");

    // 3. touchend
    el.dispatchEvent({
        type: "touchend",
        touches: [],
    });
    assert.equal(el.style.transform, "");

    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(dismissed, false, "未达阈值不应触发 onDismiss");

    action.destroy();
});
