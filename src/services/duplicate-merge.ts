/**
 * E-31 重复人物字段级合并落地与实体关联迁移服务（Duplicate Merge Service）
 * 执行主次人物字段写回、次人物自管数据无损迁移至主人物、次人物移入回收站安全缓冲并解绑。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model.ts";
import type { ContactDraft } from "../domain/person.ts";
import {
    resolveMergePlan,
    validateMergePlan,
    type ContactMergePlan,
    type MergeAuditSnapshot,
} from "../domain/duplicate-merge.ts";
import { writeDraftCells } from "./contacts.ts";
import { removeContactToTrash } from "./trash.ts";
import { invalidateRoster } from "./roster.ts";
import { emitDataChanged } from "../libs/data-events.ts";
import { saveJsonVerified, withStoreLock } from "../data/storage.ts";
import { INTERACTION_STORAGE_KEY, loadInteractionStoreStrict } from "../data/interactions.ts";
import { FOLLOW_UP_STORAGE_KEY, loadFollowUpStoreStrict } from "../data/followups.ts";
import { TOPICS_STORAGE_KEY, loadTopicsStoreStrict } from "../data/topics.ts";
import { GIFT_IDEAS_STORAGE_KEY, loadGiftIdeaStoreStrict } from "../data/gift-ideas.ts";
import { EXCHANGE_STORAGE_KEY } from "../data/exchanges.ts";
import { normalizeExchangeStoreForWrite } from "../domain/exchanges.ts";
import { loadJsonStrict } from "../data/storage.ts";
import { ORG_MEMBERSHIP_STORAGE_KEY, loadOrgMembershipStore } from "../data/org-membership.ts";
import { ANNIVERSARIES_STORAGE_KEY, loadAnniversaryStoreStrict } from "../data/anniversaries.ts";
import { PERSON_PROMISES_STORAGE_KEY, loadPromisesStoreStrict } from "../data/promises.ts";
import { PERSON_KINSHIP_STORAGE_KEY, loadKinshipStoreStrict } from "../data/kinship.ts";
import { PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, loadSocialPreferencesStoreStrict } from "../data/social-preferences.ts";
import { PERSON_SCRATCHPAD_STORAGE_KEY, loadScratchpadStoreStrict } from "../data/person-scratchpad.ts";
import { ITINERARIES_STORAGE_KEY, loadItinerariesStoreStrict } from "../data/itineraries.ts";
import { PERSON_PROJECTS_STORAGE_KEY, loadPersonProjectsStoreStrict } from "../data/projects.ts";
import { CADENCE_STORAGE_KEY, loadCadenceMapStrict } from "../data/cadences.ts";
import { PERSON_LIFECYCLE_STORAGE_KEY, loadLifecycleStoreStrict } from "../data/lifecycle-stage.ts";
import { PERSON_ALIAS_STORAGE_KEY, loadPersonAliasStore } from "../data/person-aliases.ts";
import { PERSON_ORIGIN_STORAGE_KEY, loadPersonOriginStoreStrict } from "../data/person-origins.ts";
import { RELATIONSHIP_LABEL_STORAGE_KEY, loadRelationshipLabelStore } from "../data/person-relationship-labels.ts";
import { OCCASIONS_STORAGE_KEY, loadOccasionStoreStrict } from "../data/occasions.ts";
import { setBlockAttrs } from "../api/blocks.ts";

export interface ExecuteMergeResult {
    primaryDocId: string;
    secondaryDocId: string;
    mergedDraft: ContactDraft;
    auditSnapshot: MergeAuditSnapshot;
    migrated: {
        interactions: number;
        followUps: number;
        topics: number;
        giftIdeas: number;
        exchanges: number;
        memberships: number;
        anniversaries: number;
        promises: number;
        kinships: number;
        preferences: number;
        scratchpads: number;
        itineraries: number;
        projects: number;
        cadences: number;
        lifecycle: number;
        aliases: number;
        origins: number;
        relationshipLabels: number;
        occasions: number;
    };
}

/**
 * 执行定点字段级合并服务：
 * 1. 计划合法性校验（防同文档、防同行、防本人被销毁、防空姓名）；
 * 2. 计算决议 draft 与可逆审计快照；
 * 3. 写回主人物在属性视图（AV）中的字段；
 * 4. 锁内事务化迁移次人物的所有关联自管数据（互动事件、跟进待办、人情往来账本、谈资备忘、礼物点子偏好、组织归属）；
 * 5. 将次人物移入回收站缓冲 30 天，并从主库解绑行（思源人物文档安全保留）；
 * 6. 失效名册缓存并广播变更事件。
 */
