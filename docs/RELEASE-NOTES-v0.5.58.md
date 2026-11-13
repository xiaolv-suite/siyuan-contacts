# v0.5.58 发布说明

发布日期：2026-10-25

## 核心亮点：全局响应式事件总线闭环排雷、文档档案条记互动即时同步与生态打卡联动

本版本深入排查了全生命周期数据响应式通知机制中的深层盲区，彻底打通互动与人情账本变动在全场景下的实时感知闭环：

### 1. 补齐核心互动与人情账本全局响应式通知 (`emitDataChanged`)
- **根治跨界面未刷新隐患**：修复 `src/index.ts` 中 `recordInteraction`（记互动）、`deleteInteraction`（删互动）、`createPersonExchange`（新建账目）、`updatePersonExchange`（修改账目）与 `changePersonExchangeStatus`（变更账目状态）在完成后未调用 `emitDataChanged` 的潜在盲区；
- **全生态视图秒级实时对齐**：只要任何弹窗或外部接口完成互动或账目变更，首页仪表盘（最近互动/久未联系/温度分布）、名册卡片、文档横幅档案条与关系图谱立刻收到通知并自动就地刷新，告别手动重载。

### 2. 文档顶部档案条快捷记互动闭环深化 (`QuickRecordDialog`)
- **全局事件广播**：在人物文档档案横幅条点击「记互动」并保存后，自动广播 `emitDataChanged({ topics: ["people"], docIds: [person.docId] })`，同步刷新该文档的所有分屏视窗与外层名册；
- **小驴生态中枢打卡联动**：若用户在设置中配置了打卡中枢（`checkinItemId`），档案条快捷记互动同样自动安全记录一条打卡事件，保持与主流程 100% 行为一致。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：911 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
