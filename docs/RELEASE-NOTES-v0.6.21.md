# v0.6.21 发布说明

发布日期：2026-10-28

## 核心亮点：周度人脉交往复盘与回顾实体文档生成（Weekly Social Review & Interaction Digest Doc Generator）

本版本紧密契合思源笔记知识管理与周期复盘的工作流习惯，推出了将每周人际交往足迹、重点联络人与下周跟进规划一键沉淀为思源笔记实体文档的功能：

### 1. ISO 周度区间推算与周报生成引擎（`weekly-digest.ts`）
- **高精度 ISO 自然周推算（`computeISOWeekRange`）**：纯函数零外部依赖，严格计算周一至周日闭区间及 `YYYY-Www` 标准周次（如 `2026-W44`）；
- **全要素 Markdown 结构化聚合（`buildWeeklyDigestMarkdown`）**：
  - 📊 **本周交往概览**：统计本周互动频次、覆盖人脉数与渠道来源分布（手工/日记/API）；
  - 👥 **重点联络人员与往来纪要**：按交往频次降序归纳联系人，自动注入思源块双链 `[姓名](siyuan://blocks/docId)`、职务与机构，还原每次互动的详细备注；
  - 📌 **下周待办跟进规划**：自动提取近期未完成待办，输出带 `- [ ]` 任务复选框与人物反链 `(( docId '姓名' ))` 的标准化行动清单，思源原生编辑器可直接勾选或与任务视界（Task Horizon）协同！

### 2. 首页仪表盘周日程滑轨一键沉淀（`DashboardView`）
- **一键沉淀实体文档**：在「📅 本周日程视窗」右侧增设 **`[沉淀周报 ↗]`** 入口，点击后自动在思源笔记当前笔记本创建 `/人脉周报/2026-W44 人脉交往周报（MM-DD ~ MM-DD）`；
- **属性注入与状态反馈**：自动挂载 `custom-lvct-weekly-digest` 属性标记，生成完成后提供轻量横幅提示，并支持 **`[在主编辑器打开 ↗]`** 一键直达主窗口进行周度复盘撰写！

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（951/951 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：桌面、移动端、宿主样式三套用例 100% PASS（491/491）
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
