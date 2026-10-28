/**
 * 人脉交往生命周期漏斗与转化分析引擎（E-56）：
 * 纯函数图表域模型。统计全库人脉在五大交往阶段（初相识、常交流、共合作、核心挚友、沉睡维护）的分布与成熟度，
 * 提供阶段漏斗比例、梯队转化率与结构健康度洞察建议。
 * 纯函数：无 DOM、无 IO，node --test 直接可测。
 */
import type { ContactSummary } from "./person.ts";
import {
    LIFECYCLE_STAGES,
    type RelationshipStageKey,
    type StageMeta,
} from "./lifecycle-stage.ts";

export interface LifecycleFunnelStageStat {
    key: RelationshipStageKey;
    meta: StageMeta;
    count: number;
    percentage: number;
    personDocIds: string[];
    personItemIds: string[];
}

export interface LifecycleFunnelReport {
    totalContacts: number;
    stages: LifecycleFunnelStageStat[];
    activeProgressCount: number; // 处于升温及深度合作阶段人数 (connection + collaboration + close_ally)
    activeProgressPercentage: number;
    healthyMaturityRate: number; // 深度共创与核心盟友占比 (collaboration + close_ally) / totalContacts
    keyInsight: string;
}

/**
 * 纯函数：计算全库人脉交往生命周期漏斗统计与洞察
 */
export function computeLifecycleFunnel(
    people: readonly ContactSummary[],
    stagesMap: Readonly<Record<string, RelationshipStageKey>> = {},
): LifecycleFunnelReport {
    const buckets: Record<RelationshipStageKey, { docIds: string[]; itemIds: string[] }> = {
        acquaintance: { docIds: [], itemIds: [] },
        connection: { docIds: [], itemIds: [] },
        collaboration: { docIds: [], itemIds: [] },
        close_ally: { docIds: [], itemIds: [] },
        dormant: { docIds: [], itemIds: [] },
    };

    for (const person of people) {
        const stage = stagesMap[person.docId] ?? "acquaintance";
        buckets[stage].docIds.push(person.docId);
        buckets[stage].itemIds.push(person.itemId);
    }

    const totalContacts = people.length;

    const stages: LifecycleFunnelStageStat[] = LIFECYCLE_STAGES.map((meta) => {
        const bucket = buckets[meta.key];
        const count = bucket.docIds.length;
        const percentage = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0;
        return {
            key: meta.key,
            meta,
            count,
            percentage,
            personDocIds: bucket.docIds,
            personItemIds: bucket.itemIds,
        };
    });

    const activeProgressCount =
        buckets.connection.docIds.length +
        buckets.collaboration.docIds.length +
        buckets.close_ally.docIds.length;
    const activeProgressPercentage = totalContacts > 0 ? Math.round((activeProgressCount / totalContacts) * 100) : 0;

    const highValueCount = buckets.collaboration.docIds.length + buckets.close_ally.docIds.length;
    const healthyMaturityRate = totalContacts > 0 ? Math.round((highValueCount / totalContacts) * 100) : 0;

    let keyInsight = "";
    if (totalContacts === 0) {
        keyInsight = "当前人脉库尚无联系人，快去添加人脉开启生命周期管理吧。";
    } else if (buckets.acquaintance.docIds.length / totalContacts > 0.7) {
        keyInsight = `超过 70% 的人脉处于初相识阶段（${buckets.acquaintance.docIds.length} 人），建议针对高意向伙伴主动发起交流推进互信。`;
    } else if (healthyMaturityRate >= 25) {
        keyInsight = `深度盟友与合作人脉占比达 ${healthyMaturityRate}%，人脉资产成熟度与价值共创处于优良水平。`;
    } else {
        keyInsight = `人脉梯队分布健康，已有 ${activeProgressCount} 位伙伴稳步升温推进中。`;
    }

    return {
        totalContacts,
        stages,
        activeProgressCount,
        activeProgressPercentage,
        healthyMaturityRate,
        keyInsight,
    };
}
