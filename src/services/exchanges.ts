import type { Plugin } from "siyuan";
import { newNodeId } from "../api/client";
import {
    createExchangeRecord,
    listPersonExchangeRecords,
    loadExchangeStore,
    setExchangeStatus,
    updateExchangeRecord,
} from "../data/exchanges";
import {
    computeExchangesSummary,
    buildExchangesLedgerMarkdown,
    type ExchangesSummary,
} from "../domain/exchanges-summary";
import { getRoster } from "./roster";
import { createDocWithMd } from "../api/client";
import { flushBlockIndex, setBlockAttrs } from "../api/blocks";
import { qualifyContactsSubHPath } from "../domain/format";
import { toLocalDateKey } from "../domain/date-key.ts";
import type { ContactsSettings } from "../domain/model";
import type {
    ExchangeDirection,
    ExchangeKind,
    ExchangePatch,
    ExchangeRecord,
    ExchangeStatus,
} from "../domain/exchanges";

export type { ExchangeDirection, ExchangeKind, ExchangePatch, ExchangeRecord, ExchangeStatus } from "../domain/exchanges";

const ID_PATTERN = /^\d{14}-[0-9a-z]{7}$/;

export function newExchangeRequestId(): string {
    return newNodeId();
}

function assertPersonDocId(personDocId: string): void {
    if (!ID_PATTERN.test(personDocId)) throw new Error("人物文档 ID 无效");
}

export interface CreatePersonExchangeInput {
    requestId: string;
    personDocId: string;
    kind: ExchangeKind;
    direction: ExchangeDirection;
    description: string;
    amount?: number;
    currency?: string;
    occurredOn: string;
    dueOn?: string;
    note?: string;
}

export async function listPersonExchanges(plugin: Plugin, personDocId: string): Promise<ExchangeRecord[]> {
    assertPersonDocId(personDocId);
    return listPersonExchangeRecords(plugin, personDocId);
}

export async function createPersonExchange(plugin: Plugin, input: CreatePersonExchangeInput): Promise<ExchangeRecord> {
    assertPersonDocId(input.personDocId);
    return createExchangeRecord(plugin, input);
}

export async function updatePersonExchange(plugin: Plugin, id: string, patch: ExchangePatch, expected?: Pick<ExchangeRecord, "updatedAt">): Promise<ExchangeRecord> {
    return updateExchangeRecord(plugin, id, patch, expected);
}

export async function changePersonExchangeStatus(
    plugin: Plugin,
    id: string,
    status: ExchangeStatus,
    settledOn?: string,
    expected?: Pick<ExchangeRecord, "updatedAt">,
): Promise<ExchangeRecord> {
    return setExchangeStatus(plugin, id, status, settledOn ?? "", expected);
}

export async function listAllExchanges(plugin: Plugin): Promise<ExchangeRecord[]> {
    const store = await loadExchangeStore(plugin);
    return store.records;
}

export async function loadExchangesSummary(plugin: Plugin, settings: ContactsSettings): Promise<ExchangesSummary> {
    const [records, people] = await Promise.all([
        listAllExchanges(plugin),
        getRoster(settings),
    ]);
    return computeExchangesSummary(records, people);
}

export async function createExchangesLedgerDoc(
    plugin: Plugin,
    settings: ContactsSettings,
    options: { title?: string } = {},
): Promise<{ docId: string; hpath: string; count: number } | null> {
    if (!settings.notebookId) return null;

    const summary = await loadExchangesSummary(plugin, settings);
    const title = options.title?.trim() || `人情礼尚往来大账簿 · ${toLocalDateKey(new Date())}`;
    const md = buildExchangesLedgerMarkdown(summary, title);
    const hpath = qualifyContactsSubHPath(settings, `/人情账本/🧧 ${title}`);

    const docId = await createDocWithMd(settings.notebookId, hpath, md);
    if (!docId) return null;

    try {
        await setBlockAttrs(docId, {
            "custom-lvct-ledger": title,
            "custom-lvct-created": String(Date.now()),
        });
        await flushBlockIndex();
    } catch (error) {
        console.warn("[LvContacts] 设置人情大账簿文档属性失败（已降级保留正文）：", error);
    }

    return { docId, hpath, count: summary.totalRecords };
}
