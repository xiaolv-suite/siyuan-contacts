import { test } from "node:test";
import assert from "node:assert/strict";
import { swipeDismiss } from "../src/shared/swipe-dismiss.ts";

test("swipeDismiss: 销毁时清理正在等待的关闭定时器，不触发已销毁实例的回调", (t) => {
    let dismissed = false;
    // 简易 mock DOM 节点
    const listeners: Record<string, Function[]> = {};
    const mockNode = {
        style: { transition: "", transform: "" },
        addEventListener: (event: string, fn: Function) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: Function) => {
            listeners[event] = (listeners[event] || []).filter((l) => l !== fn);
        },
    } as unknown as HTMLElement;

    const action = swipeDismiss(mockNode, {
        threshold: 50,
        onDismiss: () => {
            dismissed = true;
        },
    });

    // 模拟 touchstart
    listeners["touchstart"]?.[0]?.({
        touches: [{ clientY: 100 }],
    });

    // 模拟 touchmove 下滑超过 50px
    listeners["touchmove"]?.[0]?.({
        touches: [{ clientY: 200 }],
        cancelable: true,
        preventDefault: () => {},
    });

    // 模拟 touchend 触发滑出关闭
    listeners["touchend"]?.[0]?.();
    assert.equal(mockNode.style.transform, "translateY(100%)", "达到阈值应开始滑出动画");

    // 紧接着销毁（例如用户已切页或组件卸载）
    action.destroy();

    // 快进定时器
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            assert.equal(dismissed, false, "销毁后已排队的 onDismiss 回调不应被触发");
            resolve();
        }, 220);
    });
});

test("swipeDismiss: touchcancel 时弹性归位，不误判关闭", () => {
    let dismissed = false;
    const listeners: Record<string, Function[]> = {};
    const mockNode = {
        style: { transition: "", transform: "" },
        addEventListener: (event: string, fn: Function) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: Function) => {
            listeners[event] = (listeners[event] || []).filter((l) => l !== fn);
        },
    } as unknown as HTMLElement;

    swipeDismiss(mockNode, {
        threshold: 50,
        onDismiss: () => {
            dismissed = true;
        },
    });

    listeners["touchstart"]?.[0]?.({
        touches: [{ clientY: 100 }],
    });
    listeners["touchmove"]?.[0]?.({
        touches: [{ clientY: 120 }],
        cancelable: true,
        preventDefault: () => {},
    });
    // 中途被系统中断 (如来电/越界)
    listeners["touchcancel"]?.[0]?.();

    assert.equal(mockNode.style.transform, "", "取消手势时应弹性归位");
    assert.equal(dismissed, false);
});

test("异步竞态守卫：较早发出的慢请求不能覆盖较晚发出的快请求结果", async () => {
    let currentDocId = "doc-A";
    let displayedData: string | null = null;

    async function mockFetch(docId: string, delayMs: number): Promise<string> {
        await new Promise((r) => setTimeout(r, delayMs));
        return `data-for-${docId}`;
    }

    async function loadData(targetDocId: string, delayMs: number) {
        const result = await mockFetch(targetDocId, delayMs);
        // 竞态守卫：只有当当前文档仍是发出请求时的目标文档时才更新视图
        if (currentDocId === targetDocId) {
            displayedData = result;
        }
    }

    // 先请求 A（耗时 80ms），紧接着快速切换到 B 请求 B（耗时 20ms）
    const reqA = loadData("doc-A", 80);
    currentDocId = "doc-B";
    const reqB = loadData("doc-B", 20);

    await Promise.all([reqA, reqB]);

    // 最终视图必须保留较晚选中的 B 的数据，A 的慢响应不得将其覆盖
    assert.equal(displayedData, "data-for-doc-B", "最终显示应为后切换的 doc-B 数据");
});

test("防重复提交守卫：在异步操作未完成时连击操作被正确拦截", async () => {
    let submitCount = 0;
    let isSaving = false;

    async function doSubmit() {
        if (isSaving) return false;
        isSaving = true;
        try {
            await new Promise((r) => setTimeout(r, 30));
            submitCount += 1;
            return true;
        } finally {
            isSaving = false;
        }
    }

    // 模拟连击 5 次
    const results = await Promise.all([
        doSubmit(),
        doSubmit(),
        doSubmit(),
        doSubmit(),
        doSubmit(),
    ]);

    assert.equal(submitCount, 1, "多次连击中只有首次提交真正执行");
    assert.equal(results.filter(Boolean).length, 1);
});
