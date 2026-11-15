# v0.6.5 发布说明

发布日期：2026-10-27

## 核心亮点：快捷记互动随路事实画像沉淀（Quick Record with Facts）与双向闭环

本版本进一步完善了日常交往记录时的随路画像提炼工作流，在轻量记互动弹窗（`QuickRecordDialog`）中打通了事实画像沉淀通道：

### 1. 快捷记互动随路事实画像沉淀（Quick Record with Facts）
- **一键勾选随路沉淀**：在人物文档档案条唤起 `[+ 记互动]` 弹窗时，新增「💡 同时沉淀为社交画像事实（提炼观点与关键备忘）」开关；
- **4 大事实分类秒级点选**：勾选后即刻展开 `💡 观点见解`、`❤️ 喜好忌口`、`💼 背景经历` 与 `📌 关键事实` 分类胶囊，用户在记录交谈备注的同时，自动在人物专属文档的受控事实区块（`custom-lvct-facts`）中追加一条结构化事实记录；
- **双向无缝流通**：一笔互动既进入互动时间轴与当日日记，又提炼为长期画像记忆，兼顾交往流水与人脉深度。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（928/928 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：快捷记互动与全场景 E2E 用例 100% PASS
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
