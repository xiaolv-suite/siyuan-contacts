import { getFrontend, openMobileFileById, openTab } from "siyuan";
import type { App } from "siyuan";
import { querySql } from "../api/client";
import { showDocTreeNativeMenu } from "./lv-notice-kit";

export interface OpenDocOptions {
    /** 精确高亮并滚动定位到的子块 ID */
    targetBlockId?: string;
    /** 是否聚焦并高亮上下文 */
    highlight?: boolean;
}

/** 移动端只派发打开请求；同步异常会回传，但返回不能证明宿主已完成页面切换。 */
export async function openSiYuanDocument(
    app: App,
    docId: string,
    options?: OpenDocOptions,
): Promise<void> {
    const frontend = getFrontend();
    const targetId = options?.targetBlockId || docId;
    if (frontend === "mobile" || frontend === "browser-mobile") {
        openMobileFileById(app, targetId);
        return;
    }
    const hasBlockTarget = Boolean(options?.targetBlockId);
    await openTab({
        app,
        doc: {
            id: targetId,
            ...(hasBlockTarget || options?.highlight ? { action: ["cb-get-hl", "cb-get-context"] } : {}),
        },
    });
}

/** 弹出思源官方原生文档树右键菜单（支持移动端原生底栏菜单） */
export async function openDocumentContextMenu(
    docId: string,
    event: MouseEvent,
    notebookId?: string,
): Promise<boolean> {
    if (!docId) return false;
    let nbId = notebookId;
    if (!nbId) {
        try {
            const rows = await querySql<{ box: string }>(`SELECT box FROM blocks WHERE id = '${docId.replace(/'/g, "''")}' LIMIT 1`);
            if (rows && rows[0]?.box) {
                nbId = String(rows[0].box);
            }
        } catch {}
    }
    if (nbId) {
        return await showDocTreeNativeMenu({
            notebookId: nbId,
            docId,
            position: { x: event.clientX, y: event.clientY },
        });
    }
    return false;
}
