import assert from "node:assert/strict";
import test from "node:test";
import {
    generateAnniversaryGreeting,
    extractUpcomingMilestones,
    type ContactAnniversaryMilestone,
} from "../src/domain/anniversary-milestones.ts";
import type { AnniversaryItem } from "../src/domain/anniversaries.ts";

function makeAnniv(category: AnniversaryItem["category"], date: string, title: string, remindDisabled = false): AnniversaryItem {
    return {
        id: `ann-${Math.random().toString(36).slice(2, 8)}`,
        personDocId: "doc-1",
        title,
        category,
        date,
        isLunar: false,
        remindDisabled,
        createdAt: 1000,
        updatedAt: 1000,
    };
}

test("generateAnniversaryGreeting：根据分类与年数生成个性化温润祝贺文案", () => {
    // 1. 相识纪念
    const g1 = generateAnniversaryGreeting("acquaintance", "林总", 3);
    assert.match(g1, /转眼已与林总相识3载/);
    assert.match(g1, /感谢关照与支持/);

    // 2. 结婚纪念
    const g2 = generateAnniversaryGreeting("wedding", "李四", 5);
    assert.match(g2, /祝二位第 5 周年快乐/);
    assert.match(g2, /相濡以沫/);

    // 3. 合作纪念
    const g3 = generateAnniversaryGreeting("work", "王总工", 2);
    assert.match(g3, /祝王总工入职\/合作第 2 周年快乐/);
    assert.match(g3, /携手同行创佳绩/);

    // 4. 特殊纪念
    const g4 = generateAnniversaryGreeting("memorial", "赵院士", undefined, "国家实验室奠基");
    assert.match(g4, /祝赵院士【国家实验室奠基】纪念日快乐/);
});

test("extractUpcomingMilestones：提取窗口内纪念日并按日期升序排列", () => {
    // 假设今天为 2026-10-29
    const now = new Date(2026, 9, 29); // 2026-10-29

    const a1 = makeAnniv("acquaintance", "2020-10-29", "初次结识", false); // 今天 10-29，6周年
    const a2 = makeAnniv("work", "2023-11-05", "项目立项签约", false);       // 7天后 11-05，3周年
    const a3 = makeAnniv("wedding", "2015-12-25", "金婚相伴", false);         // 57天后（超出14天窗口）
    const a4 = makeAnniv("other", "2022-10-31", "免打扰日期", true);          // 2天后但已禁用提醒

    const list = extractUpcomingMilestones([a1, a2, a3, a4], "陈总", now, 14);

    assert.equal(list.length, 2);

    // 第一个为今天 10-29
    assert.equal(list[0].title, "初次结识");
    assert.equal(list[0].isToday, true);
    assert.equal(list[0].daysUntil, 0);
    assert.equal(list[0].yearsCount, 6);
    assert.match(list[0].congratulatoryText, /转眼已与陈总相识6载/);

    // 第二个为 11-05（7天后）
    assert.equal(list[1].title, "项目立项签约");
    assert.equal(list[1].isToday, false);
    assert.equal(list[1].daysUntil, 7);
    assert.equal(list[1].yearsCount, 3);
});
