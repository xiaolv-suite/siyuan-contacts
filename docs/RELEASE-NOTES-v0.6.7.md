# v0.6.7 发布说明

发布日期：2026-10-27

## 核心亮点：联系人详情页记互动随路事实画像沉淀（Detail Note with Facts）

本版本将随路事实沉淀工作流全面拓展至联系人详情页（`PersonDetail`）的互动记录中，完成全渠道记互动时的画像沉淀统一闭环：

### 1. 联系人详情页记互动随路事实沉淀（Detail Note with Facts）
- **一键勾选同步沉淀**：在联系人详情页“记一笔互动”区域，新增「💡 同时沉淀为社交画像事实（提炼观点与关键备忘）」开关；
- **4 大分类点选展开**：勾选后即刻展示 `💡 观点见解`、`❤️ 喜好忌口`、`💼 背景经历` 与 `📌 关键事实` 分类胶囊，记录互动的同时自动追加至当前联系人的受控事实区块（`custom-lvct-facts`）；
- **全渠道交互闭环**：至此，无论是文档横幅档案条（`QuickRecordDialog`）、笔记捕获人脉（`CaptureDialog`），还是联系人详情页（`PersonDetail`），记互动均全面支持一键提炼为长期画像记忆，兼顾即时交往流水与人脉深度沉淀。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（929/929 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：30 项互动与全场景 E2E 用例 100% PASS
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
