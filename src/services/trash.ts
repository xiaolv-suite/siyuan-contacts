/**
 * E-33 联系人软删除回收站服务层（Trash & Soft Delete Buffer）
 * 支持移入回收站并解绑、一键恢复联系人及元数据快照、列表查询与清空。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import { validateDraft, type ContactDraft, type ContactSummary } from "../domain/person.ts";
import { dropTrashEntry, listTrashEntries, loadTrashStoreStrict, pushTrashEntry, clearTrashBin } from "../data/trash.ts";
import type { TrashContactEntry } from "../domain/trash.ts";
import { removeContact, writeDraftCells } from "./contacts.ts";
import { bindDocsAsRows, mapBoundDocIds } from "../api/av.ts";
import { documentExists } from "../api/blocks.ts";
import { getRoster, invalidateRoster } from "./roster.ts";
import { addRelation } from "./relations.ts";

/**
 * 移入回收站并解绑联系人：
 * 1. 收集双向关联人物（relatedItemIds + relatedDocIds）存入 30 天回收站缓冲区；
 * 2. 从属性视图安全解绑数据库行（保留思源人物文档）；
 * 3. 失效名册缓存。
 */
export async function removeContactToTrash(
    plugin: Plugin,
    settings: ContactsSettings,
    person: ContactSummary,
): Promise<void> {
    let relatedDocIds: string[] = [];
    let allRelatedItemIds = [...(person.relatedItemIds ?? [])];
    try {
        const roster = await getRoster(settings);
        const linkedOthers = roster.filter(
            (other) => other.docId !== person.docId && other.itemId !== person.itemId
                && ((person.relatedItemIds ?? []).includes(other.itemId) || (other.relatedItemIds ?? []).includes(person.itemId)),
        );
        relatedDocIds = linkedOthers.map((other) => other.docId).filter(Boolean);
        allRelatedItemIds = [...new Set([...allRelatedItemIds, ...linkedOthers.map((other) => other.itemId).filter(Boolean)])];
    } catch {
        /* 名册旁路失败时不阻断软删除 */
    }
    await pushTrashEntry(plugin, { ...person, relatedItemIds: allRelatedItemIds }, relatedDocIds);
    await removeContact(settings, person);
    invalidateRoster();
}

/**
 * 从回收站一键恢复联系人：
 * 1. 严格读取回收站，按 entryId 找到快照；
 * 2. 校验原人物文档物理存在性（documentExists），已物理删档时拒绝绑回 AV；
 * 3. 检查是否已被重新绑定；未绑定则调用 bindDocsAsRows 重新将文档绑定为数据库行；
 * 4. 换算得到新 itemId，调用 writeDraftCells 写回快照属性（电话/邮箱/微信/标签/生日等）；
 * 5. 同步恢复快照中记录的双向 related 关系；
 * 6. 从回收站移除该条目并失效名册缓存。
 */
