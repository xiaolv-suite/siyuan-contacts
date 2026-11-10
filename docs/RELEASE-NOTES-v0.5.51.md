# v0.5.51 发布说明

发布日期：2026-10-25

## 核心亮点：UI/UX Pro Max 级视觉美学重塑——统一内联矢量图标、Bento 悬浮瓷贴与微触觉反馈

依据生态设计标准与《UI/UX Pro Max 规范体系》，本版本对全插件核心视窗、弹窗与交互细节进行了像素级美学重塑：

### 1. 彻底根除系统 Emoji 割裂，建立统一 Lucide 矢量图标体系
- **消除跨平台系统字体差异**：将此前裸露的操作系统系统 Emoji（`🔗`、`💡`、`📅`、`⚡`、`✓`、`🔔`、`🔕`）全面升级为专业级 `@lucide/svelte` 单色 SVG 矢量图标（`<Link2>`、`<Lightbulb>`、`<Calendar>`、`<Zap>`、`<Check>`、`<Bell>`、`<BellOff>`）；
- **优雅内联对齐**：引入 `.lvct-icon-inline` 规范类，确保图标垂直居中严格对齐文字基线，并跟随主题色平滑变换。

### 2. 反链视窗 Bento 瓷贴重塑与双主色徽章体系
- **Bento 悬浮质感**：反链卡片接入 `.lvct-backlink-card` 瓷贴规整布局，加入微弱的浅色高光描边与悬浮微浮雕投影；
- **双主色徽章对齐**：
  - 双链胶囊：绿松石天青灵珠（`#0284C7`）`.lvct-chip--link-pill`；
  - 提及胶囊：爱马仕暖干邑橙（`#EA580C`）`.lvct-chip--mention-pill`；
- 视觉层次井然有序，一目了然。

### 3. QuickRecordDialog 交互与微动效强化
- **自动对焦体验**：快捷记互动弹窗开启时，文本输入框自动平滑聚焦，支持 `Ctrl+Enter` 瞬间落盘；
- **按压微触觉反馈**：分类胶囊与按钮引入 `transform: scale(0.97)` 按压微触感与缓动过渡，带来顶级物理手感。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：909 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
