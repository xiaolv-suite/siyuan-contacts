/**
 * 多通讯条目与自定义信息条目领域逻辑（纯函数，无 DOM/IO，Node --test 即可测）
 * 支持每人创建/修改多种类型的多个条目（多个手机号、多个微信号、多个邮箱、社交账号、地址、自定义等）
 */

export type ChannelType =
    | "phone"
    | "wechat"
    | "email"
    | "landline"
    | "im"
    | "social"
    | "address"
    | "custom";

export interface ContactChannel {
    id: string;
    type: ChannelType;
    label: string;
    value: string;
    isPrimary?: boolean;
    createdAt?: number;
}

export interface ChannelTypeMeta {
    type: ChannelType;
    label: string;
    icon: string;
    placeholder: string;
    presetLabels: readonly string[];
}

export const CHANNEL_TYPES: readonly ChannelTypeMeta[] = [
    {
        type: "phone",
        label: "手机号",
        icon: "📱",
        placeholder: "请输入手机号码",
        presetLabels: ["手机", "工作手机", "个人手机", "常用手机", "备用号码"],
    },
    {
        type: "wechat",
        label: "微信号",
        icon: "💬",
        placeholder: "请输入微信号",
        presetLabels: ["微信", "工作微信", "生活微信", "微信小号"],
    },
    {
        type: "email",
        label: "电子邮箱",
        icon: "✉️",
        placeholder: "name@example.com",
        presetLabels: ["常用邮箱", "工作邮箱", "个人邮箱", "企业邮箱"],
    },
    {
        type: "landline",
        label: "电话/座机",
        icon: "☎️",
        placeholder: "如 010-88888888 或分机号",
        presetLabels: ["公司座机", "办公室电话", "家庭座机", "传真"],
    },
    {
        type: "im",
        label: "即时通讯",
        icon: "🗨️",
        placeholder: "QQ、钉钉、飞书、Telegram 等",
        presetLabels: ["QQ", "飞书", "钉钉", "企业微信", "Telegram", "WhatsApp"],
    },
    {
        type: "social",
        label: "社交主页",
        icon: "🌐",
        placeholder: "主页链接或社交账号",
        presetLabels: ["领英 LinkedIn", "即刻", "小红书", "GitHub", "知乎", "微博", "Twitter / X", "个人博客"],
    },
    {
        type: "address",
        label: "地址",
        icon: "📍",
        placeholder: "常驻办公地址、住址或收件地址",
        presetLabels: ["公司地址", "家庭住址", "常驻地", "收发快递地址"],
    },
    {
        type: "custom",
        label: "自定义",
        icon: "🏷️",
        placeholder: "请输入条目内容",
        presetLabels: ["工号", "会员卡号", "其他联系方式", "车牌号"],
    },
];

export const CHANNEL_TYPE_MAP: Readonly<Record<ChannelType, ChannelTypeMeta>> = Object.fromEntries(
    CHANNEL_TYPES.map((meta) => [meta.type, meta]),
) as Record<ChannelType, ChannelTypeMeta>;

const VALUE_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

export function newChannelId(): string {
    return `chan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 校验并规范化条目列表
 */
export function normalizeChannels(raw: unknown): ContactChannel[] {
    if (!Array.isArray(raw)) return [];
    const result: ContactChannel[] = [];
    const seenIds = new Set<string>();

    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const entry = item as Partial<ContactChannel>;
        const rawType = String(entry.type || "custom").toLowerCase() as ChannelType;
        const type: ChannelType = CHANNEL_TYPE_MAP[rawType] ? rawType : "custom";
        const label = String(entry.label || CHANNEL_TYPE_MAP[type].label).trim().slice(0, 40);
        const rawValue = String(entry.value || "").trim();
        if (!rawValue) continue;
        const value = rawValue.replace(/\r\n?/g, " ").replace(VALUE_CONTROLS, "").slice(0, 500);
        if (!value) continue;

        let id = String(entry.id || "").trim();
        if (!id || seenIds.has(id)) {
            id = newChannelId();
        }
        seenIds.add(id);

        result.push({
            id,
            type,
            label: label || CHANNEL_TYPE_MAP[type].label,
            value,
            ...(entry.isPrimary ? { isPrimary: true } : {}),
            createdAt: typeof entry.createdAt === "number" ? entry.createdAt : Date.now(),
        });
    }

    return result;
}

/**
 * 将联系人总表中的核心单值联系方式与已存多条目无缝对齐
 * 如果已有条目库中尚无主手机/主微信，自动合成带有 isPrimary 标志的基准条目
 */
export function alignChannelsWithContact(
    contact: { phone?: string; wechat?: string; email?: string; website?: string },
    channels: readonly ContactChannel[],
): ContactChannel[] {
    const list = [...channels];
    const phoneVal = contact.phone?.trim() || "";
    const wechatVal = contact.wechat?.trim() || "";
    const emailVal = contact.email?.trim() || "";
    const websiteVal = contact.website?.trim() || "";

    const hasPhone = phoneVal ? list.some((c) => c.type === "phone" && (c.value === phoneVal || c.isPrimary)) : true;
    const hasWechat = wechatVal ? list.some((c) => c.type === "wechat" && (c.value === wechatVal || c.isPrimary)) : true;
    const hasEmail = emailVal ? list.some((c) => c.type === "email" && (c.value === emailVal || c.isPrimary)) : true;
    const hasWebsite = websiteVal ? list.some((c) => (c.type === "social" || c.type === "custom") && (c.value === websiteVal || c.label.includes("网站"))) : true;

    // 若 contact 有单值且 channels 里还没有对应条目或主条目，补充进去
    if (phoneVal && !hasPhone) {
        list.unshift({
            id: `primary-phone-${Date.now().toString(36)}`,
            type: "phone",
            label: "手机",
            value: phoneVal,
            isPrimary: true,
            createdAt: Date.now(),
        });
    }
    if (wechatVal && !hasWechat) {
        list.push({
            id: `primary-wechat-${Date.now().toString(36)}`,
            type: "wechat",
            label: "微信",
            value: wechatVal,
            isPrimary: true,
            createdAt: Date.now(),
        });
    }
    if (emailVal && !hasEmail) {
        list.push({
            id: `primary-email-${Date.now().toString(36)}`,
            type: "email",
            label: "邮箱",
            value: emailVal,
            isPrimary: true,
            createdAt: Date.now(),
        });
    }
    if (websiteVal && !hasWebsite) {
        list.push({
            id: `primary-website-${Date.now().toString(36)}`,
            type: "social",
            label: "个人网站",
            value: websiteVal,
            isPrimary: true,
            createdAt: Date.now(),
        });
    }

    return list;
}

/**
 * 根据条目类型生成一键点击动作链接（如拨打电话、发邮件、跳转网址）
 */
export function getChannelActionHref(channel: ContactChannel): string | null {
    const val = channel.value.trim();
    if (!val) return null;
    if (channel.type === "phone" || channel.type === "landline") {
        const clean = val.replace(/[^\d+]/g, "");
        return clean ? `tel:${clean}` : `tel:${val}`;
    }
    if (channel.type === "email") {
        return `mailto:${val}`;
    }
    if (channel.type === "social" || (channel.type === "custom" && /^https?:\/\//i.test(val))) {
        if (/^https?:\/\//i.test(val)) return val;
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(val)) return `https://${val}`;
    }
    return null;
}
