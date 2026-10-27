# v0.6.12 发布说明

发布日期：2026-10-28

## 核心亮点：Task Horizon（任务视界）去中心化点对点直连协同与名片反链穿透

本版本深入贯彻落实小驴快门中枢 Issue #146 关于配合思源社区优秀插件 **Task Horizon (任务视界, by 5kyfkr)** 达成点对点去中心化直连（零快门依赖）的指导建议，全面打通客户拜访待办与任务视界联动：

### 1. Task Horizon 标准任务块自动注入日记（Daily Note Task Sync）
- **自动排期与属性注入**：在人脉中创建客户拜访计划或跟进待办时，自动在思源对应日期的日记文档（Daily Note）中生成标准任务块：
  ```markdown
  - [ ] 📅YYYY-MM-DD 拜访【联系人】：说明 {: custom-status="todo" custom-priority="medium" custom-completion-time="YYYY-MM-DD" custom-remark="(( personDocId '联系人名片' ))" }
  ```
- **Task Horizon 自动排期识别**：Task Horizon 能直接解析 `custom-status`、`custom-priority` 与 `custom-completion-time` 进行看板与日历排期。

### 2. 名片超链接一秒直接弹窗穿透（custom-remark）
- **名片反链深度咬合**：任务块挂载 `custom-remark="(( personDocId '姓名名片' ))"`；
- **双向协同流转**：用户在 Task Horizon 任务视界中查看拜访待办时，点击备注超链接即可一键直接弹窗打开对应人物的名片画像与交往脉络，实现真正的去中心化点对点生态协同。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（932/932 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：全场景 E2E 用例 100% PASS
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
