# 任务单：小驴生态 · 手机端完整开发 · Mobile Spec v1

- **执行日期**：2026-11-04
- **前置基线**：v0.7.8（Commit `cedc5c8`）
- **状态**：已完成（已全量通过编译、单元测试、UI三套回归、真内核端到端与发布门禁）

---

## 一、 任务范围与落地细则

### 1. 罗盘入口与生命周期收口
- **入口挂接**：在 `src/index.ts` 中通过 `lvLaunchpad.ensureMobileEntry()` 挂载移动端收敛入口（顶栏按钮+悬浮球双入口，按用户入口模式呈现；桌面端为 no-op）。
- **生命周期注销**：清理函数通过 `lifecycleToken.onDispose(unregisterMobileEntry)` 注入，`onunload` 时自动释放，绝不写 petal 存储。
- **直办动作重写**：`lvLaunchpad.register` 的 `actions` 字段重写为 4 个手机高频直办动作：
  - `速查联系人` $\rightarrow$ 切换至联系人名册视图；
  - `今日待联络` $\rightarrow$ 直开降温预警与破冰重联大盘；
  - `新增联系人` $\rightarrow$ 弹出新建联系人分层表单；
  - `会前速览` $\rightarrow$ 直开会前 30 秒速查大盘。
- **穿透搜索手机体验优化**：`searchOmniContacts` 检测到移动端宿主时，点击搜索结果直接打开对应思源笔记文档，不再叠加全屏工作台 Dialog，消除双层面板嵌套视觉割裂。

### 2. 宿主形态与工作台全屏化
- **100dvh 与安全区**：在 `src/index.scss` 中针对手机端（`max-width: 640px`）通过 `.b3-dialog__container:has(> .b3-dialog .lvct-workbench)` 注入 `height: 100dvh`，自适应软键盘展开/收起。
- **下拉关闭手势**：工作台顶部渲染小驴手势抓手胶囊条（`.lvct-workbench__drag-zone`），支持 Touch / Pointer 下拉手势（位移 > 120px 伴随轻震动 `haptic(12)` 并安全关闭工作台 Dialog）。
- **底部主导航**：保持 5 项紧凑网格（首页/联系人/关系图/组织/设置），触控高度保证 `min-height: 44px`，`touch-action: manipulation`。

### 3. 联系人列表与卡片移动化
- **行内快拨操作**：`PersonCard.svelte` 在手机端（`isMobile=true`）于联系方式行下方渲染两个独立高频快拨胶囊按钮：
  - `拨打`（`tel:` 链接 + 触感震动 `lvLaunchpad.haptic(10)`）；
  - `复制`（调用系统剪贴板 + 触感反馈 + 原位“已复制”绿色微动效）。
  - 均满足 `min-width: 44px; min-height: 44px` 移动端无障碍触控目标。
- **新建联系人悬浮大按钮**：手机端在名册视图右下角常驻渲染 FAB 大胶囊（`.lvct-people__create-fab`），高度 ≥ 52px，带阴影与按下 `scale(0.96)` 缩放反馈，点击震动并直达新建联系人表单；列表底部自动留出 `76px + safe-area` 避让空间。
- **表单键盘优化**：`AddPersonDialog.svelte` 关键输入框严格配置 `type="tel"`、`type="email"`、`type="url"`，唤醒手机对应原生键盘。
- **浮层与 Esc 仲裁闭环**：`PeopleView.svelte` 移动端筛选抽屉支持内层浮层优先消费 Escape；`tests/architecture.test.ts` 补充共享库 AI 网关 fetch 规则放行。

### 4. 跟进提醒与自动化规则
- **自动化规则挂载**：通过 `lvAutomation.registerRule` 注册 `contacts-followup-due` 规则，监听 `followup-due` 触发源并在手机端和桌面端统一推送跟进卡片。
- **启动与就绪首跑**：工作台处于 `ready` 状态后立即运行 `refreshFollowupDueCount()` 计算到期数并刷新罗盘徽章，避免等待整点心跳。

---

## 二、 门禁实测结果

| 检查项 | 命令 | 结果 |
| :--- | :--- | :--- |
| TypeScript 类型检查 | `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json` | 0 errors |
| Svelte 语法与语义检查 | `svelte-check --tsconfig ./tsconfig.json` | 0 errors, 0 warnings |
| 单元测试套件 | `pnpm test` | **1130 / 1130 PASS** (0 fail) |
| UI 基础烟测 | `pnpm test:ui` | **528 / 528 PASS** (0 fail) |
| UI 移动端烟测 | `pnpm test:ui:mobile` | **528 / 528 PASS** (0 fail) |
| UI 宿主基线烟测 | `pnpm test:ui:host` | **528 / 528 PASS** (0 fail) |
| 真实内核与浏览器端到端 | `pnpm e2e:isolated` | **11/11 服务 + 12/12 桌面走查全部通过**（输出 10 张截图） |
| 发版门禁与 SHA 校验 | `pnpm check:release` | **16 / 16 全部通过**（无外挂 chunk，仅 index.js） |
