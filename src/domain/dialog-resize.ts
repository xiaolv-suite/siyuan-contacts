/**
 * 弹窗尺寸缩放、视口钳制与持久化纯函数层。
 * 禁 import svelte/siyuan/api/data，供 LvctDialog 桌面端自由拖拽放大缩小及单元测试复用。
 */

export interface DialogSize {
    readonly width: number;
    readonly height: number;
}

export interface ViewportBounds {
    readonly width: number;
    readonly height: number;
}

export interface DialogSizeConstraints {
    readonly minWidth: number;
    readonly minHeight: number;
    readonly defaultWidth: number;
    readonly defaultHeight: number;
    readonly margin: number;
}

export type ResizeHandleEdge = "e" | "w" | "s" | "se" | "sw";

export interface DialogStorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export const DETAIL_DIALOG_SIZE_STORAGE_KEY = "lvct:person-detail:dialog-size:v1";

export const DEFAULT_DETAIL_DIALOG_CONSTRAINTS: DialogSizeConstraints = {
    minWidth: 580,
    minHeight: 460,
    defaultWidth: 960,
    defaultHeight: 820,
    margin: 24,
};

function sanitizeViewport(viewport: ViewportBounds): ViewportBounds {
    const width = Number.isFinite(viewport.width) && viewport.width > 0 ? Math.floor(viewport.width) : 1280;
    const height = Number.isFinite(viewport.height) && viewport.height > 0 ? Math.floor(viewport.height) : 800;
    return { width, height };
}

export function clampDialogSize(
    size: Partial<DialogSize> | null | undefined,
    viewport: ViewportBounds,
    constraints: DialogSizeConstraints = DEFAULT_DETAIL_DIALOG_CONSTRAINTS,
): DialogSize {
    const vp = sanitizeViewport(viewport);
    const margin = Math.max(8, Math.floor(constraints.margin));
    const maxWidth = Math.max(320, vp.width - margin);
    const maxHeight = Math.max(320, vp.height - margin);
    const minWidth = Math.min(Math.max(280, Math.floor(constraints.minWidth)), maxWidth);
    const minHeight = Math.min(Math.max(240, Math.floor(constraints.minHeight)), maxHeight);

    const rawW = typeof size?.width === "number" && Number.isFinite(size.width) && size.width > 0
        ? size.width
        : constraints.defaultWidth;
    const rawH = typeof size?.height === "number" && Number.isFinite(size.height) && size.height > 0
        ? size.height
        : constraints.defaultHeight;

    return {
        width: Math.round(Math.min(maxWidth, Math.max(minWidth, rawW))),
        height: Math.round(Math.min(maxHeight, Math.max(minHeight, rawH))),
    };
}

export function computeDefaultDialogSize(
    viewport: ViewportBounds,
    constraints: DialogSizeConstraints = DEFAULT_DETAIL_DIALOG_CONSTRAINTS,
): DialogSize {
    return clampDialogSize(
        { width: constraints.defaultWidth, height: constraints.defaultHeight },
        viewport,
        constraints,
    );
}

/**
 * 居中弹窗拖拽边/角计算（居中布局下左右/上下对称扩张，光标与边沿 1:1 贴合）。
 */
export function applyResizeDelta(
    startSize: DialogSize,
    edge: ResizeHandleEdge,
    deltaX: number,
    deltaY: number,
    viewport: ViewportBounds,
    constraints: DialogSizeConstraints = DEFAULT_DETAIL_DIALOG_CONSTRAINTS,
): DialogSize {
    const dx = Number.isFinite(deltaX) ? deltaX : 0;
    const dy = Number.isFinite(deltaY) ? deltaY : 0;
    let nextWidth = startSize.width;
    let nextHeight = startSize.height;

    if (edge === "e" || edge === "se") nextWidth = startSize.width + dx * 2;
    if (edge === "w" || edge === "sw") nextWidth = startSize.width - dx * 2;
    if (edge === "s" || edge === "se" || edge === "sw") nextHeight = startSize.height + dy * 2;

    return clampDialogSize({ width: nextWidth, height: nextHeight }, viewport, constraints);
}

export function readSavedDialogSize(
    storage: Pick<DialogStorageLike, "getItem"> | null | undefined,
    key: string | undefined,
    viewport: ViewportBounds,
    constraints: DialogSizeConstraints = DEFAULT_DETAIL_DIALOG_CONSTRAINTS,
): DialogSize | null {
    if (!storage || !key) return null;
    try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<DialogSize> | null;
        if (!parsed || typeof parsed.width !== "number" || typeof parsed.height !== "number") return null;
        if (!Number.isFinite(parsed.width) || !Number.isFinite(parsed.height)) return null;
        if (parsed.width <= 0 || parsed.height <= 0) return null;
        return clampDialogSize(parsed, viewport, constraints);
    } catch {
        return null;
    }
}

export function writeSavedDialogSize(
    storage: Pick<DialogStorageLike, "setItem"> | null | undefined,
    key: string | undefined,
    size: DialogSize,
): boolean {
    if (!storage || !key) return false;
    try {
        storage.setItem(key, JSON.stringify({
            width: Math.round(size.width),
            height: Math.round(size.height),
        }));
        return true;
    } catch {
        return false;
    }
}

export function clearSavedDialogSize(
    storage: Pick<DialogStorageLike, "removeItem"> | null | undefined,
    key: string | undefined,
): boolean {
    if (!storage || !key) return false;
    try {
        storage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}
