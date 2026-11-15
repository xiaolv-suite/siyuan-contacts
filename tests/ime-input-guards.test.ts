import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * IME 合成期守卫契约（R18 全生态专项 / R19 固化为回归保护）：
 * 输入框挂载的 Enter/Escape/Arrow 键盘流必须在 isComposing || keyCode === 229 时
 * 整体让路给输入法，防止拼音候选确认键被误判为提交/导航（16 处）。
 */
const guard = /(?:e|event)\.isComposing\s*\|\|\s*(?:e|event)\.keyCode === 229/g;
const read = (rel: string): string => readFileSync(resolve(import.meta.dirname, "..", rel), "utf8");
const count = (src: string): number => (src.match(guard) || []).length;

test("IME 守卫: Workbench 全局联系人搜索 Enter 提交让路", () => {
    assert.equal(count(read("src/components/Workbench.svelte")), 1);
});

test("IME 守卫: OrgMultiSelect 合成期整个键盘导航让路 (Escape/Arrow/Enter)", () => {
    assert.equal(count(read("src/components/org/OrgMultiSelect.svelte")), 1);
});

test("IME 守卫: PersonPicker 搜索框候选导航与选中让路", () => {
    assert.equal(count(read("src/components/people/PersonPicker.svelte")), 1);
});

test("IME 守卫: PersonAliases 别名新增让路", () => {
    assert.equal(count(read("src/components/people/PersonAliases.svelte")), 1);
});

test("IME 守卫: RelationshipLabels 关系称谓保存让路", () => {
    assert.equal(count(read("src/components/people/RelationshipLabels.svelte")), 1);
});

test("IME 守卫: ContextPanel 随手记快捷录入让路", () => {
    assert.equal(count(read("src/components/ContextPanel.svelte")), 1);
});

test("IME 守卫: OrgManagerDialog 组织重命名保存让路", () => {
    assert.equal(count(read("src/components/org/OrgManagerDialog.svelte")), 1);
});

test("IME 守卫: PeopleView 移动端与桌面双搜索框让路 (2 处)", () => {
    assert.equal(count(read("src/components/people/PeopleView.svelte")), 2);
});

test("IME 守卫: PersonDetail 七类输入提交让路 (渠道×2/事实/谈资/礼物/纪念日/项目)", () => {
    assert.equal(count(read("src/components/people/PersonDetail.svelte")), 7);
});
