# v0.5.52 发布说明

发布日期：2026-10-25

## 核心亮点：全模块视觉去 Emoji 矢量化重塑、图谱与看板层级优化与剪贴板鲁棒降级

本版本依据《UI/UX Pro Max 规范体系》（No Emoji as Structural Icons 原则），对全插件主要视图进行了深度视觉去噪与工业级排版重塑：

### 1. 全模块视觉去 Emoji 矢量化重塑
- **首页仪表盘（Dashboard）**：
  - 关系温度胶囊全面替换为单色矢量图标：`<Flame>` (温热)、`<Leaf>` (常温)、`<Wind>` (微凉)、`<Snowflake>` (渐冻)、`<Circle>` (未互动)；
  - 城市出差、日程视窗与近期走势卡片全面换用 `<MapPin>`、`<Calendar>`、`<TrendingUp>`、`<Sparkles>`；
  - 彻底消除操作系统自带彩标 Emoji 在各平台上的字体风格割裂。
- **关系图谱与组织看板（Graph & Orgs）**：
  - 消除四维拓扑悬浮菜单中的双重 Emoji 冗余（原同时包含 SVG 和 Emoji），视觉风格纯净规整；
  - 共同组织与同场活动接入 `<Building2>` 与 `<Users>` 单色图标；
  - 组织工作台全貌徽章统一接入 `<Building2>` 矢量规范。
- **人物详情页话题与项目（PersonDetail）**：
  - 会面谈资备忘与协作项目全面接入 `<Pin>` 与 `<FolderGit2>`，所在城市统一接入 `<MapPin>`。

### 2. 剪贴板跨环境平滑降级容错 (`copyPlainText`)
- 解决在特定非安全上下文或无权限沙箱环境下，`navigator.clipboard.writeText` 抛出 `NotAllowedError` 导致 UI 卡死的问题；
- 自动平滑降级至选区复制机制，并在 UI 层面保障复制微反馈与确定性交互。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：909 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
