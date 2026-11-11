/**
 * 联系人头像与照片处理工具模块。
 * 纯前端 HTML5 Canvas 智能居中裁切与尺寸压缩引擎。
 * 严格控制头像几何尺寸（默认 160×160，在 Retina 屏幕下足以清晰呈现 56px 详情头像），
 * 杜绝原始超大照片（如 5MB-10MB）引发内存暴涨与渲染卡顿。
 */

export const AVATAR_TARGET_SIZE = 160;
export const CARD_MAX_EDGE = 1200; // 名片长边最大像素，保证名片上微小字号清晰锐利，同时控制图片体积在 80-180 KB
export const MAX_RAW_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB 预检上限

export interface ProcessAvatarResult {
    dataUrl: string;
    width: number;
    height: number;
    approximateBytes: number;
}

export interface ProcessBusinessCardResult {
    dataUrl: string;
    width: number;
    height: number;
    approximateBytes: number;
}

/**
 * 等比例缩放尺寸计算（保证长边不超过 maxEdge，保持原图宽高比不拉伸）
 */
export function calculateAspectRatioFit(srcW: number, srcH: number, maxEdge: number = CARD_MAX_EDGE): { width: number; height: number } {
    if (srcW <= 0 || srcH <= 0) return { width: 400, height: 240 };
    const currentMax = Math.max(srcW, srcH);
    if (currentMax <= maxEdge) {
        return { width: srcW, height: srcH };
    }
    const scale = maxEdge / currentMax;
    return {
        width: Math.max(1, Math.round(srcW * scale)),
        height: Math.max(1, Math.round(srcH * scale)),
    };
}

/**
 * 校验是否为合法头像位图 DataURL 或常规图片链接
 */
export function isValidAvatarUrl(value: unknown): boolean {
    if (typeof value !== "string" || !value.trim()) return false;
    const clean = value.trim();
    if (clean.startsWith("data:image/")) {
        return /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(clean);
    }
    return /^https?:\/\//i.test(clean) || clean.startsWith("assets/");
}

/**
 * 将头像相对路径（如 assets/xxx.png）或 dataUrl 解析为可供 img 标签正常加载的有效 URL
 */
export function resolveAvatarUrl(avatar?: string | null): string {
    if (!avatar || typeof avatar !== "string") return "";
    const clean = avatar.trim();
    if (!clean) return "";
    try {
        const base = typeof location !== "undefined" && location?.origin ? location.origin : "http://127.0.0.1:6806";
        return new URL(clean, base).href;
    } catch {
        return clean;
    }
}

/**
 * 对输入的图片 File 进行中心正方形裁切（Center Crop）并缩小到目标尺寸（160×160）
 */
