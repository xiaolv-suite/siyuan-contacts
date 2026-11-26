/**
 * DisposerRegistry 统一幂等释放中枢
 *
 * 核心契约：
 * 1. LIFO 逆序释放：后注册的资源优先释放（栈语义），保障依赖关系的逆向解除。
 * 2. 树状级联（Cascading）：通过 createChild() 衍生子级注册表，父级 dispose() 时递归销毁全部子树。
 * 3. 异常强隔离（Error Isolation）：单项清理异常通过 try-catch 拦截并记录警告，绝不阻断后续清理管线。
 * 4. 100% 幂等性（Idempotency）：多次调用 dispose() 仅首轮生效；若已释放后再次 add() 则立即安全就地释放。
 * 5. Set 去重契约（Deduplication）：针对重复注册的同一清理句柄执行 Set 级去重，杜绝重复执行副作用。
 */

export type DisposerFunction = () => void;

export type DisposerLike =
    | DisposerFunction
    | { dispose: () => void }
    | { destroy: () => void }
    | null
    | undefined;

export interface IDisposerRegistry {
    readonly isDisposed: boolean;
    add(disposer: DisposerLike): DisposerFunction;
    addTimeout(timerId: number | NodeJS.Timeout | null | undefined): DisposerFunction;
    addInterval(intervalId: number | NodeJS.Timeout | null | undefined): DisposerFunction;
    addEventListener(
        target: EventTarget | null | undefined,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): DisposerFunction;
    createChild(): IDisposerRegistry;
    dispose(): void;
}

export class DisposerRegistry implements IDisposerRegistry {
    private _isDisposed = false;
    private readonly items: DisposerLike[] = [];
    private readonly seen: Set<DisposerLike> = new Set();
    private readonly children: Set<DisposerRegistry> = new Set();

    get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * 注册清理资源或具备 dispose/destroy 方法的对象。
     * 满足 Set 去重契约：同一实例/函数重复注册时静默去重。
     * 若当前注册表已处于释放状态，则立即就地安全执行清理。
     */
    add(disposer: DisposerLike): DisposerFunction {
        if (!disposer) return () => {};

        if (this._isDisposed) {
            this.safeExecute(disposer);
            return () => {};
        }

        // Set 去重契约：防止同一句柄重复入队造成多次清理
        if (this.seen.has(disposer)) {
            return () => this.remove(disposer);
        }

        this.seen.add(disposer);
        this.items.push(disposer);

        return () => this.remove(disposer);
    }

    /** 从注册表中显式移除尚未执行的清理句柄 */
    remove(disposer: DisposerLike): void {
        if (!disposer || !this.seen.has(disposer)) return;
        this.seen.delete(disposer);
        const index = this.items.indexOf(disposer);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
    }

    /** 注册定时器句柄，卸载时 clearTimeout */
    addTimeout(timerId: number | NodeJS.Timeout | null | undefined): DisposerFunction {
        if (timerId == null) return () => {};
        if (this._isDisposed) {
            clearTimeout(timerId as any);
            return () => {};
        }
        return this.add(() => clearTimeout(timerId as any));
    }

    /** 注册周期定时器句柄，卸载时 clearInterval */
    addInterval(intervalId: number | NodeJS.Timeout | null | undefined): DisposerFunction {
        if (intervalId == null) return () => {};
        if (this._isDisposed) {
            clearInterval(intervalId as any);
            return () => {};
        }
        return this.add(() => clearInterval(intervalId as any));
    }

    /** 注册 DOM / EventTarget 监听器，卸载时自动 removeEventListener */
    addEventListener(
        target: EventTarget | null | undefined,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): DisposerFunction {
        if (!target) return () => {};
        if (this._isDisposed) return () => {};

        target.addEventListener(type, listener, options);
        return this.add(() => {
            try {
                target.removeEventListener(type, listener, options);
            } catch {
                // 忽略异常，确保错误隔离
            }
        });
    }

    /**
     * 创建树状级联的子注册表：
     * 父级 dispose() 时将自动级联触发所有子级的 dispose()。
     * 若子级先于父级 dispose()，则自动解除在父级中的引用。
     */
    createChild(): DisposerRegistry {
        if (this._isDisposed) {
            const child = new DisposerRegistry();
            child.dispose();
            return child;
        }

        const child = new DisposerRegistry();
        this.children.add(child);

        child.add(() => {
            this.children.delete(child);
        });

        return child;
    }

    /**
     * 幂等执行资源释放：
     * 1. 重复调用直接短路返回，100% 幂等。
     * 2. 级联释放全部子注册表。
     * 3. 严格遵循 LIFO 逆序执行自身所有清理项。
     * 4. 异常强隔离，单项失败不阻断其余清理。
     */
    dispose(): void {
        if (this._isDisposed) return;
        this._isDisposed = true;

        // 级联释放所有子级注册表
        const childrenQueue = Array.from(this.children);
        this.children.clear();
        for (const child of childrenQueue) {
            try {
                child.dispose();
            } catch (err) {
                console.warn("[lvct-disposer] child disposer failed:", err);
            }
        }

        // LIFO 逆序释放注册项（后入先出）
        while (this.items.length > 0) {
            const item = this.items.pop();
            if (item) {
                this.seen.delete(item);
                this.safeExecute(item);
            }
        }
        this.seen.clear();
    }

    private safeExecute(item: DisposerLike): void {
        try {
            if (typeof item === "function") {
                item();
            } else if (item && typeof (item as { dispose?: unknown }).dispose === "function") {
                (item as { dispose: () => void }).dispose();
            } else if (item && typeof (item as { destroy?: unknown }).destroy === "function") {
                (item as { destroy: () => void }).destroy();
            }
        } catch (err) {
            console.warn("[lvct-disposer] disposer execution failed:", err);
        }
    }
}
