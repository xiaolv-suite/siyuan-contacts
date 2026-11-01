/**
 * 思源日记（Daily Note）双向链接同步服务。
 * 当用户记录一笔互动（见面/电话/聚餐等）时，安全追加到指定日期的日记文档末尾，
 * 并以 siyuan://blocks/<personDocId> 双向锚定人物，使得日记与人脉图谱彻底咬合。
 */
import {
    appendBlockMd,
    deleteBlock,
    findDailyNoteDocument,
    flushBlockIndex,
    setBlockAttrs,
    updateBlockMd,
} from "../api/blocks";
import { createDailyNote, querySql } from "../api/client";
import { buildDailyNoteInteractionMarkdown, buildDailyNoteOccasionMarkdown, buildDailyNoteFollowUpTaskMarkdown, type DiaryFollowUpTaskInput } from "../domain/diary-sync.ts";
import type { InteractionType } from "../domain/interactions.ts";
import { toLocalDateKey } from "../domain/interactions.ts";

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
    if (!notebookId || !input.personDocId || !input.localDate) return null;
    
    try {
        let dailyDoc = await findDailyNoteDocument(notebookId, input.localDate);
        const todayStr = toLocalDateKey(new Date());
        
        // 若当天日记尚未生成且属于今天的互动，尝试通过官方内核端点触发创建今日日记
        if (!dailyDoc && input.localDate === todayStr) {
            try {
                const createdDocId = await createDailyNote(notebookId);
                if (createdDocId) {
                    await flushBlockIndex();
                    dailyDoc = await findDailyNoteDocument(notebookId, input.localDate);
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

        const blockId = await appendBlockMd(dailyDoc.docId, markdown);
        if (input.eventId) {
            await setBlockAttrs(blockId, { "custom-lvct-event-id": input.eventId }).catch(() => {});
        }
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
    if (!notebookId || !input.title || !input.date) return null;

    try {
        let dailyDoc = await findDailyNoteDocument(notebookId, input.date);
        const todayStr = toLocalDateKey(new Date());

        if (!dailyDoc && input.date === todayStr) {
            try {
                const createdDocId = await createDailyNote(notebookId);
                if (createdDocId) {
                    await flushBlockIndex();
                    dailyDoc = await findDailyNoteDocument(notebookId, input.date);
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

        const blockId = await appendBlockMd(dailyDoc.docId, markdown);
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
    if (!notebookId || !input.personDocId || !input.dueDate) return null;

    try {
        let dailyDoc = await findDailyNoteDocument(notebookId, input.dueDate);
        const todayStr = toLocalDateKey(new Date());

        if (!dailyDoc && input.dueDate === todayStr) {
            try {
                const createdDocId = await createDailyNote(notebookId);
                if (createdDocId) {
                    await flushBlockIndex();
                    dailyDoc = await findDailyNoteDocument(notebookId, input.dueDate);
                }
            } catch (error) {
                console.warn("[LvContacts] 创建今日日记文档失败：", error);
            }
        }

        if (!dailyDoc?.docId) return null;

        const markdown = buildDailyNoteFollowUpTaskMarkdown(input);
        const blockId = await appendBlockMd(dailyDoc.docId, markdown);
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
        const rows = await querySql<{ id: string }>(
            `SELECT id FROM blocks WHERE ial LIKE '%custom-lvct-event-id="${eventId}"%' LIMIT 1`
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
        const rows = await querySql<{ id: string }>(
            `SELECT id FROM blocks WHERE ial LIKE '%custom-lvct-event-id="${input.oldEventId}"%' LIMIT 1`
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
