/**
 * 人物文档各原子区块同步服务：把人脉基本资料、往来记录、跟进事项、人情往来与纪念日同步为文档内的 Markdown 区块。
 * 契约：各区块拥有独立 custom-lvct-* 属性标记，幂等更新，内容未变不触发写入。
 */
import { deleteBlock, readMarkedBlocks, upsertMarkedBlock } from "../api/blocks";
import { KernelPermissionError, KernelResponseError } from "../api/client";
import type { ContactSummary } from "../domain/person";
import { withDocLock } from "../libs/lv-notice-kit";
import { loadInteractionStore } from "../data/interactions";
import { loadExchangeStore } from "../data/exchanges";
import { loadAnniversaryStore } from "../data/anniversaries";
import { loadPersonOrigin } from "../data/person-origins.ts";
import { loadPersonKinships } from "../data/kinship.ts";
import { syncFollowUpTasksToDoc } from "./followup-sync";
import { loadPersonFields } from "./person-fields";
import type { Plugin } from "siyuan";
import {
    RELATED_SECTION_ATTR,
    INTERACTIONS_SECTION_ATTR,
    PROFILE_SECTION_ATTR,
    FOLLOWUPS_SECTION_ATTR,
    EXCHANGES_SECTION_ATTR,
    ANNIVERSARIES_SECTION_ATTR,
    FACTS_SECTION_ATTR,
    profileSectionMarkdown,
    interactionSectionMarkdown,
    followupsSectionMarkdown,
    exchangesSectionMarkdown,
    anniversariesSectionMarkdown,
    relatedSectionMarkdown,
    buildFactsSectionMarkdown,
    parseFactsSectionMarkdown,
    type PersonFactItem,
    type ProfileSectionDetails,
} from "../domain/doc-section.ts";

export {
    RELATED_SECTION_ATTR,
    INTERACTIONS_SECTION_ATTR,
    PROFILE_SECTION_ATTR,
    FOLLOWUPS_SECTION_ATTR,
    EXCHANGES_SECTION_ATTR,
    ANNIVERSARIES_SECTION_ATTR,
    FACTS_SECTION_ATTR,
    profileSectionMarkdown,
    interactionSectionMarkdown,
    followupsSectionMarkdown,
    exchangesSectionMarkdown,
    anniversariesSectionMarkdown,
    relatedSectionMarkdown,
    buildFactsSectionMarkdown,
    parseFactsSectionMarkdown,
    type PersonFactItem,
};

export class RelatedProjectionUnknownError extends Error {}

function contentWithoutIal(markdown: string): string {
    const withoutIal = markdown.replace(/\r\n/g, "\n").trim()
        .replace(/\n\s*\{:[^}]*\}\s*$/g, "").trim();
    const superMatch = withoutIal.match(/^\{\{\{(?:row|col)\n([\s\S]*?)\n*\}\}\}$/);
    return superMatch ? superMatch[1].trim() : withoutIal;
}

/** 同步某人物文档的正文基本资料档案区块（真实落盘到思源笔记正文，受 withDocLock 保护） */
export async function syncPersonProfileDocSection(
    person: ContactSummary,
    options: { strict?: boolean; plugin?: Plugin } = {},
): Promise<void> {
    if (!person.docId) return;
    return withDocLock(person.docId, async () => {
        const existing = await readMarkedBlocks(person.docId, PROFILE_SECTION_ATTR);
        let details: ProfileSectionDetails | undefined;
        if (options.plugin) {
            try {
                const [origin, kinships] = await Promise.all([
                    loadPersonOrigin(options.plugin, person.docId).catch(() => null),
                    loadPersonKinships(options.plugin, person.docId).catch(() => []),
                ]);
                details = {
                    origin: origin ? {
                        metAt: origin.metAt,
                        introducedByDocId: origin.introducedByDocId,
                    } : null,
                    kinships,
                };
            } catch {}
        }
        const markdown = profileSectionMarkdown(person, details);
        if (existing.length === 0 && !markdown) return;
        if (existing.length === 1 && contentWithoutIal(existing[0].markdown) === markdown) return;
        try {
            await upsertMarkedBlock(person.docId, PROFILE_SECTION_ATTR, markdown, existing[0]?.id);
        } catch (err) {
            if (options.strict) throw err;
            console.warn("[LvContacts] 人脉基本档案同步到正文未完成", err);
        }
    });
}

