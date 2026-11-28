import { confirm as siyuanConfirm, Dialog } from "siyuan";

export interface ConfirmDialogOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

export interface PromptDialogOptions {
    title?: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

function escapeHtml(raw: string): string {
    return raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * 原生非阻塞输入对话框，彻底消除 window.prompt 在 Electron 宿主与触屏端引发的阻塞与失效
 */
export function promptDialog(options: PromptDialogOptions): Promise<string | null> {
    if (typeof Dialog === "function") {
        return new Promise((resolve) => {
            let settled = false;
            const dlg = new Dialog({
                title: options.title ?? "请输入",
                content: `
                    <div class="b3-dialog__content" style="padding: 16px 24px;">
                        ${options.message ? `<div class="b3-label__text" style="margin-bottom: 8px; font-size: 13px; color: var(--b3-theme-on-surface);">${escapeHtml(options.message)}</div>` : ""}
                        <input type="text" class="b3-text-field fn__block" placeholder="${escapeHtml(options.placeholder ?? "")}" value="${escapeHtml(options.defaultValue ?? "")}" style="width: 100%; box-sizing: border-box;" />
                    </div>
                    <div class="b3-dialog__action">
                        <button type="button" class="b3-button b3-button--cancel">${escapeHtml(options.cancelLabel ?? "取消")}</button>
                        <button type="button" class="b3-button b3-button--text">${escapeHtml(options.confirmLabel ?? "确定")}</button>
                    </div>
                `,
                width: typeof window !== "undefined" && window.innerWidth < 640 ? "90vw" : "420px",
                destroyCallback: () => {
                    if (!settled) {
                        settled = true;
                        resolve(null);
                    }
                },
            });

            const inputEl = dlg.element.querySelector<HTMLInputElement>("input.b3-text-field");
            const cancelBtn = dlg.element.querySelector<HTMLButtonElement>(".b3-button--cancel");
            const okBtn = dlg.element.querySelector<HTMLButtonElement>(".b3-button--text");

            const submit = () => {
                if (settled) return;
                settled = true;
                const val = inputEl?.value ?? "";
                dlg.destroy();
                resolve(val);
            };

            const cancel = () => {
                if (settled) return;
                settled = true;
                dlg.destroy();
                resolve(null);
            };

            cancelBtn?.addEventListener("click", cancel);
            okBtn?.addEventListener("click", submit);
            inputEl?.addEventListener("keydown", (e) => {
                if (e.isComposing || e.keyCode === 229) return;
                if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancel();
                }
            });

            setTimeout(() => {
                inputEl?.focus();
                inputEl?.select();
            }, 80);
        });
    }

    if (typeof window !== "undefined" && typeof window.prompt === "function") {
        try {
            return Promise.resolve(window.prompt(options.message ?? options.title ?? "", options.defaultValue ?? ""));
        } catch {
            return Promise.resolve(null);
        }
    }
    return Promise.resolve(null);
}

/**
 * K-10：统一确认对话框服务。
 * 优先使用思源原生非阻塞确认弹窗（siyuan.confirm），避免原生 window.confirm 冻结渲染与自动化输入通道；
 * 在非宿主/单元测试环境中优雅降级到 window.confirm。
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
    if (typeof siyuanConfirm === "function") {
        return new Promise((resolve) => {
            try {
                siyuanConfirm(
                    options.title ?? "确认",
                    options.message,
                    () => resolve(true),
                    () => resolve(false)
                );
                if (typeof requestAnimationFrame === "function" && typeof document !== "undefined") {
                    requestAnimationFrame(() => {
                        const dialogs = document.querySelectorAll<HTMLElement>(".b3-dialog");
                        if (dialogs.length > 0) {
                            const top = dialogs[dialogs.length - 1];
                            top.classList.add("lv-top-confirm");
                            top.style.setProperty("z-index", "2000", "important");
                            if (options.confirmLabel) {
                                const okBtn = top.querySelector<HTMLButtonElement>(".b3-dialog__action .b3-button--text");
                                if (okBtn) okBtn.textContent = options.confirmLabel;
                            }
                            if (options.cancelLabel) {
                                const cancelBtn = top.querySelector<HTMLButtonElement>(".b3-dialog__action .b3-button--cancel");
                                if (cancelBtn) cancelBtn.textContent = options.cancelLabel;
                            }
                        }
                    });
                }
            } catch {
                if (typeof window !== "undefined" && typeof window.confirm === "function") {
                    try {
                        resolve(Boolean(window.confirm(options.message)));
                        return;
                    } catch {
                        resolve(false);
                        return;
                    }
                }
                resolve(false);
            }
        });
    }
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
        try {
            const confirmed = window.confirm(options.message);
            return Promise.resolve(Boolean(confirmed));
        } catch {
            return Promise.resolve(false);
        }
    }
    return Promise.resolve(false);
}
