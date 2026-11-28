/**
 * 从思源文档（#### 🐴 小驴记录 / ## 往来记录 及兼容旧标题）反向提取互动记录的纯函数解析器。
 * 严格遵守 domain 层纯净原则：零网络、零存储写入、零思源 DOM 依赖。
 */
import { isValidDateKey } from "./date-key.ts";
import {
    INTERACTION_TYPES,
    normalizeInteractionStore,
    type InteractionEvent,
    type InteractionSource,
    type InteractionStore,
    type InteractionType,
} from "./interactions.ts";

export interface RebuiltInteractionCandidate {
    personDocId: string;
    personName?: string;
    localDate: string;
    occurredAt: number;
    type: InteractionType;
    summary: string;
    detail?: string;
    note?: string;
    source: InteractionSource;
    linkedBlockId?: string;
    externalRef: string;
    fingerprint: string;
    sectionTitle: string;
}

export interface InteractionRebuildPlan {
    candidatesTotal: number;
    willRestore: RebuiltInteractionCandidate[];
    skippedDuplicateCount: number;
    eventsToAppend: InteractionEvent[];
}

const SECTION_HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const XIAOLV_OR_INTERACTION_HEADING_RE = /^(?:(?:🐴|📝|🤝|📅|💬|📞)\s*)*(?:小驴记录|小驴互动记录|往来记录|互动记录)(?:\s*[（(].*[）)])?$/;
const DATE_SUBHEADING_RE = /^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?(?:\s|$)/;
const LIST_ITEM_RE = /^[-*+]\s+(?:\[[xX\s]\]\s+)?(.+)$/;
const LEADING_DATE_RE = /^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?(?:\s+|$)/;
const LEADING_TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s+|$)/;
const BLOCK_LINK_RE = /\[[^\]]*\]\(siyuan:\/\/blocks\/(\d{14}-[0-9a-z]{7})(?:\?[^)]*)?\)/g;
const TRAILING_ORIGINAL_LINK_RE = /\s*\[🔗\s*原文\]\(siyuan:\/\/blocks\/\d{14}-[0-9a-z]{7}(?:\?[^)]*)?\)\s*/g;
const PERSON_REF_PREFIX_RE = /^(?:与\s+)?\(\(\s*\d{14}-[0-9a-z]{7}(?:\s+['"][^'"]*['"])?\s*\)\)\s*/;

const TYPE_TOKENS: readonly { pattern: RegExp; type: InteractionType }[] = [
    { pattern: /^(?:🤝\s*)?(?:见面|会面|拜访|面谈)(?:\s|$|[：:])/, type: "meeting" },
    { pattern: /^(?:📞\s*)?(?:电话|通话|致电|电联)(?:\s|$|[：:])/, type: "call" },
    { pattern: /^(?:💬\s*)?(?:消息|微信|线上交流|线上沟通|聊天|私信)(?:\s|$|[：:])/, type: "message" },
    { pattern: /^(?:🍽️?\s*)?(?:聚餐|吃饭|午餐|晚餐|宴请|茶叙|喝茶)(?:\s|$|[：:])/, type: "meal" },
    { pattern: /^(?:✉️?\s*)?(?:邮件|Email|发邮件)(?:\s|$|[：:])/i, type: "email" },
    { pattern: /^(?:📝\s*)?(?:互动|其他|沟通|交流|联络)(?:\s|$|[：:])/, type: "other" },
];

const EMOJI_ONLY_TYPE_MAP: ReadonlyArray<readonly [string, InteractionType]> = [
    ["🤝", "meeting"],
    ["📞", "call"],
    ["💬", "message"],
    ["🍽️", "meal"],
    ["🍽", "meal"],
    ["✉️", "email"],
    ["✉", "email"],
    ["📝", "other"],
];

