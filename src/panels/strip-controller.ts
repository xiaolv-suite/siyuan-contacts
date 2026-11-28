/**
 * 文档档案条生命周期控制器 (StripController)
 *
 * 核心设计与契约：
 * 1. 单一生产实例：无任何默认全局单例（杜绝影子旁路），由插件宿主唯一持有并纳管；
 * 2. 独立生命周期管理：通过 WeakMap 代际自增计数器（stripRequests）抵御异步回调竞态，保证仅最新代际请求能够挂载 DOM；
 * 3. 活跃条带登记管理（activeStrips）：跟踪当前可见的文档条带，当联系人名册/偏好数据变更时原地刷新；
 * 4. 禁负缓存新文档：不将任何未命中文档记录到永久否定黑名单，新创建的联系人文档打开时立即正常探测并挂载；
 * 5. 异常隔离与安全释放：包含 handleProtyleDestroy 与 dispose，彻底清理 DOM 元素与数据订阅；
 * 6. 100% 幂等与 Disposer 集成：作为 Disposer 节点被生命周期中枢逆序清理，onunload 后 activeCount 严格归零。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model";
import type { LifecycleToken } from "../domain/lifecycle";
import { subscribeDataChanged } from "../libs/data-events";

export const STRIP_CLASS = "lvct-doc-strip";

export interface PanelContext {
    plugin: Plugin;
    settings: ContactsSettings | null;
    i18n?: Record<string, string>;
    lifecycleToken?: LifecycleToken;
    stripController?: StripController;
}

export interface ProtyleLike {
    element: HTMLElement;
    block?: { rootID?: string };
}

export type ProtyleEvent = { detail?: { protyle?: ProtyleLike } };

export type StripRenderFunction = (
    context: PanelContext,
    protyle: ProtyleLike,
    rootId: string,
    isCurrent: () => boolean,
    controller: StripController,
) => Promise<void>;

export class StripController {
    private readonly stripRequests = new WeakMap<HTMLElement, number>();
    private readonly activeStrips = new Map<HTMLElement, { context: PanelContext; protyle: ProtyleLike; rootId: string }>();
    private dataSubscription: (() => void) | null = null;
    private disposed = false;

    constructor(
        private readonly getContext?: () => PanelContext | null,
        private readonly renderer?: StripRenderFunction,
    ) {
        this.ensureDataSubscription();
    }

    /** 检查是否已释放 */
    get isDisposed(): boolean {
        return this.disposed;
    }

    /** 当前活跃条带数量（用于测试与监控） */
    get activeCount(): number {
        return this.activeStrips.size;
    }

    /** 数据变更订阅是否已激活 */
    get hasDataSubscription(): boolean {
        return this.dataSubscription !== null;
    }

    /** 为指定元素自增并获取最新请求代际号 */
    nextRequest(element: HTMLElement): number {
        const next = (this.stripRequests.get(element) ?? 0) + 1;
        this.stripRequests.set(element, next);
        return next;
    }

    /** 获取特定元素当前的请求代际号（用于竞态判定） */
    getRequestGeneration(element: HTMLElement): number {
        return this.stripRequests.get(element) ?? 0;
    }

    /**
     * 判定当前请求是否仍然有效（最新代际、未销毁、DOM 已连接、生命周期有效）。
     * 契约：若用户在异步取数期间切换了文档或关闭了标签页，旧请求自动静默失效。
     */
    isCurrent(element: HTMLElement, request: number, rootId: string, protyle?: ProtyleLike, context?: PanelContext): boolean {
        if (this.disposed) return false;
        if (this.stripRequests.get(element) !== request) return false;
        if (protyle?.block?.rootID && protyle.block.rootID !== rootId) return false;
        if (!element.isConnected) return false;
        if (context?.lifecycleToken && !context.lifecycleToken.isAlive()) return false;
        return true;
    }

    /** 登记一个活跃的条带实例 */
    registerActive(element: HTMLElement, entry: { context: PanelContext; protyle: ProtyleLike; rootId: string }): void {
        if (this.disposed) return;
        this.activeStrips.set(element, entry);
    }

    /** 注销指定元素的活跃条带 */
    unregisterActive(element: HTMLElement): void {
        this.activeStrips.delete(element);
    }

    /**
     * 处理 protyle 事件入口（loaded-protyle-static/dynamic、switch-protyle）
     */
    handleProtyleEvent(event: ProtyleEvent, explicitContext?: PanelContext): void {
        if (this.disposed) return;
        const context = explicitContext ?? this.getContext?.();
        if (!context || (context.lifecycleToken && !context.lifecycleToken.isAlive())) return;

        this.ensureDataSubscription();
        const protyle = event.detail?.protyle;
        if (!protyle?.element || !context.settings) return;
        const rootId = protyle.block?.rootID ?? "";

        void this.updateStrip(context, protyle, rootId);
    }

    /**
     * 释放关闭的编辑器档案条引用，杜绝 DOM 内存泄漏
     */
    handleProtyleDestroy(event: ProtyleEvent): void {
        const el = event.detail?.protyle?.element;
        if (el) {
            this.stripRequests.set(el, (this.stripRequests.get(el) ?? 0) + 1);
            el.querySelector(`.${STRIP_CLASS}`)?.remove();
            this.activeStrips.delete(el);
        }
    }

    /**
     * 调度条带更新与渲染
     */
    async updateStrip(context: PanelContext, protyle: ProtyleLike, rootId: string): Promise<void> {
        if (this.disposed || (context.lifecycleToken && !context.lifecycleToken.isAlive())) return;

        const request = this.nextRequest(protyle.element);
        const isCurrent = () => this.isCurrent(protyle.element, request, rootId, protyle, context);

        // 先清理旧条带
        protyle.element.querySelector(`.${STRIP_CLASS}`)?.remove();
        if (!rootId || !context.settings || !/^\d{14}-[0-9a-z]{7}$/.test(rootId)) {
            this.activeStrips.delete(protyle.element);
            return;
        }

        this.activeStrips.set(protyle.element, { context, protyle, rootId });

        if (this.renderer) {
            await this.renderer(context, protyle, rootId, isCurrent, this);
        }
    }

    /** 数据变化广播时原地刷新所有活跃条带（乱序由 stripRequests 代际挡） */
    refreshActiveStrips(): void {
        if (this.disposed) return;
        for (const [element, entry] of [...this.activeStrips]) {
            if (!element.isConnected || (entry.context.lifecycleToken && !entry.context.lifecycleToken.isAlive())) {
                this.activeStrips.delete(element);
                continue;
            }
            void this.updateStrip(entry.context, entry.protyle, entry.rootId);
        }
    }

    private ensureDataSubscription(): void {
        if (typeof window === "undefined") return;
        if (this.dataSubscription) return;
        this.dataSubscription = subscribeDataChanged(() => {
            this.refreshActiveStrips();
        });
    }

    /**
     * 销毁并释放所有活跃条带与数据订阅，满足 Disposer 契约
     */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;

        if (this.dataSubscription) {
            this.dataSubscription();
            this.dataSubscription = null;
        }

        for (const [element] of this.activeStrips) {
            this.stripRequests.set(element, (this.stripRequests.get(element) ?? 0) + 1);
            element.querySelector(`.${STRIP_CLASS}`)?.remove();
        }
        this.activeStrips.clear();
    }
}
