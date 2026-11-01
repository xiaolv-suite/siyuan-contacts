import { getFrontend, openMobileFileById, openTab } from "siyuan";
import type { App } from "siyuan";

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
