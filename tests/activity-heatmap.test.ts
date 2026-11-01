import assert from "node:assert/strict";
import test from "node:test";
import { computeActivityHeatmap } from "../src/domain/activity-heatmap.ts";
import type { InteractionEvent } from "../src/domain/interactions.ts";
import type { ContactSummary } from "../src/domain/person.ts";

test("computeActivityHeatmap：生成 52 周网格并正确聚合互动数据", () => {
    const mockPeople: ContactSummary[] = [
        {
            docId: "doc-1",
            itemId: "item-1",
            name: "张总",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "",
            tags: [],
            relatedItemIds: [],
        },
        {
            docId: "doc-2",
            itemId: "item-2",
            name: "李教授",
            phone: "",
            email: "",
            wechat: "",
            website: "",
            birthday: "",
            isLunar: false,
            group: "",
            tags: [],
            relatedItemIds: [],
        },
    ];

    const refDate = "2026-10-28"; // 周三
    const mockEvents: InteractionEvent[] = [
        // 2026-10-28: 2 次
        {
            id: "ev-1",
            personDocId: "doc-1",
            occurredAt: 1730073600000,
            localDate: "2026-10-28",
            source: "manual",
            note: "讨论业务合作",
        },
        {
            id: "ev-2",
            personDocId: "doc-2",
            occurredAt: 1730073600000,
            localDate: "2026-10-28",
            source: "manual",
            note: "学术探讨",
        },
        // 2026-10-27: 1 次
        {
            id: "ev-3",
            personDocId: "doc-1",
            occurredAt: 1729987200000,
            localDate: "2026-10-27",
            source: "manual",
            note: "电话跟进",
        },
        // 2026-10-26: 7 次（超高频测试 level 4）
        ...Array.from({ length: 7 }).map((_, i) => ({
            id: `ev-high-${i}`,
            personDocId: "doc-1",
            occurredAt: 1729900800000,
            localDate: "2026-10-26",
            source: "manual" as const,
        })),
        // 墓碑数据：应被过滤
        {
            id: "ev-deleted",
            personDocId: "doc-1",
            occurredAt: 1730073600000,
            localDate: "2026-10-28",
            source: "manual",
            tombstone: true,
        } as unknown as InteractionEvent,
    ];

    const data = computeActivityHeatmap(mockEvents, mockPeople, refDate, 52);

    assert.equal(data.weeks.length, 52, "应生成 52 列周网格");
    for (const w of data.weeks) {
        assert.equal(w.length, 7, "每周应恰好包含 7 天（周一到周日）");
    }

    assert.equal(data.totalEvents, 10, "有效互动总数应为 10（2 + 1 + 7）");
    assert.equal(data.activeDays, 3, "活跃天数应为 3 天（10-26, 10-27, 10-28）");
    assert.equal(data.maxDayCount, 7, "单日最高互动数应为 7");
    assert.equal(data.currentStreak, 3, "连续打卡 3 天");
    assert.equal(data.longestStreak, 3, "最长连续打卡 3 天");

    // 检查最后一周的数据
    const lastWeek = data.weeks[data.weeks.length - 1];
    // 2026-10-26 是周一 (index 0)
    const mon = lastWeek[0];
    assert.equal(mon.dateKey, "2026-10-26");
    assert.equal(mon.count, 7);
    assert.equal(mon.level, 4, ">=6 次互动应为最高等级 4");

    // 2026-10-28 是周三 (index 2)
    const wed = lastWeek[2];
    assert.equal(wed.dateKey, "2026-10-28");
    assert.equal(wed.count, 2);
    assert.equal(wed.level, 2, "2 次互动对应等级 2");
    assert.equal(wed.peopleCount, 2, "涉及张总与李教授两位联系人");
    assert(wed.personNames.includes("张总"));
    assert(wed.personNames.includes("李教授"));
    assert.equal(wed.personDocIds.length, 2, "应记录当日互动联系人的稳定 docId 供点击下钻");

    // 2026-10-29 是周四 (未来日期，应为 isFuture)
    const thu = lastWeek[3];
    assert.equal(thu.isFuture, true, "基准日之后应标记为未来日期");
    assert.deepEqual(thu.personDocIds, []);

    // 验证气泡所需数据完整性
    assert.ok(wed.personNames.length > 0, "活跃日气泡应包含联系人姓名数组");
    assert.equal(wed.count, 2, "活跃日气泡应包含准确互动计数");
    assert.equal(mon.peopleCount, 1, "超高频测试日应正确统计参与人数");
});
