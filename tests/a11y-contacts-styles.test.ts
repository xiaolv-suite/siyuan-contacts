/**
 * 小驴人脉 · 无障碍与高对比度样式契约自动化测试
 * 确保 forced-colors 系统颜色映射、prefers-contrast 增强边框以及关键视觉标记不退化。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "..", "src");

test("小驴人脉 · 设计令牌声明完整的 forced-colors 系统变量映射", () => {
    const tokensContent = fs.readFileSync(path.join(SRC, "style", "_tokens.scss"), "utf8");
    assert.match(tokensContent, /@media \(forced-colors: active\)/);
    assert.match(tokensContent, /--lvct-accent:\s*Highlight/);
    assert.match(tokensContent, /--lvct-on-accent:\s*HighlightText/);
    assert.match(tokensContent, /--lvct-bg-app:\s*Canvas/);
    assert.match(tokensContent, /--lvct-bg-surface:\s*Canvas/);
    assert.match(tokensContent, /--lvct-text-1:\s*CanvasText/);
    assert.match(tokensContent, /--lvct-border-subtle:\s*CanvasText/);
    assert.match(tokensContent, /--lvct-focus-ring-color:\s*Highlight/);

    // Host bridge variables
    assert.match(tokensContent, /--b3-theme-primary:\s*Highlight;/);
    assert.match(tokensContent, /--b3-theme-on-primary:\s*HighlightText;/);
    assert.match(tokensContent, /--b3-theme-background:\s*Canvas;/);
    assert.match(tokensContent, /--b3-theme-surface:\s*Canvas;/);
    assert.match(tokensContent, /--b3-theme-on-background:\s*CanvasText;/);
    assert.match(tokensContent, /--b3-border-color:\s*CanvasText;/);
});

test("小驴人脉 · 公共控件层在 forced-colors 下强制卡片、弹窗与按钮实体边框", () => {
    const controlsContent = fs.readFileSync(path.join(SRC, "style", "_controls.scss"), "utf8");
    assert.match(controlsContent, /@media \(forced-colors: active\)/);
    assert.match(controlsContent, /\.lvct-sheet,\s*[\s\S]*\.lvct-person-card,\s*[\s\S]*border:\s*1px solid CanvasText/);
    assert.match(controlsContent, /\.lvct-dialog-panel,\s*[\s\S]*border:\s*2px solid CanvasText/);
    assert.match(controlsContent, /outline-color:\s*Highlight/);
});

test("小驴人脉 · 独立弹窗隔离层 (body-level .b3-dialog) 在 forced-colors 下确保高对比度容器与交互元素", () => {
    const controlsContent = fs.readFileSync(path.join(SRC, "style", "_controls.scss"), "utf8");
    assert.match(controlsContent, /\.b3-dialog:has\(\.b3-dialog__content\)/);
    assert.match(controlsContent, /\.b3-dialog__container\s*\{[^}]*border:\s*2px solid CanvasText !important;/);
    assert.match(controlsContent, /\.b3-dialog__header\s*\{[^}]*border-bottom:\s*1px solid CanvasText !important;/);
    assert.match(controlsContent, /\.b3-dialog__action\s*\{[^}]*border-top:\s*1px solid CanvasText !important;/);
    assert.match(controlsContent, /\.b3-button--primary,\s*#confirmDialogConfirmBtn\s*\{[^}]*background:\s*Highlight !important;/);
    assert.match(controlsContent, /:where\(button, a, input, select, textarea, \[tabindex="0"\]\):focus-visible,\s*:focus-visible\s*\{[^}]*outline:\s*2px solid Highlight !important;/);
});

test("小驴人脉 · 关键视觉标记与状态点在强制色模式下禁止系统擦除 (forced-color-adjust: none)", () => {
    const controlsContent = fs.readFileSync(path.join(SRC, "style", "_controls.scss"), "utf8");
    assert.match(controlsContent, /\.lvct-avatar,\s*[\s\S]*\.lvct-status-dot,\s*[\s\S]*forced-color-adjust:\s*none/);
});

test("小驴人脉 · 用户高对比度偏好 (prefers-contrast: more) 提供强化边框与焦点环", () => {
    const controlsContent = fs.readFileSync(path.join(SRC, "style", "_controls.scss"), "utf8");
    assert.match(controlsContent, /@media \(prefers-contrast: more\)/);
    assert.match(controlsContent, /--lvct-border-subtle:\s*color-mix\(in srgb,\s*var\(--lvct-text-1\)\s*45%,\s*transparent\)/);
    assert.match(controlsContent, /:where\(button, a, input, select, textarea, \[tabindex="0"\]\):focus-visible\s*\{[^}]*outline:\s*3px solid var\(--lvct-accent\)/);
    assert.match(controlsContent, /\.b3-dialog__container\s*\{[^}]*border:\s*2px solid var\(--b3-theme-on-background,\s*currentColor\) !important;/);
});

test("小驴人脉 · 空态操作按钮与全局状态通知条统一对齐全胶囊体系与 1.6 细线图标规范", () => {
    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /\.lvct-empty__actions\s*\{[\s\S]*\.b3-button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(indexScss, /\.lvct-notice\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(indexScss, /\.lvct-notice__action\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    const viewStateSvelte = fs.readFileSync(path.join(SRC, "components", "ViewState.svelte"), "utf8");
    assert.match(viewStateSvelte, /strokeWidth=\{1\.6\}/);
    assert.doesNotMatch(viewStateSvelte, /strokeWidth=\{1\.8\}/);

    const statusNoticeSvelte = fs.readFileSync(path.join(SRC, "components", "StatusNotice.svelte"), "utf8");
    assert.match(statusNoticeSvelte, /strokeWidth=\{1\.6\}/);
});

test("小驴人脉 · 信诺履约本、名片弹窗与批量阶段设置对齐一体化指标条、实体状态点与全胶囊交互规范", () => {
    const promisesSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonPromisesLedger.svelte"), "utf8");
    assert.match(promisesSvelte, /\.lvct-promises-ledger__metrics\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*14px\)/);
    assert.match(promisesSvelte, /\.metric-card\s*\{[\s\S]*&:not\(:last-child\)::after\s*\{/);
    assert.match(promisesSvelte, /\.item-status-tag\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(promisesSvelte, /\.item-status-tag\s*\{[\s\S]*&::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(promisesSvelte, /strokeWidth=\{1\.6\}/);

    const cardModalSvelte = fs.readFileSync(path.join(SRC, "components", "people", "BusinessCardModal.svelte"), "utf8");
    assert.match(cardModalSvelte, /\.card-modal-footer\s*\{[\s\S]*button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(cardModalSvelte, /strokeWidth=\{1\.6\}/);

    const batchStageSvelte = fs.readFileSync(path.join(SRC, "components", "people", "BatchLifecycleStageModal.svelte"), "utf8");
    assert.match(batchStageSvelte, /\.stage-option-row\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(batchStageSvelte, /\.modal-actions\s*\{[\s\S]*button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(batchStageSvelte, /\.note-field-wrap\s*\{[\s\S]*input\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
});

test("小驴人脉 · 亲属树谱、大事记时间轴与互惠卡片对齐细线图标、实体状态点、全胶囊化与并发防连击锁", () => {
    // 1. 亲属树谱
    const kinshipSvelte = fs.readFileSync(path.join(SRC, "components", "people", "FamilyKinshipTree.svelte"), "utf8");
    assert.match(kinshipSvelte, /strokeWidth=\{1\.6\}/);
    assert.match(kinshipSvelte, /removingId:\s*string\s*\|\s*null\s*=\s*\$state\(null\)/);
    assert.match(kinshipSvelte, /disabled=\{saving\s*\|\|\s*removingId === m\.id\}/);
    assert.doesNotMatch(kinshipSvelte, /👵/);
    assert.doesNotMatch(kinshipSvelte, /💑/);

    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /&__add-btn\s*\{[^}]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(indexScss, /&__remove\s*\{[\s\S]*opacity:\s*0;/);
    assert.match(indexScss, /&__form\s*\{[\s\S]*select,\s*input,\s*button\s*\{[^}]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 大事记时间轴
    const milestonesSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonMilestonesTimeline.svelte"), "utf8");
    assert.match(milestonesSvelte, /let copying = \$state\(false\);/);
    assert.match(milestonesSvelte, /disabled=\{copying\}/);
    assert.match(milestonesSvelte, /strokeWidth=\{1\.6\}/);
    assert.match(milestonesSvelte, /\.event-badge\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(milestonesSvelte, /\.event-badge\s*\{[\s\S]*&::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(milestonesSvelte, /\.milestones-actions\s*\{[\s\S]*button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 3. 互惠卡片
    const reciprocitySvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonReciprocityCard.svelte"), "utf8");
    assert.doesNotMatch(reciprocitySvelte, /⚖️/);
    assert.match(reciprocitySvelte, /<Scale size=\{14\} strokeWidth=\{1\.6\}/);
    assert.match(reciprocitySvelte, /\.status-badge\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(reciprocitySvelte, /\.status-badge\s*\{[\s\S]*&::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(reciprocitySvelte, /\.metric-val\s*\{[\s\S]*font-variant-numeric:\s*tabular-nums/);
});

test("小驴人脉 · 纪念日横幅、社交偏好与拜访行程对齐防重入锁、细线图标、全胶囊化与实体状态点", () => {
    // 1. 纪念日横幅
    const annivSvelte = fs.readFileSync(path.join(SRC, "components", "people", "AnniversaryMilestoneBanner.svelte"), "utf8");
    assert.match(annivSvelte, /copyingIndex\s*=\s*\$state<number\s*\|\s*null>\(null\)/);
    assert.match(annivSvelte, /disabled=\{copyingIndex === idx\}/);
    assert.match(annivSvelte, /strokeWidth=\{1\.6\}/);
    assert.doesNotMatch(annivSvelte, /milestone\.isToday \? "🎉" : "🌟"/);
    assert.match(annivSvelte, /\.btn-apply-greeting,\s*\.btn-copy-greeting\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 社交偏好与忌口
    const prefsSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonSocialPreferences.svelte"), "utf8");
    assert.match(prefsSvelte, /removingId:\s*string\s*\|\s*null\s*=\s*\$state\(null\)/);
    assert.match(prefsSvelte, /disabled=\{saving\s*\|\|\s*removingId === item\.id\}/);
    assert.match(prefsSvelte, /strokeWidth=\{1\.6\}/);
    assert.match(prefsSvelte, /\.taboo-badge\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(prefsSvelte, /\.taboo-badge\s*\{[\s\S]*&::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(prefsSvelte, /\.btn-remove-pref\s*\{[\s\S]*opacity:\s*0;/);

    // 3. 拜访行程与行前准备
    const itinerarySvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonItinerary.svelte"), "utf8");
    assert.match(itinerarySvelte, /copyingId\s*=\s*\$state<string\s*\|\s*null>\(null\)/);
    assert.match(itinerarySvelte, /togglingChecklistId\s*=\s*\$state<string\s*\|\s*null>\(null\)/);
    assert.match(itinerarySvelte, /disabled=\{busy\s*\|\|\s*togglingChecklistId === chk\.id\}/);
    assert.doesNotMatch(itinerarySvelte, /🗓️/);
    assert.match(itinerarySvelte, /strokeWidth=\{1\.6\}/);
    assert.match(itinerarySvelte, /\.status-badge\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(itinerarySvelte, /\.status-badge::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(itinerarySvelte, /\.checklist-chip\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(itinerarySvelte, /\.btn-action\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
});

test("小驴人脉 · 关系称谓、别名卡片与档案面板对齐全胶囊体系、回车提交与大圆角分层规范", () => {
    // 1. 关系称谓
    const labelsSvelte = fs.readFileSync(path.join(SRC, "components", "people", "RelationshipLabels.svelte"), "utf8");
    assert.match(labelsSvelte, /e\.key === "Enter" && dirty && !busy && !unknown/);
    assert.match(labelsSvelte, /border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 别名卡片
    const aliasesSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonAliases.svelte"), "utf8");
    assert.match(aliasesSvelte, /strokeWidth=\{1\.6\}/);
    assert.match(aliasesSvelte, /\.lvct-person-aliases__item\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(aliasesSvelte, /\.btn-remove-alias\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(aliasesSvelte, /\.lvct-person-aliases__confirm\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(aliasesSvelte, /\.lvct-detail__record\s*\{[\s\S]*input,\s*button\s*\{[^}]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 3. 档案面板摘要
    const summarySvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonProfileSummary.svelte"), "utf8");
    assert.match(summarySvelte, /\.lvct-profile-summary\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*14px\)/);
    assert.match(summarySvelte, /\.lvct-profile-summary\s*\{[\s\S]*box-shadow:\s*0 1px 4px rgba\(28,\s*24,\s*21,\s*0\.03\)/);
});

test("小驴人脉 · 群体活动大盘、补录弹窗与关系雷达对齐细线图标、全胶囊体系与大圆角规范", () => {
    // 1. 群体活动大盘
    const occSvelte = fs.readFileSync(path.join(SRC, "components", "people", "OccasionsHubDialog.svelte"), "utf8");
    assert.match(occSvelte, /strokeWidth=\{1\.6\}/);
    assert.match(occSvelte, /\.btn-del-occ\s*\{[\s\S]*opacity:\s*0;/);
    assert.match(occSvelte, /\.occ-type-tag,\s*\.occ-place-tag\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(occSvelte, /\.attendee-chip\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 补录弹窗
    const qfSvelte = fs.readFileSync(path.join(SRC, "components", "people", "ProfileCompletionDialog.svelte"), "utf8");
    assert.match(qfSvelte, /CheckCircle2 size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(qfSvelte, /\.lvct-qf\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*16px\)/);
    assert.match(qfSvelte, /\.lvct-form__actions button\s*\{[^}]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 3. 微型关系雷达
    const radarSvelte = fs.readFileSync(path.join(SRC, "components", "people", "MiniRelationRadar.svelte"), "utf8");
    assert.doesNotMatch(radarSvelte, /💡/);
    assert.match(radarSvelte, /Sparkles size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(radarSvelte, /\.lvct-radar-container\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*16px\)/);
});

test("小驴人脉 · 重复合并向导与快捷记互动弹窗对齐细线图标、全胶囊体系与大圆角规范", () => {
    // 1. 重复合并向导
    const mergeSvelte = fs.readFileSync(path.join(SRC, "components", "people", "ContactMergeWizard.svelte"), "utf8");
    assert.match(mergeSvelte, /ChevronLeft size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(mergeSvelte, /ChevronRight size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(mergeSvelte, /ShieldAlert size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(mergeSvelte, /\.lvct-merge__switch\s*\{[\s\S]*button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(mergeSvelte, /\.lvct-merge__headrow\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-md,\s*12px\)/);
    assert.match(mergeSvelte, /\.lvct-merge__footer\s*\{[\s\S]*button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 快捷记互动弹窗
    const quickRecordSvelte = fs.readFileSync(path.join(SRC, "components", "people", "QuickRecordDialog.svelte"), "utf8");
    assert.match(quickRecordSvelte, /\.lvct-quick-record-dialog\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*16px\)/);
    assert.match(quickRecordSvelte, /input\[type="date"\]\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(quickRecordSvelte, /\.b3-chip\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(quickRecordSvelte, /\.b3-button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
});

test("小驴人脉 · 主资料编辑弹窗与新建联系人弹窗对齐细线图标、全胶囊体系、12px大圆角与防连发快捷键", () => {
    // 1. 主资料编辑弹窗
    const editSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonEditDialog.svelte"), "utf8");
    assert.match(editSvelte, /ClipboardPaste size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(editSvelte, /Sparkles size=\{11\}\s*strokeWidth=\{1\.6\}/);
    assert.match(editSvelte, /removingMembershipId/);
    assert.match(editSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(editSvelte, /\.lvct-person-edit__profile\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(editSvelte, /\.lvct-person-edit__org-draft\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(editSvelte, /\.lvct-person-edit__org-confirm\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(editSvelte, /\.lvct-person-edit__org-item\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*10px\)/);

    // 2. 新建联系人弹窗
    const addSvelte = fs.readFileSync(path.join(SRC, "components", "people", "AddPersonDialog.svelte"), "utf8");
    assert.match(addSvelte, /ClipboardPaste size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(addSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(addSvelte, /\.lvct-add-person__org-draft\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(addSvelte, /\.lvct-add-person__org-confirm\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(addSvelte, /\.lvct-add-person__org-head button\[aria-label\^="移除这条"\]\s*\{[\s\S]*opacity:\s*0\.6;/);
});

test("小驴人脉 · 粘贴并识别弹窗与会面简报导出版面对齐细线图标、全胶囊体系、12px大圆角与复制/应用防连发锁", () => {
    // 1. 粘贴并识别弹窗
    const qfSvelte = fs.readFileSync(path.join(SRC, "components", "people", "QuickFillDialog.svelte"), "utf8");
    assert.match(qfSvelte, /copyingTemplate/);
    assert.match(qfSvelte, /applying/);
    assert.match(qfSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(qfSvelte, /Copy size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(qfSvelte, /Check size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(qfSvelte, /\.lvct-qf__item\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*10px\)/);
    assert.match(qfSvelte, /\.lvct-qf__unrecognized\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);

    // 2. 会面简报导出与样式表
    const detailSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonDetail.svelte"), "utf8");
    assert.match(detailSvelte, /briefingCopying/);
    assert.match(detailSvelte, /ExternalLink size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(detailSvelte, /FileText size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(detailSvelte, /Check size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(detailSvelte, /Copy size=\{14\}\s*strokeWidth=\{1\.6\}/);

    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /\.lvct-briefing-preview\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
});

test("小驴人脉 · 备注模板管理与便签速记板对齐细线图标、全胶囊体系、12px大圆角与并发防连击锁", () => {
    // 1. 备注模板管理
    const tplSvelte = fs.readFileSync(path.join(SRC, "components", "people", "TemplateManager.svelte"), "utf8");
    assert.match(tplSvelte, /removingTemplateId/);
    assert.match(tplSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(tplSvelte, /\.lvct-templates__item\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(tplSvelte, /\.lvct-templates__delete-btn\s*\{[\s\S]*opacity:\s*0\.6;/);
    assert.match(tplSvelte, /\.lvct-templates__var-chip\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 便签速记板
    const scratchSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonScratchpad.svelte"), "utf8");
    assert.match(scratchSvelte, /StickyNote size=\{18\}\s*strokeWidth=\{1\.6\}/);
    assert.match(scratchSvelte, /Plus size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(scratchSvelte, /Pin size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(scratchSvelte, /Sparkles size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(scratchSvelte, /Trash2 size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(scratchSvelte, /pinningId/);
    assert.match(scratchSvelte, /removingId/);
    assert.match(scratchSvelte, /converting/);
    assert.match(scratchSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(scratchSvelte, /\.action-icon-btn\.ft__error\s*\{[\s\S]*opacity:\s*0\.6;/);
});

test("小驴人脉 · 通讯录导入导出与文档收编对齐细线图标、全胶囊体系、14px/12px大圆角与Ctrl+Enter快捷键", () => {
    // 1. 通讯录导入导出弹窗
    const vcardSvelte = fs.readFileSync(path.join(SRC, "components", "people", "VCardDialog.svelte"), "utf8");
    assert.match(vcardSvelte, /Download size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(vcardSvelte, /lvct-vcard__scope-radio-group[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /\.lvct-vcard__export\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*14px\)/);
    assert.match(indexScss, /\.lvct-vcard__card\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(indexScss, /\.lvct-vcard__preview-summary\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);

    // 2. 文档收编弹窗
    const importSvelte = fs.readFileSync(path.join(SRC, "components", "people", "ImportDialog.svelte"), "utf8");
    assert.match(importSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(importSvelte, /\.lvct-import__list\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(importSvelte, /\.lvct-import__queue-item\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*10px\)/);
});

test("小驴人脉 · 往来账本与补充资料编辑器对齐空气感指标条、全胶囊体系、12px大圆角与并发锁", () => {
    // 1. 往来账本
    const ledgerSvelte = fs.readFileSync(path.join(SRC, "components", "people", "ExchangeLedger.svelte"), "utf8");
    assert.match(ledgerSvelte, /updatingRecordId/);
    assert.match(ledgerSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(ledgerSvelte, /\.lvct-exchange-stats\s*\{[\s\S]*border-bottom:\s*1px solid var\(--lvct-border-subtle\)/);
    assert.match(ledgerSvelte, /\.lvct-exchange-stat:not\(:last-child\)::after\s*\{/);
    assert.match(ledgerSvelte, /\.lvct-exchange-stat__val\s*\{[\s\S]*font-variant-numeric:\s*tabular-nums/);
    assert.match(ledgerSvelte, /\.lvct-exchange-row\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(ledgerSvelte, /\.lvct-exchange-status::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(ledgerSvelte, /\.lvct-exchange-btn\s*\{[\s\S]*opacity:\s*0\.6;/);

    // 2. 补充资料编辑器
    const fieldsSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonFieldsEditor.svelte"), "utf8");
    assert.match(fieldsSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(fieldsSvelte, /\.lvct-person-fields__item,\s*\.lvct-person-fields__group\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(fieldsSvelte, /\.lvct-person-fields__confirm\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*10px\)/);
});

test("小驴人脉 · 组织管理与组织资料编辑器对齐细线图标、全胶囊体系、12px大圆角与实体状态点", () => {
    // 1. 组织管理大盘
    const orgSvelte = fs.readFileSync(path.join(SRC, "components", "org", "OrgManagerDialog.svelte"), "utf8");
    assert.match(orgSvelte, /\.lvct-org-manager__member\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(orgSvelte, /\.lvct-org-manager__member-status::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(orgSvelte, /border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 组织资料编辑器
    const profSvelte = fs.readFileSync(path.join(SRC, "components", "org", "OrganizationProfileEditor.svelte"), "utf8");
    assert.match(profSvelte, /Plus size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(profSvelte, /Upload size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(profSvelte, /Trash2 size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(profSvelte, /X size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(profSvelte, /onkeydown=\{handleKeydown\}/);
    assert.match(profSvelte, /border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
});

test("小驴人脉 · 组织操作续做、双链修复与写入反馈对齐空气感指标条、细线图标、全胶囊体系与并发锁", () => {
    // 1. 联系人创建组织子弹窗外壳
    const contactOrgSvelte = fs.readFileSync(path.join(SRC, "components", "org", "ContactOrganizationDialog.svelte"), "utf8");
    assert.match(contactOrgSvelte, /\.lvct-contact-organization-dialog\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-dialog,\s*16px\)/);
    assert.match(contactOrgSvelte, /\.lvct-contact-organization-dialog\s*\{[\s\S]*box-shadow:\s*0 4px 24px/);

    // 2. 组织操作续做
    const recoverySvelte = fs.readFileSync(path.join(SRC, "components", "org", "OrgOperationRecovery.svelte"), "utf8");
    assert.match(recoverySvelte, /actingRequestId/);
    assert.match(recoverySvelte, /ShieldAlert size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(recoverySvelte, /RefreshCw size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(recoverySvelte, /Play size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(recoverySvelte, /\.lvct-org-recovery\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(recoverySvelte, /\.lvct-org-recovery__entry\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(recoverySvelte, /\.lvct-org-step-tag::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(recoverySvelte, /\.lvct-org-recovery__pill-btn\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 3. 组织成员双链修复
    const projSvelte = fs.readFileSync(path.join(SRC, "components", "org", "OrgProjectionRepair.svelte"), "utf8");
    assert.match(projSvelte, /repairingKey/);
    assert.match(projSvelte, /FileCheck size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(projSvelte, /Wrench size=\{11\}\s*strokeWidth=\{1\.6\}/);
    assert.match(projSvelte, /\.lvct-org-projection__metrics-bar\s*\{[\s\S]*border-bottom:\s*1px solid var\(--lvct-border-subtle\)/);
    assert.match(projSvelte, /\.lvct-org-projection__metric:not\(:last-child\)::after\s*\{/);
    assert.match(projSvelte, /\.lvct-org-projection__metric-value\s*\{[\s\S]*font-variant-numeric:\s*tabular-nums/);
    assert.match(projSvelte, /\.lvct-org-projection__target\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(projSvelte, /\.lvct-org-projection__state-tag::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
    assert.match(projSvelte, /\.lvct-org-projection__pill-btn\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(projSvelte, /\.lvct-org-projection__action-btn\s*\{[\s\S]*opacity:\s*0\.7;/);

    // 4. 成员写入结果反馈
    const resultSvelte = fs.readFileSync(path.join(SRC, "components", "org", "OrgMembershipResult.svelte"), "utf8");
    assert.match(resultSvelte, /CheckCircle2 size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(resultSvelte, /AlertCircle size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(resultSvelte, /FileText size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(resultSvelte, /\.lvct-org-membership-result\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(resultSvelte, /\.lvct-org-membership-result__status-tag::before\s*\{[\s\S]*forced-color-adjust:\s*none/);
});

test("小驴人脉 · 全局通知条与关系图谱控制岛对齐细线图标、全胶囊体系、悬停保护与高对比度规范", () => {
    // 1. 全局通知条
    const noticeSvelte = fs.readFileSync(path.join(SRC, "components", "StatusNotice.svelte"), "utf8");
    assert.match(noticeSvelte, /isHovered/);
    assert.match(noticeSvelte, /CircleAlert size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(noticeSvelte, /CheckCircle2 size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(noticeSvelte, /X size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(noticeSvelte, /lvct-notice__dismiss-btn/);

    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /\.lvct-notice__dismiss-btn\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 关系图谱画布控制与全屏防重入
    const graphSvelte = fs.readFileSync(path.join(SRC, "components", "graph", "RelationGraph.svelte"), "utf8");
    assert.match(graphSvelte, /expanding/);
    assert.match(graphSvelte, /Share2 size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /Scan size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /ZoomIn size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /ZoomOut size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /Minimize2 size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /Maximize2 size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /RefreshCw size=\{15\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /RotateCcw size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /Pause size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /Play size=\{14\}\s*strokeWidth=\{1\.6\}/);

    // 3. 图例小圆点高对比度防擦除
    assert.match(indexScss, /\.lvct-graph-legend__item\s*\{[\s\S]*forced-color-adjust:\s*none;/);
});

test("小驴人脉 · 设置大盘与图谱证据悬停卡对齐全胶囊体系与1.6细线图标规范", () => {
    // 1. 设置大盘导航与功能图标
    const settingsSvelte = fs.readFileSync(path.join(SRC, "components", "SettingsView.svelte"), "utf8");
    assert.match(settingsSvelte, /SlidersHorizontal size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /Database size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /Bell size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /Sparkles size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /Plug size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /Info size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /Check size=\{12\}\s*color="#ffffff"\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /RotateCcw size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(settingsSvelte, /Sparkles size=\{13\}\s*strokeWidth=\{1\.6\}/);

    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /\.lvct-settings__nav-item\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);

    // 2. 图谱证据悬停卡微交互与细线
    const graphSvelte = fs.readFileSync(path.join(SRC, "components", "graph", "RelationGraph.svelte"), "utf8");
    assert.match(graphSvelte, /Building2 size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(graphSvelte, /Users size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(indexScss, /\.lvct-graph-view__hover-card\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*16px\)/);
    assert.match(indexScss, /\.lvct-graph-view__hover-card[\s\S]*\.b3-button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)\s*!important/);
});

test("小驴人脉 · 首页仪表盘与名册工具栏对齐全量1.6细线图标、全胶囊体系与回忆复制防连发锁", () => {
    // 1. 首页仪表盘细线图标与并发锁
    const dashSvelte = fs.readFileSync(path.join(SRC, "components", "dashboard", "DashboardView.svelte"), "utf8");
    assert.match(dashSvelte, /copyingMemory/);
    assert.match(dashSvelte, /Users size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(dashSvelte, /Share2 size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(dashSvelte, /Cake size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(dashSvelte, /UserX size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(dashSvelte, /TrendingUp size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(dashSvelte, /MapPin size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(dashSvelte, /Calendar size=\{14\}\s*strokeWidth=\{1\.6\}/);

    // 2. 联系人名册视图切换与工具栏细线图标
    const peopleSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PeopleView.svelte"), "utf8");
    assert.match(peopleSvelte, /LayoutGrid size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(peopleSvelte, /List size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(peopleSvelte, /Columns3 size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(peopleSvelte, /UserPlus size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(peopleSvelte, /SlidersHorizontal size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(peopleSvelte, /Sparkles size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(peopleSvelte, /Network size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(peopleSvelte, /FileSpreadsheet size=\{14\}\s*strokeWidth=\{1\.6\}/);
});

test("小驴人脉 · 联系人卡片与右侧上下文面板对齐1.6细线图标、实体状态圆点与复制防连发锁", () => {
    // 1. 联系人卡片
    const cardSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonCard.svelte"), "utf8");
    assert.match(cardSvelte, /copyingWechat/);
    assert.match(cardSvelte, /copyingEmail/);
    assert.match(cardSvelte, /Cake size=\{11\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Phone size=\{11\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Star size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /MessageSquarePlus size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Network size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /ExternalLink size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Star size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /MessageSquarePlus size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Network size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /ExternalLink size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Phone size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /MessageCircle size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Mail size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(cardSvelte, /Clock3 size=\{13\}\s*strokeWidth=\{1\.6\}/);

    // 2. 右侧上下文面板
    const ctxSvelte = fs.readFileSync(path.join(SRC, "components", "ContextPanel.svelte"), "utf8");
    assert.match(ctxSvelte, /Sparkles size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(ctxSvelte, /Maximize2 size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(ctxSvelte, /ChevronRight size=\{16\}\s*strokeWidth=\{1\.6\}/);
    assert.match(ctxSvelte, /Star size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(ctxSvelte, /Phone size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(ctxSvelte, /MessageSquare size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(ctxSvelte, /Cake size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(ctxSvelte, /\.lvct-context-timeline__dot\s*\{[\s\S]*forced-color-adjust:\s*none;/);
    assert.match(ctxSvelte, /\(e\.ctrlKey \|\| e\.metaKey\) && e\.key === "Enter"/);
});

test("小驴人脉 · 群体活动弹窗对齐12px大圆角分层、全胶囊药丸、1.6细线图标与Ctrl+Enter快捷键", () => {
    const occSvelte = fs.readFileSync(path.join(SRC, "components", "OccasionDialog.svelte"), "utf8");
    assert.match(occSvelte, /\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"/);
    assert.match(occSvelte, /Users size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(occSvelte, /Plus size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(occSvelte, /X size=\{11\}\s*strokeWidth=\{1\.6\}/);
    assert.match(occSvelte, /\.lvct-occ-dialog__section\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(occSvelte, /\.lvct-occ-dialog__candidates\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(occSvelte, /\.lvct-occ-attendee-chip\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(occSvelte, /\.lvct-occ-attendee-dot\s*\{[\s\S]*forced-color-adjust:\s*none;/);
    assert.match(occSvelte, /\.lvct-occ-dialog__footer[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
});

test("小驴人脉 · 城市行程助手与足迹大盘对齐1.6细线图标、全胶囊体系、14px/16px大圆角与并发防连击锁", () => {
    const regionSvelte = fs.readFileSync(path.join(SRC, "components", "people", "RegionExplorerDialog.svelte"), "utf8");
    assert.match(regionSvelte, /copyingVisitList/);
    assert.match(regionSvelte, /creatingTripDoc/);
    assert.match(regionSvelte, /syncingDoc/);
    assert.match(regionSvelte, /\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"/);
    assert.match(regionSvelte, /Compass size=\{18\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /Search size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /MapPin size=\{40\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /MapPin size=\{18\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /MapPin size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /Check size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /FileText size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /ExternalLink size=\{13\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /Filter size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /Copy size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /Sparkles size=\{14\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /Briefcase size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /Phone size=\{12\}\s*strokeWidth=\{1\.6\}/);
    assert.match(regionSvelte, /\.lvct-region-dialog__body\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*16px\)/);
    assert.match(regionSvelte, /\.lvct-region-dialog__city-item\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*10px\)/);
    assert.match(regionSvelte, /\.lvct-region-dialog__person-card\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*14px\)/);
    assert.match(regionSvelte, /\.lvct-region-dialog__context-chip\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(regionSvelte, /\.b3-button\s*\{[\s\S]*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(regionSvelte, /font-variant-numeric:\s*tabular-nums;/);
});

test("小驴人脉 · GitHub三大标杆融合对齐圈层联络周期、会前速览折叠卡、初识引荐与Twenty垂直时间轴", () => {
    // 1. 联系人详情页：会前破冰速览折叠卡、初识溯源与 Twenty 时间轴
    const detailSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonDetail.svelte"), "utf8");
    assert.match(detailSvelte, /CADENCE_TIERS/);
    assert.match(detailSvelte, /preMeetingBrief/);
    assert.match(detailSvelte, /lvct-premeeting-brief/);
    assert.match(detailSvelte, /lvct-origin-section/);
    assert.match(detailSvelte, /lvct-twenty-activity-header/);
    assert.match(detailSvelte, /handleCopyPreMeetingBrief/);
    assert.match(detailSvelte, /handleSendGreetingReminder/);

    // 2. 联系人名册：待问候胶囊 tab
    const peopleSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PeopleView.svelte"), "utf8");
    assert.match(peopleSvelte, /lvct-people__group-tab--overdue/);
    assert.match(peopleSvelte, /overduePeopleCount/);

    // 3. 全局 SCSS 样式契约与统一令牌对齐
    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /\.lvct-premeeting-brief\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*14px\)/);
    assert.match(indexScss, /\.lvct-origin-section\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(indexScss, /\.lvct-twenty-activity-header\s*\{[\s\S]*border-radius:\s*var\(--lvct-r-card,\s*12px\)/);
    assert.match(indexScss, /\.lvct-people__group-tab--overdue[\s\S]*var\(--lv-heat-cold/);
    assert.match(indexScss, /\.lvct-origin-edit-box[\s\S]*input,\s*select\s*\{\s*border-radius:\s*var\(--lv-r-pill,\s*9999px\)/);
    assert.match(indexScss, /\.lvct-twenty-spark-bar[\s\S]*var\(--lv-data-amber/);
    assert.match(indexScss, /\.lvct-twenty-spark-bar[\s\S]*@media\s*\(forced-colors:\s*active\)/);
});

test("小驴人脉 · 手机端全屏容器选择器、visualViewport 软键盘同步、单行顶栏 44x44 关闭钮与列表/详情头部紧凑化", () => {
    const indexTs = fs.readFileSync(path.join(SRC, "index.ts"), "utf8");
    assert.match(indexTs, /lvct-mobile-dialog/);
    assert.match(indexTs, /--lvct-vv-h/);

    const indexScss = fs.readFileSync(path.join(SRC, "index.scss"), "utf8");
    assert.match(indexScss, /\.b3-dialog:has\(\.lvct-workbench\)\s*\.b3-dialog__container,\s*\.b3-dialog__container\.lvct-mobile-dialog/);
    assert.match(indexScss, /height:\s*var\(--lvct-vv-h,\s*100dvh\)\s*!important/);
    assert.match(indexScss, /body:has\(\.lvct-dialog-mask,\s*\.lvct-sheet\)\s*\.lvct-workbench__sidebar/);
    assert.match(indexScss, /\.lvct-detail__more-tools-panel[\s\S]*max-width:\s*calc\(100vw - 24px\)/);

    const workbenchSvelte = fs.readFileSync(path.join(SRC, "components", "Workbench.svelte"), "utf8");
    assert.match(workbenchSvelte, /lvct-workbench__mobile-close/);
    assert.match(workbenchSvelte, /closeWorkbenchSafely/);

    const peopleSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PeopleView.svelte"), "utf8");
    assert.match(peopleSvelte, /lvct-people__mobile-filter-btn/);
    assert.match(peopleSvelte, /lvct-people__narrow-filter-btn/);
    assert.match(peopleSvelte, /alphabetBarBlock/);
    assert.match(peopleSvelte, /tagFiltersBlock/);

    const detailSvelte = fs.readFileSync(path.join(SRC, "components", "people", "PersonDetail.svelte"), "utf8");
    assert.match(detailSvelte, /lvct-detail__edit-btn/);
    assert.match(detailSvelte, /lvct-detail__quick-record-btn/);
});













