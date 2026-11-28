import type { ContactChannel } from "./person-channels.ts";
import {
    CHINA_REGIONS,
    LOCATIONS_ATTR,
    LEGACY_LOCATIONS_ATTR,
    normalizeChinaCityName,
    parseChinaRegionFromText,
    parseContactLocationsAttr,
    resolveChinaCity,
    normalizeContactLocations,
    type ContactLocation,
    type ContactLocations,
} from "./china-regions.ts";

export type { ContactLocation, ContactLocations };
export {
    CHINA_REGIONS,
    LOCATIONS_ATTR,
    LEGACY_LOCATIONS_ATTR,
    normalizeChinaCityName,
    parseChinaRegionFromText,
    parseContactLocationsAttr,
    resolveChinaCity,
};

export interface Person {
    id?: string;
    docId?: string;
    itemId?: string;
    name: string;
    address?: string;
    location?: string;
    locations?: ContactLocations;
    residentLocation?: ContactLocation;
    hometownLocation?: ContactLocation;
    resident_province?: string;
    resident_city?: string;
    resident_district?: string;
    hometown?: string;
    organization?: string;
    role?: string;
    phone?: string;
    wechat?: string;
    email?: string;
    website?: string;
    lastContact?: string;
    tags?: string[];
    groups?: string[];
    group?: string;
    relationshipLabel?: string;
    company?: string;
    title?: string;
    profile?: any;
    channels?: ContactChannel[];
    contactChannels?: ContactChannel[];
    [key: string]: any;
}

export interface RegionCityGroup {
    city: string;
    province?: string;
    count: number;
    people: Person[];
    /** 距离当前时间超过指定天数未联络的人数（默认 60 天） */
    needsReconnectionCount: number;
}

export interface RegionSummary {
    totalPeople: number;
    totalResolvedPeople: number;
    unresolvedCount: number;
    unresolvedPeople: Person[];
    cityGroups: RegionCityGroup[];
}

/** 知名城市到对应省份映射（直辖市和特区省份同名或直辖） */
const KNOWN_CITY_PROVINCE_MAP: Record<string, string> = {
    北京: "北京",
    上海: "上海",
    天津: "天津",
    重庆: "重庆",
    香港: "香港",
    澳门: "澳门",
    台北: "台湾",
    高雄: "台湾",
    // 广东
    广州: "广东",
    深圳: "广东",
    东莞: "广东",
    佛山: "广东",
    珠海: "广东",
    惠州: "广东",
    中山: "广东",
    江门: "广东",
    汕头: "广东",
    湛江: "广东",
    // 浙江
    杭州: "浙江",
    宁波: "浙江",
    温州: "浙江",
    嘉兴: "浙江",
    湖州: "浙江",
    绍兴: "浙江",
    金华: "浙江",
    台州: "浙江",
    衢州: "浙江",
    丽水: "浙江",
    舟山: "浙江",
    // 江苏
    南京: "江苏",
    苏州: "江苏",
    无锡: "江苏",
    常州: "江苏",
    南通: "江苏",
    扬州: "江苏",
    镇江: "江苏",
    徐州: "江苏",
    连云港: "江苏",
    淮安: "江苏",
    盐城: "江苏",
    泰州: "江苏",
    宿迁: "江苏",
    昆山: "江苏",
    // 四川
    成都: "四川",
    绵阳: "四川",
    德阳: "四川",
    宜宾: "四川",
    南充: "四川",
    泸州: "四川",
    乐山: "四川",
    // 湖北
    武汉: "湖北",
    襄阳: "湖北",
    宜昌: "湖北",
    荆州: "湖北",
    黄石: "湖北",
    十堰: "湖北",
    // 湖南
    长沙: "湖南",
    株洲: "湖南",
    湘潭: "湖南",
    衡阳: "湖南",
    岳阳: "湖南",
    常德: "湖南",
    // 陕西
    西安: "陕西",
    宝鸡: "陕西",
    咸阳: "陕西",
    汉中: "陕西",
    延安: "陕西",
    // 山东
    济南: "山东",
    青岛: "山东",
    烟台: "山东",
    潍坊: "山东",
    威海: "山东",
    淄博: "山东",
    临沂: "山东",
    济宁: "山东",
    // 福建
    福州: "福建",
    厦门: "福建",
    泉州: "福建",
    漳州: "福建",
    莆田: "福建",
    // 河南
    郑州: "河南",
    洛阳: "河南",
    南阳: "河南",
    新乡: "河南",
    开封: "河南",
    // 安徽
    合肥: "安徽",
    芜湖: "安徽",
    蚌埠: "安徽",
    安庆: "安徽",
    黄山: "安徽",
    // 江西
    南昌: "江西",
    九江: "江西",
    赣州: "江西",
    景德镇: "江西",
    // 河北
    石家庄: "河北",
    保定: "河北",
    唐山: "河北",
    廊坊: "河北",
    邯郸: "河北",
    雄安: "河北",
    // 辽宁
    沈阳: "辽宁",
    大连: "辽宁",
    鞍山: "辽宁",
    // 吉林
    长春: "吉林",
    吉林市: "吉林",
    // 黑龙江
    哈尔滨: "黑龙江",
    大庆: "黑龙江",
    // 云南
    昆明: "云南",
    大理: "云南",
    丽江: "云南",
    // 贵州
    贵阳: "贵州",
    遵义: "贵州",
    // 广西
    南宁: "广西",
    桂林: "广西",
    柳州: "广西",
    // 海南
    海口: "海南",
    三亚: "海南",
    // 内蒙古
    呼和浩特: "内蒙古",
    包头: "内蒙古",
    // 宁夏
    银川: "宁夏",
    // 新疆
    乌鲁木齐: "新疆",
    // 青海
    西宁: "青海",
    // 甘肃
    兰州: "甘肃",
    // 西藏
    拉萨: "西藏",
    // 海外常用
    新加坡: "新加坡",
    东京: "海外",
    首尔: "海外",
    伦敦: "海外",
    纽约: "海外",
    旧金山: "海外",
    硅谷: "海外",
    西雅图: "海外",
};

