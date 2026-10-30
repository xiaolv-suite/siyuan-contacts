/**
 * 移动端底部弹层/抽屉轻量级滑动下拉关闭手势（Swipe-to-Dismiss）。
 * 零外部依赖，支持手指跟随、阻尼回弹与滑出关闭回调。
 */

export interface SwipeDismissOptions {
    /** 下拉判定关闭的位移阈值（像素，默认 80px） */
    threshold?: number;
    /** 达到阈值释放手指后触发的关闭回调 */
    onDismiss: () => void;
    /** 是否启用（例如仅在移动端开启） */
    enabled?: boolean;
}

export function swipeDismiss(node: HTMLElement, options: SwipeDismissOptions) {
    let startY = 0;
    let currentDeltaY = 0;
    let isTracking = false;
    let isDragging = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    function getTouch(event: TouchEvent): Touch | null {
        return event.touches.length > 0 ? event.touches[0] : null;
    }

    function onTouchStart(event: TouchEvent) {
        if (!options.enabled && options.enabled !== undefined) return;
        const touch = getTouch(event);
        if (!touch) return;

        // 如果触摸发生在可滚动的子容器内且子容器未滚动到顶部，则允许正常内部滚动，不抢手势
        const target = event.target as HTMLElement | null;
        const scrollable = typeof target?.closest === "function"
            ? target.closest(".lvct-sheet__body, .trash-content-list, .lvct-dialog-panel")
            : null;
        if (scrollable && scrollable.scrollTop > 0) {
            return;
        }

        startY = touch.clientY;
        currentDeltaY = 0;
        isTracking = true;
        isDragging = false;
        node.style.transition = "none";
    }

    function onTouchMove(event: TouchEvent) {
        if (!isTracking) return;
        const touch = getTouch(event);
        if (!touch) return;

        const delta = touch.clientY - startY;
        // 只响应向下滑动
        if (delta > 0) {
            // 轻微阻尼计算，使拖拽手感真实细腻
            currentDeltaY = delta;
            isDragging = true;
            node.style.transform = `translateY(${Math.min(currentDeltaY, 260)}px)`;
            if (event.cancelable) {
                event.preventDefault();
            }
        } else {
            currentDeltaY = 0;
            node.style.transform = "";
        }
    }

    function onTouchEnd() {
        if (!isTracking) return;
        isTracking = false;

        const threshold = options.threshold ?? 80;
        node.style.transition = "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)";

        if (isDragging && currentDeltaY >= threshold) {
            // 滑出并触发关闭
            node.style.transform = "translateY(100%)";
            if (dismissTimer) clearTimeout(dismissTimer);
            dismissTimer = setTimeout(() => {
                dismissTimer = null;
                options.onDismiss();
            }, 180);
        } else {
            // 未达阈值，弹性归位
            node.style.transform = "";
        }

        isDragging = false;
        currentDeltaY = 0;
    }

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return {
        update(newOptions: SwipeDismissOptions) {
            options = newOptions;
        },
        destroy() {
            if (dismissTimer) {
                clearTimeout(dismissTimer);
                dismissTimer = null;
            }
            node.removeEventListener("touchstart", onTouchStart);
            node.removeEventListener("touchmove", onTouchMove);
            node.removeEventListener("touchend", onTouchEnd);
            node.removeEventListener("touchcancel", onTouchEnd);
        },
    };
}
