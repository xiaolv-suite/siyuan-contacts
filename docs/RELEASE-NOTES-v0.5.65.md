# v0.5.65 发布说明

发布日期：2026-10-26

## 核心亮点：组织看板 Master-Detail 空间升维、成员网络自适应栅格与视觉系统完全自洽

本版本继续围绕“优化 UI 设计，梳理页面布局”方针，对组织全景视图（`OrgsView`）的 Master-Detail 架构与成员网络空间秩序进行全面重塑：

### 1. 组织看板 Master-Detail 空间秩序升维
- **色彩与层级完全自控**：彻底清理组织全貌工作台看板（`.lvct-orgs-cockpit`）中依赖思源宿主主题的变量，改用小驴自控 `--lv-brand` 暖干邑橙、`--lvct-text-1` 与柔和微边框；
- **成员网格流式自适应**：成员卡片区域升级为 `grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr))` 弹性自适应栅格，引入 `scrollbar-gutter: stable`，彻底杜绝滚动闪烁；
- **成员卡片微浮雕**：成员项具备自控微底色、1px 柔和描边与鼠标悬浮微上浮反馈（`translateY(-1px)`）。

### 2. 组织总览统计条轻量化排版
- 组织统计数据条（`.lvct-orgs-overview-bar`）数字改用自控主标题墨黑，副说明文字对比度优化，分割线与外边框自然融合。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：911 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
