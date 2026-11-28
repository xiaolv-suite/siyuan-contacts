/**
 * 思源日记（Daily Note）双向链接同步服务。
 * 当用户记录一笔互动（见面/电话/聚餐等）时，安全追加到指定日期的日记文档末尾，
 * 并以 siyuan://blocks/<personDocId> 双向锚定人物，使得日记与人脉图谱彻底咬合。
 */
import {
    appendBlockMd,
    deleteBlock,
    diaryZoneKernelPost,
    findDailyNoteDocument,
    flushBlockIndex,
    insertBlockAfterMd,
    setBlockAttrs,
    updateBlockMd,
} from "../api/blocks";
import { createDailyNote, listNotebooks, querySql } from "../api/client";
import { buildDailyNoteInteractionMarkdown, buildDailyNoteOccasionMarkdown, buildDailyNoteFollowUpTaskMarkdown, type DiaryFollowUpTaskInput } from "../domain/diary-sync.ts";
import type { InteractionType } from "../domain/interactions.ts";
import { toLocalDateKey } from "../domain/interactions.ts";
import { buildXiaolvLifeLogAttrs, ensureXiaolvDiaryZone, findTodayDailyNoteDocId, resolveDailyNotebookId } from "../libs/lv-notice-kit";

async function resolveSafeDailyNotebookId(fallbackNb?: string): Promise<string> {
    try {
        const resolved = await resolveDailyNotebookId();
        if (resolved) return resolved;
    } catch { /* ignore */ }
    if (fallbackNb?.trim()) return fallbackNb.trim();
    try {
        const notebooks = await listNotebooks();
        const openNb = notebooks.find((nb) => !nb.closed && nb.id?.trim());
        if (openNb?.id) return openNb.id.trim();
    } catch { /* ignore */ }
    return "";
}

async function createDailyNoteWithValidNotebook(primaryNb: string, fallbackNb?: string): Promise<string> {
    const candidates: string[] = [];
    if (primaryNb.trim()) candidates.push(primaryNb.trim());
    if (fallbackNb?.trim() && !candidates.includes(fallbackNb.trim())) candidates.push(fallbackNb.trim());
    try {
        const notebooks = await listNotebooks();
        for (const nb of notebooks) {
            if (!nb.closed && nb.id?.trim() && !candidates.includes(nb.id.trim())) {
                candidates.push(nb.id.trim());
            }
        }
    } catch { /* ignore */ }
    for (const nbId of candidates) {
        const created = await createDailyNote(nbId).catch(() => "");
        if (created) return created;
    }
    return "";
}

export interface AppendInteractionToDailyNoteInput {
    personDocId: string;
    personName: string;
    localDate: string;
    type?: InteractionType;
    note?: string;
    occurredAt?: number;
    eventId?: string;
}

export async function appendInteractionToDailyNote(
    notebookId: string,
    input: AppendInteractionToDailyNoteInput,
): Promise<{ dailyDocId: string; blockId: string } | null> {
    const targetNb = await resolveSafeDailyNotebookId(notebookId);
    if (!targetNb || !input.personDocId || !input.localDate) return null;
    
    try {
        let dailyDoc = await findDailyNoteDocument(targetNb, input.localDate);
        const todayStr = toLocalDateKey(new Date());
        
        // 若当天日记尚未生成且属于今天的互动，优先多级查找全库日记正身，最后才兜底创建
        if (!dailyDoc && input.localDate === todayStr) {
            try {
                const foundToday = await findTodayDailyNoteDocId(targetNb);
                if (foundToday) {
                    dailyDoc = { docId: foundToday, hpath: "" };
                } else {
                    const createdDocId = await createDailyNoteWithValidNotebook(targetNb, notebookId);
                    if (createdDocId) {
                        await flushBlockIndex();
                        dailyDoc = (await findDailyNoteDocument(targetNb, input.localDate)) ?? { docId: createdDocId, hpath: "" };
                    }
                }
            } catch {
                // 部分旧版本或特定只读模式可能不支持 createDailyNote，静默容错
            }
        }

        if (!dailyDoc?.docId) return null;

        // 提取时分秒用于更精准的日记流水展示
        let occurredTimeStr: string | undefined;
        if (input.occurredAt) {
            const timeDate = new Date(input.occurredAt);
            if (!Number.isNaN(timeDate.getTime())) {
                const pad = (v: number) => String(v).padStart(2, "0");
                occurredTimeStr = `${pad(timeDate.getHours())}:${pad(timeDate.getMinutes())}`;
            }
        }

        const markdown = buildDailyNoteInteractionMarkdown({
            personDocId: input.personDocId,
            personName: input.personName,
            type: input.type,
            note: input.note,
            occurredTimeStr,
        });

        let blockId = "";
        try {
            const zone = await ensureXiaolvDiaryZone(dailyDoc.docId, { postFn: diaryZoneKernelPost });
            blockId = await insertBlockAfterMd(zone.anchorBlockId, dailyDoc.docId, markdown);
        } catch {
            blockId = await appendBlockMd(dailyDoc.docId, markdown);
        }
        const unifiedAttrs = buildXiaolvLifeLogAttrs({
            date: input.localDate,
            time: occurredTimeStr,
            type: `人脉互动-${input.type || "note"}`,
            body: `${input.personName}${input.note ? `：${input.note}` : ""}`,
            source: "siyuan-contacts",
            module: "interactions",
            eventId: input.eventId,
            target: input.personDocId,
            refDocId: input.personDocId,
            refDocTitle: input.personName,
        });
        await setBlockAttrs(blockId, {
            ...unifiedAttrs,
            ...(input.eventId ? { "custom-lvct-event-id": input.eventId } : {}),
        }).catch(() => {});
        await flushBlockIndex();
        return { dailyDocId: dailyDoc.docId, blockId };
    } catch (err) {
        console.warn("[LvContacts] 追加互动到思源日记未完成（非阻塞）：", err);
        return null;
    }
}

