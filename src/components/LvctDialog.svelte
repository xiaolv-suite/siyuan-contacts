<script lang="ts">
    import { onDestroy, onMount, tick } from "svelte";
    import type { Snippet } from "svelte";
    import { Maximize2, Minimize2, X } from "@lucide/svelte";
    import { createCloseScope } from "./close-guard";
    import { getFocusableElements } from "../shared/focusable-elements";
    import { acquireModalBodyClass } from "../shared/modal-host";
    import {
        applyResizeDelta,
        clampDialogSize,
        clearSavedDialogSize,
        DEFAULT_DETAIL_DIALOG_CONSTRAINTS,
        readSavedDialogSize,
        writeSavedDialogSize,
        type DialogSize,
        type ResizeHandleEdge,
    } from "../domain/dialog-resize";

    let {
        title,
        closeLabel = "关闭",
        wide = false,
        modal = true,
        closeOnBackdrop = true,
        resizable = false,
        maximizable = false,
        sizeStorageKey = "",
        maskClass = "",
        panelClass = "",
        beforeClose,
        onClose,
        children,
    }: {
        title: string;
        closeLabel?: string;
        wide?: boolean;
        modal?: boolean;
        closeOnBackdrop?: boolean;
        resizable?: boolean;
        maximizable?: boolean;
        sizeStorageKey?: string;
        maskClass?: string;
        panelClass?: string;
        /** 子窗口可使用自身编辑器的守卫，避免被等待其结果的父窗口 busy 阻断。 */
        beforeClose?: () => Promise<boolean>;
        onClose: () => void;
        children: Snippet;
    } = $props();

    let panel: HTMLDivElement | undefined = $state();
    let closing = false;
    let lastContentFocus: HTMLElement | null = null;
    let maximized = $state(false);
    let customSize = $state<DialogSize | null>(null);
    let resizing = $state(false);
    let isDesktop = $state(typeof window !== "undefined" ? window.innerWidth > 640 : true);
    let activeResizeCleanup: (() => void) | null = null;

    const canClose = createCloseScope(() => panel);
    const titleId = `lvct-dialog-title-${Math.random().toString(36).slice(2)}`;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function detectDesktop(): boolean {
        if (typeof window === "undefined") return false;
        if (panel?.closest('.lvct-workbench[data-narrow="true"], .lvct-mobile-dialog')) return false;
        return window.innerWidth > 640;
    }

    function currentViewport() {
        return {
            width: typeof window !== "undefined" ? window.innerWidth : 1280,
            height: typeof window !== "undefined" ? window.innerHeight : 800,
        };
    }

    function focusables(): HTMLElement[] {
        return panel ? getFocusableElements(panel) : [];
    }

    function toggleMaximize() {
        if (!maximizable || !detectDesktop()) return;
        maximized = !maximized;
    }

    function resetDialogSize() {
        maximized = false;
        customSize = null;
        if (sizeStorageKey && typeof window !== "undefined") {
            clearSavedDialogSize(window.localStorage, sizeStorageKey);
        }
    }

    function startResize(edge: ResizeHandleEdge, event: PointerEvent) {
        if (event.button !== 0 || !resizable || maximized || !detectDesktop() || !panel) return;
        event.preventDefault();
        event.stopPropagation();

        activeResizeCleanup?.();
        const startX = event.clientX;
        const startY = event.clientY;
        const rect = panel.getBoundingClientRect();
        const startSize: DialogSize = customSize ?? {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        };
        resizing = true;

        const onPointerMove = (moveEvent: PointerEvent) => {
            customSize = applyResizeDelta(
                startSize,
                edge,
                moveEvent.clientX - startX,
                moveEvent.clientY - startY,
                currentViewport(),
                DEFAULT_DETAIL_DIALOG_CONSTRAINTS,
            );
        };

        const finish = () => {
            cleanup();
            resizing = false;
            if (sizeStorageKey && customSize && typeof window !== "undefined") {
                writeSavedDialogSize(window.localStorage, sizeStorageKey, customSize);
            }
        };

        const cleanup = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", finish);
            window.removeEventListener("pointercancel", finish);
            activeResizeCleanup = null;
        };

        activeResizeCleanup = cleanup;
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", finish);
        window.addEventListener("pointercancel", finish);
    }

    async function requestClose() {
        if (closing) return;
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const fields = [...(panel?.querySelectorAll<HTMLElement>(
            "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
        ) ?? [])];
        const editableFields = fields.filter((field) => field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement);
        const draftField = editableFields.find((field) => field.getAttribute("aria-label") === "新增别名")
            ?? editableFields.find((field) => String((field as HTMLInputElement).value ?? "").length > 0)
            ?? editableFields[0]
            ?? fields[0]
            ?? null;
        const restoreTarget = lastContentFocus?.isConnected
            ? lastContentFocus
            : active && panel?.contains(active) && !active.classList.contains("lvct-dialog-panel__close") ? active : draftField;
        closing = true;
        try {
            // B06：聚合作用域内全部脏项，弹一次三选一（保存并离开/放弃/取消）
            const allowed = await (beforeClose ? beforeClose() : canClose.requestClose());
            if (!allowed) {
                await tick();
                if (restoreTarget?.isConnected) {
                    // A draft can live inside a collapsed details block. Open
                    // its owning disclosure before asking the browser to focus it.
                    let disclosure = restoreTarget.parentElement?.closest("details");
                    while (disclosure) {
                        disclosure.open = true;
                        disclosure = disclosure.parentElement?.closest("details");
                    }
                    await tick();
                    restoreTarget.focus({ preventScroll: true });
                }
                return;
            }
            maximized = false;
            onClose();
        } finally {
            closing = false;
        }
    }

    function hasHigherBlockingOverlay(): boolean {
        if (typeof document === "undefined") return false;
        const panels = document.querySelectorAll(".lvct-dialog-panel");
        if (panel && panels.length > 0 && panels[panels.length - 1] !== panel) return true;
        const blockers = document.querySelectorAll<HTMLElement>(
            ".b3-dialog, .lvct-confirm-dialog-root, .lvct-closeguard, .lvct-card-viewer-modal"
        );
        for (const blocker of blockers) {
            if (panel && blocker.contains(panel)) continue;
            return true;
        }
        return false;
    }

    function handleKeydown(event: KeyboardEvent) {
        // 中文/日文 IME 合成期（isComposing 或 keyCode === 229）整体让路，对齐 lv-focus-trap.ts 规范
        if (event.isComposing || event.keyCode === 229) return;
        // 选人器等子浮层已处理 Esc 时，只收起该浮层。
        if (event.defaultPrevented) return;
        // 嵌套编辑窗口各自处理键盘焦点与 Esc。
        // 外层弹层不能抢走内层的按键，否则 Esc 会连关两层窗口。
        const activePanel = document.activeElement instanceof HTMLElement
            ? document.activeElement.closest(".lvct-dialog-panel")
            : null;
        if (activePanel && activePanel !== panel) return;
        if (hasHigherBlockingOverlay()) return;
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (maximized && detectDesktop()) {
                maximized = false;
                return;
            }
            void requestClose();
            return;
        }
        if (event.key !== "Tab" || !modal) return;
        // 焦点位于思源原生右键菜单 / 命令提示 / 悬浮菜单内时直接放行，对齐 lv-focus-trap.ts 规范
        const activeEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (activeEl?.closest('.b3-menu, #commonMenu, .protyle-hint, [role="menu"]')) return;
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function handleWindowKeydown(event: KeyboardEvent) {
        if (panel && event.target instanceof Node && panel.contains(event.target)) return;
        handleKeydown(event);
    }

    function handleWindowCaptureEscape(event: KeyboardEvent) {
        if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
        if (!maximized || !detectDesktop()) return;
        const activePanel = document.activeElement instanceof HTMLElement
            ? document.activeElement.closest(".lvct-dialog-panel")
            : null;
        if (activePanel && activePanel !== panel) return;
        if (hasHigherBlockingOverlay()) return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target && target.closest('input, textarea, select, [contenteditable="true"], .lvct-picker__panel, .lvct-detail__more-tools[open], .lvct-card-viewer-modal, .lvct-confirm-dialog-root, .lvct-closeguard')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        maximized = false;
    }

    onMount(() => {
        const releaseModalClass = acquireModalBodyClass();
        isDesktop = detectDesktop();
        if (resizable && sizeStorageKey && isDesktop && typeof window !== "undefined") {
            const loaded = readSavedDialogSize(
                window.localStorage,
                sizeStorageKey,
                currentViewport(),
                DEFAULT_DETAIL_DIALOG_CONSTRAINTS,
            );
            if (loaded) customSize = loaded;
        }
        void tick().then(() => focusables()[0]?.focus());

        const handleWindowResize = () => {
            isDesktop = detectDesktop();
            if (!isDesktop) {
                maximized = false;
                return;
            }
            if (customSize) {
                customSize = clampDialogSize(customSize, currentViewport(), DEFAULT_DETAIL_DIALOG_CONSTRAINTS);
            }
        };

        // 移动端虚拟键盘避让 (visualViewport)：若外层工作台/全屏移动容器已通过 --lvct-vv-h 扣减高度，禁止内层二次扣减
        const updateViewport = () => {
            if (typeof window !== "undefined" && window.visualViewport && panel) {
                if (panel.closest(".lvct-workbench, .lvct-mobile-dialog")) {
                    panel.style.marginBottom = "";
                    panel.style.maxHeight = "";
                    return;
                }
                const offset = window.innerHeight - window.visualViewport.height;
                if (offset > 120) {
                    panel.style.marginBottom = `${offset}px`;
                    panel.style.maxHeight = `${window.visualViewport.height - 32}px`;
                } else {
                    panel.style.marginBottom = "";
                    panel.style.maxHeight = "";
                }
            }
        };
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", handleWindowCaptureEscape, true);
            window.addEventListener("resize", handleWindowResize);
            if (window.visualViewport) {
                window.visualViewport.addEventListener("resize", updateViewport);
                window.visualViewport.addEventListener("scroll", updateViewport, { passive: true });
            }
        }

        return () => {
            releaseModalClass();
            activeResizeCleanup?.();
            if (typeof window !== "undefined") {
                window.removeEventListener("keydown", handleWindowCaptureEscape, true);
                window.removeEventListener("resize", handleWindowResize);
                if (window.visualViewport) {
                    window.visualViewport.removeEventListener("resize", updateViewport);
                    window.visualViewport.removeEventListener("scroll", updateViewport);
                }
            }
            previousActive?.focus();
        };
    });

    onDestroy(() => {
        activeResizeCleanup?.();
    });
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div
    class={`lvct-dialog-mask${maskClass ? ` ${maskClass}` : ""}`}
    role="presentation"
    onclick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) void requestClose();
    }}
