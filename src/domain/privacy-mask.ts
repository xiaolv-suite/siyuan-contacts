/**
 * 隐私脱敏与保护遮罩盾（Privacy Mask Shield）：
 * 在投屏、录屏、会议演示或离席时对联系人的私人电话、微信号、邮箱与私密资料进行安全打码遮罩。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */

/**
 * 电话号码隐私遮罩：
 * 11 位手机号（如 13812345678）-> 138****5678
 * 固定电话或国际号码保持两端、掩蔽中间。
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone) return "";
    const clean = phone.trim();
    if (!clean) return "";

    // 匹配常见的 +86 手机号或 11 位国内手机
    const mobileMatch = clean.match(/^(\+?86[- ]?)?(1\d{2})\d{4}(\d{4})$/);
    if (mobileMatch) {
        const prefix = mobileMatch[1] || "";
        return `${prefix}${mobileMatch[2]}****${mobileMatch[3]}`;
    }

    if (clean.length >= 8) {
        return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
    }
    if (clean.length >= 4) {
        return `${clean.slice(0, 1)}****${clean.slice(-1)}`;
    }
    return "****";
}

/**
 * 电子邮箱隐私遮罩：
 * alexander@example.com -> al***r@example.com
 * 用户名两端保留微小辨识度，中间安全遮罩。
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return "";
    const clean = email.trim();
    if (!clean) return "";

    const atIndex = clean.indexOf("@");
    if (atIndex <= 0) {
        return maskGeneric(clean);
    }

    const user = clean.slice(0, atIndex);
    const domain = clean.slice(atIndex);

    let maskedUser: string;
    if (user.length <= 2) {
        maskedUser = `${user[0]}***`;
    } else if (user.length <= 4) {
        maskedUser = `${user[0]}***${user.slice(-1)}`;
    } else {
        maskedUser = `${user.slice(0, 2)}***${user.slice(-1)}`;
    }

    return `${maskedUser}${domain}`;
}

/**
 * 微信号隐私遮罩：
 * wx_peter_1234 -> wx****34
 */
export function maskWechat(wechat: string | null | undefined): string {
    if (!wechat) return "";
    const clean = wechat.trim();
    if (!clean) return "";

    if (clean.length >= 6) {
        return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
    }
    if (clean.length >= 3) {
        return `${clean.slice(0, 1)}***${clean.slice(-1)}`;
    }
    return "****";
}

/**
 * 通用文本信息隐私遮罩
 */
export function maskGeneric(text: string | null | undefined): string {
    if (!text) return "";
    const clean = text.trim();
    if (!clean) return "";

    if (clean.length <= 3) {
        return "***";
    }
    if (clean.length <= 6) {
        return `${clean.slice(0, 1)}***${clean.slice(-1)}`;
    }
    return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}
