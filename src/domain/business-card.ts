/**
 * 联系人视觉名片海报（Persona Business Card & Social Poster）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 纯 SVG 生成：无需 Canvas、无需无头浏览器、零宿主依赖，可直接导出为矢量 SVG、嵌入 Markdown 或转换图片。
 */

import type { ContactSummary } from "./person.ts";

export type CardTheme = "brand" | "minimal" | "dark";
export type CardOrientation = "horizontal" | "vertical";

export interface BusinessCardInput {
    person: ContactSummary;
    orgAndTitle?: string;
    region?: string;
    socialScore?: number;
    tierLabel?: string;
    stageLabel?: string;
    theme?: CardTheme;
    orientation?: CardOrientation;
}

export function escapeSvgText(text: string): string {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function getAvatarInitial(name: string): string {
    const trimmed = (name || "").trim();
    if (!trimmed) return "人";
    return Array.from(trimmed)[0] || "人";
}

export function generateBusinessCardSvg(input: BusinessCardInput): string {
    const {
        person,
        orgAndTitle = "",
        region = "",
        socialScore,
        tierLabel = "",
        stageLabel = "",
        theme = "brand",
        orientation = "horizontal",
    } = input;

    const isVertical = orientation === "vertical";
    const width = isVertical ? 440 : 600;
    const height = isVertical ? 600 : 380;

    const personName = escapeSvgText(person.name.trim() || "联系人");
    const avatarChar = escapeSvgText(getAvatarInitial(person.name));
    const safeOrg = escapeSvgText(orgAndTitle.trim());
    const safeRegion = escapeSvgText(region.trim());

    // 主题调色板
    let bgFill = "#FFFFFF";
    let bgCardGradient = "";
    let borderColor = "#E2E8F0";
    let textPrimary = "#0F172A";
    let textSecondary = "#64748B";
    let chipBg = "#F1F5F9";
    let chipText = "#475569";
    let accentColor = "#EA580C"; // 品牌暖干邑橙

    if (theme === "brand") {
        bgFill = "#0F172A";
        bgCardGradient = `
            <defs>
                <linearGradient id="bgGrad--brand" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0F172A" />
                    <stop offset="50%" stop-color="#1E293B" />
                    <stop offset="100%" stop-color="#0F172A" />
                </linearGradient>
                <linearGradient id="avatarGrad--brand" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#EA580C" />
                    <stop offset="100%" stop-color="#F97316" />
                </linearGradient>
                <radialGradient id="glowTop--brand" cx="10%" cy="10%" r="50%">
                    <stop offset="0%" stop-color="#EA580C" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="#EA580C" stop-opacity="0" />
                </radialGradient>
                <radialGradient id="glowBottom--brand" cx="90%" cy="90%" r="50%">
                    <stop offset="0%" stop-color="#0284C7" stop-opacity="0.25" />
                    <stop offset="100%" stop-color="#0284C7" stop-opacity="0" />
                </radialGradient>
            </defs>
        `;
        borderColor = "#334155";
        textPrimary = "#F8FAFC";
        textSecondary = "#94A3B8";
        chipBg = "rgba(255, 255, 255, 0.08)";
        chipText = "#CBD5E1";
    } else if (theme === "dark") {
        bgFill = "#18181B";
        bgCardGradient = `
            <defs>
                <linearGradient id="avatarGrad--dark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3F3F46" />
                    <stop offset="100%" stop-color="#27272A" />
                </linearGradient>
            </defs>
        `;
        borderColor = "#27272A";
        textPrimary = "#FAFAFA";
        textSecondary = "#A1A1AA";
        chipBg = "#27272A";
        chipText = "#D4D4D8";
        accentColor = "#F4F4F5";
    } else {
        // minimal
        bgCardGradient = `
            <defs>
                <linearGradient id="avatarGrad--minimal" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0284C7" />
                    <stop offset="100%" stop-color="#38BDF8" />
                </linearGradient>
            </defs>
        `;
    }

    const tagsSvg = person.tags.slice(0, 4).map((tag, idx) => {
        const xOffset = isVertical ? 24 + idx * 80 : 120 + idx * 75;
        const yOffset = isVertical ? 175 : 82;
        return `
            <g transform="translate(${xOffset}, ${yOffset})">
                <rect width="68" height="22" rx="6" fill="${chipBg}" />
                <text x="34" y="15" font-size="11" font-weight="500" fill="${chipText}" text-anchor="middle">${escapeSvgText(tag)}</text>
            </g>
        `;
    }).join("");

    // 联系方式列表
    const contactItems: Array<{ icon: string; text: string }> = [];
    if (person.phone) contactItems.push({ icon: "📞", text: person.phone });
    if (person.wechat) contactItems.push({ icon: "💬", text: person.wechat });
    if (person.email) contactItems.push({ icon: "✉️", text: person.email });
    if (safeRegion) contactItems.push({ icon: "📍", text: safeRegion });

    const contactsSvg = contactItems.slice(0, 4).map((ci, idx) => {
        const xPos = isVertical ? 24 : 36 + (idx % 2) * 270;
        const yPos = isVertical ? 230 + idx * 36 : 160 + Math.floor(idx / 2) * 36;
        return `
            <g transform="translate(${xPos}, ${yPos})">
                <text x="0" y="16" font-size="14">${ci.icon}</text>
                <text x="26" y="16" font-size="13" fill="${textPrimary}" font-family="system-ui, sans-serif">${escapeSvgText(ci.text)}</text>
            </g>
        `;
    }).join("");

    // 资产与阶段徽章
    let badgeSvg = "";
    if (tierLabel || stageLabel) {
        const badgeY = isVertical ? 420 : 255;
        const scoreStr = typeof socialScore === "number" ? ` · ${socialScore}分` : "";
        badgeSvg = `
            <g transform="translate(24, ${badgeY})">
                ${tierLabel ? `
                <g transform="translate(0, 0)">
                    <rect width="140" height="26" rx="8" fill="rgba(234, 88, 12, 0.15)" stroke="#EA580C" stroke-width="1" />
                    <text x="70" y="17" font-size="12" font-weight="600" fill="#EA580C" text-anchor="middle">⭐ ${escapeSvgText(tierLabel)}${scoreStr}</text>
                </g>` : ""}
                ${stageLabel ? `
                <g transform="translate(${tierLabel ? 148 : 0}, 0)">
                    <rect width="120" height="26" rx="8" fill="rgba(2, 132, 199, 0.15)" stroke="#0284C7" stroke-width="1" />
                    <text x="60" y="17" font-size="12" font-weight="600" fill="#0284C7" text-anchor="middle">🚀 ${escapeSvgText(stageLabel)}</text>
                </g>` : ""}
            </g>
        `;
    }

    const footerY = height - 32;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    ${bgCardGradient}
    <!-- 卡片外框与背景 -->
    <rect width="${width}" height="${height}" rx="20" fill="${theme === "brand" ? "url(#bgGrad--brand)" : bgFill}" stroke="${borderColor}" stroke-width="1.5" />
    ${theme === "brand" ? `
    <rect width="${width}" height="${height}" rx="20" fill="${theme === "brand" ? "url(#glowTop--brand)" : "none"}" pointer-events="none" />
    <rect width="${width}" height="${height}" rx="20" fill="${theme === "brand" ? "url(#glowBottom--brand)" : "none"}" pointer-events="none" />
    ` : ""}

    <!-- 头像圆形徽章 -->
    <g transform="translate(${isVertical ? 24 : 36}, 32)">
        <circle cx="32" cy="32" r="32" fill="url(#avatarGrad--${theme})" />
        <text x="32" y="42" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${avatarChar}</text>
    </g>

    <!-- 姓名与机构职称 -->
    <g transform="translate(${isVertical ? 104 : 120}, 46)">
        <text x="0" y="18" font-size="24" font-weight="bold" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif">${personName}</text>
        ${safeOrg ? `<text x="0" y="42" font-size="13" font-weight="500" fill="${textSecondary}" font-family="system-ui, sans-serif">${safeOrg}</text>` : ""}
    </g>

    <!-- 标签列 -->
    ${tagsSvg}

    <!-- 分割线 -->
    <line x1="24" y1="${isVertical ? 210 : 130}" x2="${width - 24}" y2="${isVertical ? 210 : 130}" stroke="${borderColor}" stroke-width="1" stroke-dasharray="4 4" />

    <!-- 联系方式 -->
    ${contactsSvg}

    <!-- 社交资产与阶段徽标 -->
    ${badgeSvg}

    <!-- 底部标识水印 -->
    <g transform="translate(24, ${footerY})">
        <text x="0" y="14" font-size="11" fill="${textSecondary}" font-family="system-ui, sans-serif">小驴人脉 · 个人人际关系网络与成长印记</text>
        <text x="${width - 48}" y="14" font-size="11" font-weight="600" fill="${accentColor}" text-anchor="end" font-family="system-ui, sans-serif">LV CONTACTS</text>
    </g>
</svg>`.trim();
}