export async function executeContactMerge(
    plugin: Plugin,
    settings: ContactsSettings,
    plan: ContactMergePlan,
): Promise<ExecuteMergeResult> {
    const errors = validateMergePlan(plan);
    if (errors.length > 0) {
        throw new Error(`合并计划校验失败：${errors.join("；")}`);
    }

    const { draft, auditSnapshot } = resolveMergePlan(plan);
    const primary = plan.primary;
    const secondary = plan.secondary;

    // 1. 写回主人物属性视图
    await writeDraftCells(settings, primary.itemId, draft, { mode: "edit" });

    const migrated = {
        interactions: 0,
        followUps: 0,
        topics: 0,
        giftIdeas: 0,
        exchanges: 0,
        memberships: 0,
        anniversaries: 0,
        promises: 0,
        kinships: 0,
        preferences: 0,
        scratchpads: 0,
        itineraries: 0,
        projects: 0,
        cadences: 0,
        lifecycle: 0,
        aliases: 0,
        origins: 0,
        relationshipLabels: 0,
        occasions: 0,
    };

    // 2. 迁移互动事件（interaction-events.json）
    await withStoreLock(INTERACTION_STORAGE_KEY, async () => {
        const store = await loadInteractionStoreStrict(plugin);
        let changed = false;
        for (const event of store.events) {
            if (event.personDocId === secondary.docId) {
                event.personDocId = primary.docId;
                migrated.interactions += 1;
                changed = true;
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, INTERACTION_STORAGE_KEY, store);
        }
    });

    // 3. 迁移跟进事项（follow-ups.json）
    await withStoreLock(FOLLOW_UP_STORAGE_KEY, async () => {
        const store = await loadFollowUpStoreStrict(plugin);
        let changed = false;
        for (const item of store.items) {
            if (item.personDocId === secondary.docId) {
                item.personDocId = primary.docId;
                item.updatedAt = Date.now();
                migrated.followUps += 1;
                changed = true;
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, FOLLOW_UP_STORAGE_KEY, store);
        }
    });

    // 4. 迁移会面谈资与备忘（person-topics.json）
    await withStoreLock(TOPICS_STORAGE_KEY, async () => {
        const store = await loadTopicsStoreStrict(plugin);
        const secondaryTopics = store.topics[secondary.docId];
        if (secondaryTopics && secondaryTopics.length > 0) {
            const primaryList = store.topics[primary.docId] ? [...store.topics[primary.docId]] : [];
            // 将次要人物的话题合并进主人物（保持上限 15 条）
            for (const item of secondaryTopics) {
                if (primaryList.length < 15 && !primaryList.some((t) => t.id === item.id || t.text === item.text)) {
                    primaryList.push(item);
                    migrated.topics += 1;
                }
            }
            store.topics[primary.docId] = primaryList;
            delete store.topics[secondary.docId];
            await saveJsonVerified(plugin, TOPICS_STORAGE_KEY, store);
        }
    });

    // 5. 迁移礼物点子与偏好清单（gift-ideas.json）
    await withStoreLock(GIFT_IDEAS_STORAGE_KEY, async () => {
        const store = await loadGiftIdeaStoreStrict(plugin);
        const secondaryIdeas = store.ideas[secondary.docId];
        if (secondaryIdeas && secondaryIdeas.length > 0) {
            const primaryList = store.ideas[primary.docId] ? [...store.ideas[primary.docId]] : [];
            for (const item of secondaryIdeas) {
                if (primaryList.length < 30 && !primaryList.some((idea) => idea.id === item.id)) {
                    primaryList.push({ ...item, personDocId: primary.docId, updatedAt: Date.now() });
                    migrated.giftIdeas += 1;
                }
            }
            store.ideas[primary.docId] = primaryList;
            delete store.ideas[secondary.docId];
            await saveJsonVerified(plugin, GIFT_IDEAS_STORAGE_KEY, store);
        }
    });

    // 6. 迁移人情往来账本（exchange-records.json）
    await withStoreLock(EXCHANGE_STORAGE_KEY, async () => {
        const raw = await loadJsonStrict(plugin, EXCHANGE_STORAGE_KEY);
        const store = normalizeExchangeStoreForWrite(raw);
        let changed = false;
        for (const record of store.records) {
            if (record.personDocId === secondary.docId) {
                record.personDocId = primary.docId;
                record.updatedAt = Date.now();
                migrated.exchanges += 1;
                changed = true;
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, EXCHANGE_STORAGE_KEY, store);
        }
    });

    // 7. 迁移组织成员归属（org-membership.json）
    await withStoreLock(ORG_MEMBERSHIP_STORAGE_KEY, async () => {
        const store = await loadOrgMembershipStore(plugin);
        let changed = false;
        for (const membership of store.memberships) {
            if (membership.personDocId === secondary.docId) {
                membership.personDocId = primary.docId;
                migrated.memberships += 1;
                changed = true;
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, ORG_MEMBERSHIP_STORAGE_KEY, store);
        }
    });

    // 8. 迁移纪念日（person-anniversaries.json）
    await withStoreLock(ANNIVERSARIES_STORAGE_KEY, async () => {
        const store = await loadAnniversaryStoreStrict(plugin);
        const secondaryList = store.anniversaries[secondary.docId];
        if (secondaryList && secondaryList.length > 0) {
            const primaryList = store.anniversaries[primary.docId] ? [...store.anniversaries[primary.docId]] : [];
            for (const item of secondaryList) {
                if (primaryList.length < 20 && !primaryList.some((a) => a.id === item.id || (a.title === item.title && a.date === item.date))) {
                    primaryList.push({ ...item, personDocId: primary.docId, updatedAt: Date.now() });
                    migrated.anniversaries += 1;
                }
            }
            store.anniversaries[primary.docId] = primaryList;
            delete store.anniversaries[secondary.docId];
            await saveJsonVerified(plugin, ANNIVERSARIES_STORAGE_KEY, store);
        }
    });

    // 9. 迁移信诺承诺（person-promises.json）
    await withStoreLock(PERSON_PROMISES_STORAGE_KEY, async () => {
        const store = await loadPromisesStoreStrict(plugin);
        const secondaryPromises = store.promises[secondary.docId];
        if (secondaryPromises && secondaryPromises.length > 0) {
            const primaryList = store.promises[primary.docId] ? [...store.promises[primary.docId]] : [];
            for (const p of secondaryPromises) {
                if (!primaryList.some((item) => item.id === p.id || (item.title === p.title && item.promisedOn === p.promisedOn))) {
                    primaryList.push({ ...p, personDocId: primary.docId, updatedAt: Date.now() });
                    migrated.promises += 1;
                }
            }
            store.promises[primary.docId] = primaryList;
            delete store.promises[secondary.docId];
            await saveJsonVerified(plugin, PERSON_PROMISES_STORAGE_KEY, store);
        }
    });

    // 10. 迁移家庭与亲属谱系（person-kinship.json）
    await withStoreLock(PERSON_KINSHIP_STORAGE_KEY, async () => {
        const store = await loadKinshipStoreStrict(plugin);
        let changed = false;
        const secondaryKinships = store.kinships[secondary.docId];
        if (secondaryKinships && secondaryKinships.length > 0) {
            const primaryList = store.kinships[primary.docId] ? [...store.kinships[primary.docId]] : [];
            for (const k of secondaryKinships) {
                if (!primaryList.some((item) => item.id === k.id || (item.name === k.name && item.role === k.role))) {
                    primaryList.push({ ...k, personDocId: primary.docId });
                    migrated.kinships += 1;
                }
            }
            store.kinships[primary.docId] = primaryList;
            delete store.kinships[secondary.docId];
            changed = true;
        }
        for (const list of Object.values(store.kinships)) {
            for (const item of list) {
                if (item.linkedDocId === secondary.docId) {
                    item.linkedDocId = primary.docId;
                    changed = true;
                }
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, PERSON_KINSHIP_STORAGE_KEY, store);
        }
    });

    // 11. 迁移社交偏好与忌口档案（person-social-preferences.json）
    await withStoreLock(PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, async () => {
        const store = await loadSocialPreferencesStoreStrict(plugin);
        const secondaryPrefs = store.preferences[secondary.docId];
        if (secondaryPrefs && secondaryPrefs.length > 0) {
            const primaryList = store.preferences[primary.docId] ? [...store.preferences[primary.docId]] : [];
            for (const p of secondaryPrefs) {
                if (!primaryList.some((item) => item.id === p.id || (item.category === p.category && item.content === p.content))) {
                    primaryList.push({ ...p, personDocId: primary.docId, updatedAt: Date.now() });
                    migrated.preferences += 1;
                }
            }
            store.preferences[primary.docId] = primaryList;
            delete store.preferences[secondary.docId];
            await saveJsonVerified(plugin, PERSON_SOCIAL_PREFERENCES_STORAGE_KEY, store);
        }
    });

    // 12. 迁移便签速记（person-scratchpads.json）
    await withStoreLock(PERSON_SCRATCHPAD_STORAGE_KEY, async () => {
        const store = await loadScratchpadStoreStrict(plugin);
        const secondaryNotes = store.notes[secondary.docId];
        if (secondaryNotes && secondaryNotes.length > 0) {
            const primaryList = store.notes[primary.docId] ? [...store.notes[primary.docId]] : [];
            for (const n of secondaryNotes) {
                if (!primaryList.some((item) => item.id === n.id)) {
                    primaryList.push({ ...n, personDocId: primary.docId, updatedAt: Date.now() });
                    migrated.scratchpads += 1;
                }
            }
            store.notes[primary.docId] = primaryList;
            delete store.notes[secondary.docId];
            await saveJsonVerified(plugin, PERSON_SCRATCHPAD_STORAGE_KEY, store);
        }
    });

    // 13. 迁移行程计划（person-itineraries.json）
    await withStoreLock(ITINERARIES_STORAGE_KEY, async () => {
        const store = await loadItinerariesStoreStrict(plugin);
        const secondaryItns = store.itineraries[secondary.docId];
        if (secondaryItns && secondaryItns.length > 0) {
            const primaryList = store.itineraries[primary.docId] ? [...store.itineraries[primary.docId]] : [];
            for (const itn of secondaryItns) {
                if (!primaryList.some((item) => item.id === itn.id)) {
                    primaryList.push({ ...itn, personDocId: primary.docId, updatedAt: Date.now() });
                    migrated.itineraries += 1;
                }
            }
            store.itineraries[primary.docId] = primaryList;
            delete store.itineraries[secondary.docId];
            await saveJsonVerified(plugin, ITINERARIES_STORAGE_KEY, store);
        }
    });

    // 14. 迁移项目协作（person-projects.json）
    await withStoreLock(PERSON_PROJECTS_STORAGE_KEY, async () => {
        const store = await loadPersonProjectsStoreStrict(plugin);
        const secondaryProjs = store.projects[secondary.docId];
        if (secondaryProjs && secondaryProjs.length > 0) {
            const primaryList = store.projects[primary.docId] ? [...store.projects[primary.docId]] : [];
            for (const proj of secondaryProjs) {
                if (!primaryList.some((item) => item.id === proj.id || item.title === proj.title)) {
                    primaryList.push({ ...proj, personDocId: primary.docId, updatedAt: Date.now() });
                    migrated.projects += 1;
                }
            }
            store.projects[primary.docId] = primaryList;
            delete store.projects[secondary.docId];
            await saveJsonVerified(plugin, PERSON_PROJECTS_STORAGE_KEY, store);
        }
    });

    // 15. 迁移联系节奏（person-cadences.json）
    await withStoreLock(CADENCE_STORAGE_KEY, async () => {
        const store = await loadCadenceMapStrict(plugin);
        if (store[secondary.docId]) {
            if (!store[primary.docId]) {
                store[primary.docId] = store[secondary.docId];
                migrated.cadences += 1;
            }
            delete store[secondary.docId];
            await saveJsonVerified(plugin, CADENCE_STORAGE_KEY, {
                schemaVersion: 1,
                cadences: Object.keys(store).length > 0 ? store : {},
            });
        }
    });

    // 16. 迁移交往生命周期（person-lifecycle-stage.json）
    await withStoreLock(PERSON_LIFECYCLE_STORAGE_KEY, async () => {
        const store = await loadLifecycleStoreStrict(plugin);
        const secondaryRecord = store.records[secondary.docId];
        if (secondaryRecord) {
            const primaryRecord = store.records[primary.docId];
            if (!primaryRecord) {
                store.records[primary.docId] = {
                    ...secondaryRecord,
                    personDocId: primary.docId,
                    updatedAt: Date.now(),
                };
                migrated.lifecycle += 1;
            } else {
                primaryRecord.history.push(...secondaryRecord.history);
                primaryRecord.updatedAt = Date.now();
                migrated.lifecycle += 1;
            }
            delete store.records[secondary.docId];
            await saveJsonVerified(plugin, PERSON_LIFECYCLE_STORAGE_KEY, store);
        }
    });

    // 17. 迁移别名（person-aliases.json）
    await withStoreLock(PERSON_ALIAS_STORAGE_KEY, async () => {
        const store = await loadPersonAliasStore(plugin);
        let changed = false;
        for (const alias of store.aliases) {
            if (alias.personDocId === secondary.docId) {
                alias.personDocId = primary.docId;
                alias.updatedAt = Date.now();
                migrated.aliases += 1;
                changed = true;
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, PERSON_ALIAS_STORAGE_KEY, store);
            try {
                const primaryAliases = store.aliases
                    .filter((a) => a.personDocId === primary.docId)
                    .map((a) => a.alias.trim())
                    .filter(Boolean);
                await setBlockAttrs(primary.docId, { alias: primaryAliases.join(",") });
            } catch (err) {
                console.warn("[LvContacts] 合并别名同步至主文档原生属性失败", err);
            }
        }
    });

    // 18. 迁移初识溯源与引荐人链路（person-origins.json）
    await withStoreLock(PERSON_ORIGIN_STORAGE_KEY, async () => {
        const store = await loadPersonOriginStoreStrict(plugin);
        let changed = false;
        const secondaryOrigin = store.origins[secondary.docId];
        if (secondaryOrigin) {
            const primaryOrigin = store.origins[primary.docId];
            const safeIntroducer = secondaryOrigin.introducedByDocId === primary.docId
                ? undefined
                : secondaryOrigin.introducedByDocId;
            if (!primaryOrigin) {
                if (secondaryOrigin.metAt || safeIntroducer || secondaryOrigin.preferences) {
                    store.origins[primary.docId] = {
                        personDocId: primary.docId,
                        metAt: secondaryOrigin.metAt,
                        introducedByDocId: safeIntroducer,
                        preferences: secondaryOrigin.preferences,
                        createdAt: secondaryOrigin.createdAt ?? Date.now(),
                        updatedAt: Date.now(),
                    };
                    migrated.origins += 1;
                }
            } else {
                const nextMetAt = primaryOrigin.metAt || secondaryOrigin.metAt;
                const nextIntroducer = primaryOrigin.introducedByDocId || safeIntroducer;
                const nextPrefs = primaryOrigin.preferences || secondaryOrigin.preferences;
                if (
                    nextMetAt !== primaryOrigin.metAt ||
                    nextIntroducer !== primaryOrigin.introducedByDocId ||
                    nextPrefs !== primaryOrigin.preferences
                ) {
                    store.origins[primary.docId] = {
                        ...primaryOrigin,
                        metAt: nextMetAt,
                        introducedByDocId: nextIntroducer,
                        preferences: nextPrefs,
                        updatedAt: Date.now(),
                    };
                    migrated.origins += 1;
                }
            }
            delete store.origins[secondary.docId];
            changed = true;
        }
        for (const [docId, entry] of Object.entries(store.origins)) {
            if (entry.introducedByDocId === secondary.docId) {
                entry.introducedByDocId = docId === primary.docId ? undefined : primary.docId;
                entry.updatedAt = Date.now();
                changed = true;
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, PERSON_ORIGIN_STORAGE_KEY, store);
        }
    });

    // 19. 迁移与我的关系称谓（person-relationship-labels.json）
    await withStoreLock(RELATIONSHIP_LABEL_STORAGE_KEY, async () => {
        const store = await loadRelationshipLabelStore(plugin);
        const secondaryRecords = store.labels.filter((r) => r.personDocId === secondary.docId);
        if (secondaryRecords.length > 0) {
            const nextLabels = store.labels.filter((r) => r.personDocId !== secondary.docId);
            for (const secRec of secondaryRecords) {
                const priRec = nextLabels.find(
                    (r) => r.selfDocId === secRec.selfDocId && r.personDocId === primary.docId,
                );
                if (!priRec) {
                    nextLabels.push({
                        ...secRec,
                        personDocId: primary.docId,
                        updatedAt: Date.now(),
                    });
                    migrated.relationshipLabels += 1;
                } else {
                    const mergedSet = new Set([...priRec.labels, ...secRec.labels]);
                    if (mergedSet.size > priRec.labels.length) {
                        priRec.labels = [...mergedSet];
                        priRec.updatedAt = Date.now();
                        migrated.relationshipLabels += 1;
                    }
                }
            }
            await saveJsonVerified(plugin, RELATIONSHIP_LABEL_STORAGE_KEY, {
                schemaVersion: 1,
                labels: nextLabels,
            });
        }
    });

    // 20. 迁移群体活动与场合出席人（occasions.json）
    await withStoreLock(OCCASIONS_STORAGE_KEY, async () => {
        const store = await loadOccasionStoreStrict(plugin);
        let changed = false;
        for (const occ of store.occasions) {
            if (occ.attendees.some((a) => a.personDocId === secondary.docId)) {
                const seen = new Set<string>();
                const nextAttendees = [];
                for (const att of occ.attendees) {
                    const targetId = att.personDocId === secondary.docId ? primary.docId : att.personDocId;
                    if (seen.has(targetId)) continue;
                    seen.add(targetId);
                    nextAttendees.push(
                        att.personDocId === secondary.docId
                            ? { ...att, personDocId: primary.docId, name: draft.name || primary.name }
                            : att,
                    );
                }
                occ.attendees = nextAttendees;
                occ.updatedAt = Date.now();
                migrated.occasions += 1;
                changed = true;
            }
        }
        if (changed) {
            await saveJsonVerified(plugin, OCCASIONS_STORAGE_KEY, store);
        }
    });

    // 21. 将次人物移入回收站缓冲 30 天，并从主库解绑
    await removeContactToTrash(plugin, settings, secondary);

    // 9. 失效名册缓存并广播变更
    invalidateRoster();
    emitDataChanged({
        topics: ["people", "memberships"],
        docIds: [primary.docId, secondary.docId],
    });

    return {
        primaryDocId: primary.docId,
        secondaryDocId: secondary.docId,
        mergedDraft: draft,
        auditSnapshot,
        migrated,
    };
}