/** 同步某人物文档的正文往来记录区块（真实落盘到思源笔记正文，受 withDocLock 互斥排队保护） */
export async function syncInteractionDocSection(plugin: Plugin, personDocId: string, options: { strict?: boolean } = {}): Promise<void> {
    return withDocLock(personDocId, async () => {
        const store = await loadInteractionStore(plugin);
        const tombstones = new Set(store.tombstones);
        const events = store.events
            .filter((e) => e.personDocId === personDocId && !tombstones.has(e.id))
            .sort((a, b) => b.occurredAt - a.occurredAt);
        const existing = await readMarkedBlocks(personDocId, INTERACTIONS_SECTION_ATTR);
        const markdown = interactionSectionMarkdown(events);
        if (existing.length === 0 && !markdown) return;
        if (existing.length === 1 && contentWithoutIal(existing[0].markdown) === markdown) return;
        try {
            await upsertMarkedBlock(personDocId, INTERACTIONS_SECTION_ATTR, markdown, existing[0]?.id);
        } catch (err) {
            if (options.strict) throw err;
            console.warn("[LvContacts] 互动记录同步到正文未完成", err);
        }
    });
}

export async function syncFollowUpsDocSection(plugin: Plugin, personDocId: string, _personName?: string, options: { strict?: boolean } = {}): Promise<void> {
    if (!personDocId) return;
    return withDocLock(personDocId, async () => {
        try {
            const existing = await readMarkedBlocks(personDocId, FOLLOWUPS_SECTION_ATTR);
            for (const b of existing) {
                await deleteBlock(b.id).catch(() => {});
            }
            await syncFollowUpTasksToDoc(plugin, personDocId);
        } catch (err) {
            if (options.strict) throw err;
            console.warn("[LvContacts] 原生跟进任务同步到正文未完成", err);
        }
    });
}

export async function syncExchangesDocSection(plugin: Plugin, personDocId: string, options: { strict?: boolean } = {}): Promise<void> {
    if (!personDocId) return;
    return withDocLock(personDocId, async () => {
        try {
            const store = await loadExchangeStore(plugin);
            const items = store.records.filter((item) => item.personDocId === personDocId);
            const existing = await readMarkedBlocks(personDocId, EXCHANGES_SECTION_ATTR);
            const markdown = exchangesSectionMarkdown(items);
            if (existing.length === 0 && !markdown) return;
            if (existing.length === 1 && contentWithoutIal(existing[0].markdown) === markdown) return;
            await upsertMarkedBlock(personDocId, EXCHANGES_SECTION_ATTR, markdown, existing[0]?.id);
        } catch (err) {
            if (options.strict) throw err;
            console.warn("[LvContacts] 人情往来同步到正文未完成", err);
        }
    });
}

export async function syncAnniversariesDocSection(plugin: Plugin, personDocId: string, options: { strict?: boolean } = {}): Promise<void> {
    if (!personDocId) return;
    return withDocLock(personDocId, async () => {
        try {
            const store = await loadAnniversaryStore(plugin);
            const items = store.anniversaries[personDocId] ?? [];
            const existing = await readMarkedBlocks(personDocId, ANNIVERSARIES_SECTION_ATTR);
            const markdown = anniversariesSectionMarkdown(items);
            if (existing.length === 0 && !markdown) return;
            if (existing.length === 1 && contentWithoutIal(existing[0].markdown) === markdown) return;
            await upsertMarkedBlock(personDocId, ANNIVERSARIES_SECTION_ATTR, markdown, existing[0]?.id);
        } catch (err) {
            if (options.strict) throw err;
            console.warn("[LvContacts] 重要纪念日同步到正文未完成", err);
        }
    });
}

/** 读取人物文档中的谈资与关键事实（读取异常或存在多个受控块时显式抛错，禁止静默返回空数组导致后续写入覆盖） */
export async function loadPersonFactsFromDoc(personDocId: string): Promise<PersonFactItem[]> {
    if (!personDocId) return [];
    const blocks = await readMarkedBlocks(personDocId, FACTS_SECTION_ATTR);
    if (blocks.length > 1) throw new Error("存在多个事实画像标记区块，未自动读取；请先核对文档");
    if (blocks.length === 0) return [];
    return parseFactsSectionMarkdown(blocks[0].markdown);
}

