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

test("swipeDismiss: touchcancel 时即使当前位移超阈值也弹性归位，不误判关闭", async () => {
    const el = createMockElement();
    let dismissed = false;

    const action = swipeDismiss(el, {
        threshold: 60,
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

    // 2. touchmove 下滑 120px (大幅超过 60px 阈值)
    el.dispatchEvent({
        type: "touchmove",
        touches: [{ clientY: 220 }],
        cancelable: true,
        preventDefault() {},
    });
    assert.equal(el.style.transform, "translateY(120px)");

    // 3. 系统中断事件 touchcancel (例如来电、边缘防误触)
    el.dispatchEvent({
        type: "touchcancel",
        touches: [],
    });
    assert.equal(el.style.transform, "", "系统中断后应强制弹性归位，不可触发关闭");

    await new Promise((resolve) => setTimeout(resolve, 220));
    assert.equal(dismissed, false, "touchcancel 绝不应触发 onDismiss 回调");

    action.destroy();
});

test("swipeDismiss: 快速轻甩手势（flick / velocity）在短时间内触发流畅关闭", async () => {
    const el = createMockElement();
    let dismissed = false;

    const action = swipeDismiss(el, {
        threshold: 100, // 阈值设为 100
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

    // 2. touchmove 短距离下滑 45px (远小于 100px 阈值，但在极短时间内完成)
    el.dispatchEvent({
        type: "touchmove",
        touches: [{ clientY: 145 }],
        cancelable: true,
        preventDefault() {},
    });

    // 3. touchend 快速释放 (此时由于速度高，判定为 flick)
    el.dispatchEvent({
        type: "touchend",
        touches: [],
    });
    assert.equal(el.style.transform, "translateY(100%)", "高初速下滑甩动应启动滑出动画");

    await new Promise((resolve) => setTimeout(resolve, 220));
    assert.equal(dismissed, true, "快速轻甩手势应成功触发 onDismiss");

    action.destroy();
});

test("swipeDismiss: 滑出关闭期间忽略重复 touchstart，防止重入", async () => {
    const el = createMockElement();
    let dismissCount = 0;

    const action = swipeDismiss(el, {
        threshold: 50,
        onDismiss: () => {
            dismissCount += 1;
        },
    });

    // 1. touchstart
    el.dispatchEvent({
        type: "touchstart",
        touches: [{ clientY: 100 }],
        target: el,
    });

    // 2. touchmove 下滑 80px
    el.dispatchEvent({
        type: "touchmove",
        touches: [{ clientY: 180 }],
        cancelable: true,
        preventDefault() {},
    });

    // 3. touchend
    el.dispatchEvent({
        type: "touchend",
        touches: [],
    });
    assert.equal(el.style.transform, "translateY(100%)");

    // 4. 在滑出过渡尚未结束时（180ms 内），再次触发 touchstart 和 touchmove
    el.dispatchEvent({
        type: "touchstart",
        touches: [{ clientY: 100 }],
        target: el,
    });
    el.dispatchEvent({
        type: "touchmove",
        touches: [{ clientY: 200 }],
        cancelable: true,
        preventDefault() {},
    });

    // 此时动画依然保持 translateY(100%)，不被新的 touchmove 打断
    assert.equal(el.style.transform, "translateY(100%)");

    await new Promise((resolve) => setTimeout(resolve, 220));
    assert.equal(dismissCount, 1, "同一关闭周期内只触发一次 onDismiss");

    action.destroy();
});
