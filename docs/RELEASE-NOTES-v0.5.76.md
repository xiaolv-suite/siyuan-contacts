# v0.5.76 发布说明

发布日期：2026-10-26

## 核心亮点：设计方案深化落地——生效条件流自控高光微浮雕、体检状态芯片色阶与清除微反馈

本版本继续围绕用户“继续落地”指导指令，深度推进《全景 UI/UX 深度审查报告与系统性优化方案》关于筛选交互减阻与资料质量体检的规范化落地：

### 1. 生效条件流高光胶囊与清除微反馈（PeopleView）
- **暖橙自控微浮雕胶囊**：名册生效筛选条件胶囊（`.lvct-people__condition`）接入自控 `--lv-brand` 暖干邑橙（`10%` 微底色与 `35%` 描边），鼠标悬浮呈现微上浮（`translateY(-1px)`）与删除预览；
- **清除全部危险操作微反馈**：清除按钮（`.lvct-people__filter-clear`）悬浮时触发珊瑚红（`#E11D48`）高光与下划线，让批量清除动作的人机交互认知直观清晰；
- **标签筛选高光纯化**：标签过滤 Chip（`.lvct-people__filter--active`）全面收敛至爱马仕暖橙设计系统。

### 2. 资料体检模块状态芯片色阶大一统（ReviewReportDialog & _tokens）
- **三阶标准状态芯片规范**：在通用设计系统（`_tokens` 与 `src/index.scss`）中建立 `.lvct-chip--success`（翡翠绿）、`.lvct-chip--error`（珊瑚红）与 `.lvct-chip--warning`（琥珀金）；
- **体检结果一眼即辨**：体检中心 5 大模块状态芯片根据成功、失败、未知分别自动应用对应色阶与微边框，资料健康情况一目了然。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：911 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
