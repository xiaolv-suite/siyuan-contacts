/**
 * 联系人自管社交偏好与交往忌口档案（Personal Social Preferences & Taboos）纯函数域模型。
 * 纯函数：零外部依赖，严格遵守 domain/ 架构约束。
 * 将饮食忌口、茶酒偏好、社交习惯与谈话禁忌雷区进行多维结构化管理，提供红线警示与会前备忘。
 */

export type SocialPreferenceCategory = "dietary" | "beverage" | "habits" | "taboos";

export interface SocialPreferenceCategoryMeta {
    key: SocialPreferenceCategory;
    label: string;
    icon: string;
    placeholder: string;
}

export const PREFERENCE_STORE_VERSION = 1;

export const SOCIAL_PREFERENCE_CATEGORIES: readonly SocialPreferenceCategoryMeta[] = [
    {
        key: "dietary",
        label: "饮食偏好与忌口",
        icon: "🍲",
        placeholder: "如：海鲜过敏、不吃香菜、严格素食、偏好粤菜清淡",
    },
    {
        key: "beverage",
        label: "茶酒咖啡饮品",
        icon: "☕",
        placeholder: "如：喜冰美式不加糖、偏好普洱生茶、不喝高度白酒",
    },
    {
        key: "habits",
        label: "会面与交往习惯",
        icon: "🤝",
        placeholder: "如：喜安静独立包间、讨厌迟到、习惯上午开会直接切题",
    },
    {
        key: "taboos",
        label: "敏感话题与雷区",
        icon: "🚫",
        placeholder: "如：请勿提及前东家纠纷、新业务筹备中暂保密",
    },
];

const CATEGORY_MAP = new Map<SocialPreferenceCategory, SocialPreferenceCategoryMeta>(
    SOCIAL_PREFERENCE_CATEGORIES.map((c) => [c.key, c])
);

export function getCategoryMeta(category: unknown): SocialPreferenceCategoryMeta {
    if (typeof category === "string" && CATEGORY_MAP.has(category as SocialPreferenceCategory)) {
        return CATEGORY_MAP.get(category as SocialPreferenceCategory)!;
    }
    return CATEGORY_MAP.get("dietary")!;
}

export function isValidCategory(val: unknown): val is SocialPreferenceCategory {
    return typeof val === "string" && CATEGORY_MAP.has(val as SocialPreferenceCategory);
}

