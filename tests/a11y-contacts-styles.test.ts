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







