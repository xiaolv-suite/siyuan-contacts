/**
 * 思源日记（Daily Note）双向链接同步服务。
 * 当用户记录一笔互动（见面/电话/聚餐等）时，安全追加到指定日期的日记文档末尾，
 * 并以 siyuan://blocks/<personDocId> 双向锚定人物，使得日记与人脉图谱彻底咬合。
 */
import { appendBlockMd, findDailyNoteDocument, flushBlockIndex } from "../api/blocks";
import { createDailyNote } from "../api/client";
import { buildDailyNoteInteractionMarkdown } from "../domain/diary-sync.ts";
import type { InteractionType } from "../domain/interactions.ts";
import { toLocalDateKey } from "../domain/interactions.ts";

export interface AppendInteractionToDailyNoteInput {
    personDocId: string;
    personName: string;
    localDate: string;
    type?: InteractionType;
    note?: string;
    occurredAt?: number;
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
        await flushBlockIndex();
        return { dailyDocId: dailyDoc.docId, blockId };
    } catch (err) {
        console.warn("[LvContacts] 追加互动到思源日记未完成（非阻塞）：", err);
        return null;
    }
}
