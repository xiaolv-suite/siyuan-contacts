/**
 * 人脉记忆复习闪卡服务：创建与沉淀实体闪卡文档。
 * 纯本地实现，零网络请求。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import type { ContactSummary } from "../domain/person.ts";
import type { PersonFactItem } from "../domain/doc-section.ts";
import type { PersonTopicItem } from "../domain/topics.ts";
import { buildPersonFlashcards, buildFlashcardDocumentMarkdown } from "../domain/flashcards.ts";
import { createDocWithMd } from "../api/client.ts";
import { flushBlockIndex, setBlockAttrs } from "../api/blocks.ts";

export interface CreateFlashcardsDocOptions {
    deckName?: string;
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
    const hpath = `/人脉闪卡/🎴 人脉记忆闪卡 · ${name}`;

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-riff-decks": deckName,
            "custom-lvct-flashcard-person": person.docId,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch {}

    return { docId, hpath, count: cards.length };
}
