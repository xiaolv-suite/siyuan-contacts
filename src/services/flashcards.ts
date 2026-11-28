/**
 * 人脉记忆复习闪卡服务：创建与沉淀实体闪卡文档。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import type { ContactSummary } from "../domain/person.ts";
import type { PersonFactItem } from "../domain/doc-section.ts";
import type { PersonTopicItem } from "../domain/topics.ts";
import {
    buildPersonFlashcards,
    buildFlashcardDocumentMarkdown,
    buildBatchFlashcardsDocumentMarkdown,
    type BatchPersonFlashcardInput,
} from "../domain/flashcards.ts";
import { loadPersonFactsFromDoc } from "./doc-section.ts";
import { loadPersonTopics } from "../data/topics.ts";
import { createDocWithMd } from "../api/client.ts";
import { flushBlockIndex, setBlockAttrs } from "../api/blocks.ts";
import { qualifyContactsSubHPath } from "../domain/format.ts";

export interface CreateFlashcardsDocOptions {
    deckName?: string;
}

export interface CreateBatchFlashcardsDocOptions {
    deckName?: string;
    batchTitle?: string;
}

export async function createPersonFlashcardsDoc(
    _plugin: Plugin,
    settings: ContactsSettings,
    person: ContactSummary,
    facts: readonly PersonFactItem[] = [],
    topics: readonly PersonTopicItem[] = [],
    options: CreateFlashcardsDocOptions = {},
): Promise<{ docId: string; hpath: string; count: number } | null> {
    if (!settings.notebookId || !person.docId) return null;

    const deckName = options.deckName || "人脉记忆";
    const cards = buildPersonFlashcards(person, facts, topics);
    const md = buildFlashcardDocumentMarkdown(person, cards, deckName);

    const name = person.name.trim() || "联系人";
    const hpath = qualifyContactsSubHPath(settings, `/人脉闪卡/🎴 人脉记忆闪卡 · ${name}`);

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-riff-decks": deckName,
            "custom-lvct-flashcard-person": person.docId,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch (error) {
        console.warn("[LvContacts] 设置个人闪卡文档属性失败（已降级保留正文）：", error);
    }

    return { docId, hpath, count: cards.length };
}

/**
 * 批量将一组联系人汇编沉淀为思源实体闪卡文档。
 */
export async function createBatchFlashcardsDoc(
    plugin: Plugin,
    settings: ContactsSettings,
    people: readonly ContactSummary[],
    options: CreateBatchFlashcardsDocOptions = {},
): Promise<{ docId: string; hpath: string; count: number } | null> {
    if (!settings.notebookId || people.length === 0) return null;

    const deckName = options.deckName || "人脉记忆";
    const batchTitle = options.batchTitle || `批量汇编（${people.length} 人）`;

    // 并行收集每位人物的画像事实与会面谈资
    const batchInputs: BatchPersonFlashcardInput[] = await Promise.all(
        people.map(async (p) => {
            const facts = await loadPersonFactsFromDoc(p.docId).catch(() => []);
            const topics = await loadPersonTopics(plugin, p.docId).catch(() => []);
            return {
                person: p,
                facts,
                topics,
            };
        })
    );

    const md = buildBatchFlashcardsDocumentMarkdown(batchInputs, deckName, batchTitle);
    const hpath = qualifyContactsSubHPath(settings, `/人脉闪卡/🎴 人脉记忆闪卡 · ${batchTitle}`);

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    // 统计总卡片数
    let totalCards = 0;
    for (const item of batchInputs) {
        const cards = buildPersonFlashcards(item.person, item.facts ?? [], item.topics ?? []);
        totalCards += cards.length;
    }

    try {
        await setBlockAttrs(docId, {
            "custom-riff-decks": deckName,
            "custom-lvct-flashcard-batch": String(people.length),
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch (error) {
        console.warn("[LvContacts] 设置批量闪卡文档属性失败（已降级保留正文）：", error);
    }

    return { docId, hpath, count: totalCards };
}