function fnv1aHex(input: string): string {
    let h1 = 2166136261;
    let h2 = 522970236;
    for (let i = 0; i < input.length; i++) {
        const ch = input.charCodeAt(i);
        h1 ^= ch;
        h1 = Math.imul(h1, 16777619);
        h2 ^= (ch + i) & 0xffff;
        h2 = Math.imul(h2, 16777619);
    }
    return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

function normalizeYmd(year: string, month: string, day: string): string | null {
    const candidate = `${year}-${pad2(Number(month))}-${pad2(Number(day))}`;
    return isValidDateKey(candidate) ? candidate : null;
}

function stripIalAndSuperblockMarkers(markdown: string): string[] {
    const rawLines = markdown.replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];
    for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (trimmed === "{{{row" || trimmed === "{{{col" || trimmed === "}}}") continue;
        if (/^\{:[^}\n]*\}$/.test(trimmed)) continue;
        // 去掉行尾内联 IAL，例如 `{: id="..."}`
        const withoutInlineIal = rawLine.replace(/\s*\{:\s*(?:id|custom-[a-z0-9-]+)="[^"]*"[^}]*\}\s*$/i, "");
        out.push(withoutInlineIal);
    }
    return out;
}

function parseInteractionTypePrefix(rawBody: string): { type: InteractionType; rest: string; explicit: boolean } {
    let rest = rawBody.trim();
    let detectedType: InteractionType = "other";
    let explicit = false;

    for (const [emoji, t] of EMOJI_ONLY_TYPE_MAP) {
        if (rest.startsWith(emoji)) {
            detectedType = t;
            explicit = true;
            rest = rest.slice(emoji.length).trim();
            break;
        }
    }

    // 处理 `与 (( id 'name' )) 见面：...` 形式
    if (PERSON_REF_PREFIX_RE.test(rest)) {
        rest = rest.replace(PERSON_REF_PREFIX_RE, "").trim();
    }

    for (const entry of TYPE_TOKENS) {
        const m = rest.match(entry.pattern);
        if (m) {
            detectedType = entry.type;
            explicit = true;
            rest = rest.slice(m[0].length).trim();
            // 若上面 regex 吃掉了末尾冒号，则无需再剥一次；若吃掉的是空白，继续剥前导冒号
            rest = rest.replace(/^[：:]\s*/, "").trim();
            break;
        }
    }

    if (!explicit) {
        // 再次检查无 emoji 的类型前缀
        rest = rest.replace(/^[：:]\s*/, "").trim();
    }

    return { type: INTERACTION_TYPES.includes(detectedType) ? detectedType : "other", rest, explicit };
}

function computeOccurredAt(localDate: string, timeParts?: { hh: number; mm: number; ss: number } | null): number {
    const [y, m, d] = localDate.split("-").map(Number);
    const hh = timeParts ? timeParts.hh : 12;
    const mm = timeParts ? timeParts.mm : 0;
    const ss = timeParts ? timeParts.ss : 0;
    const dt = new Date(y, m - 1, d, hh, mm, ss, 0);
    return Number.isNaN(dt.getTime()) ? Date.now() : dt.getTime();
}

