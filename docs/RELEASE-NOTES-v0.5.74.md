# v0.5.74 发布说明

发布日期：2026-10-26

## 核心亮点：设计方案深化落地——会面简报等宽代码排版与微绿光环反馈、交往回顾色阶统合

本版本继续围绕用户“继续优化落地”指令，深度推进《全景 UI/UX 深度审查报告与系统性优化方案》之触感反馈与色调纯化落地：

### 1. 会面简报导出弹窗质感升级与微绿光环反馈（PersonDetail）
- **等宽代码字体与优雅行高**：会面简报预览区（`.lvct-briefing-preview`）采用系统代码等宽字体排版，行高调整为 1.6，层次分明；
- **复制成功整框微绿光环（Tactile Feedback）**：点击复制后，预览框即刻呈现翡翠绿光环（`box-shadow: 0 0 0 2px color-mix(in srgb, #16A34A 30%, transparent)`）与轻柔微绿底色，带来顶级微触感交互确认。

### 2. 交往回顾报表色彩大一统与悬浮微浮雕（ReviewReportDialog）
- **大数字与比例条品牌色阶统合**：互动大数字改用暖干邑橙（`--lv-brand`），来源比例直方条严格消费暖干邑橙（手动记录）、生机翡翠绿（笔记捕获）与天青灵珠（外部联动），彻底清除历史硬编码；
- **指标格子微浮雕交互**：指标卡片（`.lvct-review__cell`）加入自控轻阴影与鼠标悬浮微上浮（`translateY(-1px)`）。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：911 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