export async function processAvatarFile(file: File, targetSize: number = AVATAR_TARGET_SIZE): Promise<ProcessAvatarResult> {
    if (!file.type.startsWith("image/")) {
        throw new Error("请选择有效的图片文件（PNG、JPG、WebP 或 GIF）");
    }
    if (file.size > MAX_RAW_IMAGE_SIZE) {
        throw new Error("原图片文件过大，请选择 10 MB 以内的图片");
    }

    // 优先使用现代高效的 createImageBitmap 解码，杜绝 Image 异步 onload 丢失
    if (typeof createImageBitmap === "function") {
        try {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement("canvas");
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("无法初始化 Canvas 绘图上下文");

            const srcW = bitmap.width;
            const srcH = bitmap.height;
            const minDim = Math.min(srcW, srcH);
            const sx = (srcW - minDim) / 2;
            const sy = (srcH - minDim) / 2;

            ctx.drawImage(bitmap, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
            bitmap.close();

            let dataUrl = canvas.toDataURL("image/webp", 0.85);
            if (!dataUrl.startsWith("data:image/webp")) {
                dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            }
            const approximateBytes = Math.round((dataUrl.length * 3) / 4);
            return {
                dataUrl,
                width: targetSize,
                height: targetSize,
                approximateBytes,
            };
        } catch {}
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("读取本地图片文件失败"));
        reader.onload = () => {
            const resultUrl = typeof reader.result === "string" ? reader.result : "";
            if (!resultUrl) {
                reject(new Error("图片内容解析为空"));
                return;
            }

            const img = new Image();
            img.onerror = () => reject(new Error("图片解码失败，请确认文件格式完整"));
            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = targetSize;
                    canvas.height = targetSize;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        reject(new Error("当前浏览器环境无法初始化 Canvas"));
                        return;
                    }

                    // 计算中心正方形切片区域（Center Crop）
                    const srcW = img.naturalWidth || img.width;
                    const srcH = img.naturalHeight || img.height;
                    const minDim = Math.min(srcW, srcH);
                    const sx = (srcW - minDim) / 2;
                    const sy = (srcH - minDim) / 2;

                    // 绘制并缩放
                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

                    // 优先导出为高压缩比的 image/webp，若不支持则降级为 image/jpeg
                    let dataUrl = canvas.toDataURL("image/webp", 0.85);
                    if (!dataUrl.startsWith("data:image/webp")) {
                        dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                    }

                    const approximateBytes = Math.round((dataUrl.length * 3) / 4);
                    resolve({
                        dataUrl,
                        width: targetSize,
                        height: targetSize,
                        approximateBytes,
                    });
                } catch (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                }
            };
            img.src = resultUrl;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 对输入的实体名片照片 File 进行等比例高清缩放与体积压缩
 * 保持名片原始长宽比，长边限制在 1200px 以内，保证公司职位、电话、二维码等微小细节清晰可辨
 */
export async function processBusinessCardFile(file: File, maxEdge: number = CARD_MAX_EDGE): Promise<ProcessBusinessCardResult> {
    if (!file.type.startsWith("image/")) {
        throw new Error("请选择有效的名片图片文件（PNG、JPG 或 WebP）");
    }
    if (file.size > MAX_RAW_IMAGE_SIZE) {
        throw new Error("原名片图片文件过大，请选择 15 MB 以内的图片");
    }

    if (typeof createImageBitmap === "function") {
        try {
            const bitmap = await createImageBitmap(file);
            const { width, height } = calculateAspectRatioFit(bitmap.width, bitmap.height, maxEdge);
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("无法初始化名片 Canvas 上下文");

            ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, width, height);
            bitmap.close();

            let dataUrl = canvas.toDataURL("image/webp", 0.85);
            if (!dataUrl.startsWith("data:image/webp")) {
                dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            }
            const approximateBytes = Math.round((dataUrl.length * 3) / 4);
            return {
                dataUrl,
                width,
                height,
                approximateBytes,
            };
        } catch {}
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("读取本地名片文件失败"));
        reader.onload = () => {
            const resultUrl = typeof reader.result === "string" ? reader.result : "";
            if (!resultUrl) {
                reject(new Error("名片图片内容解析为空"));
                return;
            }

            const img = new Image();
            img.onerror = () => reject(new Error("名片图片解码失败，请确认文件完整"));
            img.onload = () => {
                try {
                    const srcW = img.naturalWidth || img.width;
                    const srcH = img.naturalHeight || img.height;
                    const { width, height } = calculateAspectRatioFit(srcW, srcH, maxEdge);

                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        reject(new Error("当前浏览器环境无法初始化 Canvas"));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, width, height);

                    let dataUrl = canvas.toDataURL("image/webp", 0.85);
                    if (!dataUrl.startsWith("data:image/webp")) {
                        dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                    }

                    const approximateBytes = Math.round((dataUrl.length * 3) / 4);
                    resolve({
                        dataUrl,
                        width,
                        height,
                        approximateBytes,
                    });
                } catch (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                }
            };
            img.src = resultUrl;
        };
        reader.readAsDataURL(file);
    });
}