export function normalizeNoteForFingerprint(note: string | undefined): string {
    return String(note ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

export function buildInteractionRebuildFingerprint(
    personDocId: string,
    localDate: string,
    type: InteractionType,
    note?: string,
): string {
    const normNote = normalizeNoteForFingerprint(note);
    return fnv1aHex(`${personDocId}\n${localDate}\n${type}\n${normNote}`);
}

function parseSingleInteractionLine(
    lineText: string,
    personDocId: string,
    sectionTitle: string,
    personName: string | undefined,
    fallbackDate: string | null,
): RebuiltInteractionCandidate | null {
    const trimmed = lineText.trim();
    if (!trimmed) return null;

    let work = trimmed;
    let localDate: string | null = null;
    const dateMatch = work.match(LEADING_DATE_RE);
    if (dateMatch) {
        localDate = normalizeYmd(dateMatch[1], dateMatch[2], dateMatch[3]);
        if (!localDate) return null;
        work = work.slice(dateMatch[0].length).trim();
    } else if (fallbackDate && isValidDateKey(fallbackDate)) {
        localDate = fallbackDate;
    } else {
        return null;
    }

    let timeParts: { hh: number; mm: number; ss: number } | null = null;
    const timeMatch = work.match(LEADING_TIME_RE);
    if (timeMatch) {
        const hh = Number(timeMatch[1]);
        const mm = Number(timeMatch[2]);
        const ss = Number(timeMatch[3] ?? 0);
        if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59) {
            timeParts = { hh, mm, ss };
        }
        work = work.slice(timeMatch[0].length).trim();
    }

    // 剥离 `🔗 原文` 链接并提取 siyuan://blocks/ 引用 ID
    let linkedBlockId: string | undefined;
    for (const m of work.matchAll(BLOCK_LINK_RE)) {
        if (m[1]) linkedBlockId = m[1];
    }
    work = work.replace(TRAILING_ORIGINAL_LINK_RE, " ").trim();
    // 把 `[《标题》](siyuan://blocks/xxx)` 收敛为 `《标题》`，保持与原 note 一致性
    work = work.replace(/\[《([^》]+)》\]\(siyuan:\/\/blocks\/\d{14}-[0-9a-z]{7}(?:\?[^)]*)?\)/g, "《$1》").trim();

    const { type, rest } = parseInteractionTypePrefix(work);
    const cleanedNote = rest
        .replace(/\s*<br\s*\/?>\s*/gi, "\n")
        .replace(/^[：:]\s*/, "")
        .trim();

    const noteLines = cleanedNote ? cleanedNote.split(/\n+/).map((l) => l.trim()).filter(Boolean) : [];
    const summary = noteLines[0] || (type === "other" ? "互动" : "");
    const detail = noteLines.length > 1 ? noteLines.slice(1).join("\n") : undefined;
    const finalNote = cleanedNote || undefined;

    const source: InteractionSource = sectionTitle.includes("小驴记录") ? "diary" : "manual";
    const fingerprint = buildInteractionRebuildFingerprint(personDocId, localDate, type, finalNote);
    const externalRef = linkedBlockId ? `block:${linkedBlockId}` : `doc-rebuild:${fingerprint}`;

    return {
        personDocId,
        ...(personName ? { personName } : {}),
        localDate,
        occurredAt: computeOccurredAt(localDate, timeParts),
        type,
        summary: summary || finalNote || "互动",
        ...(detail ? { detail } : {}),
        ...(finalNote ? { note: finalNote } : {}),
        source,
        ...(linkedBlockId ? { linkedBlockId } : {}),
        externalRef,
        fingerprint,
        sectionTitle,
    };
}

/**
 * 纯函数：从单篇联系人文档的 Markdown 全文或受控区块中解析「#### 🐴 小驴记录」「## 往来记录」及兼容旧标题下的互动列表。
 * 100% 只读解析，绝不修改输入文本。
 */
export function parseInteractionsFromDocMarkdown(
    personDocId: string,
    markdown: string,
    personName?: string,
): RebuiltInteractionCandidate[] {
    if (!personDocId || !markdown || !markdown.trim()) return [];
    const lines = stripIalAndSuperblockMarkers(markdown);
    const results: RebuiltInteractionCandidate[] = [];

    let activeSectionLevel = 0;
    let activeSectionTitle = "";
    let dateContext: string | null = null;
    let lastCandidate: RebuiltInteractionCandidate | null = null;

    const finalizeCandidateContinuation = (extraLine: string) => {
        if (!lastCandidate) return;
        const cleanExtra = extraLine.trim();
        if (!cleanExtra) return;
        const nextNote = lastCandidate.note ? `${lastCandidate.note}\n${cleanExtra}` : cleanExtra;
        const nextDetail = lastCandidate.detail ? `${lastCandidate.detail}\n${cleanExtra}` : cleanExtra;
        const nextFp = buildInteractionRebuildFingerprint(
            lastCandidate.personDocId,
            lastCandidate.localDate,
            lastCandidate.type,
            nextNote,
        );
        lastCandidate.note = nextNote;
        lastCandidate.detail = nextDetail;
        lastCandidate.fingerprint = nextFp;
        if (!lastCandidate.linkedBlockId) {
            lastCandidate.externalRef = `doc-rebuild:${nextFp}`;
        }
    };

    for (const line of lines) {
        const headingMatch = line.match(SECTION_HEADING_RE);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();
            if (XIAOLV_OR_INTERACTION_HEADING_RE.test(title)) {
                activeSectionLevel = level;
                activeSectionTitle = title;
                dateContext = null;
                lastCandidate = null;
                continue;
            }
            if (activeSectionLevel > 0) {
                if (level <= activeSectionLevel) {
                    // 离开当前小驴记录/往来记录区块
                    activeSectionLevel = 0;
                    activeSectionTitle = "";
                    dateContext = null;
                    lastCandidate = null;
                    continue;
                }
                // 子标题如果是日期分组（如 ##### 2026-10-26）
                const subDateMatch = title.match(DATE_SUBHEADING_RE);
                if (subDateMatch) {
                    dateContext = normalizeYmd(subDateMatch[1], subDateMatch[2], subDateMatch[3]);
                }
                lastCandidate = null;
                continue;
            }
            continue;
        }

        if (activeSectionLevel === 0) continue;

        const listMatch = line.match(LIST_ITEM_RE);
        if (listMatch) {
            const parsed = parseSingleInteractionLine(
                listMatch[1],
                personDocId,
                activeSectionTitle,
                personName,
                dateContext,
            );
            if (parsed) {
                results.push(parsed);
                lastCandidate = parsed;
            } else {
                lastCandidate = null;
            }
            continue;
        }

        // 缩进续行作为前一条记录的详情补充
        if (lastCandidate && /^\s{2,}\S/.test(line)) {
            finalizeCandidateContinuation(line);
        } else if (!line.trim()) {
            lastCandidate = null;
        }
    }

    return results;
}

