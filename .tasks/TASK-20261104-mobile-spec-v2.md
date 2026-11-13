# 任务单：小驴生态 · 手机端第二轮优化 · 真机教训审计与专项深化

- **执行日期**：2026-11-04
- **前置基线**：v0.7.8 + Mobile Spec v1（Commit `e528f16`）
- **状态**：已完成（已全量通过编译、单元测试、UI三套回归、真内核端到端与发布门禁）

---

## 一、 真机教训强制审计落地

### 1. Esc-only 关闭面审计
- **问题根因**：思源手机端原生 Dialog 顶栏无关闭按钮，移动设备无物理 Escape 键，纯依赖 Esc 关闭的面板在手机端无法退出。
- **闭环方案**：
  - 在 `src/libs/dialog.ts` 的 `simpleDialog` / `svelteDialog` 中，当检测到手机端（`isMobileFrontend()`）且标题栏缺失关闭按钮时，自动注入可见标准关闭按钮（`<button class="b3-dialog__close lvct-mobile-dialog-close">✕</button>`，尺寸 36×36px，`touch-action: manipulation`）；
  - 在 `src/index.ts` 的 `openWorkbenchDialog` 中同步注入移动端可见 `✕` 关闭按钮；
  - `LvctDialog` 与 `PersonDetail` 查看器保持原有显式 `×` / `✕` 按钮。

### 2. 焦点移除卡死审计
- **问题根因**：移动端输入法关闭或 DOM 元素被移除时，Chromium 不一定会可靠派发 `focusout` / `blur`，导致悬浮球/气泡提示卡死在抑制态。
- **闭环方案**：
  - `src/components/StatusNotice.svelte` 改用 `event.currentTarget.contains(document.activeElement)` 校验，并在 `onDestroy` 中主动重置 `isHovered = false`；
  - `src/components/dashboard/ActivityHeatmap.svelte` 挂载 `onDestroy` 钩子显式重算并清理 `handleCellLeave`。

### 3. svgIcon 逐字一致性审计
- **问题根因**：`lvLaunchpad.register` 中的 `svgIcon` 若与 `addIcons` 注入的 sprite id 大小写或破折号不一致，罗盘磁贴将渲染为空白。
- **闭环方案**：
  - `src/index.ts` 中 `registerLaunchpad` 的 `svgIcon` 设置为 `"iconLvContacts"`；
  - `addIcons` 声明中同时保留 `<symbol id="iconLvContacts">` 与 `<symbol id="icon-lv-contacts">` 双别名，确保逐字 100% 匹配。

---

## 二、 本插件专项深化落地

### 1. 速查页通讯录融合
- 在 `src/components/people/PersonCard.svelte` 移动端行内快拨操作区补充第三个「发短信」按钮（`<a class="lvct-person-card__quick-sms" href="sms:号码">`）；
- 在 `src/index.scss` 中将 `.lvct-person-card__quick-call`、`.lvct-person-card__quick-sms`、`.lvct-person-card__quick-copy` 设置为 `flex: 1 1 0` 等宽三列排布，触控尺寸均满足 `min-width: 44px; min-height: 44px;`，点击均伴随 `lvLaunchpad.haptic(10)` 震动反馈。

### 2. 会前速览卡手势与圆点指示器
- 在 `src/components/people/PersonDetail.svelte` 的会前 30 秒破冰速览卡（`.lvct-premeeting-brief`）接入 `ontouchstart` 与 `ontouchend` 滑动手势，支持水平左右滑动在联系人列表间切换（上一位/下一位，位移 > 40px），伴随 `6ms` 细腻轻触感（`lvLaunchpad.haptic(6)`）；
- 卡片顶部渲染动态圆点指示器（`.lvct-premeeting-brief__dots`），当前联系人高亮显示为 16px 品牌色圆角胶囊条，圆点支持直接点击跳转并伴随 6ms 触感。

### 3. 互动记录快捷模板 chips
- 在 `PersonDetail.svelte`（详情页记互动区域）与 `QuickRecordDialog.svelte`（浮动档案条快速记互动弹窗）中统一增加三条高频常用模板 chips：
  - `📞 电话联络 30 分钟`（自动设为电话类型并填入备注）；
  - `💬 微信互动`（自动设为消息类型并填入备注）；
  - `🤝 见面交流`（自动设为见面类型并填入备注）；
- 点击伴随 `8ms` 触感震动（`lvLaunchpad.haptic(8)`），自动设置当前日期并聚焦输入框。

### 4. 生日/纪念日临近（≤7天）置顶横幅
- 在 `src/components/dashboard/DashboardView.svelte` 针对手机端（`isMobileScreen`）计算临近 7 天内的生日与纪念日集合（`upcomingCelebrations`）；
- 首页置顶渲染橙色温暖质感横幅卡片（`.lvct-dash__celebration-banner`），显示天数倒计时与主角姓名；
- 提供「祝贺」按钮一键打开联系人详情，以及「🔔 稍后提醒」按钮直接接入 `lvNotify.card`，支持「1小时后再提醒」、「明天再提醒」与「今日免打扰」三档延期选项。

---

## 三、 门禁与发布验证

- `pnpm check`：**0 errors, 0 warnings**
- `pnpm test`：**1130 / 1130 PASS**
- `pnpm test:ui`：**528 / 528 PASS**
- `pnpm test:ui:mobile`：**528 / 528 PASS**
- `pnpm test:ui:host`：**528 / 528 PASS**
- `pnpm e2e:isolated`：**11/11 真实内核服务 + 12/12 真实桌面浏览器走查全绿**
- `pnpm check:release`：**16 / 16 门禁全绿**