const PROVINCES = [
    "北京", "上海", "天津", "重庆", "香港", "澳门", "台湾",
    "广东", "浙江", "江苏", "四川", "湖北", "湖南", "陕西", "山东",
    "福建", "河南", "安徽", "江西", "河北", "辽宁", "吉林", "黑龙江",
    "云南", "贵州", "广西", "海南", "内蒙古", "宁夏", "新疆", "青海", "甘肃", "西藏"
];

/**
 * 从地址字符串中解析出省份与城市
 */
export function extractCityFromAddress(rawAddress: string | undefined): { province?: string; city: string } | null {
    if (!rawAddress) return null;
    const text = rawAddress.trim();
    if (!text) return null;

    // 1. 直辖市 / 特别行政区匹配
    for (const d of ["北京", "上海", "天津", "重庆", "香港", "澳门"]) {
        if (text.startsWith(d) || text.includes(d + "市") || text.includes(d + "特别行政区")) {
            return { province: d, city: d };
        }
    }

    // 2. 遍历已知城市词典进行匹配
    for (const [cityKey, province] of Object.entries(KNOWN_CITY_PROVINCE_MAP)) {
        if (text.includes(cityKey)) {
            return { province, city: cityKey };
        }
    }

    // 2.5 使用全量离线中国行政区划树匹配全部地级市/自治州
    const treeCity = resolveChinaCity(text);
    if (treeCity) {
        return { province: treeCity.provinceShortName, city: treeCity.canonicalCity };
    }

    // 3. 通用正则匹配：XX省XX市 或 XX自治区XX市 或 XX市
    const provCityRegex = /([\u4e00-\u9fa5]{2,5}?(?:省|自治区|特别行政区))?\s*([\u4e00-\u9fa5]{2,6}?市)/;
    const match = text.match(provCityRegex);
    if (match) {
        let rawProv = match[1]?.replace(/(省|自治区|特别行政区)$/, "").trim();
        let rawCity = match[2]?.replace(/市$/, "").trim();
        if (rawCity) {
            // 如果提取出来的城市在我们已知映射中，矫正省份
            const mappedProv = KNOWN_CITY_PROVINCE_MAP[rawCity];
            return {
                province: mappedProv || rawProv,
                city: rawCity
            };
        }
    }

    // 4. 省份命中但无具体城市
    for (const prov of PROVINCES) {
        if (text.includes(prov)) {
            return { province: prov, city: prov };
        }
    }

    return null;
}

/**
 * 检查联系人是否长期未联络（如超过 inactiveThresholdDays 天）
 */
export function isNeedsReconnection(person: Person, inactiveThresholdDays = 60, now = Date.now()): boolean {
    if (!person.lastContact) {
        return true;
    }
    const lastTime = new Date(person.lastContact).getTime();
    if (Number.isNaN(lastTime)) {
        return true;
    }
    const diffDays = (now - lastTime) / (1000 * 60 * 60 * 24);
    return diffDays >= inactiveThresholdDays;
}

/**
 * 对联系人列表进行地区聚类和统计
 */
