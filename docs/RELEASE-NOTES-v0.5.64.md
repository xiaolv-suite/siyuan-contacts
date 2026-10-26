# v0.5.64 发布说明

发布日期：2026-10-26

## 核心亮点：工作台页眉空间轻量化、名册栅格防抖重塑与超宽屏 1400px 布局升维

本版本继续围绕“优化 UI 设计，梳理页面布局”方针，针对工作台视窗高度利用率与名册栅格排版进行深度重塑：

### 1. 工作台页眉轻量化与垂直空间释放
- **释放 24px 首屏可视空间**：工作台页眉（`.lvct-workbench__header`）高度从原先固定的 112px 优化为呼吸弹性的 88px，内边距按屏幕比例自适应（`20px clamp(...) 16px`）；
- **主标题与副标题层级收敛**：字号比例更紧凑，视觉重心大幅集中于下层数据与业务卡片本身；
- **超宽屏展开支持**：内容主体（`.lvct-workbench__body`）最大宽度提升至 1400px，在 2K/4K 大屏下展示更加开阔大气。

### 2. 名册卡片栅格防抖与流式自适应（`lvct-people__cards`）
- **流式栅格微调**：卡片最小宽度调整为 `minmax(min(100%, 270px), 1fr)`，多列过渡更加柔和平滑；
- **CLS 布局防抖**：引入 `scrollbar-gutter: stable`，滚动条出现与消失时页面不再发生左右抖动。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：911 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
