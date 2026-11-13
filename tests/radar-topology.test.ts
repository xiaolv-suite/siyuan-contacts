import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRadarPositions } from "../src/domain/radar-topology.ts";

test("computeRadarPositions：单节点落在正上方", () => {
    const pos = computeRadarPositions(1, 360, 220, 80);
    assert.equal(pos.length, 1);
    assert.equal(pos[0].x, 180);
    assert.equal(pos[0].y, 110 - 80); // 30
});

test("computeRadarPositions：4 节点均匀分布四周", () => {
    const pos = computeRadarPositions(4, 360, 220, 80);
    assert.equal(pos.length, 4);
    // 0: top (180, 30)
    assert.equal(pos[0].x, 180);
    assert.equal(pos[0].y, 30);
    // 1: right (180 + 80, 110)
    assert.equal(pos[1].x, 260);
    assert.equal(pos[1].y, 110);
    // 2: bottom (180, 110 + 80)
    assert.equal(pos[2].x, 180);
    assert.equal(pos[2].y, 190);
    // 3: left (180 - 80, 110)
    assert.equal(pos[3].x, 100);
    assert.equal(pos[3].y, 110);
});

test("computeRadarPositions：边界处理", () => {
    assert.deepEqual(computeRadarPositions(0), []);
    assert.equal(computeRadarPositions(100).length, 12, "上限不超过 12 个节点以保持清晰");
});