>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class:lvct-dialog-panel--wide={wide}
        class:lvct-dialog-panel--resizable={resizable && isDesktop}
        class:lvct-dialog-panel--resizing={resizing}
        class:lvct-dialog-panel--maximized={maximized && isDesktop}
        class={`lvct-dialog-panel${panelClass ? ` ${panelClass}` : ""}`}
        style={isDesktop && !maximized && customSize ? `width: ${customSize.width}px; height: ${customSize.height}px;` : undefined}
        role="dialog"
        tabindex="-1"
        aria-modal={modal ? "true" : undefined}
        aria-labelledby={titleId}
        bind:this={panel}
        onkeydown={handleKeydown}
        onfocusin={(event) => {
            const target = event.target;
            if (target instanceof HTMLElement && panel?.contains(target) && !target.classList.contains("lvct-dialog-panel__close")) {
                lastContentFocus = target;
            }
        }}
    >
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="lvct-dialog-panel__header"
            ondblclick={(event) => {
                if (!maximizable || !detectDesktop()) return;
                const target = event.target as HTMLElement | null;
                if (target?.closest("button")) return;
                toggleMaximize();
            }}
        >
            <div class="lv-dialog-title-wrap">
                <span class="lv-dialog-title-badge" aria-hidden="true">驴</span>
                <h2 id={titleId} class="lvct-dialog-panel__title">{title}</h2>
            </div>
            {#if maximizable && isDesktop}
                <button
                    class="lvct-dialog-panel__maximize"
                    type="button"
                    aria-label={maximized ? "还原窗口大小" : "最大化窗口"}
                    title={maximized ? "还原窗口大小 (Esc)" : "最大化窗口"}
                    aria-pressed={maximized}
                    onclick={toggleMaximize}
                >
                    {#if maximized}
                        <Minimize2 size={15} strokeWidth={1.6} aria-hidden="true" />
                    {:else}
                        <Maximize2 size={15} strokeWidth={1.6} aria-hidden="true" />
                    {/if}
                </button>
            {/if}
            <button class="lvct-dialog-panel__close" type="button" aria-label={closeLabel} title={closeLabel}
                onmousedown={(event) => {
                    const active = document.activeElement;
                    if (active instanceof HTMLElement && panel?.contains(active) && !active.classList.contains("lvct-dialog-panel__close")) lastContentFocus = active;
                    event.preventDefault();
                }}
                onclick={() => void requestClose()}>
                <X size={16} strokeWidth={1.6} aria-hidden="true" />
            </button>
        </div>
        <div class="lvct-dialog-panel__body">
            {@render children()}
        </div>
        {#if resizable && isDesktop && !maximized}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="lvct-dialog-panel__resize-edge lvct-dialog-panel__resize-edge--e"
                aria-hidden="true"
                onpointerdown={(event) => startResize("e", event)}
            ></div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="lvct-dialog-panel__resize-edge lvct-dialog-panel__resize-edge--w"
                aria-hidden="true"
                onpointerdown={(event) => startResize("w", event)}
            ></div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="lvct-dialog-panel__resize-edge lvct-dialog-panel__resize-edge--s"
                aria-hidden="true"
                onpointerdown={(event) => startResize("s", event)}
            ></div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="lvct-dialog-panel__resize-corner lvct-dialog-panel__resize-corner--se"
                title="拖拽调整窗口大小（双击恢复默认尺寸）"
                aria-hidden="true"
                onpointerdown={(event) => startResize("se", event)}
                ondblclick={resetDialogSize}
            ></div>
        {/if}
    </div>
</div>
