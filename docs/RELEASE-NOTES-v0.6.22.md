# v0.6.22 发布说明

发布日期：2026-10-28

## 核心亮点：年度人脉交往活跃热力图与打卡足迹（Annual Social Activity Heatmap & Streaks）

本版本将广受用户推崇的时间线热力可视化引入小驴人脉首页核心控制台，推出了纯本地零依赖的年度 52 周社交活跃度打卡热力图：

### 1. 52 周社交互动热力矩阵挖掘引擎（`activity-heatmap.ts`）
- **自然周网格布局（`computeActivityHeatmap`）**：纯函数零外部依赖，严格推算过去 52 周（364 天）完整网格（以周一至周日为周期），结合月份刻度栏精确对齐；
- **5 档多梯度活跃度分级（Levels 0~4）**：
  - ⬜ **Level 0**：暂无互动记录；
  - 🟩 **Level 1**：1 次互动；
  - 🟩 **Level 2**：2 ~ 3 次互动；
  - 🟩 **Level 3**：4 ~ 5 次互动；
  - 🟩 **Level 4**：6 次及以上高频互动；
- **多维度交往指标与打卡连击**：
  - 连续打卡（Current Streak）与历史最长连击（Longest Streak）智能推算；
  - 自动聚合当天参与人物名册与互动频次，支持未来日期透视。

### 2. 首页仪表盘交互式热力图卡片（`ActivityHeatmap.svelte`）
- **成就感极强的社交资产展现**：直观展示“年度活跃 xx 天 · 累计记录 xx 次 · 当前连续 xx 天 · 最长连续 xx 天”；
- **微交互与无障碍悬停**：鼠标悬停任意日期方块即可查看清晰 Tooltip（如：*“2026-10-28：2 次互动（张总、李教授）”*）；
- **主题令牌与暗色适配**：完美遵循思源设计规范，浅色与深色模式下均保持舒适对比度与精致微动效。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（952/952 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：桌面、移动端、宿主样式三套用例 100% PASS（492/492）
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
