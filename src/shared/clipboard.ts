/** A pending Clipboard API request outlives the component that started it. */
let copyPending = false;

/** Copy plain text on explicit user action, including ordinary HTTP SiYuan tabs. */
export async function copyPlainText(value: string): Promise<void> {
    if (typeof value !== "string") throw new Error("复制内容必须是文本");
    if (copyPending) throw new Error("前一次复制尚未完成，请稍候重试");
    copyPending = true;
    try {
        if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
            // A rejected asynchronous request is reported to the caller. Starting a
            // second copy after navigation could steal focus from a different view.
            await navigator.clipboard.writeText(value);
            notifyCopySuccess(value);
            return;
        }
        copyWithSelection(value);
        notifyCopySuccess(value);
    } finally {
        copyPending = false;
    }
}

function notifyCopySuccess(val: string): void {
    if (typeof window !== "undefined" && typeof (window as any).__LV_NOTICE_HUB__ !== "undefined") {
        try {
            const previewText = val.length > 20 ? val.slice(0, 18) + "…" : val;
            (window as any).__LV_NOTICE_HUB__.post({
                id: `copy_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                mode: "capsule",
                source: "人脉",
                message: `已复制：${previewText.replace(/\n/g, " ")}`,
                duration: 1600,
                level: "success",
                createdAt: Date.now(),
                repeatCount: 1,
            });
        } catch { /* soft feedback */ }
    }
}

/** Synchronous fallback while the original click still has user activation. */
function copyWithSelection(value: string): void {
    if (typeof document === "undefined" || typeof document.execCommand !== "function") {
        throw new Error("当前环境无法自动复制，请手动选择内容复制");
    }
    const previous = document.activeElement as HTMLElement | null;
    const selection = document.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
    const input = previous as HTMLInputElement | HTMLTextAreaElement | null;
    const start = typeof input?.selectionStart === "number" ? input.selectionStart : null;
    const end = typeof input?.selectionEnd === "number" ? input.selectionEnd : null;
    const direction = input?.selectionDirection;
    const temporary = document.createElement("textarea");
    temporary.value = value;
    temporary.readOnly = true;
    temporary.tabIndex = -1;
    temporary.setAttribute("aria-hidden", "true");
    temporary.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    // Stay inside the current dialog's focus scope when it has a focus trap.
    const parent = previous?.parentElement ?? document.body;
    try {
        parent.appendChild(temporary);
        temporary.focus({ preventScroll: true });
        temporary.select();
        temporary.setSelectionRange(0, value.length);
        if (!document.execCommand("copy")) throw new Error("当前环境未完成复制，请手动选择内容复制");
    } finally {
        temporary.remove();
        previous?.focus({ preventScroll: true });
        if (selection) {
            selection.removeAllRanges();
            for (const range of ranges) selection.addRange(range);
        }
        if (start !== null && end !== null && typeof input?.setSelectionRange === "function") {
            input.setSelectionRange(start, end, direction ?? undefined);
        }
    }
}
