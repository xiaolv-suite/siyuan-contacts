# v0.6.17 发布说明

发布日期：2026-10-28

## 核心亮点：Cardhop 式自然语言快捷建档条（Cardhop-Style Instant Contact Input）

本版本贯彻落实《ROADMAP 与特性设计》关于 Cardhop 式快速输入建档的规划，全面升级了名册搜索与新建通道：

### 1. 自然语言快速建档纯函数（buildDraftFromQuickInput）
- **单行多要素智能提取**：支持输入类似 `张三 13800000000 zhangsan@example.com 微信:zhangsan_wx #朋友 #科技` 的单行文本；
- **自动分词与格式化归类**：
  - 自动识别首个姓名 token 作为联系人姓名；
  - 自动精准提取手机号、电话与国家码并格式化；
  - 自动提取电子邮箱与微信号；
  - 自动将带有 `#` 前缀的 token 提取为标签列表（`tags`）；
- **纯函数零副作用**：位于 `domain/quick-fill.ts`，100% 覆盖自动化单测。

### 2. 名册顶栏快捷建档与回车直建交互（PeopleView）
- **多词输入智能感知**：在名册搜索框键入含空格、电话号码、邮箱或 `#标签` 时，右侧自动浮现 **`[⚡ 快捷建档]`** 按钮；
- **回车一键直达草稿**：当搜索无结果时，敲击回车键（`Enter`）或点击空态下的「快捷录入建档」按钮，自动打开新建联系人对话框并将识别到的姓名、电话、邮箱、微信、标签等全部自动预填，建档效率极大提升！

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（944/944 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：全场景 E2E 用例 100% PASS
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