export interface PersonSocialPreferenceItem {
    id: string; // "spf-xxxx"
    personDocId: string;
    category: SocialPreferenceCategory;
    content: string;
    isTaboo: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface PersonSocialPreferencesStore {
    schemaVersion: 1;
    preferences: Record<string, PersonSocialPreferenceItem[]>;
}

export function newSocialPreferenceId(): string {
    return `spf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptySocialPreferencesStore(): PersonSocialPreferencesStore {
    return {
        schemaVersion: PREFERENCE_STORE_VERSION,
        preferences: {},
    };
}

function sanitizePreferenceItem(raw: unknown, expectedPersonDocId?: string): PersonSocialPreferenceItem | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;

    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : newSocialPreferenceId();
    const personDocId = typeof r.personDocId === "string" && r.personDocId.trim()
        ? r.personDocId.trim()
        : expectedPersonDocId || "";
    if (!personDocId) return null;

    const content = typeof r.content === "string" ? r.content.trim() : "";
    if (!content) return null;

    const category: SocialPreferenceCategory = isValidCategory(r.category) ? r.category : "dietary";
    const isTaboo = category === "taboos" ? true : Boolean(r.isTaboo);
    const createdAt = typeof r.createdAt === "number" && r.createdAt > 0 ? r.createdAt : Date.now();
    const updatedAt = typeof r.updatedAt === "number" && r.updatedAt > 0 ? r.updatedAt : Date.now();

    return {
        id,
        personDocId,
        category,
        content,
        isTaboo,
        createdAt,
        updatedAt,
    };
}

export function groupPreferencesByCategory(
    items: readonly PersonSocialPreferenceItem[],
): Record<SocialPreferenceCategory, PersonSocialPreferenceItem[]> {
    const grouped: Record<SocialPreferenceCategory, PersonSocialPreferenceItem[]> = {
        dietary: [],
        beverage: [],
        habits: [],
        taboos: [],
    };
    for (const item of items) {
        if (grouped[item.category]) {
            grouped[item.category].push(item);
        }
    }
    return grouped;
}

export function normalizeSocialPreferencesStore(raw: unknown): PersonSocialPreferencesStore {
    if (!raw || typeof raw !== "object") return emptySocialPreferencesStore();
    const r = raw as Record<string, unknown>;
    const preferences: Record<string, PersonSocialPreferenceItem[]> = {};

    if (r.preferences && typeof r.preferences === "object" && !Array.isArray(r.preferences)) {
        for (const [docId, list] of Object.entries(r.preferences as Record<string, unknown>)) {
            if (Array.isArray(list)) {
                const validList: PersonSocialPreferenceItem[] = [];
                for (const item of list) {
                    const sanitized = sanitizePreferenceItem(item, docId);
                    if (sanitized) validList.push(sanitized);
                }
                if (validList.length > 0) {
                    preferences[docId] = validList;
                }
            }
        }
    }

    return {
        schemaVersion: PREFERENCE_STORE_VERSION,
        preferences,
    };
}

export function normalizeSocialPreferencesStoreForWrite(raw: unknown): PersonSocialPreferencesStore {
    if (!raw || typeof raw !== "object") return emptySocialPreferencesStore();
    const r = raw as Record<string, unknown>;
    if ("schemaVersion" in r && r.schemaVersion !== PREFERENCE_STORE_VERSION) {
        throw new Error(`社交偏好与忌口存储版本不支持（schemaVersion: ${String(r.schemaVersion)}）`);
    }
    return normalizeSocialPreferencesStore(raw);
}

export function addSocialPreference(
    store: PersonSocialPreferencesStore,
    item: PersonSocialPreferenceItem,
): PersonSocialPreferencesStore {
    const sanitized = sanitizePreferenceItem(item);
    if (!sanitized) throw new Error("偏好或忌口内容不能为空");

    const existingList = store.preferences[sanitized.personDocId] ? [...store.preferences[sanitized.personDocId]] : [];
    const idx = existingList.findIndex((p) => p.id === sanitized.id);
    if (idx >= 0) {
        existingList[idx] = sanitized;
    } else {
        existingList.unshift(sanitized);
    }

    return {
        ...store,
        preferences: {
            ...store.preferences,
            [sanitized.personDocId]: existingList,
        },
    };
}

export function updateSocialPreference(
    store: PersonSocialPreferencesStore,
    personDocId: string,
    prefId: string,
    patch: Partial<Omit<PersonSocialPreferenceItem, "id" | "personDocId" | "createdAt">>,
): PersonSocialPreferencesStore {
    if (!personDocId || !prefId) return store;
    const existingList = store.preferences[personDocId];
    if (!existingList) return store;

    const idx = existingList.findIndex((p) => p.id === prefId);
    if (idx < 0) return store;

    const cur = existingList[idx];
    const category = patch.category ? (isValidCategory(patch.category) ? patch.category : cur.category) : cur.category;
    const isTaboo = category === "taboos" ? true : (patch.isTaboo !== undefined ? patch.isTaboo : cur.isTaboo);

    const updated: PersonSocialPreferenceItem = {
        ...cur,
        ...patch,
        category,
        isTaboo,
        updatedAt: Date.now(),
    };

    const nextList = [...existingList];
    nextList[idx] = updated;

    return {
        ...store,
        preferences: {
            ...store.preferences,
            [personDocId]: nextList,
        },
    };
}

export function removeSocialPreference(
    store: PersonSocialPreferencesStore,
    personDocId: string,
    prefId: string,
): PersonSocialPreferencesStore {
    if (!personDocId || !prefId) return store;
    const existingList = store.preferences[personDocId];
    if (!existingList) return store;

    const filtered = existingList.filter((p) => p.id !== prefId);
    const updated = { ...store.preferences };
    if (filtered.length > 0) {
        updated[personDocId] = filtered;
    } else {
        delete updated[personDocId];
    }

    return {
        ...store,
        preferences: updated,
    };
}

export interface SocialPreferenceMicroTag {
    id: string;
    category: SocialPreferenceCategory;
    icon: string;
    text: string;
    isTaboo: boolean;
}

/**
 * 纯函数：提取高优先级社交偏好与忌口微标签
 * 优先排布红线禁忌（isTaboo），其次排布茶酒咖啡与饮食日常偏好，截取前 maxCount 项
 */
export function extractPreferenceMicroTags(
    items: readonly PersonSocialPreferenceItem[],
    maxCount: number = 4,
): SocialPreferenceMicroTag[] {
    const taboos = items.filter((item) => item.isTaboo || item.category === "taboos");
    const normals = items.filter((item) => !item.isTaboo && item.category !== "taboos");

    const sorted = [...taboos, ...normals];
    const categoryIcons: Record<SocialPreferenceCategory, string> = {
        dietary: "🍲",
        beverage: "☕",
        habits: "🤝",
        taboos: "🚫",
    };

    return sorted.slice(0, maxCount).map((item) => ({
        id: item.id,
        category: item.category,
        icon: item.isTaboo || item.category === "taboos" ? "🚫" : (categoryIcons[item.category] || "📌"),
        text: item.content.trim(),
        isTaboo: item.isTaboo || item.category === "taboos",
    }));
}