export interface AppendOccasionToDailyNoteInput {
    title: string;
    type?: string;
    date: string;
    place?: string;
    attendees: readonly { personDocId: string; name: string }[];
}

export async function appendOccasionToDailyNote(
    notebookId: string,
    input: AppendOccasionToDailyNoteInput,
): Promise<{ dailyDocId: string; blockId: string } | null> {
    const targetNb = await resolveSafeDailyNotebookId(notebookId);
    if (!targetNb || !input.title || !input.date) return null;

    try {
        let dailyDoc = await findDailyNoteDocument(targetNb, input.date);
        const todayStr = toLocalDateKey(new Date());

        if (!dailyDoc && input.date === todayStr) {
            try {
                const foundToday = await findTodayDailyNoteDocId(targetNb);
                if (foundToday) {
                    dailyDoc = { docId: foundToday, hpath: "" };
                } else {
                    const createdDocId = await createDailyNoteWithValidNotebook(targetNb, notebookId);
                    if (createdDocId) {
                        await flushBlockIndex();
                        dailyDoc = (await findDailyNoteDocument(targetNb, input.date)) ?? { docId: createdDocId, hpath: "" };
                    }
                }
            } catch {
                // 忽略非阻塞错误
            }
        }

        if (!dailyDoc?.docId) return null;

        const markdown = buildDailyNoteOccasionMarkdown({
            title: input.title,
            type: input.type,
            date: input.date,
            place: input.place,
            attendees: input.attendees,
        });

        let blockId = "";
        try {
            const zone = await ensureXiaolvDiaryZone(dailyDoc.docId, { postFn: diaryZoneKernelPost });
            blockId = await insertBlockAfterMd(zone.anchorBlockId, dailyDoc.docId, markdown);
        } catch {
            blockId = await appendBlockMd(dailyDoc.docId, markdown);
        }
        const unifiedAttrs = buildXiaolvLifeLogAttrs({
            date: input.date,
            type: `人脉活动-${input.type || "occasion"}`,
            body: input.title,
            source: "siyuan-contacts",
            module: "occasions",
        });
        await setBlockAttrs(blockId, unifiedAttrs).catch(() => {});
        await flushBlockIndex();
        return { dailyDocId: dailyDoc.docId, blockId };
    } catch (err) {
        console.warn("[LvContacts] 追加多人活动到思源日记未完成（非阻塞）：", err);
        return null;
    }
}

/**
 * 配合 Task Horizon (任务视界) 落地：将客户拜访/跟进待办写入指定日期的日记文档，
 * 携带标准 custom-status, custom-priority, custom-completion-time 与名片反链 custom-remark。
 */
