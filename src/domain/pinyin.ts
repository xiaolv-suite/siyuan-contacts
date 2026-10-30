/**
 * 极轻量中文拼音首字母提取纯函数
 * 供联系人搜索、选人器拼音首字母智能模糊命中，无外部第三方依赖。
 */

const SPECIAL_INITIALS: Record<string, string> = {
    阿: "a",
    艾: "a",
    安: "a",
    敖: "a",
    欧: "o",
    区: "o",
    仇: "q",
    单: "s",
    解: "x",
    查: "z",
    朴: "p",
    曾: "z",
    柏: "b",
    缪: "m",
    翟: "z",
};

const ZH_INITIAL_BOUNDS = "啊芭擦搭蛾发噶哈击喀拉妈拿哦啪期然撒塌挖昔压匝".split("");
const ZH_LETTERS = "abcdefghjklmnopqrstwxyz".split("");

const charInitialCache = new Map<string, string>();
const zhCollator = new Intl.Collator("zh-Hans-CN");

export function getChineseCharInitial(ch: string): string {
    if (!ch) return "";
    const cached = charInitialCache.get(ch);
    if (cached !== undefined) return cached;

    let result = "";
    if (/[a-zA-Z0-9]/.test(ch)) {
        result = ch.toLowerCase();
    } else if (SPECIAL_INITIALS[ch]) {
        result = SPECIAL_INITIALS[ch];
    } else {
        const code = ch.charCodeAt(0);
        if (code >= 0x4e00 && code <= 0x9fa5) {
            for (let i = ZH_INITIAL_BOUNDS.length - 1; i >= 0; i--) {
                if (zhCollator.compare(ch, ZH_INITIAL_BOUNDS[i]) >= 0) {
                    result = ZH_LETTERS[i];
                    break;
                }
            }
        }
    }
    charInitialCache.set(ch, result);
    return result;
}

const wordInitialCache = new Map<string, string>();
const MAX_WORD_CACHE = 2000;

/**
 * 获取字符串对应的拼音首字母序列（小写）
 * 带有高命中词级缓存，避免大数据量连续检索下频繁字符拆分与遍历。
 */
export function getPinyinInitials(text: string): string {
    if (!text) return "";
    const cached = wordInitialCache.get(text);
    if (cached !== undefined) return cached;
    let result = "";
    for (let i = 0; i < text.length; i++) {
        result += getChineseCharInitial(text[i]);
    }
    if (wordInitialCache.size >= MAX_WORD_CACHE) {
        const firstKey = wordInitialCache.keys().next().value;
        if (firstKey !== undefined) wordInitialCache.delete(firstKey);
    }
    wordInitialCache.set(text, result);
    return result;
}

export interface PinyinInitialGroup<T> {
    letter: string;
    count: number;
    items: T[];
}

export const ALPHABET_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * 获取联系人姓名的首字母大写（A-Z，非字母字符归入 '#'）
 */
export function getPersonNameInitial(name: string): string {
    if (!name || !name.trim()) return "#";
    const firstChar = name.trim()[0];
    const initial = getChineseCharInitial(firstChar);
    if (initial && /^[a-z]$/i.test(initial)) {
        return initial.toUpperCase();
    }
    return "#";
}

/**
 * 将联系人列表按拼音首字母聚合归类（A-Z + #）
 */
export function groupPeopleByAlphabet<T extends { name: string }>(people: readonly T[]): {
    groups: PinyinInitialGroup<T>[];
    activeLetters: Set<string>;
} {
    const map = new Map<string, T[]>();
    const activeLetters = new Set<string>();

    for (const person of people) {
        const initial = getPersonNameInitial(person.name);
        let list = map.get(initial);
        if (!list) {
            list = [];
            map.set(initial, list);
            activeLetters.add(initial);
        }
        list.push(person);
    }

    const groups: PinyinInitialGroup<T>[] = [];
    for (const letter of ALPHABET_LETTERS) {
        const items = map.get(letter);
        if (items && items.length > 0) {
            groups.push({ letter, count: items.length, items });
        }
    }
    const hashItems = map.get("#");
    if (hashItems && hashItems.length > 0) {
        groups.push({ letter: "#", count: hashItems.length, items: hashItems });
    }

    return { groups, activeLetters };
}
