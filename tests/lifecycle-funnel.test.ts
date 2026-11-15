import assert from "node:assert/strict";
import test from "node:test";
import {
    computeLifecycleFunnel,
    type LifecycleFunnelReport,
} from "../src/domain/lifecycle-funnel.ts";
import type { ContactSummary } from "../src/domain/person.ts";
import type { RelationshipStageKey } from "../src/domain/lifecycle-stage.ts";

function makePerson(docId: string, name: string): ContactSummary {
    return {
        docId,
        itemId: `item-${docId}`,
        name,
        phone: "",
        email: "",
        wechat: "",
        website: "",
        birthday: "",
        isLunar: false,
        group: "",
        tags: [],
        relatedItemIds: [],
    };
}

test("computeLifecycleFunnel：各阶段人数聚合、百分比与高价值成熟度计算", () => {
    const people = [
        makePerson("p1", "张三"),
        makePerson("p2", "李四"),
        makePerson("p3", "王五"),
        makePerson("p4", "赵六"),
        makePerson("p5", "钱七"),
    ];

    const stagesMap: Record<string, RelationshipStageKey> = {
        p1: "acquaintance",
        p2: "connection",
        p3: "collaboration",
        p4: "close_ally",
        p5: "dormant",
    };

    const report = computeLifecycleFunnel(people, stagesMap);

    assert.equal(report.totalContacts, 5);
    assert.equal(report.stages.length, 5);

    // 每个阶段各 1 人，占比 20%
    for (const stage of report.stages) {
        assert.equal(stage.count, 1);
        assert.equal(stage.percentage, 20);
    }

    // 活跃推进中人数：connection + collaboration + close_ally = 3人 (60%)
    assert.equal(report.activeProgressCount, 3);
    assert.equal(report.activeProgressPercentage, 60);

    // 高价值成熟度：collaboration + close_ally = 2人 (40%)
    assert.equal(report.healthyMaturityRate, 40);
    assert.match(report.keyInsight, /深度盟友与合作人脉占比达 40%/);
});

test("computeLifecycleFunnel：未显式登记阶段的人选默认归为初相识", () => {
    const people = [
        makePerson("p1", "新朋友1"),
        makePerson("p2", "新朋友2"),
        makePerson("p3", "新朋友3"),
    ];

    const report = computeLifecycleFunnel(people, {});

    assert.equal(report.totalContacts, 3);
    const acqStage = report.stages.find((s) => s.key === "acquaintance");
    assert.equal(acqStage?.count, 3);
    assert.equal(acqStage?.percentage, 100);
    assert.equal(report.healthyMaturityRate, 0);
    assert.match(report.keyInsight, /超过 70% 的人脉处于初相识阶段/);
});

test("computeLifecycleFunnel：空库防御", () => {
    const report = computeLifecycleFunnel([], {});

    assert.equal(report.totalContacts, 0);
    assert.equal(report.activeProgressCount, 0);
    assert.equal(report.healthyMaturityRate, 0);
    assert.match(report.keyInsight, /当前人脉库尚无联系人/);
});
