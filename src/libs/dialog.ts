/*
 * Svelte 弹窗工具（模板 siyuan-note/plugin-sample-vite-svelte 移植, MIT, frostime）
 */
import { Dialog } from "siyuan";
import { mount, unmount } from "svelte";
import type { Component } from "svelte";
import { dialogEscapeScope } from "./dialog-escape-scope";
import { lvSurfaceStack } from "./lv-notice-kit";

/**
 * D-40：宿主关闭通道守卫。
 * 宿主 Dialog 的 X / Esc / 遮罩会直接 destroy 弹窗、绕过组件内 close-guard。
 * svelteDialog 向组件注入 `hostCloseChannel`，组件把自己的守卫（通常 guardedClose）
 * 挂到 `channel.request`；本层以 capture 拦截宿主关闭动作并路由到该守卫——
 * 未挂接（request 为空）时保持宿主原行为，组件无需感知。
 * 隔离 mock（siyuan-mock.js）对齐真实宿主 DOM 类名：.b3-dialog__scrim / .b3-dialog__close；
 * 真实宿主三路径核对 Host pending（D-40）。
 */
export interface HostCloseChannel {
    /** 组件挂接宿主关闭的守卫入口；close = 真正关闭弹窗（走 destroy 链） */
    request?: (close: () => void) => void;
}

export const simpleDialog = (args: {
    title: string, ele: HTMLElement | DocumentFragment,
    width?: string, height?: string,
    disableClose?: boolean,
    canDismiss?: () => boolean,
    callback?: () => void;
}) => {
    let closed = false;
    const surfaceId = `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const popSurface = lvSurfaceStack.push({
        id: surfaceId,
        type: "dialog",
        dismiss: () => {
            if (closed) return false;
            const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            if (active && dialog.element.contains(active)) {
                const scope = dialogEscapeScope(active);
                if (scope) {
                    scope();
                    return true;
                }
            }
            if (args.canDismiss && args.canDismiss() === false) return false;
            closed = true;
            dialog.destroy();
            return true;
        },
    });

    const dialog = new Dialog({
        title: args.title,
        content: `<div class="dialog-content" style="display: flex; flex-direction: column; align-items: stretch; width: 100%; height: 100%; min-width: 0; min-height: 0; box-sizing: border-box;"/>`,
        width: args.width,
        height: args.height,
        disableClose: args.disableClose ?? true,
        destroyCallback: () => {
            if (!closed) {
                closed = true;
                popSurface();
            }
            if (args.callback) args.callback();
        }
    });
    // 点击遮罩背景快速关闭
    dialog.element.addEventListener("click", (e) => {
        if (e.target === dialog.element || (e.target as HTMLElement).classList?.contains("b3-dialog__scrim")) {
            if (!closed) {
                closed = true;
                popSurface();
                dialog.destroy();
            }
        }
    });
    dialog.element.querySelector(".dialog-content")?.appendChild(args.ele);

    const outerClose = dialog.element.querySelector<HTMLElement | SVGElement>(".b3-dialog__container > .b3-dialog__close");
    if (outerClose && outerClose.style) {
        outerClose.style.setProperty("display", "none", "important");
    }

    // Esc-only 关闭面审计：补充可见关闭按钮（思源手机端 Dialog 无关闭钮、手机无 Esc 键）
    const header = dialog.element.querySelector(".b3-dialog__header");
    if (header && !header.querySelector(".b3-dialog__close, .lvct-mobile-dialog-close")) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "b3-dialog__close lvct-mobile-dialog-close";
        closeBtn.setAttribute("aria-label", "关闭");
        closeBtn.innerHTML = "✕";
        closeBtn.style.cssText = "display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:18px;border:none;background:transparent;color:var(--b3-theme-on-surface,#5f6368);cursor:pointer;touch-action:manipulation;";
        closeBtn.onclick = () => {
            if (!closed) {
                closed = true;
                popSurface();
                dialog.destroy();
            }
        };
        header.appendChild(closeBtn);
    }

    return {
        dialog,
        close: () => {
            if (!closed) {
                closed = true;
                popSurface();
                dialog.destroy();
            }
        }
    };
};

export const svelteDialog = (args: {
    title: string,
    component: Component<any>, // Svelte 5 component constructor
    props?: Record<string, any>,
    width?: string,
    height?: string,
    disableClose?: boolean,
    callback?: () => void;
}) => {
    let container = document.createElement("div");
    container.className = "lvct-dialog-root";
    container.style.display = "contents";

    const hostCloseChannel: HostCloseChannel = {};
    let closeDialog: (() => void) | undefined;
    let componentInstance = mount(args.component, {
        target: container,
        props: { ...args.props, onClose: () => closeDialog?.(), hostCloseChannel }
    });

    const { dialog, close } = simpleDialog({
        ...args,
        ele: container,
        canDismiss: () => {
            if (typeof hostCloseChannel.request === "function") {
                hostCloseChannel.request(() => closeDialog?.());
                return false;
            }
            return true;
        },
        callback: () => {
            teardownHostCloseInterception();
            unmount(componentInstance);
            if (args.callback) args.callback();
        }
    });

    closeDialog = close;

    /* D-40：capture 拦截先于宿主关闭处理器（元素级 capture 先于目标冒泡、
       window capture 先于一切文档/元素处理器）。重入门按守卫浮层在场判定
       （无时序敏感的 pending 标志）：三选一打开期间由其自身 Esc/遮罩逻辑接管。 */
    const intercept = (event: Event) => {
        if (typeof hostCloseChannel.request !== "function") return;
        if (document.querySelector(".lvct-closeguard")) return;
        const target = event.target as HTMLElement | null;
        if (event.type === "keydown") {
            if ((event as KeyboardEvent).key !== "Escape") return;
            /* 焦点不在本弹窗内时可能是更上层浮层的 Esc，保持宿主行为 */
            if (!target || !dialog.element.contains(target)) return;
            // 在宿主 document keydown 和 Svelte 委托之前，明确交给最内层选择浮层。
            const closeScope = dialogEscapeScope(target);
            if (closeScope) {
                event.stopImmediatePropagation();
                event.preventDefault();
                closeScope();
                return;
            }
        } else if (event.type === "click") {
            if (!target?.closest?.(".b3-dialog__scrim, .b3-dialog__close") && target !== dialog.element) return;
        } else {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        void Promise.resolve(hostCloseChannel.request(() => closeDialog?.())).catch(() => {});
    };
    const listeners: Array<[EventTarget, string]> = [
        [dialog.element, "click"],
        [window, "keydown"],
    ];
    for (const [target, type] of listeners) target.addEventListener(type, intercept, true);
    function teardownHostCloseInterception(): void {
        for (const [target, type] of listeners) target.removeEventListener(type, intercept, true);
    }

    return {
        component: componentInstance,
        dialog,
        close
    };
};