export function groupPeopleByRegion(people: Person[], inactiveThresholdDays = 60, now = Date.now()): RegionSummary {
    const cityMap = new Map<string, RegionCityGroup>();
    const unresolvedPeople: Person[] = [];

    for (const person of people) {
        const resolved = extractNormalizedRegion(person);
        if (!resolved || resolved.city === "未知" || resolved.city === "未填写") {
            unresolvedPeople.push(person);
            continue;
        }

        const cityKey = resolved.city;
        let group = cityMap.get(cityKey);
        if (!group) {
            group = {
                city: cityKey,
                province: resolved.province,
                count: 0,
                people: [],
                needsReconnectionCount: 0
            };
            cityMap.set(cityKey, group);
        }

        group.people.push(person);
        group.count += 1;
        if (isNeedsReconnection(person, inactiveThresholdDays, now)) {
            group.needsReconnectionCount += 1;
        }
    }

    // 按联系人数量降序，数量相同按拼音或名称排
    const cityGroups = Array.from(cityMap.values()).sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return a.city.localeCompare(b.city, "zh-CN");
    });

    const totalResolvedPeople = people.length - unresolvedPeople.length;

    return {
        totalPeople: people.length,
        totalResolvedPeople,
        unresolvedCount: unresolvedPeople.length,
        unresolvedPeople,
        cityGroups
    };
}

export interface TripPlanMarkdownOptions {
    city: string;
    people: Person[];
    planDate?: string;
    note?: string;
}

/**
 * 生成出差/拜访联络清单的 Markdown 文本，方便快速复制分享到备忘录或思源文档中
 */
export function generateTripPlanMarkdown(options: TripPlanMarkdownOptions): string {
    const { city, people, planDate, note } = options;
    const lines: string[] = [];

    lines.push(`# 📍 出差拜访清单 - ${city}`);
    if (planDate) {
        lines.push(`> **规划日期**：${planDate}`);
    }
    if (note) {
        lines.push(`> **出差备忘**：${note}`);
    }
    lines.push(`> **预计联络人脉**：共 ${people.length} 位`);
    lines.push("");

    if (people.length === 0) {
        lines.push("_暂无选择联系人_");
        return lines.join("\n");
    }

    lines.push("| 姓名 | 组织/职务 | 电话 | 微信 | 最近互动 | 拜访重点/标签 |");
    lines.push("| :--- | :--- | :--- | :--- | :--- | :--- |");

    for (const p of people) {
        const orgRole = [p.organization, p.role].filter(Boolean).join(" · ") || "-";
        const phone = p.phone || "-";
        const wechat = p.wechat || "-";
        const lastContact = p.lastContact ? p.lastContact.slice(0, 10) : "未记录";
        const tags = (p.tags && p.tags.length > 0) ? p.tags.join("、") : "-";

        lines.push(`| **${p.name}** | ${orgRole} | ${phone} | ${wechat} | ${lastContact} | ${tags} |`);
    }

    lines.push("");
    lines.push("### 备忘录与纪要要点");
    lines.push("- [ ] 拜访前确认行程安排与会面时间");
    lines.push("- [ ] 准备交流议题与伴手礼/资料");
    lines.push("- [ ] 会后及时录入互动时间线");


    return lines.join("\n");
}

/**
 * 从联系人对象中尝试提取结构化通讯条目（支持 channels 数组、contactChannels、profile.channels 及序列化 IAL/属性字符串）
 */
export function extractChannelsFromPerson(person: Person): ContactChannel[] {
    if (!person) return [];
    if (Array.isArray(person.channels) && person.channels.length > 0) {
        return person.channels;
    }
    if (Array.isArray(person.contactChannels) && person.contactChannels.length > 0) {
        return person.contactChannels;
    }
    if (person.profile && Array.isArray(person.profile.channels) && person.profile.channels.length > 0) {
        return person.profile.channels;
    }
    const rawChannels = person["custom-lvct-channels"] || person.customLvctChannels;
    if (typeof rawChannels === "string" && rawChannels.trim()) {
        try {
            const parsed = JSON.parse(decodeURIComponent(rawChannels));
            if (Array.isArray(parsed)) return parsed;
        } catch {
            try {
                const parsed = JSON.parse(rawChannels);
                if (Array.isArray(parsed)) return parsed;
            } catch {}
        }
    }
    if (typeof person.ial === "string") {
        const m = person.ial.match(/custom-lvct-channels="([^"]*)"/);
        if (m && m[1]) {
            try {
                const parsed = JSON.parse(decodeURIComponent(m[1]));
                if (Array.isArray(parsed)) return parsed;
            } catch {
                try {
                    const parsed = JSON.parse(m[1]);
                    if (Array.isArray(parsed)) return parsed;
                } catch {}
            }
        }
    }
    return [];
}

