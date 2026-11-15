import { test } from "node:test";
import assert from "node:assert/strict";
import {
    inferDunbarTier,
    computeDunbarWarmthDecay,
    DUNBAR_CIRCLE_CONFIGS,
} from "../src/domain/cooling-radar.ts";
import {
    computeSocialRadar,
    deriveSocialStrategyAdvice,
    type SocialRadarInput,
} from "../src/domain/social-radar.ts";
import type { ContactSummary } from "../src/domain/person.ts";

test("Station 7: Dunbar Circles Dynamic Decay & Person Cognitive Radar Engine", async (t) => {
    await t.test("1. 邓巴圈层智能推断 (inferDunbarTier)", () => {
        // 家人关系直通 core_5
        assert.equal(inferDunbarTier({ relationshipLabel: "妻子", group: "家属" }), "core_5");
        assert.equal(inferDunbarTier({ group: "核心合伙人", totalInteractions: 10 }), "core_5");

        // 星标或好友归入 close_15
        assert.equal(inferDunbarTier({ isStarred: true, group: "大学同学" }), "close_15");
        assert.equal(inferDunbarTier({ group: "挚友", totalInteractions: 5 }), "close_15");

        // 同事归入 active_50
        assert.equal(inferDunbarTier({ group: "研发同事", totalInteractions: 4 }), "active_50");

        // 仅有 1 次接触归入 stable_150
        assert.equal(inferDunbarTier({ totalInteractions: 1 }), "stable_150");

        // 零互动且无特定组归入 loose_broad
        assert.equal(inferDunbarTier({ totalInteractions: 0 }), "loose_broad");
    });

    await t.test("2. 邓巴人际温度指数与动态衰减模型 (computeDunbarWarmthDecay)", () => {
        // 核心圈 (core_5，推荐节奏 14 天)
        // 刚联系 3 天：热络 (fresh)
        const resFresh = computeDunbarWarmthDecay(3, "core_5");
        assert.equal(resFresh.temperature, "fresh");
        assert.equal(resFresh.isOverdue, false);
        assert.equal(resFresh.overdueDays, 0);
        assert.ok(resFresh.warmthScore >= 80);

        // 刚联系 12 天：舒适正常 (comfortable)
        const resComfort = computeDunbarWarmthDecay(12, "core_5");
        assert.equal(resComfort.temperature, "comfortable");
        assert.equal(resComfort.isOverdue, false);

        // 逾期到 18 天：微凉 (cooling)
        const resCooling = computeDunbarWarmthDecay(18, "core_5");
        assert.equal(resCooling.temperature, "cooling");
        assert.equal(resCooling.isOverdue, true);
        assert.equal(resCooling.overdueDays, 4);

        // 逾期到 30 天：渐冻 (cold)
        const resCold = computeDunbarWarmthDecay(30, "core_5");
        assert.equal(resCold.temperature, "cold");
        assert.equal(resCold.isOverdue, true);
        assert.ok(resCold.actionAdvice.includes("深度电话交流或约见"));

        // 未知/从未联系安全防御
        const resUnknown = computeDunbarWarmthDecay(undefined, "core_5");
        assert.equal(resUnknown.temperature, "frozen");
        assert.equal(resUnknown.isOverdue, true);
        assert.equal(resUnknown.warmthScore, 10);
    });

    await t.test("3. 六维社交雷达交往策略生成 (deriveSocialStrategyAdvice)", () => {
        // 场景 A：履约不足 + 网络广但记忆浅
        const adviceA = deriveSocialStrategyAdvice({
            recency: 80,
            connectivity: 75,
            memoryDepth: 30, // 记忆浅
            commitment: 40,  // 存在逾期跟进
            frequency: 50,
            coOccurrence: 40,
        });
        assert.ok(adviceA.some(a => a.includes("优先闭环已承诺的待办事项")));
        assert.ok(adviceA.some(a => a.includes("多倾听对方业务痛点")));

        // 场景 B：记忆基底深但长期未联系
        const adviceB = deriveSocialStrategyAdvice({
            recency: 20, // 长期未联系
            connectivity: 40,
            memoryDepth: 80, // 记忆深度
            commitment: 80,
            frequency: 40,
            coOccurrence: 30,
        });
        assert.ok(adviceB.some(a => a.includes("历史共同话题或合伙项目轻松破冰")));
    });

    await t.test("4. computeSocialRadar 全要素装配与多边形闭环", () => {
        const mockPerson: ContactSummary = {
            docId: "20261108100000-person1",
            itemId: "p1",
            name: "李总",
            group: "核心合伙人",
            tags: ["投资", "半导体"],
            relatedItemIds: ["r1", "r2", "r3"],
            updatedAt: "2026-11-08",
        };

        const input: SocialRadarInput = {
            person: mockPerson,
            lastContactDays: 5,
            totalInteractions: 8,
            facts: [{ id: "f1", personDocId: "p1", content: "喜欢普洱茶", createdAt: 0 }],
            topics: [{ id: "t1", personDocId: "p1", topic: "B轮融资", createdAt: 0 }],
            followUps: [{ id: "fo1", personDocId: "p1", title: "发送财务模型", status: "done", createdAt: 0 }],
            coAttendanceCount: 2,
            projectCount: 1,
        };

        const assessment = computeSocialRadar(input);
        assert.ok(assessment.overallScore >= 60);
        assert.ok(assessment.actionStrategies.length > 0);
        assert.ok(assessment.polygonPoints.split(" ").length === 6);
        assert.equal(assessment.axesCoordinates.length, 6);
    });
});
