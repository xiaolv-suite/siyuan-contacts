# v0.6.26 发布说明

发布日期：2026-10-28

## 核心亮点：名册多选批量制作思源复习闪卡包（Batch Flashcards Deck Generator）

本版本将 v0.6.24 的单人复习闪卡能力无缝升维至名册批量多选视角，推出了多人物跨维度批量汇编与集中复习的闪卡包生成引擎：

### 1. 多联系人批量闪卡汇编引擎（`domain/flashcards.ts`）
- **多人物画像全要素提取（`buildBatchFlashcardsDocumentMarkdown`）**：纯函数零外部依赖，对选中的每一位联系人自动提取基本资料、生日历法、喜好忌口（`preference`）、履历背景（`background`）、核心观点（`quote`）与会面谈资（`topics`）；
- **层级化结构与双链穿透**：生成文档以人物为章节（`## 👤 [姓名](siyuan://blocks/docId)`），集中汇编所有人物的闪卡，严格遵循思源标准问答题块属性语法（`{: custom-riff-decks="人脉记忆" }\n?`）。

### 2. 名册批量操作栏一键制作闪卡（`PeopleView.svelte`）
- **批量操作栏无缝集成**：在名册多选操作栏（Batch Bar）中增设 **`[🎴 制作复习闪卡]`** 按钮；
- **智能汇编与实体沉淀**：自动根据所选联系人（或当前筛选分组）在思源当前笔记本创建 `/人脉闪卡/🎴 人脉记忆闪卡 · 某某组（N 人）`；
- **即时反馈与文档直达**：生成完成后即刻在批量栏展示成功反馈与 **`[打开闪卡文档 ↗]`**，方便用户一键在主编辑器开启批量间隔重复复习！

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（958/958 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：桌面、移动端、宿主样式三套用例 100% PASS（496/496）
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
