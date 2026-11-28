/**
 * 从已绑定联系人思源文档的「#### 🐴 小驴记录」「## 往来记录」及兼容标题区块反向重建本地互动记录。
 * 100% 只读思源文档（零篡改原文 Markdown），按幂等指纹去重后只增不删地补回 interaction-events.json。
 */
import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model";
import { fetchDocMarkdown } from "../api/blocks";
import { INTERACTION_STORAGE_KEY } from "../data/interactions";
import { loadJsonStrict, saveJsonVerified, withStoreLock } from "../data/storage";
import { normalizeInteractionStoreForWrite } from "../domain/interactions";
import {
    parseInteractionsFromDocMarkdown,
    planInteractionDocRebuild,
    type RebuiltInteractionCandidate,
} from "../domain/interaction-doc-rebuild";
import { getRoster, invalidateRoster } from "./roster";
import { emitDataChanged } from "../libs/data-events";

export interface InteractionDocRebuildPreview {
    scannedDocsCount: number;
    failedDocsCount: number;
    totalFoundCount: number;
    restoreCount: number;
    skippedDuplicateCount: number;
    items: RebuiltInteractionCandidate[];
    scannedCandidates: RebuiltInteractionCandidate[];
}

export interface InteractionDocRebuildResult {
    scannedDocsCount: number;
    failedDocsCount: number;
    totalFoundCount: number;
    restoredCount: number;
    skippedDuplicateCount: number;
}

const READ_CONCURRENCY = 8;

async function scanContactDocsReadOnly(settings: ContactsSettings): Promise<{
    scannedDocsCount: number;
    failedDocsCount: number;
    candidates: RebuiltInteractionCandidate[];
}> {
    const roster = await getRoster(settings);
    const bound = roster.filter((person) => /^\d{14}-[0-9a-z]{7}$/.test(person.docId));
    const candidates: RebuiltInteractionCandidate[] = [];
    let scannedDocsCount = 0;
    let failedDocsCount = 0;

    for (let i = 0; i < bound.length; i += READ_CONCURRENCY) {
        const batch = bound.slice(i, i + READ_CONCURRENCY);
        const settled = await Promise.all(
            batch.map(async (person) => {
                try {
                    const exported = await fetchDocMarkdown(person.docId);
                    return {
                        ok: true as const,
                        items: parseInteractionsFromDocMarkdown(person.docId, exported.content, person.name),
                    };
                } catch {
                    return { ok: false as const, items: [] as RebuiltInteractionCandidate[] };
                }
            }),
        );
        for (const entry of settled) {
            if (entry.ok) {
                scannedDocsCount += 1;
                candidates.push(...entry.items);
            } else {
                failedDocsCount += 1;
            }
        }
    }

    return { scannedDocsCount, failedDocsCount, candidates };
}

/** 预览从联系人文档重建互动记录（100% 只读，零思源文档写入、零本地库写入） */
export async function previewRebuildInteractionsFromDocs(
    plugin: Plugin,
    settings: ContactsSettings,
): Promise<InteractionDocRebuildPreview> {
    const scan = await scanContactDocsReadOnly(settings);
    const currentStore = normalizeInteractionStoreForWrite(await loadJsonStrict(plugin, INTERACTION_STORAGE_KEY));
    const plan = planInteractionDocRebuild(currentStore, scan.candidates);
    return {
        scannedDocsCount: scan.scannedDocsCount,
        failedDocsCount: scan.failedDocsCount,
        totalFoundCount: plan.candidatesTotal,
        restoreCount: plan.willRestore.length,
        skippedDuplicateCount: plan.skippedDuplicateCount,
        items: plan.willRestore,
        scannedCandidates: scan.candidates,
    };
}

/**
 * 确认重建：只增不删地补回本地互动库（绝不修改、绝不回写任何思源文档）。
 */
export async function executeRebuildInteractionsFromDocs(
    plugin: Plugin,
    settings: ContactsSettings,
    scannedCandidates?: readonly RebuiltInteractionCandidate[],
): Promise<InteractionDocRebuildResult> {
    let candidates: readonly RebuiltInteractionCandidate[];
    let scannedDocsCount = 0;
    let failedDocsCount = 0;

    if (scannedCandidates) {
        candidates = scannedCandidates;
    } else {
        const scan = await scanContactDocsReadOnly(settings);
        candidates = scan.candidates;
        scannedDocsCount = scan.scannedDocsCount;
        failedDocsCount = scan.failedDocsCount;
    }

    const summary = await withStoreLock(INTERACTION_STORAGE_KEY, async () => {
        const currentStore = normalizeInteractionStoreForWrite(await loadJsonStrict(plugin, INTERACTION_STORAGE_KEY));
        const plan = planInteractionDocRebuild(currentStore, candidates);
        if (plan.eventsToAppend.length > 0) {
            const nextStore = normalizeInteractionStoreForWrite({
                ...currentStore,
                events: [...currentStore.events, ...plan.eventsToAppend],
            });
            await saveJsonVerified(plugin, INTERACTION_STORAGE_KEY, nextStore);
        }
        return {
            restoredCount: plan.eventsToAppend.length,
            skippedDuplicateCount: plan.skippedDuplicateCount,
            totalFoundCount: plan.candidatesTotal,
        };
    });

    if (summary.restoredCount > 0) {
        invalidateRoster();
        emitDataChanged({ topics: ["people"] });
    }

    return {
        scannedDocsCount,
        failedDocsCount,
        ...summary,
    };
}