export async function restoreContactFromTrash(
    plugin: Plugin,
    settings: ContactsSettings,
    entryId: string,
): Promise<{ docId: string; itemId: string; name: string; warnings?: string[] }> {
    const store = await loadTrashStoreStrict(plugin);
    const entry = store.entries.find((item) => item.id === entryId || item.docId === entryId);
    if (!entry) throw new Error("回收站未找到该条目或已被清理");

    // 校验思源人物文档是否仍物理存在；若已物理删除，严禁把不存在的 docId 绑回属性视图
    const exists = await documentExists(entry.docId);
    if (!exists) {
        throw new Error(`原人物文档「${entry.name}」（${entry.docId}）已不存在（可能已被物理删除），无法绑回名册；请先重建文档后再重试，或取消/清空该回收站记录。`);
    }

    // 1. 先构造并校验快照草稿，校验通过才允许绑定数据库行（防止无效快照留下孤立已绑行）
    const draft: ContactDraft = {
        name: entry.name,
        phone: entry.snapshot.phone ?? "",
        email: entry.snapshot.email ?? "",
        wechat: entry.snapshot.wechat ?? "",
        website: entry.snapshot.website ?? "",
        birthday: entry.snapshot.birthday ?? "",
        isLunar: Boolean(entry.snapshot.isLunar),
        group: entry.snapshot.group ?? "",
        tags: entry.snapshot.tags ?? [],
    };
    const draftErrors = validateDraft(draft);
    if (draftErrors.length > 0) {
        throw new Error(`回收站快照「${entry.name}」资料校验失败（${draftErrors.join("；")}），已停止恢复并保留原快照`);
    }

    // 2. 检查是否已经在数据库中；未绑定才绑行
    const boundMap = await mapBoundDocIds(settings.avId, [entry.docId]);
    let newItemId = boundMap[entry.docId];

    if (!newItemId) {
        // 重新绑行为数据库行
        await bindDocsAsRows(settings.avId, settings.dbBlockId, [{ id: entry.docId, content: entry.name }]);
        const freshBound = await mapBoundDocIds(settings.avId, [entry.docId]);
        newItemId = freshBound[entry.docId];
        if (!newItemId) throw new Error("恢复联系人行绑定未收敛，请重试");
    }

    // 3. 写回快照属性并核实全部字段已收敛
    const writeReport = await writeDraftCells(settings, newItemId, draft, { mode: "create" });
    if (!writeReport.complete) {
        const failedDesc = writeReport.unresolved
            .map((u) => `${u.label}（${u.message}）`)
            .join("、") || "部分字段未能核实";
        throw new Error(`恢复联系人「${entry.name}」字段写回未完成（${failedDesc}），回收站快照已保留以便重试`);
    }

    // 4. 同步恢复双向 related 关系（基于稳定 docId 优先匹配，兼容 itemId 回退）
    const warnings: string[] = [];
    const snapRelatedDocIds = entry.snapshot.relatedDocIds ?? [];
    const snapRelatedItemIds = entry.snapshot.relatedItemIds ?? [];
    if (snapRelatedDocIds.length > 0 || snapRelatedItemIds.length > 0) {
        invalidateRoster();
        try {
            const roster = await getRoster(settings);
            const restoredPerson = roster.find((p) => p.docId === entry.docId && p.itemId === newItemId)
                ?? roster.find((p) => p.docId === entry.docId);
            if (!restoredPerson) {
                warnings.push("未能从名册核实已恢复联系人，关联关系未能恢复");
            } else {
                const targetDocSet = new Set(snapRelatedDocIds);
                const targetItemSet = new Set(snapRelatedItemIds);
                const counterparts = roster.filter(
                    (other) => other.docId !== restoredPerson.docId && other.itemId !== restoredPerson.itemId
                        && (targetDocSet.has(other.docId) || targetItemSet.has(other.itemId)),
                );
                const seenDocs = new Set<string>();
                for (const other of counterparts) {
                    if (seenDocs.has(other.docId)) continue;
                    seenDocs.add(other.docId);
                    try {
                        await addRelation(settings, restoredPerson, other);
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        warnings.push(`与「${other.name}」的关联关系恢复失败：${msg}`);
                        console.warn(`[LvContacts] 恢复联系人「${entry.name}」与「${other.name}」的关联关系未完成:`, err);
                    }
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            warnings.push(`关系名册读取失败，关联关系未能恢复：${msg}`);
            console.warn(`[LvContacts] 恢复联系人「${entry.name}」关系名册读取未完成:`, err);
        }
    }

    // 5. 若关联关系恢复存在告警，保留回收站快照避免静默丢关系；仅全部无误才移除快照
    if (warnings.length === 0) {
        await dropTrashEntry(plugin, entry.id);
    }
    invalidateRoster();

    return {
        docId: entry.docId,
        itemId: newItemId,
        name: entry.name,
        ...(warnings.length > 0 ? { warnings } : {}),
    };
}

/** 查询当前未过期的回收站条目列表 */
export async function listTrash(plugin: Plugin): Promise<TrashContactEntry[]> {
    return listTrashEntries(plugin);
}

/** 彻底清空回收站 */
export async function emptyTrash(plugin: Plugin): Promise<void> {
    await clearTrashBin(plugin);
}