/** 保存/更新人物文档中的谈资与关键事实区块（受 withDocLock 互斥排队保护） */
export async function savePersonFactsToDoc(personDocId: string, items: readonly PersonFactItem[]): Promise<void> {
    if (!personDocId) return;
    return withDocLock(personDocId, async () => {
        const existing = await readMarkedBlocks(personDocId, FACTS_SECTION_ATTR);
        if (existing.length > 1) throw new Error("存在多个事实画像标记区块，未自动覆盖；请先核对文档");
        const markdown = buildFactsSectionMarkdown(items);
        if (existing.length === 0 && !markdown) return;
        if (existing.length === 1 && contentWithoutIal(existing[0].markdown) === markdown) return;
        await upsertMarkedBlock(personDocId, FACTS_SECTION_ATTR, markdown, existing[0]?.id);
    });
}

/** 同步人物文档的补充资料受控区块（由 savePersonFields 直接维护于文档内，此处仅核实可达与无损读取） */
export async function syncPersonFieldsDocSection(personDocId: string, options: { strict?: boolean } = {}): Promise<void> {
    if (!personDocId) return;
    try {
        await loadPersonFields(personDocId);
    } catch (err) {
        if (options.strict) throw err;
        console.warn("[LvContacts] 补充资料同步到正文未完成", err);
    }
}

/** 完整同步人脉档案、往来记录、原生跟进计划、补充资料、人情账目与纪念日到思源独立文档正文 */
export async function syncFullPersonDocument(plugin: Plugin, person: ContactSummary): Promise<void> {
    if (!person.docId) return;

    // 清理历史遗留的静态双轨待办块（若存在），彻底消除与原生跟进任务块的重复
    try {
        const legacyStaticFollowups = await readMarkedBlocks(person.docId, FOLLOWUPS_SECTION_ATTR);
        if (legacyStaticFollowups.length > 0) {
            for (const b of legacyStaticFollowups) {
                await deleteBlock(b.id).catch(() => {});
            }
        }
    } catch {}

    await Promise.all([
        syncPersonProfileDocSection(person, { strict: true, plugin }),
        syncInteractionDocSection(plugin, person.docId, { strict: true }),
        withDocLock(person.docId, async () => {
            await syncFollowUpTasksToDoc(plugin, person.docId).catch((e) => console.warn("[LvContacts] 原生跟进同步未完成:", e));
        }),
        syncPersonFieldsDocSection(person.docId, { strict: true }),
        syncExchangesDocSection(plugin, person.docId, { strict: true }),
        syncAnniversariesDocSection(plugin, person.docId, { strict: true }),
    ]);
}

/** 同步某人物文档的相关人物区块（related 为解析好姓名的对方联系人，受 withDocLock 保护） */
export async function syncRelatedSection(person: ContactSummary, related: readonly ContactSummary[]): Promise<void> {
    if (!person.docId) return;
    return withDocLock(person.docId, async () => {
        const existing = await readMarkedBlocks(person.docId, RELATED_SECTION_ATTR);
        if (existing.length > 1) throw new RelatedProjectionUnknownError("存在多个关系标记区块，未自动覆盖；请先核对文档");
        const markdown = related.length > 0 ? relatedSectionMarkdown(related) : "";
        if (existing.length === 0 && !markdown
            || existing.length === 1 && contentWithoutIal(existing[0].markdown) === markdown) return;
        try {
            await upsertMarkedBlock(person.docId, RELATED_SECTION_ATTR, markdown, existing[0]?.id);
        } catch (cause) {
            const writeRejected = (cause instanceof KernelPermissionError || cause instanceof KernelResponseError)
                && ["/api/block/insertBlock", "/api/block/updateBlock", "/api/block/deleteBlock"].includes(cause.route);
            if (writeRejected) throw cause;
            throw new RelatedProjectionUnknownError("关系投影请求已发出，但写入或回读结果尚未核实", { cause });
        }
        let verified: Array<{ id: string; markdown: string }>;
        try {
            verified = await readMarkedBlocks(person.docId, RELATED_SECTION_ATTR);
        } catch (cause) {
            throw new RelatedProjectionUnknownError("关系投影请求已发出，但回读失败，结果未知", { cause });
        }
        if (!markdown ? verified.length !== 0
            : verified.length !== 1 || contentWithoutIal(verified[0].markdown) !== markdown) {
            throw new RelatedProjectionUnknownError("关系投影请求已接受，但回读尚未核实预期内容");
        }
    });
}

/** 从名册解析某人的相关人（itemID → 对方 ContactSummary，丢弃已删条目） */
export function resolveRelated(person: ContactSummary, roster: readonly ContactSummary[]): ContactSummary[] {
    return roster.filter((other) => other.itemId !== person.itemId
        && (person.relatedItemIds.includes(other.itemId) || other.relatedItemIds.includes(person.itemId)));
}
