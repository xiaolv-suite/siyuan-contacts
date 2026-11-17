# v0.6.2 发布说明

发布日期：2026-10-27

## 核心亮点：全仓 SQL 块 ID 防注入加固与 Issue #146 中枢统领排雷规范闭环

本版本全面贯彻落实小驴快门中枢 Issue #146 统领排雷规范，深入加固了底层数据防线与集市生态能力：

### 1. 全仓 SQL 块 ID 与参数防注入加固（SQL Security Hardening）
- **块 ID 强正则断言**：全仓凡拼入 SQL 语句的块 ID、文档 ID 与笔记本 ID，均严格前置经过 `assertSafeBlockId`（`/^\d{14}-[0-9a-z]{7}$/`）校验，彻底拦截非法字符串与畸形字符；
- **单引号安全转义**：对日记日期、城市名称等字符串参数全面接入 `escapeSqlString` 安全转义，防范注入隐患；
- **完备单测覆盖**：在 `tests/backlinks.test.ts` 中补充覆盖常见 SQL 注入模式、非法字符与长度边界测试，确保 100% 拦截。

### 2. Issue #146 快门中枢统领排雷指标全面达成
- 🎯 **品牌关键词全覆盖**：`plugin.json` 补齐 `["小驴", "小驴人脉", "xiaolv", "lv"]`，大幅提升集市中文搜索曝光；
- 🖼️ **桌面独立设置大窗**：`settingsWindow: true` 彻底打通思源 3.8.8+ 大窗口设置体验；
- 🔄 **跨插件事件纠偏**：统一走 `ECOSYSTEM_EVENTS` 标准常量与 `subscribeEcosystemEvent`；
- 📱 **移动端防遮挡自愈**：全弹窗统一接入 `window.visualViewport` 动态抬升，避让软键盘。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