const HOMETOWN_LABEL_RE = /老家|籍贯|家乡|祖籍|出生地|户籍|原籍/i;
const HOMETOWN_VALUE_PREFIX_RE = /^(?:老家|籍贯|家乡|祖籍|出生地|户籍|原籍)[：:\s]/;

export function isHometownLabel(label: string | undefined): boolean {
    return Boolean(label && HOMETOWN_LABEL_RE.test(label));
}

function extractIalAttr(ial: string, attrName: string): string | undefined {
    const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = ial.match(new RegExp(`(?:^|[\\s{:])${escaped}="([^"]*)"`));
    if (!m?.[1]) return undefined;
    return m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

function extractRawLocationsObject(person: Person): ContactLocations {
    if (!person) return {};
    if (person.locations && (person.locations.resident || person.locations.hometown)) {
        return normalizeContactLocations(person.locations);
    }
    if (person.residentLocation || person.hometownLocation) {
        return normalizeContactLocations({
            resident: person.residentLocation,
            hometown: person.hometownLocation,
        });
    }
    const rawAttr = person[LOCATIONS_ATTR] ?? person[LEGACY_LOCATIONS_ATTR] ?? person.customLvLocations ?? person.customLvctLocations;
    if (rawAttr) {
        const parsed = parseContactLocationsAttr(rawAttr);
        if (parsed.resident || parsed.hometown) return parsed;
    }
    if (typeof person.ial === "string") {
        const locRaw = extractIalAttr(person.ial, LOCATIONS_ATTR) ?? extractIalAttr(person.ial, LEGACY_LOCATIONS_ATTR);
        if (locRaw) {
            const parsed = parseContactLocationsAttr(locRaw);
            if (parsed.resident || parsed.hometown) return parsed;
        }
    }
    if (person.resident_city || person.resident_province || person.resident_district || person.hometown) {
        const residentRaw = [person.resident_province, person.resident_city, person.resident_district].filter(Boolean).join(" ").trim();
        const resident = residentRaw ? (parseChinaRegionFromText(residentRaw, "resident") ?? { kind: "resident" as const, rawText: residentRaw }) : undefined;
        const hometown = person.hometown ? (parseChinaRegionFromText(person.hometown, "hometown") ?? { kind: "hometown" as const, rawText: person.hometown.trim() }) : undefined;
        return normalizeContactLocations({ resident, hometown });
    }
    return {};
}

/**
 * 从联系人记录提取结构化的常住地（resident）与籍贯（hometown），兼容旧自由文本无损回显
 */
export function extractLocationsFromPerson(person: Person): ContactLocations {
    if (!person) return {};
    const direct = extractRawLocationsObject(person);
    let resident = direct.resident;
    let hometown = direct.hometown;

    const channels = extractChannelsFromPerson(person);
    if (!resident) {
        const residentAddrs = extractAddressCandidatesFromChannels(channels);
        if (residentAddrs.length > 0) {
            resident = parseChinaRegionFromText(residentAddrs[0], "resident") ?? undefined;
        } else {
            const explicitAddr = (person.address || person.location || "").trim();
            if (explicitAddr && !HOMETOWN_VALUE_PREFIX_RE.test(explicitAddr)) {
                resident = parseChinaRegionFromText(explicitAddr, "resident") ?? undefined;
            }
        }
    }
    if (!hometown) {
        const hometownCh = channels.find((c) => c && typeof c.value === "string" && c.value.trim() && (isHometownLabel(c.label) || HOMETOWN_VALUE_PREFIX_RE.test(c.value.trim())));
        if (hometownCh) {
            const cleanedVal = hometownCh.value.trim().replace(HOMETOWN_VALUE_PREFIX_RE, "").trim();
            hometown = parseChinaRegionFromText(cleanedVal || hometownCh.value.trim(), "hometown") ?? undefined;
        } else {
            const explicitAddr = (person.address || person.location || "").trim();
            if (explicitAddr && HOMETOWN_VALUE_PREFIX_RE.test(explicitAddr)) {
                const cleanedVal = explicitAddr.replace(HOMETOWN_VALUE_PREFIX_RE, "").trim();
                hometown = parseChinaRegionFromText(cleanedVal || explicitAddr, "hometown") ?? undefined;
            }
        }
    }
    return {
        ...(resident ? { resident } : {}),
        ...(hometown ? { hometown } : {}),
    };
}

/**
 * 从多维通讯条目中筛选出常住/办公地址条目（严格排除老家/籍贯/户籍条目，避免混淆同城识别），并按权威权重排序：
 * 权重优先级：
 * 1. 显式主条目 (isPrimary === true) 且为非籍贯地址
 * 2. 常驻类地址（label 包含“常驻”、“常住”、“现居”、“主要”）
 * 3. 居住/家庭住址类（label 为家庭住址/住址/居住，不含老家/户籍）
 * 4. 工作/公司类地址（label 包含“公司”、“工作”、“办公”、“单位”）
 * 5. 普通/其他地址条目（type === "address"）
 */
export function extractAddressCandidatesFromChannels(channels: ContactChannel[]): string[] {
    if (!channels || channels.length === 0) return [];

    const addressEntries = channels.filter((c) => {
        if (!c || typeof c.value !== "string") return false;
        const val = c.value.trim();
        if (!val) return false;
        if (isHometownLabel(c.label) || HOMETOWN_VALUE_PREFIX_RE.test(val)) return false;
        return c.type === "address" || /地址|住址|常驻|常住|现居|居住/i.test(c.label || "");
    });
    if (addressEntries.length === 0) return [];

    const scored = addressEntries.map((c) => {
        let score = 0;
        if (c.isPrimary) score += 100;
        const lbl = (c.label || "").trim();
        if (/常驻|常住|现居|主要/i.test(lbl)) score += 50;
        else if (/^(?:家庭住址|家庭地址|家住|住址|居住|家)$/i.test(lbl)) score += 30;
        else if (/公司|工作|办公|单位/i.test(lbl)) score += 20;
        else score += 10;
        return { value: c.value.trim(), score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.value).filter(Boolean);
}

/**
 * 综合联系人的结构化常住地（resident）、多维资料地址条目、显式单值地址、标签、组织单位等线索，提炼出规范化的常住地域信息。
 * 严格排除籍贯/老家（hometown），绝不把籍贯误判为同城常住地。
 */
export function extractNormalizedRegion(person: Person): {
    city: string;
    province?: string;
    provinceName?: string;
    district?: string;
    region?: string;
    cityCode?: string;
    provinceCode?: string;
    districtCode?: string;
} {
    if (!person) return { city: "未知" };

    // 0. 最高优先级：显式结构化常住地 (resident_city / locations.resident / custom-lv-locations)
    const structured = extractRawLocationsObject(person).resident;
    if (structured) {
        const parsedRaw = structured.rawText ? parseChinaRegionFromText(structured.rawText, "resident") : null;
        const districtName = structured.districtName ?? parsedRaw?.districtName;
        const districtCode = structured.districtCode ?? parsedRaw?.districtCode;
        const districtInfo = districtName || districtCode
            ? { ...(districtName ? { district: districtName } : {}), ...(districtCode ? { districtCode } : {}) }
            : {};

        const resolved = resolveChinaCity(structured.cityCode || structured.cityName || structured.rawText);
        if (resolved) {
            return {
                city: resolved.canonicalCity,
                province: resolved.provinceShortName,
                provinceName: resolved.provinceName,
                cityCode: resolved.cityCode,
                provinceCode: resolved.provinceCode,
                ...districtInfo,
            };
        }
        if (structured.cityName) {
            const canonical = normalizeChinaCityName(structured.cityName) || structured.cityName;
            const provNode = structured.provinceCode
                ? CHINA_REGIONS.find((p) => p.code === structured.provinceCode)
                : structured.provinceName
                    ? CHINA_REGIONS.find((p) => p.name === structured.provinceName || p.shortName === structured.provinceName)
                    : undefined;
            const prov = provNode?.shortName ?? structured.provinceName?.replace(/(?:省|自治区|特别行政区|市)$/, "");
            return {
                city: canonical,
                ...(prov ? { province: prov } : {}),
                ...(provNode?.name ?? structured.provinceName ? { provinceName: provNode?.name ?? structured.provinceName } : {}),
                ...(structured.cityCode ? { cityCode: structured.cityCode } : {}),
                ...(provNode?.code ?? structured.provinceCode ? { provinceCode: provNode?.code ?? structured.provinceCode } : {}),
                ...districtInfo,
            };
        }
        if (structured.rawText) {
            const fromRaw = extractCityFromAddress(structured.rawText);
            if (fromRaw) {
                const tree = resolveChinaCity(fromRaw.city);
                const provNode = tree
                    ? CHINA_REGIONS.find((p) => p.code === tree.provinceCode)
                    : CHINA_REGIONS.find((p) => p.shortName === fromRaw.province || p.name === fromRaw.province);
                return {
                    city: tree?.canonicalCity ?? fromRaw.city,
                    province: tree?.provinceShortName ?? fromRaw.province,
                    ...(provNode ? { provinceName: provNode.name } : {}),
                    cityCode: tree?.cityCode,
                    provinceCode: tree?.provinceCode ?? provNode?.code,
                    ...districtInfo,
                };
            }
        }
        // 仅选省（未选城市）或仅保留省/区县：不得回退丢弃已选省份与区县
        const provCode = structured.provinceCode ?? parsedRaw?.provinceCode;
        const provNameRaw = structured.provinceName ?? parsedRaw?.provinceName;
        const provNode = provCode
            ? CHINA_REGIONS.find((p) => p.code === provCode)
            : provNameRaw
                ? CHINA_REGIONS.find((p) => p.name === provNameRaw || p.shortName === provNameRaw)
                : undefined;
        const provShort = provNode?.shortName ?? provNameRaw?.replace(/(?:壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/, "");
        if (provShort || provCode || districtName || districtCode) {
            return {
                city: "未知",
                ...(provShort ? { province: provShort } : {}),
                ...(provNode?.name ?? provNameRaw ? { provinceName: provNode?.name ?? provNameRaw } : {}),
                ...(provNode?.code ?? provCode ? { provinceCode: provNode?.code ?? provCode } : {}),
                ...districtInfo,
            };
        }
    }

    // 1. 第一优先级：从通讯多维资料地址条目（排除籍贯/老家后，常驻/住址/公司地址）精准提取
    const channels = extractChannelsFromPerson(person);
    const channelAddresses = extractAddressCandidatesFromChannels(channels);
    for (const addr of channelAddresses) {
        const fromAddr = extractCityFromAddress(addr);
        if (fromAddr) {
            const tree = resolveChinaCity(fromAddr.city);
            return {
                city: tree?.canonicalCity ?? fromAddr.city,
                province: tree?.provinceShortName ?? fromAddr.province,
                cityCode: tree?.cityCode,
                provinceCode: tree?.provinceCode,
            };
        }
    }

    // 2. 第二优先级：显式单值地址字段（person.address 或 person.location，排除显式老家前缀）
    const explicitAddr = (person.address || person.location || "").trim();
    if (explicitAddr && !HOMETOWN_VALUE_PREFIX_RE.test(explicitAddr)) {
        const fromAddr = extractCityFromAddress(explicitAddr);
        if (fromAddr) {
            const tree = resolveChinaCity(fromAddr.city);
            return {
                city: tree?.canonicalCity ?? fromAddr.city,
                province: tree?.provinceShortName ?? fromAddr.province,
                cityCode: tree?.cityCode,
                provinceCode: tree?.provinceCode,
            };
        }
    }

    // 3. 第三优先级：从标签中提取明确标注的城市（排除老家/籍贯类标签）
    if (Array.isArray(person.tags)) {
        for (const tag of person.tags) {
            const trimmed = tag.trim();
            if (!trimmed || HOMETOWN_LABEL_RE.test(trimmed)) continue;
            if (KNOWN_CITY_PROVINCE_MAP[trimmed]) {
                const tree = resolveChinaCity(trimmed);
                return {
                    city: trimmed,
                    province: KNOWN_CITY_PROVINCE_MAP[trimmed],
                    cityCode: tree?.cityCode,
                    provinceCode: tree?.provinceCode,
                };
            }
            const fromTag = extractCityFromAddress(trimmed);
            if (fromTag) {
                const tree = resolveChinaCity(fromTag.city);
                return {
                    city: tree?.canonicalCity ?? fromTag.city,
                    province: tree?.provinceShortName ?? fromTag.province,
                    cityCode: tree?.cityCode,
                    provinceCode: tree?.provinceCode,
                };
            }
        }
    }

    // 4. 最后兜底：仅在无任何明确人身地址时，才从所属公司或组织背景中做弱推断
    const orgSources = [
        person.company,
        person.organization,
    ].filter(Boolean) as string[];

    if (person.profile && person.profile.affiliations?.state === "known") {
        const aff = person.profile.affiliations.value;
        const allAffs = [...(aff.work || []), ...(aff.education || []), ...(aff.family || []), ...(aff.unspecified || [])];
        for (const a of allAffs) {
            if (a.orgName) orgSources.push(a.orgName);
        }
    }

    for (const text of orgSources) {
        const fromOrg = extractCityFromAddress(text);
        if (fromOrg) {
            const tree = resolveChinaCity(fromOrg.city);
            return {
                city: tree?.canonicalCity ?? fromOrg.city,
                province: tree?.provinceShortName ?? fromOrg.province,
                cityCode: tree?.cityCode,
                provinceCode: tree?.provinceCode,
            };
        }
    }

    return { city: "未知" };
}

/**
 * 获取严格基于常住地（resident_city）的同城匹配键，绝不与籍贯混淆
 */
export function getResidentCityMatchKey(person: Person): { cityCode?: string; city: string } | null {
    const norm = extractNormalizedRegion(person);
    if (!norm.city || norm.city === "未知" || norm.city === "未填写") return null;
    // 如果仅命中了纯省份而没有具体地级市，不作为精确同城
    const resolved = resolveChinaCity(norm.cityCode || norm.city);
    if (resolved) {
        return { cityCode: resolved.cityCode, city: resolved.canonicalCity };
    }
    return { city: normalizeChinaCityName(norm.city) || norm.city };
}

/**
 * 判断两位联系人是否同城：严格基于 resident_city 标准编码/城市名，绝不因「成都」vs「四川省成都市」写法差异漏匹配，绝不与籍贯混淆
 */
export function isSameResidentCity(a: Person, b: Person): boolean {
    const ka = getResidentCityMatchKey(a);
    const kb = getResidentCityMatchKey(b);
    if (!ka || !kb) return false;
    if (ka.cityCode && kb.cityCode) return ka.cityCode === kb.cityCode;
    return ka.city === kb.city;
}

/**
 * 判断联系人是否与目标城市（支持编码如 "510100"、全称 "四川省成都市"、简称 "成都"）同城
 */
export function matchesResidentCity(person: Person, targetCityOrCode: string | ContactLocation): boolean {
    const kp = getResidentCityMatchKey(person);
    if (!kp) return false;
    const targetInput = typeof targetCityOrCode === "string"
        ? targetCityOrCode
        : (targetCityOrCode.cityCode || targetCityOrCode.cityName || targetCityOrCode.rawText || "");
    const resolvedTarget = resolveChinaCity(targetInput);
    if (kp.cityCode && resolvedTarget) return kp.cityCode === resolvedTarget.cityCode;
    const normalizedTarget = resolvedTarget?.canonicalCity ?? normalizeChinaCityName(targetInput);
    return Boolean(normalizedTarget && kp.city === normalizedTarget);
}

/**
 * 获取同省或周边的关联城市名单
 */
export function findNearbyOrSameProvinceCities(city: string): string[] {
    if (!city || city === "未知") return [];
    const resolved = resolveChinaCity(city);
    const prov = resolved?.provinceShortName ?? KNOWN_CITY_PROVINCE_MAP[city];
    if (!prov) return [];

    const canonicalSelf = resolved?.canonicalCity ?? normalizeChinaCityName(city);
    const result = new Set<string>();
    for (const [c, p] of Object.entries(KNOWN_CITY_PROVINCE_MAP)) {
        if (p === prov && c !== canonicalSelf) {
            result.add(c);
        }
    }
    for (const pNode of CHINA_REGIONS) {
        if (pNode.shortName === prov) {
            for (const cNode of pNode.cities) {
                const cName = normalizeChinaCityName(cNode.name) || cNode.name;
                if (cName !== canonicalSelf) result.add(cName);
            }
        }
    }
    return Array.from(result);
}

/**
 * 对联系人列表进行城市归类分组，供地域对话框和图表消费
 */
export function groupContactsByRegion<T extends Person>(contacts: readonly T[]): { city: string; province?: string; count: number; people: T[] }[] {
    const map = new Map<string, { city: string; province?: string; count: number; people: T[] }>();

    for (const person of contacts) {
        const norm = extractNormalizedRegion(person);
        const cityKey = norm.city;
        let entry = map.get(cityKey);
        if (!entry) {
            entry = {
                city: cityKey,
                province: norm.province,
                count: 0,
                people: [],
            };
            map.set(cityKey, entry);
        }
        entry.people.push(person);
        entry.count += 1;
    }

    const groups = Array.from(map.values());
    // 已知城市排在前面按数量降序，数量相同按名称排序；未知排在最后
    groups.sort((a, b) => {
        if (a.city === "未知") return 1;
        if (b.city === "未知") return -1;
        if (b.count !== a.count) return b.count - a.count;
        return a.city.localeCompare(b.city, "zh-CN");
    });

    return groups;
}

/**
 * 按指定目标城市过滤联系人（支持标准编码与省市全称/简称精确同城匹配，排除籍贯误命中）
 */
export function filterContactsByRegion<T extends Person>(contacts: readonly T[], targetCity: string): T[] {
    if (!targetCity) return [...contacts];
    const target = targetCity.trim().toLowerCase();

    if (target === "未知" || target === "未填写") {
        return contacts.filter((p) => {
            const norm = extractNormalizedRegion(p);
            return norm.city === "未知" && !norm.province && !norm.district;
        });
    }

    const resolvedTarget = resolveChinaCity(targetCity);
    const matchedProvince = CHINA_REGIONS.find(
        (prov) => prov.name.toLowerCase() === target || prov.shortName.toLowerCase() === target,
    );

    return contacts.filter((p) => {
        const norm = extractNormalizedRegion(p);
        if (resolvedTarget && norm.cityCode && norm.cityCode === resolvedTarget.cityCode) return true;
        if (resolvedTarget && norm.city === resolvedTarget.canonicalCity) return true;
        if (matchedProvince && (
            norm.provinceCode === matchedProvince.code
            || norm.province?.toLowerCase() === matchedProvince.shortName.toLowerCase()
            || norm.provinceName?.toLowerCase() === matchedProvince.name.toLowerCase()
        )) return true;
        if (norm.city !== "未知" && norm.city.toLowerCase() === target) return true;
        if (norm.province && norm.province.toLowerCase() === target) return true;
        if (norm.provinceName && norm.provinceName.toLowerCase() === target) return true;
        if (norm.district && norm.district.toLowerCase().includes(target)) return true;
        if (p.address && !HOMETOWN_VALUE_PREFIX_RE.test(p.address.trim()) && p.address.toLowerCase().includes(target)) return true;
        const channels = extractChannelsFromPerson(p);
        for (const ch of channels) {
            if (isHometownLabel(ch.label) || (typeof ch.value === "string" && HOMETOWN_VALUE_PREFIX_RE.test(ch.value.trim()))) continue;
            if ((ch.type === "address" || /地址|住址|常驻|常住|现居/i.test(ch.label || "")) && typeof ch.value === "string" && ch.value.toLowerCase().includes(target)) {
                return true;
            }
        }
        return false;
    });
}

/**
 * 供名册过滤器使用的多维地域筛选（支持城市名、省份全称/简称、区县名、编码或“未填写”，排除籍贯误命中常住同城）
 */
export function filterPeopleByRegion<T extends Person>(people: readonly T[], regionQuery: string): T[] {
    if (!regionQuery || !regionQuery.trim()) return [...people];
    const q = regionQuery.trim().toLowerCase();

    if (q === "未填写" || q === "未知") {
        return people.filter((p) => {
            const norm = extractNormalizedRegion(p);
            return norm.city === "未知" && !norm.province && !norm.district;
        });
    }

    const resolvedTarget = resolveChinaCity(regionQuery);
    const matchedProvince = CHINA_REGIONS.find(
        (prov) => prov.name.toLowerCase() === q || prov.shortName.toLowerCase() === q,
    );

    return people.filter((p) => {
        const norm = extractNormalizedRegion(p);
        if (resolvedTarget && norm.cityCode && norm.cityCode === resolvedTarget.cityCode) return true;
        if (resolvedTarget && norm.city === resolvedTarget.canonicalCity) return true;
        if (matchedProvince && (
            norm.provinceCode === matchedProvince.code
            || norm.province?.toLowerCase() === matchedProvince.shortName.toLowerCase()
            || norm.provinceName?.toLowerCase() === matchedProvince.name.toLowerCase()
        )) return true;
        if (norm.city !== "未知" && norm.city.toLowerCase().includes(q)) return true;
        if (norm.province && norm.province.toLowerCase().includes(q)) return true;
        if (norm.provinceName && norm.provinceName.toLowerCase().includes(q)) return true;
        if (norm.district && norm.district.toLowerCase().includes(q)) return true;
        if (norm.districtCode && norm.districtCode.toLowerCase() === q) return true;

        const resident = extractRawLocationsObject(p).resident;
        if (resident) {
            if (resident.districtName && resident.districtName.toLowerCase().includes(q)) return true;
            if (resident.cityName && resident.cityName.toLowerCase().includes(q)) return true;
            if (resident.provinceName && resident.provinceName.toLowerCase().includes(q)) return true;
            if (resident.rawText && !HOMETOWN_VALUE_PREFIX_RE.test(resident.rawText) && resident.rawText.toLowerCase().includes(q)) return true;
        }

        if (p.address && !HOMETOWN_VALUE_PREFIX_RE.test(p.address.trim()) && p.address.toLowerCase().includes(q)) return true;
        const channels = extractChannelsFromPerson(p);
        for (const ch of channels) {
            if (isHometownLabel(ch.label) || (typeof ch.value === "string" && HOMETOWN_VALUE_PREFIX_RE.test(ch.value.trim()))) continue;
            if ((ch.type === "address" || /地址|住址|常驻|常住|现居/i.test(ch.label || "")) && typeof ch.value === "string" && ch.value.toLowerCase().includes(q)) {
                return true;
            }
        }
        if (Array.isArray(p.tags) && p.tags.some((t) => !HOMETOWN_LABEL_RE.test(t) && t.toLowerCase().includes(q))) return true;
        if (p.company && p.company.toLowerCase().includes(q)) return true;
        if (p.organization && p.organization.toLowerCase().includes(q)) return true;
        return false;
    });
}