/**
 * 幂等去重与只增不删规划（纯函数）：
 * - 已有同 externalRef、同 id 或同 (personDocId, localDate, type/note) 指纹的记录均跳过；
 * - 绝不删除或改写 currentStore 中已有的事件与 tombstones。
 */
export function planInteractionDocRebuild(
    currentStore: InteractionStore,
    scannedCandidates: readonly RebuiltInteractionCandidate[],
): InteractionRebuildPlan {
    const normalizedCurrent = normalizeInteractionStore(currentStore);
    const existingTombstones = new Set(normalizedCurrent.tombstones);
    const existingIds = new Set(normalizedCurrent.events.map((e) => e.id));
    const existingExternalRefs = new Set<string>();
    const existingFingerprints = new Set<string>();

    for (const event of normalizedCurrent.events) {
        if (event.externalRef) {
            existingExternalRefs.add(`${event.personDocId}\n${event.externalRef}`);
        }
        const t = event.type ?? "other";
        existingFingerprints.add(buildInteractionRebuildFingerprint(event.personDocId, event.localDate, t, event.note));
        // 兼容无 type 或 type 识别为 other 的旧事件指纹
        existingFingerprints.add(buildInteractionRebuildFingerprint(event.personDocId, event.localDate, "other", event.note));
    }

    const willRestore: RebuiltInteractionCandidate[] = [];
    const eventsToAppend: InteractionEvent[] = [];
    const seenBatchExternalRefs = new Set<string>();
    const seenBatchFingerprints = new Set<string>();
    let skippedDuplicateCount = 0;

    for (const candidate of scannedCandidates) {
        const refKey = `${candidate.personDocId}\n${candidate.externalRef}`;
        const fpExact = candidate.fingerprint;
        const fpFallback = buildInteractionRebuildFingerprint(
            candidate.personDocId,
            candidate.localDate,
            "other",
            candidate.note,
        );
        const deterministicId = `rebuild-${candidate.fingerprint}`;

        const isDuplicate =
            existingTombstones.has(deterministicId)
            || existingIds.has(deterministicId)
            || existingExternalRefs.has(refKey)
            || existingFingerprints.has(fpExact)
            || existingFingerprints.has(fpFallback)
            || seenBatchExternalRefs.has(refKey)
            || seenBatchFingerprints.has(fpExact);

        if (isDuplicate) {
            skippedDuplicateCount += 1;
            continue;
        }

        seenBatchExternalRefs.add(refKey);
        seenBatchFingerprints.add(fpExact);
        willRestore.push(candidate);

        eventsToAppend.push({
            id: deterministicId,
            personDocId: candidate.personDocId,
            occurredAt: candidate.occurredAt,
            localDate: candidate.localDate,
            source: candidate.source,
            type: candidate.type,
            externalRef: candidate.externalRef,
            ...(candidate.note ? { note: candidate.note } : {}),
        });
    }

    return {
        candidatesTotal: scannedCandidates.length,
        willRestore,
        skippedDuplicateCount,
        eventsToAppend,
    };
}