export async function appendFollowUpToDailyNote(
    notebookId: string,
    input: DiaryFollowUpTaskInput,
): Promise<{ dailyDocId: string; blockId: string } | null> {
    const targetNb = await resolveSafeDailyNotebookId(notebookId);
    if (!targetNb || !input.personDocId || !input.dueDate) return null;

    try {
        let dailyDoc = await findDailyNoteDocument(targetNb, input.dueDate);
        const todayStr = toLocalDateKey(new Date());

        if (!dailyDoc && input.dueDate === todayStr) {
            try {
                const foundToday = await findTodayDailyNoteDocId(targetNb);
                if (foundToday) {
                    dailyDoc = { docId: foundToday, hpath: "" };
                } else {
                    const createdDocId = await createDailyNoteWithValidNotebook(targetNb, notebookId);
                    if (createdDocId) {
                        await flushBlockIndex();
                        dailyDoc = (await findDailyNoteDocument(targetNb, input.dueDate)) ?? { docId: createdDocId, hpath: "" };
                    }
                }
            } catch (error) {
                console.warn("[LvContacts] 创建今日日记文档失败：", error);
            }
        }

        if (!dailyDoc?.docId) return null;

        const markdown = buildDailyNoteFollowUpTaskMarkdown(input);
        let blockId = "";
        try {
            const zone = await ensureXiaolvDiaryZone(dailyDoc.docId, { postFn: diaryZoneKernelPost });
            blockId = await insertBlockAfterMd(zone.anchorBlockId, dailyDoc.docId, markdown);
        } catch {
            blockId = await appendBlockMd(dailyDoc.docId, markdown);
        }
        const unifiedAttrs = buildXiaolvLifeLogAttrs({
            date: input.dueDate,
            type: "人脉跟进",
            body: `${input.personName}：${input.title}`,
            source: "siyuan-contacts",
            module: "followups",
            target: input.personDocId,
            refDocId: input.personDocId,
            refDocTitle: input.personName,
        });
        await setBlockAttrs(blockId, unifiedAttrs).catch(() => {});
        await flushBlockIndex();
        return { dailyDocId: dailyDoc.docId, blockId };
    } catch (err) {
        console.warn("[LvContacts] 追加跟进待办到思源日记未完成（非阻塞）：", err);
        return null;
    }
}

/**
 * 根据互动事件 ID 精确定位并删除思源日记中的对应行（改删同步 P3）
 */
export async function removeDailyNoteInteractionByEventId(eventId: string): Promise<boolean> {
    if (!eventId) return false;
    try {
        const safeEventId = eventId.replace(/'/g, "''");
        const rows = await querySql<{ id: string }>(
            `SELECT id FROM blocks WHERE ial LIKE '%custom-lvct-event-id="${safeEventId}"%' LIMIT 1`
        );
        if (!rows || rows.length === 0) return false;
        await deleteBlock(rows[0].id);
        await flushBlockIndex();
        return true;
    } catch (err) {
        console.warn(`[LvContacts] 从日记中移除互动行失败 (${eventId}):`, err);
        return false;
    }
}

export interface UpdateDailyNoteInteractionInput {
    oldEventId: string;
    newEventId: string;
    personDocId: string;
    personName: string;
    type?: InteractionType;
    note?: string;
    occurredAt?: number;
}

/**
 * 根据旧互动事件 ID 精确定位并就地更新思源日记中的对应行文本及事件 ID 锚点（改删同步 P3）
 */
export async function updateDailyNoteInteractionByEventId(
    input: UpdateDailyNoteInteractionInput,
): Promise<boolean> {
    if (!input.oldEventId) return false;
    try {
        const safeOldId = input.oldEventId.replace(/'/g, "''");
        const rows = await querySql<{ id: string }>(
            `SELECT id FROM blocks WHERE ial LIKE '%custom-lvct-event-id="${safeOldId}"%' LIMIT 1`
        );
        if (!rows || rows.length === 0) return false;
        const blockId = rows[0].id;

        let occurredTimeStr: string | undefined;
        if (input.occurredAt) {
            const timeDate = new Date(input.occurredAt);
            if (!Number.isNaN(timeDate.getTime())) {
                const pad = (v: number) => String(v).padStart(2, "0");
                occurredTimeStr = `${pad(timeDate.getHours())}:${pad(timeDate.getMinutes())}`;
            }
        }

        const markdown = buildDailyNoteInteractionMarkdown({
            personDocId: input.personDocId,
            personName: input.personName,
            type: input.type,
            note: input.note,
            occurredTimeStr,
        });

        await updateBlockMd(blockId, markdown);
        if (input.newEventId !== input.oldEventId) {
            await setBlockAttrs(blockId, { "custom-lvct-event-id": input.newEventId });
        }
        await flushBlockIndex();
        return true;
    } catch (err) {
        console.warn(`[LvContacts] 更新日记中互动行失败 (${input.oldEventId}):`, err);
        return false;
    }
}
