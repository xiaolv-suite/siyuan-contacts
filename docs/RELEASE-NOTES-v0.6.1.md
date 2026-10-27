# v0.6.1 发布说明

发布日期：2026-10-27

## 核心亮点：笔记人员捕获事实随路沉淀（Capture with Facts）与双向闭环沉淀

本版本深入贯彻落实《小驴人脉后续开发总计划与演进路线图 (2026 - 2027)》，全面升维了“从笔记捕获人脉（Capture From Note）”的工作流深度：

### 1. 笔记人员捕获关键观点与事实随路沉淀（Capture with Facts）
- **一站式闭环工作流**：在会议纪要、专访与研报笔记中捕获参与人时，增设“💡 观点或关键事实随路沉淀”输入区与 4 大事实分类胶囊（💡 观点见解、❤️ 喜好忌口、💼 背景经历、📌 关键事实）；
- **全自动多端追加**：捕获提交后，不仅记录同场往来并写入参与人员双链区块，还会自动为所有勾选的参会人员文档追加带出处链接（`siyuan://blocks/{docId}`）的事实画像记录（`custom-lvct-facts`）；
- **完成步骤状态自证**：向导完成屏即时呈现“已为 N 位参与人员沉淀关键观点与事实”，执行透明可信。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
