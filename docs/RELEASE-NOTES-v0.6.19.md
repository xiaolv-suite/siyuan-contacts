# v0.6.19 发布说明

发布日期：2026-10-28

## 核心亮点：互动沟通文本事实画像智能提炼（Fact & Quote Extraction Engine）

本版本深入贯彻落实第三阶段 3.1 节关于“本地离线智能社交助理（Local AI Copilot）”的规划，推出了纯本地零外部依赖的沟通文本事实提取引擎：

### 1. 多分类社交事实画像提炼引擎（extractFactCandidates / extractFactsFromText）
- **多维度自然语言智能分词解析**：纯函数零外部依赖，自动解析长段互动纪要、随笔与谈资；
- **4 大受控分类精准提炼**：
  - 💡 **观点见解（quote）**：提炼对方提出的行业洞察、业务主张与核心观点；
  - ❤️ **喜好忌口（preference）**：提炼饮食偏好、茶道/咖啡品味与过敏忌口注意；
  - 💼 **背景经历（background）**：提炼履历、毕业院校、历史任职与家庭背景；
  - 📌 **关键事实（fact）**：提炼出差安排、近期计划与特定事项；
- **纯函数分层守门**：位于 `domain/fact-extraction.ts`，100% 覆盖自动化测试。

### 2. 详情页记互动区域智能提炼与一键采纳（PersonDetail）
- **智能感知与即时分析**：在“记一笔互动”输入备注时，输入框下方提供 **`[💡 智能提炼事实]`** 操作；
- **结构化卡片预览与灵活采纳**：
  - 点击即可瞬间将备注分解为结构化事实条目卡片；
  - 支持单条点选 `[+ 采纳]` 沉淀至当前人物的 `custom-lvct-facts` 受控区块；
  - 提供 **`[一键全部采纳]`**，彻底告别手工多头录入，人脉资料积累如流水般顺畅。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（948/948 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：全场景 E2E 用例 100% PASS
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
