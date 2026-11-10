# 小驴人脉（siyuan-contacts）全交互元素盘点清单与走查跟踪表

- **清单建立时间**：2026-11-01
- **盘点基线版本**：`v0.7.5`
- **全量元素总数**：**1495** 项
- **划分批次体系**：
  - **Batch 1 (宿主级入口/外壳导航/快捷键/通用组件)**：86 项
  - **Batch 2 (首页工作台 Dashboard)**：181 项
  - **Batch 3 (联系人名册与详情 People & Detail)**：843 项
  - **Batch 4 (组织架构 Orgs & 关系图谱 Graph)**：251 项
  - **Batch 5 (全局设置 Settings & 状态/数据流/通用)**：134 项

---

## 一、 各类型元素数量统计

| 元素交互类型 | 数量 | 占比 | 走查标准抓手 |
| :--- | :--- | :--- | :--- |
| **快捷键/命令** | 2 | 0.1% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **右键菜单项** | 2 | 0.1% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **顶栏图标按钮** | 1 | 0.1% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **设置项入口** | 3 | 0.2% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **浮动面板按钮** | 9 | 0.6% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **弹窗容器** | 22 | 1.5% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **按钮** | 969 | 64.8% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **下拉选择框** | 67 | 4.5% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **错误态/提示反馈** | 79 | 5.3% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **复选框/开关** | 27 | 1.8% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **多行文本框** | 16 | 1.1% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **单行输入框** | 208 | 13.9% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **空态提示/占位** | 61 | 4.1% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **主页面/视图** | 5 | 0.3% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **分段/标签切换控件** | 13 | 0.9% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **单选框** | 8 | 0.5% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **键盘快捷键监听** | 1 | 0.1% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |
| **抽屉容器** | 2 | 0.1% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |

---

## 二、 模块与批次走查推进进度表

| 批次代号 | 覆盖模块 | 元素总数 | 本轮状态 | 累计覆盖项 | 累计覆盖率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Batch 1** | 宿主入口、快捷键、浮动档案条、工作台外壳、笔记捕获向导 | 86 | **已完成走查与修复 (Pass)** | 86 / 86 | 5.75% (86/1495) |
| **Batch 2** | 首页工作台 (Dashboard)、活跃度热力图、五大Hub弹窗、生命周期漏斗 | 181 | **已完成走查与修复 (Pass)** | 267 / 267 | 17.86% (267/1495) |
| **Batch 3** | 联系人名册 (PeopleView)、人物详情 (PersonDetail)、20个业务子模块、新建/编辑/合并/补录向导 | 843 | **已完成走查与修复 (Pass)** | 1110 / 1110 | 74.25% (1110/1495) |
| **Batch 4** | 组织架构 (OrgsView)、组织编辑器、关系图谱 (RelationGraph)、网络枢纽分析 | 251 | **已完成走查与修复 (Pass)** | 1361 / 1361 | 91.04% (1361/1495) |
| **Batch 5** | 全局设置 (SettingsView)、状态通知 (StatusNotice)、工作区恢复、通用对话框 | 134 | **已完成走查与修复 (Pass)** | 1495 / 1495 | **100.0%** (1495/1495) |
| **Round 2 (专项收敛)** | 深度联动（块级精准跳转 cb-get-hl）、全站复制容错与深色模式高对比复查 | 1495 | **已通过第二轮深度验收 (Pass)** | 1495 / 1495 | **100.0% 终审通过** |
| **Round 3 (全景旅程)** | 第二层高风险区全链路、第三层全局横向比对（UI/兼容/稳定/安全）与全生命周期用户旅程走通 | 1495 | **已通过第三轮全景验收 (Pass)** | 1495 / 1495 | **100.0% 终审通过** |

---

## 三、 全量元素明细表 (按编号索引)

| 编号 | 批次 | 所属模块 | 组件/文件位置 | 交互类型 | 元素标签/标识 | 触发动作与链路 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ELEM-0001` | Batch-1 | 宿主入口 | `src/index.ts:357` | 快捷键/命令 | 思源命令: 快捷键命令 | 触发对应快捷指令（如打开工作台、笔记捕获等） |
| `ELEM-0002` | Batch-1 | 宿主入口 | `src/index.ts:364` | 快捷键/命令 | 思源命令: 快捷键命令 | 触发对应快捷指令（如打开工作台、笔记捕获等） |
| `ELEM-0003` | Batch-1 | 宿主入口 | `src/index.ts:378` | 右键菜单项 | 编辑器块右键菜单: 人脉相关操作 | 弹出快捷识别资料/从笔记捕获人脉菜单项 |
| `ELEM-0004` | Batch-1 | 宿主入口 | `src/index.ts:385` | 右键菜单项 | 编辑器块右键菜单: 人脉相关操作 | 弹出快捷识别资料/从笔记捕获人脉菜单项 |
| `ELEM-0005` | Batch-1 | 宿主入口 | `src/index.ts:429` | 顶栏图标按钮 | 顶栏主图标 (iconLvContacts) | 点击打开工作台Tab / 移动端全屏Dialog |
| `ELEM-0006` | Batch-1 | 宿主入口 | `src/index.ts:2242` | 设置项入口 | 思源集市插件设置齿轮 | 打开小驴人脉独立设置窗口 |
| `ELEM-0007` | Batch-1 | 宿主入口 | `src/index.ts:2243` | 设置项入口 | 思源集市插件设置齿轮 | 打开小驴人脉独立设置窗口 |
| `ELEM-0008` | Batch-1 | 宿主入口 | `src/index.ts:2246` | 设置项入口 | 思源集市插件设置齿轮 | 打开小驴人脉独立设置窗口 |
| `ELEM-0009` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:223` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0010` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:277` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0011` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:299` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0012` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:350` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0013` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:371` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0014` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:507` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0015` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:559` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0016` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:565` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0017` | Batch-1 | 浮动档案条 | `src/panels/person-panel.ts:572` | 浮动面板按钮 | 文档顶部浮动条交互操作 | 点击触发复制、折叠、记互动、编辑资料或下钻打开工作台 |
| `ELEM-0018` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:1` | 弹窗容器 | 弹窗: CaptureDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0019` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:431` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0020` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:432` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0021` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:487` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0022` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:494` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0023` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:496` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0024` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:503` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0025` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:504` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0026` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:505` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0027` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:507` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0028` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:512` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0029` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:519` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0030` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:525` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0031` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:558` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0032` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:572` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0033` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:580` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0034` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:593` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0035` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:601` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0036` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:603` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0037` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:607` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0038` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:615` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0039` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:618` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0040` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:619` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0041` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:620` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0042` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:627` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0043` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:644` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0044` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:645` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0045` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:647` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0046` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:652` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0047` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:662` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0048` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:664` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0049` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:677` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0050` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:681` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0051` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:686` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0052` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:691` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0053` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:697` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0054` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:703` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0055` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:709` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0056` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:716` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0057` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:727` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0058` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:738` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0059` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:739` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0060` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:752` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0061` | Batch-1 | 笔记捕获 (Capture) | `src/components/capture/CaptureDialog.svelte:753` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0062` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:180` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0063` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:190` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0064` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:206` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0065` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:217` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0066` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:249` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0067` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:268` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0068` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:309` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0069` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:316` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0070` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:323` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0071` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:330` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0072` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:340` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0073` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:354` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0074` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:364` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0075` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:372` | 按钮 | 查看全部 &gt; | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0076` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:377` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0077` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:395` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0078` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/ContextPanel.svelte:424` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0079` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ActivityHeatmap.svelte:79` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0080` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:1` | 弹窗容器 | 弹窗: AnniversariesHubDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0081` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:209` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0082` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:220` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0083` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:227` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0084` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:234` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0085` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:241` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0086` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:251` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0087` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:265` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0088` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:299` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0089` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:347` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0090` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:360` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0091` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:370` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0092` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/AnniversariesHubDialog.svelte:389` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0093` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:1` | 弹窗容器 | 弹窗: CoolingRadarDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0094` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:118` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0095` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:127` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0096` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:134` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0097` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:142` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0098` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:150` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0099` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:159` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0100` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/CoolingRadarDialog.svelte:243` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0101` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1` | 主页面/视图 | 主视图: DashboardView | 承载主导航与一级核心业务大盘 |
| `ELEM-0102` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1072` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0103` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1113` | 按钮 | 查看今天过生日的联系人 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0104` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1135` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0105` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1144` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0106` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1153` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0107` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1163` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0108` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1193` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0109` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1212` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0110` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1224` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0111` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1253` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0112` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1263` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0113` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1272` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0114` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1278` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0115` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1286` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0116` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1297` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0117` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1299` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0118` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1308` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0119` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1317` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0120` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1337` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0121` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1348` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0122` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1356` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0123` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1372` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0124` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1387` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0125` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1396` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0126` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1411` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0127` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1421` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0128` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1445` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0129` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1451` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0130` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1471` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0131` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1474` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0132` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1488` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0133` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1490` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0134` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1491` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0135` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1492` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0136` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1494` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0137` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1495` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0138` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1496` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0139` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1497` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0140` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1502` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0141` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1503` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0142` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1504` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0143` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1505` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0144` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1506` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0145` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1509` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0146` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1510` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0147` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1511` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0148` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1513` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0149` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1514` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0150` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1516` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0151` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1526` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0152` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1540` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0153` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1544` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0154` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1547` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0155` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1575` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0156` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1576` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0157` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1591` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0158` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1597` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0159` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1627` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0160` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1633` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0161` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1646` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0162` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1647` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0163` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1648` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0164` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1654` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0165` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1670` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0166` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1676` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0167` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1702` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0168` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1703` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0169` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1704` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0170` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1707` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0171` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1711` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0172` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1724` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0173` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1725` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0174` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1726` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0175` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1727` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0176` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1733` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0177` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1747` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0178` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1753` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0179` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1764` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0180` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1765` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0181` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1766` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0182` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1767` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0183` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1768` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0184` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1769` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0185` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1770` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0186` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1775` | 按钮 | 查看详情并处理跟进 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0187` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1777` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0188` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1778` | 按钮 | 完成跟进；不会自动记录互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0189` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1779` | 按钮 | 取消本次跟进计划 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0190` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1786` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0191` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1819` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0192` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1822` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0193` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1825` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0194` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1828` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0195` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1831` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0196` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1834` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0197` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1838` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0198` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1838` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0199` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1841` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0200` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1841` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0201` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1844` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0202` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1844` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0203` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1847` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0204` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1847` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0205` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1851` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0206` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1870` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0207` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1890` | 按钮 | 行程助手 &gt; | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0208` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1895` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0209` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:1936` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0210` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:2006` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0211` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:2019` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0212` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:2029` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0213` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:2045` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0214` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/DashboardView.svelte:2054` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0215` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:1` | 弹窗容器 | 弹窗: ExchangesHubDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0216` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:107` | 按钮 | 重试 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0217` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:133` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0218` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:150` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0219` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:156` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0220` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:162` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0221` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:172` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0222` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:178` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0223` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:184` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0224` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:190` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0225` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:212` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0226` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:230` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0227` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:257` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0228` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ExchangesHubDialog.svelte:267` | 按钮 | 关闭 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0229` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/LifecycleFunnelCard.svelte:49` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0230` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/PreMeetingHubDialog.svelte:1` | 弹窗容器 | 弹窗: PreMeetingHubDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0231` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/PreMeetingHubDialog.svelte:101` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0232` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/PreMeetingHubDialog.svelte:110` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0233` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/PreMeetingHubDialog.svelte:117` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0234` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/PreMeetingHubDialog.svelte:125` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0235` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/PreMeetingHubDialog.svelte:163` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0236` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/QuickStartPanel.svelte:37` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0237` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/QuickStartPanel.svelte:43` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0238` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/QuickStartPanel.svelte:48` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0239` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/QuickStartPanel.svelte:53` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0240` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/QuickStartPanel.svelte:58` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0241` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/QuickStartPanel.svelte:68` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0242` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/QuickStartPanel.svelte:69` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0243` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:1` | 弹窗容器 | 弹窗: ReviewReportDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0244` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:206` | 按钮 | 重新读取体检 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0245` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:212` | 按钮 | 重新核实全部模块 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0246` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:214` | 按钮 | 只重试失败模块 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0247` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:221` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0248` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:234` | 按钮 | 预览修复范围 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0249` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:236` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0250` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:254` | 按钮 | 关闭预览 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0251` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:267` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0252` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:274` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0253` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:276` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0254` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:286` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0255` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:293` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0256` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:333` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0257` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:346` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0258` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:366` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0259` | Batch-2 | 首页工作台 (Dashboard) | `src/components/dashboard/ReviewReportDialog.svelte:379` | 按钮 | 在主编辑器打开 ↗ | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0260` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:55` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0261` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:57` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0262` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:63` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0263` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:65` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0264` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:72` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0265` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:74` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0266` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:82` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0267` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:84` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0268` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:92` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0269` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:94` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0270` | Batch-5 | 通用与公共组件 | `src/components/FollowUpGroupList.svelte:112` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0271` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/NetworkHubsModal.svelte:1` | 弹窗容器 | 弹窗: NetworkHubsModal | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0272` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/NetworkHubsModal.svelte:81` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0273` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/NetworkHubsModal.svelte:89` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0274` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/NetworkHubsModal.svelte:100` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0275` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/NetworkHubsModal.svelte:112` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0276` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/NetworkHubsModal.svelte:166` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0277` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/NetworkHubsModal.svelte:179` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0278` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1705` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0279` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1712` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0280` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1720` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0281` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1724` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0282` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1737` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0283` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1738` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0284` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1740` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0285` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1750` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0286` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1759` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0287` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1778` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0288` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1787` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0289` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1794` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0290` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1807` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0291` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1813` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0292` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1814` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0293` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1821` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0294` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1841` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0295` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1870` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0296` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1876` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0297` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1877` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0298` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1878` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0299` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1884` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0300` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1887` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0301` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1889` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0302` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1897` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0303` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1899` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0304` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1900` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0305` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1901` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0306` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1909` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0307` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1925` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0308` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1940` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0309` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1965` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0310` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1979` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0311` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1996` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0312` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:1999` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0313` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2002` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0314` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2005` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0315` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2011` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0316` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2018` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0317` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2019` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0318` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2020` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0319` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2021` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0320` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2022` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0321` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2023` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0322` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2069` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0323` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2085` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0324` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2095` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0325` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2108` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0326` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2117` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0327` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2141` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0328` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2142` | 按钮 | 关闭组织信息 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0329` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2143` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0330` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2144` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0331` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2176` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0332` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2177` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0333` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2181` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0334` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2182` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0335` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2183` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0336` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2210` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0337` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2226` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0338` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2251` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0339` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2267` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0340` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2283` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0341` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2294` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0342` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2330` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0343` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2351` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0344` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2359` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0345` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2368` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0346` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2386` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0347` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2403` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0348` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2408` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0349` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2444` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0350` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2450` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0351` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2465` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0352` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2466` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0353` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2477` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0354` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2483` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0355` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2509` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0356` | Batch-4 | 关系图谱 (Graph) | `src/components/graph/RelationGraph.svelte:2512` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0357` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:156` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0358` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:162` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0359` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:198` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0360` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:207` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0361` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:210` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0362` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:216` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0363` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:226` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0364` | Batch-5 | 通用与公共组件 | `src/components/InitWizard.svelte:230` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0365` | Batch-5 | 通用与公共组件 | `src/components/LvctDialog.svelte:1` | 弹窗容器 | 弹窗: LvctDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0366` | Batch-5 | 通用与公共组件 | `src/components/LvctDialog.svelte:166` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0367` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:1` | 弹窗容器 | 弹窗: OccasionDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0368` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:114` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0369` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:127` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0370` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:139` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0371` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:151` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0372` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:174` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0373` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:189` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0374` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:200` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0375` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:221` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0376` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:228` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0377` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:241` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0378` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:249` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0379` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:260` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0380` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:265` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0381` | Batch-5 | 通用与公共组件 | `src/components/OccasionDialog.svelte:266` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0382` | Batch-4 | 组织架构 (Orgs) | `src/components/org/ContactOrganizationDialog.svelte:1` | 弹窗容器 | 弹窗: ContactOrganizationDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0383` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:352` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0384` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:360` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0385` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:370` | 按钮 | 仅填空白 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0386` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:371` | 按钮 | 覆盖模板字段 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0387` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:372` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0388` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:382` | 单行输入框 | 例如：远山科技 | 编辑修改并双向绑定状态值 |
| `ELEM-0389` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:383` | 单行输入框 | 例如：远山 | 编辑修改并双向绑定状态值 |
| `ELEM-0390` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:384` | 单行输入框 | https://www.qcc.com/... | 编辑修改并双向绑定状态值 |
| `ELEM-0391` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:385` | 多行文本框 | 记录组织定位、合作背景或你希望记住的内容 | 编辑修改并双向绑定状态值 |
| `ELEM-0392` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:394` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0393` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:395` | 按钮 | 上传图片 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0394` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:396` | 单行输入框 | https://.../logo.png | 编辑修改并双向绑定状态值 |
| `ELEM-0395` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:397` | 按钮 | 移除 Logo | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0396` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:399` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0397` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:406` | 按钮 | 部门设置 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0398` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:407` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0399` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:410` | 按钮 | 无上级部门 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0400` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:410` | 单行输入框 | 部门名称，如产品部 | 编辑修改并双向绑定状态值 |
| `ELEM-0401` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:410` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0402` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:418` | 按钮 | 确认删除部门 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0403` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:419` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0404` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:424` | 按钮 | 部门删除记录仍在草稿中： | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0405` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:429` | 按钮 | 自定义内容 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0406` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:430` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0407` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:432` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0408` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:432` | 单行输入框 | 字段名称，如官网 | 编辑修改并双向绑定状态值 |
| `ELEM-0409` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:435` | 按钮 | 字段删除记录仍在草稿中： | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0410` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:440` | 按钮 | 重新读取组织资料 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0411` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:440` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0412` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrganizationProfileEditor.svelte:441` | 按钮 | 保存后可在组织列表、联系人归属和关系图中使用。 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0413` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1` | 弹窗容器 | 弹窗: OrgManagerDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0414` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1079` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0415` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1084` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0416` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1087` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0417` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1101` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0418` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1111` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0419` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1116` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0420` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1127` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0421` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1134` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0422` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1147` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0423` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1153` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0424` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1165` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0425` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1170` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0426` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1178` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0427` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1191` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0428` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1194` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0429` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1196` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0430` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1203` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0431` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1206` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0432` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1210` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0433` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1213` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0434` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1217` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0435` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1226` | 按钮 | 保留文档： | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0436` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1230` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0437` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1231` | 按钮 | 确认移除组织 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0438` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1237` | 按钮 | 打开保留的组织文档 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0439` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1245` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0440` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1250` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0441` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1257` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0442` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1271` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0443` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1276` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0444` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1281` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0445` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1289` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0446` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1297` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0447` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1301` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0448` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1308` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0449` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1315` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0450` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1329` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0451` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1337` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0452` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1345` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0453` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1353` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0454` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1360` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0455` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1369` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0456` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1373` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0457` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1376` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0458` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1381` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0459` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1386` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0460` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1387` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0461` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1405` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0462` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1409` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0463` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1412` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0464` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1415` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0465` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1418` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0466` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1419` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0467` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1420` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0468` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1421` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0469` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1423` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0470` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1431` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0471` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1437` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0472` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1459` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0473` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1462` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0474` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1465` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0475` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1472` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0476` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1475` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0477` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1478` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0478` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1482` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0479` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1490` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0480` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1498` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0481` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1502` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0482` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1508` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0483` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1511` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0484` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1514` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0485` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1517` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0486` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1520` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0487` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1525` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0488` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1526` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0489` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1528` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0490` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1536` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0491` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1538` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0492` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1545` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0493` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1558` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0494` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1561` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0495` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1563` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0496` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1571` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0497` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1575` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0498` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1578` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0499` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1587` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0500` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1588` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0501` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1607` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0502` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1608` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0503` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgManagerDialog.svelte:1619` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0504` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:103` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0505` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:113` | 单行输入框 | 搜索组织名称… | 编辑修改并双向绑定状态值 |
| `ELEM-0506` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:119` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0507` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:131` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0508` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:135` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0509` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:136` | 按钮 | 完成选择 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0510` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:145` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0511` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgMultiSelect.svelte:154` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0512` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgOperationRecovery.svelte:83` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0513` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgOperationRecovery.svelte:94` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0514` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgOperationRecovery.svelte:139` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0515` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgOperationRecovery.svelte:149` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0516` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgProjectionRepair.svelte:109` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0517` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgProjectionRepair.svelte:122` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0518` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgProjectionRepair.svelte:171` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0519` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgProjectionRepair.svelte:213` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0520` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgProjectionRepair.svelte:222` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0521` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:1` | 主页面/视图 | 主视图: OrgsView | 承载主导航与一级核心业务大盘 |
| `ELEM-0522` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:273` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0523` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:283` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0524` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:290` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0525` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:295` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0526` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:298` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0527` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:301` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0528` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:303` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0529` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:312` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0530` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:319` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0531` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:329` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0532` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:333` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0533` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:339` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0534` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:340` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0535` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:371` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0536` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:375` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0537` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:379` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0538` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:389` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0539` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:393` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0540` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:413` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0541` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:422` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0542` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:426` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0543` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:444` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0544` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:453` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0545` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:475` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0546` | Batch-4 | 组织架构 (Orgs) | `src/components/org/OrgsView.svelte:503` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0547` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:1` | 弹窗容器 | 弹窗: AddPersonDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0548` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:435` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0549` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:442` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0550` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:443` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0551` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:448` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0552` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:452` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0553` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:456` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0554` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:460` | 单行输入框 | https:// | 编辑修改并双向绑定状态值 |
| `ELEM-0555` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:469` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0556` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:477` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0557` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:498` | 按钮 | 保留经历 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0558` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:499` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0559` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:506` | 按钮 | 补录历史 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0560` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:507` | 按钮 | 移除这条 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0561` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:510` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0562` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:513` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0563` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:520` | 单行输入框 | 例如：实习、兼职、休学 | 编辑修改并双向绑定状态值 |
| `ELEM-0564` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:521` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0565` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:522` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0566` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:523` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0567` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:524` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0568` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:525` | 单行输入框 | 仅记录这段组织经历 | 编辑修改并双向绑定状态值 |
| `ELEM-0569` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:532` | 按钮 | 重新读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0570` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:532` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0571` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:534` | 按钮 | 重试 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0572` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:534` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0573` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:536` | 单行输入框 | 例如：张老师、英文名；多个称呼用顿号分隔 | 编辑修改并双向绑定状态值 |
| `ELEM-0574` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:537` | 按钮 | 与我的关系称谓 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0575` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:537` | 单行输入框 | 例如：同事、朋友、校友；多个称谓用顿号分隔 | 编辑修改并双向绑定状态值 |
| `ELEM-0576` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:538` | 多行文本框 | 记录你希望长期保留的补充信息 | 编辑修改并双向绑定状态值 |
| `ELEM-0577` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:552` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0578` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:557` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0579` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:570` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0580` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:577` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0581` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:584` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0582` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:590` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0583` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:595` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0584` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:602` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0585` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:603` | 按钮 | 取消预览 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0586` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:606` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0587` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:612` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0588` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AddPersonDialog.svelte:613` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0589` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AnniversaryMilestoneBanner.svelte:82` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0590` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/AnniversaryMilestoneBanner.svelte:93` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0591` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BatchLifecycleStageModal.svelte:1` | 弹窗容器 | 弹窗: BatchLifecycleStageModal | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0592` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BatchLifecycleStageModal.svelte:49` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0593` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BatchLifecycleStageModal.svelte:55` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0594` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BatchLifecycleStageModal.svelte:76` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0595` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BatchLifecycleStageModal.svelte:86` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0596` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BatchLifecycleStageModal.svelte:94` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0597` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BirthdayField.svelte:141` | 按钮 | 公历 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0598` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BirthdayField.svelte:142` | 按钮 | 农历 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0599` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BirthdayField.svelte:144` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0600` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BirthdayField.svelte:147` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0601` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BirthdayField.svelte:151` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0602` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BirthdayField.svelte:155` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0603` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BirthdayField.svelte:162` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0604` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:1` | 弹窗容器 | 弹窗: BusinessCardModal | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0605` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:104` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0606` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:111` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0607` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:118` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0608` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:132` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0609` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:139` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0610` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:164` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0611` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:171` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0612` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/BusinessCardModal.svelte:186` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0613` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:140` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0614` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:161` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0615` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:171` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0616` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:181` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0617` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:191` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0618` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:200` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0619` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:218` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0620` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:222` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0621` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:226` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0622` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:229` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0623` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:257` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0624` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:262` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0625` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:266` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0626` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ContactMergeWizard.svelte:267` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0627` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:299` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0628` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:303` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0629` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:311` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0630` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:318` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0631` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:323` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0632` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:327` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0633` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:332` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0634` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:336` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0635` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:341` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0636` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:344` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0637` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:352` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0638` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:367` | 按钮 | 结清 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0639` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:368` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0640` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ExchangeLedger.svelte:370` | 按钮 | 重新打开 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0641` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:114` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0642` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:138` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0643` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:146` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0644` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:174` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0645` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:182` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0646` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:210` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0647` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:218` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0648` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:246` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0649` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:254` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0650` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:283` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0651` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:300` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0652` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:309` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0653` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:316` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0654` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:324` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0655` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:332` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0656` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:340` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0657` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:348` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0658` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/FamilyKinshipTree.svelte:356` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0659` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/GroupField.svelte:123` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0660` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/GroupField.svelte:137` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0661` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/GroupField.svelte:151` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0662` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:1` | 弹窗容器 | 弹窗: ImportDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0663` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:242` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0664` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:255` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0665` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:257` | 按钮 | 继续并核实未完成项 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0666` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:259` | 按钮 | 仅重试失败/未知/冲突项 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0667` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:262` | 按钮 | 关闭 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0668` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:267` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0669` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:273` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0670` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:283` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0671` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:297` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0672` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:298` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0673` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:298` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0674` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:303` | 按钮 | 清空全部选择 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0675` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:307` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0676` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:308` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0677` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:314` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0678` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:322` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0679` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:325` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0680` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:327` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0681` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:332` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0682` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:342` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0683` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:352` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0684` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:359` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0685` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:361` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0686` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ImportDialog.svelte:362` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0687` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/MiniRelationRadar.svelte:70` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0688` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:1` | 弹窗容器 | 弹窗: OccasionsHubDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-0689` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:153` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0690` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:162` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0691` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:178` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0692` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:211` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0693` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:236` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0694` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:265` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0695` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:283` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0696` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:294` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0697` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/OccasionsHubDialog.svelte:316` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0698` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1` | 主页面/视图 | 主视图: PeopleView | 承载主导航与一级核心业务大盘 |
| `ELEM-0699` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:352` | 键盘快捷键监听 | 键盘事件处理器 (Enter / Esc / Ctrl+Enter) | 快捷提交表单、切换条目或退出弹窗 |
| `ELEM-0700` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1940` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0701` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1948` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0702` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1952` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0703` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1954` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0704` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1955` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0705` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1960` | 按钮 | 保存当前筛选为视图 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0706` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1967` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0707` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1979` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0708` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:1994` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0709` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2008` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0710` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2016` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0711` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2018` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0712` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2022` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0713` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2025` | 单行输入框 | 如：北京、上海、杭州、未填写 | 编辑修改并双向绑定状态值 |
| `ELEM-0714` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2026` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0715` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2027` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0716` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2028` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0717` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2031` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0718` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2047` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0719` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2072` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0720` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2082` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0721` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2097` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0722` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2100` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0723` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2107` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0724` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2108` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0725` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2109` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0726` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2110` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0727` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2112` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0728` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2118` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0729` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2126` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0730` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2127` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0731` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2138` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0732` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2162` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0733` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2179` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0734` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2187` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0735` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2198` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0736` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2205` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0737` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2215` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0738` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2228` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0739` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2234` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0740` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2242` | 按钮 | ↑ | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0741` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2243` | 按钮 | ↓ | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0742` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2248` | 按钮 | 恢复默认显示 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0743` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2256` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0744` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2272` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0745` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2281` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0746` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2296` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0747` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2304` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0748` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2317` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0749` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2326` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0750` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2339` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0751` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2356` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0752` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2365` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0753` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2386` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0754` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2392` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0755` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2399` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0756` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2401` | 按钮 | 重试最近互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0757` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2406` | 按钮 | 重新读取别名 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0758` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2410` | 按钮 | 重新读取三项资料 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0759` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2413` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0760` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2415` | 按钮 | 重试保存显示偏好 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0761` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2426` | 按钮 | 点击清除该条件 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0762` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2431` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0763` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2439` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0764` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2449` | 按钮 | 清除全部 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0765` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2458` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0766` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2461` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0767` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2471` | 按钮 | 清除筛选 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0768` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2479` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0769` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2481` | 按钮 | 收起标签 ▴ | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0770` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2489` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0771` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2503` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0772` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2504` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0773` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2506` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0774` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2516` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0775` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2526` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0776` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2527` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0777` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2535` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0778` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2549` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0779` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2559` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0780` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2570` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0781` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2571` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0782` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2581` | 按钮 | 停止继续读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0783` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2584` | 按钮 | 重试后续读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0784` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2587` | 按钮 | 继续读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0785` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2601` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0786` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2602` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0787` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2608` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0788` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2617` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0789` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2622` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0790` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2624` | 按钮 | 重新加载 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0791` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2637` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0792` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2638` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0793` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2641` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0794` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2642` | 按钮 | 重试后续读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0795` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2646` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0796` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2647` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0797` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2652` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0798` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2653` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0799` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2657` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0800` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2658` | 按钮 | ＋ 新建联系人 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0801` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2659` | 按钮 | 收编文档 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0802` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2660` | 按钮 | 导入 vCard | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0803` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2663` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0804` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2665` | 按钮 | 停止继续读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0805` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2667` | 按钮 | 继续读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0806` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2671` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0807` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2673` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0808` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2677` | 按钮 | 清除所有筛选 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0809` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2711` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0810` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2730` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0811` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2739` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0812` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2742` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0813` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2743` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0814` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2767` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0815` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2828` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0816` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2834` | 单行输入框 | 重点 客户 | 编辑修改并双向绑定状态值 |
| `ELEM-0817` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2841` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0818` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2846` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0819` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2848` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0820` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2850` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0821` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2862` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0822` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2871` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0823` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2882` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0824` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2891` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0825` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2893` | 按钮 | 新建组织 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0826` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2896` | 按钮 | 重新读取组织 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0827` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2898` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0828` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2929` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0829` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2934` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0830` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PeopleView.svelte:2937` | 按钮 | 合并此对 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0831` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonAliases.svelte:138` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0832` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonAliases.svelte:142` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0833` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonAliases.svelte:148` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0834` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonAliases.svelte:163` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0835` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonAliases.svelte:166` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0836` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonAliases.svelte:178` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0837` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonAliases.svelte:187` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0838` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:140` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0839` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:194` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0840` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:206` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0841` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:208` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0842` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:209` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0843` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:218` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0844` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:228` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0845` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:247` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0846` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:271` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0847` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:328` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0848` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:330` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0849` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonCard.svelte:331` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0850` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:723` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0851` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3458` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0852` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3475` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0853` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3485` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0854` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3487` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0855` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3501` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0856` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3542` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0857` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3561` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0858` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3587` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0859` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3588` | 按钮 | 为当前联系人快速记录一笔互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0860` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3591` | 按钮 | 导出格式化会面简报 Markdown | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0861` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3594` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0862` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3595` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0863` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3602` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0864` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3610` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0865` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3627` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0866` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3640` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0867` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3649` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0868` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3657` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0869` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3669` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0870` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3681` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0871` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3690` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0872` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3701` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0873` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3723` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0874` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3731` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0875` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3757` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0876` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3816` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0877` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3816` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0878` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3817` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0879` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3817` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0880` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3818` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0881` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3818` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-0882` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3838` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0883` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3872` | 按钮 | 重试互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0884` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3874` | 按钮 | 查看互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0885` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3883` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0886` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3897` | 按钮 | 重试跟进 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0887` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3905` | 按钮 | 重试 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0888` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3932` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0889` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3937` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0890` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3947` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0891` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3965` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0892` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3982` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0893` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:3995` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0894` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4006` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0895` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4013` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0896` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4021` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0897` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4029` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0898` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4037` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0899` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4051` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0900` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4066` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0901` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4073` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0902` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4081` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0903` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4084` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0904` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4092` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0905` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4133` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0906` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4145` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0907` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4153` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0908` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4180` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0909` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4188` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0910` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4198` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0911` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4231` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0912` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4239` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0913` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4248` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0914` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4261` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0915` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4313` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0916` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4315` | 按钮 | 重试模板 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0917` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4319` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0918` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4323` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0919` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4328` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0920` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4341` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0921` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4357` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0922` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4368` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-0923` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4372` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0924` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4390` | 按钮 | 一键全部采纳 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0925` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4391` | 按钮 | 关闭 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0926` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4400` | 按钮 | + 采纳 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0927` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4408` | 按钮 | 💡 观点见解 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0928` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4409` | 按钮 | ❤️ 喜好忌口 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0929` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4410` | 按钮 | 💼 背景经历 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0930` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4411` | 按钮 | 📌 关键事实 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0931` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4420` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0932` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4438` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0933` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4440` | 按钮 | 重试 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0934` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4463` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0935` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4471` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0936` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4484` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-0937` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4488` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0938` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4493` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0939` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4503` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0940` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4515` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0941` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4527` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0942` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4535` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0943` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4553` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0944` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4569` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0945` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4581` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0946` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4584` | 按钮 | 重新读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0947` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4591` | 按钮 | 保留草稿并读取最新 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0948` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4592` | 按钮 | 放弃草稿并读取最新 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0949` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4593` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0950` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4605` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0951` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4607` | 按钮 | 重试保存 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0952` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4611` | 按钮 | 核对旧备注 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0953` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4620` | 按钮 | 打开人物文档核对 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0954` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4621` | 按钮 | 保留原文并解除旧备注关联 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0955` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4622` | 按钮 | 取消核对 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0956` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4626` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0957` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4639` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0958` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4649` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0959` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4650` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0960` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4676` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0961` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4681` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0962` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4688` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0963` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4689` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0964` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4690` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0965` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4691` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0966` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4692` | 单行输入框 | 自定义状态，如实习、休学 | 编辑修改并双向绑定状态值 |
| `ELEM-0967` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4693` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0968` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4694` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0969` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4697` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0970` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4701` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0971` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4702` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0972` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4708` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0973` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4709` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0974` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4718` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0975` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4719` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0976` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4722` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0977` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4730` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0978` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4732` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0979` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4734` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0980` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4736` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0981` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4737` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0982` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4740` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-0983` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4743` | 单行输入框 | 自定义状态，如实习、休学 | 编辑修改并双向绑定状态值 |
| `ELEM-0984` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4744` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-0985` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4745` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0986` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4749` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0987` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4756` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0988` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4757` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0989` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4769` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0990` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4770` | 按钮 | 重新读取共同背景 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0991` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4776` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0992` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4787` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0993` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4811` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-0994` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4813` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0995` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4823` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0996` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4841` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0997` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4842` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0998` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4843` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-0999` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4844` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1000` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4846` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1001` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4847` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1002` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4852` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1003` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4853` | 按钮 | 完成跟进；不会自动记录互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1004` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4854` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1005` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4863` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1006` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4872` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1007` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4873` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1008` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4890` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1009` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4895` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1010` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4901` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1011` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4907` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1012` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4909` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1013` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4915` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1014` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4930` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1015` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4942` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1016` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4963` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1017` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4982` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1018` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4986` | 单行输入框 | 如：2024年秋季行业峰会、创业路演 | 编辑修改并双向绑定状态值 |
| `ELEM-1019` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:4990` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1020` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5001` | 多行文本框 | 如：海鲜过敏、喜欢手冲浅烘、勿聊前东家 | 编辑修改并双向绑定状态值 |
| `ELEM-1021` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5004` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1022` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5005` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1023` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5019` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1024` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5177` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1025` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5194` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1026` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5197` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1027` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5206` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1028` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5214` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1029` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5221` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1030` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5227` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1031` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5233` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1032` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5251` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1033` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5268` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1034` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5271` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1035` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5275` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1036` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5285` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1037` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5296` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1038` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5304` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1039` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5323` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1040` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5335` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1041` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5343` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1042` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5361` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1043` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5372` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1044` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5390` | 按钮 | 重试 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1045` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5393` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1046` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5402` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1047` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5407` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1048` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5416` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1049` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5419` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1050` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5447` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1051` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5462` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1052` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5480` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1053` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5497` | 按钮 | 重试 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1054` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5500` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1055` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5509` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1056` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5518` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1057` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5527` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1058` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5541` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1059` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5555` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1060` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5564` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1061` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5585` | 按钮 | 导出会面简报 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1062` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5621` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1063` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5651` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1064` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5659` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1065` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5696` | 单行输入框 | 搜索备注或日期 | 编辑修改并双向绑定状态值 |
| `ELEM-1066` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5697` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1067` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5705` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1068` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5707` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1069` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5708` | 按钮 | 最近 30 天 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1070` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5709` | 按钮 | 最近 90 天 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1071` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5711` | 按钮 | 清除筛选 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1072` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5715` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1073` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5717` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-1074` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5724` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1075` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5726` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-1076` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5747` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1077` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5769` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1078` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5786` | 按钮 | 修改这条互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1079` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5789` | 按钮 | 删除这条互动 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1080` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5796` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1081` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5797` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1082` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5803` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1083` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5813` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1084` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5816` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1085` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5817` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1086` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5833` | 按钮 | 加载更多 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1087` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5838` | 按钮 | 清除筛选 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1088` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5842` | 按钮 | 去记一笔 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1089` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5853` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1090` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5872` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1091` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5887` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1092` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5896` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1093` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5908` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1094` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5916` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1095` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5922` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1096` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5928` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1097` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5937` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1098` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5941` | 按钮 | 清除筛选 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1099` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5971` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1100` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5977` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1101` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:5993` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1102` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6001` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1103` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6016` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1104` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6023` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1105` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6028` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1106` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6035` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1107` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6041` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1108` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6066` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1109` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6072` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1110` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6085` | 按钮 | 重试 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1111` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6091` | 按钮 | 选择联系人 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1112` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6093` | 按钮 | 返回工作台 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1113` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6107` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1114` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6108` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1115` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6132` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1116` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6147` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1117` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6179` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1118` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6182` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1119` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6189` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1120` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6191` | 按钮 | 重新读取并继续关系操作 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1121` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6197` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1122` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6199` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1123` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6201` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1124` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6202` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1125` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6238` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1126` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6257` | 按钮 | 关闭 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1127` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6260` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1128` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6273` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1129` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6287` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1130` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6294` | 按钮 | 下载 .md | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1131` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6325` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1132` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonDetail.svelte:6332` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1133` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:1` | 弹窗容器 | 弹窗: PersonEditDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-1134` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:732` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1135` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:752` | 单行输入框 | 例如：同事、朋友 | 编辑修改并双向绑定状态值 |
| `ELEM-1136` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:764` | 按钮 | 保留经历 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1137` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:765` | 按钮 | 确认移除这条经历 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1138` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:771` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1139` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:774` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1140` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:775` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1141` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:780` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1142` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:781` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1143` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:782` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1144` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:783` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1145` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:784` | 单行输入框 | 例如：兼职、社团骨干、休学 | 编辑修改并双向绑定状态值 |
| `ELEM-1146` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:785` | 单行输入框 | 仅记录这段组织经历 | 编辑修改并双向绑定状态值 |
| `ELEM-1147` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:788` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1148` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:810` | 按钮 | 编辑 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1149` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:811` | 按钮 | 补录历史 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1150` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:812` | 按钮 | 删除 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1151` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:817` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1152` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:818` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1153` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:819` | 单行输入框 | 例如：实习、兼职、休学 | 编辑修改并双向绑定状态值 |
| `ELEM-1154` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:820` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1155` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:821` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1156` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:822` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1157` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:823` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1158` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:824` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1159` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:825` | 按钮 | 保存 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1160` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:837` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1161` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:838` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1162` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:843` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1163` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:852` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1164` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:856` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1165` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:860` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1166` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:861` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1167` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:865` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1168` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:870` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1169` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:877` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1170` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:886` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1171` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:893` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1172` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:908` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1173` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:912` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1174` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:914` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1175` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonEditDialog.svelte:916` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1176` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:401` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1177` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:405` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1178` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:414` | 按钮 | 编辑补充资料 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1179` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:422` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1180` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:442` | 按钮 | 上移 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1181` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:443` | 按钮 | 下移 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1182` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:444` | 按钮 | 删除 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1183` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:448` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1184` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:453` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1185` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:456` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1186` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:467` | 按钮 | 保留子条目（解除分组） | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1187` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:468` | 按钮 | 连同子条目删除 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1188` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:469` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1189` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:474` | 按钮 | 确认删除条目 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1190` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:475` | 按钮 | 取消 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1191` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:484` | 按钮 | 添加资料条目 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1192` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:485` | 按钮 | 添加分组 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1193` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:486` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1194` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:487` | 按钮 | 取消编辑 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1195` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:491` | 按钮 | 添加资料条目 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1196` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:495` | 单行输入框 | 名称、分组或内容 | 编辑修改并双向绑定状态值 |
| `ELEM-1197` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:499` | 按钮 | 清空筛选 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1198` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:524` | 按钮 | 重新读取 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1199` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonFieldsEditor.svelte:525` | 按钮 | 打开人物文档 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1200` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:271` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1201` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:286` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1202` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:293` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1203` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:300` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1204` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:311` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1205` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:322` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1206` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:334` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1207` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:343` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1208` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:356` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1209` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:366` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1210` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:382` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1211` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:389` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1212` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:403` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1213` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:411` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1214` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:424` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1215` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:435` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1216` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:443` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1217` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:458` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1218` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:517` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1219` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:546` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1220` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:558` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1221` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:574` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1222` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonItinerary.svelte:584` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1223` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonMilestonesTimeline.svelte:112` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1224` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonMilestonesTimeline.svelte:129` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1225` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonMilestonesTimeline.svelte:148` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1226` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonMilestonesTimeline.svelte:158` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1227` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonMilestonesTimeline.svelte:186` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1228` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPicker.svelte:217` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1229` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPicker.svelte:236` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1230` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPicker.svelte:248` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1231` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPicker.svelte:269` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1232` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPicker.svelte:274` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1233` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:206` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1234` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:241` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1235` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:247` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1236` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:253` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1237` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:261` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1238` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:267` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1239` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:273` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1240` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:289` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1241` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:293` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1242` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:301` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1243` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:314` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1244` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:318` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1245` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:325` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1246` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:340` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1247` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:347` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1248` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:361` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1249` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:414` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1250` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:423` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1251` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:432` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1252` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonPromisesLedger.svelte:442` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1253` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:144` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1254` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:159` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1255` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:170` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1256` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:181` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1257` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:186` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1258` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:195` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1259` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:218` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1260` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:225` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1261` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:236` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1262` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonScratchpad.svelte:248` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1263` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:123` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1264` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:139` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1265` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:148` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1266` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:161` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1267` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:174` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1268` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:182` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1269` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:197` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1270` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:225` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1271` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/PersonSocialPreferences.svelte:235` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1272` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:1` | 弹窗容器 | 弹窗: ProfileCompletionDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-1273` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:175` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1274` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:190` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1275` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:205` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1276` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:213` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1277` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:216` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1278` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:217` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1279` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:221` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1280` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/ProfileCompletionDialog.svelte:223` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1281` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:1` | 弹窗容器 | 弹窗: QuickFillDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-1282` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:228` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1283` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:235` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1284` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:237` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1285` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:243` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1286` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:244` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1287` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:253` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1288` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:279` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1289` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:281` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1290` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickFillDialog.svelte:283` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1291` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:1` | 弹窗容器 | 弹窗: QuickRecordDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-1292` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:140` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1293` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:149` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1294` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:157` | 按钮 | 今天 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1295` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:158` | 按钮 | 昨天 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1296` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:159` | 按钮 | 前天 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1297` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:167` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1298` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:184` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1299` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:197` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1300` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:203` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1301` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:208` | 按钮 | 💡 观点见解 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1302` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:209` | 按钮 | ❤️ 喜好忌口 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1303` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:210` | 按钮 | 💼 背景经历 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1304` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:211` | 按钮 | 📌 关键事实 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1305` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:217` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1306` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/QuickRecordDialog.svelte:224` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1307` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:1` | 弹窗容器 | 弹窗: RegionExplorerDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-1308` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:248` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1309` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:264` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1310` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:274` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1311` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:296` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1312` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:299` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1313` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:321` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1314` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:322` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1315` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:342` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1316` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:358` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1317` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:373` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1318` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:382` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1319` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:390` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1320` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:402` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1321` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:412` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1322` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:429` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1323` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RegionExplorerDialog.svelte:444` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1324` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipLabels.svelte:109` | 按钮 | 重新读取核实称谓 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1325` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipLabels.svelte:112` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1326` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipLabels.svelte:116` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1327` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipLabels.svelte:127` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1328` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipLabels.svelte:128` | 按钮 | 取消称谓草稿 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1329` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipStageTracker.svelte:73` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1330` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipStageTracker.svelte:130` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1331` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipStageTracker.svelte:143` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1332` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipStageTracker.svelte:148` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1333` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipStageTracker.svelte:163` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1334` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipStageTracker.svelte:171` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1335` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/RelationshipStageTracker.svelte:186` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1336` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:187` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1337` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:188` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1338` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:193` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1339` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:204` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1340` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:208` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1341` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:209` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1342` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:210` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1343` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:212` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1344` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:213` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1345` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:217` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1346` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:225` | 多行文本框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1347` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TemplateManager.svelte:230` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1348` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:1` | 抽屉容器 | 抽屉: TidyDrawer | 提供滑出交互抽屉面板 |
| `ELEM-1349` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:121` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1350` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:134` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1351` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:139` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1352` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:173` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1353` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:191` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1354` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:206` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1355` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:230` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1356` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TidyDrawer.svelte:238` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1357` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TrashDrawer.svelte:1` | 抽屉容器 | 抽屉: TrashDrawer | 提供滑出交互抽屉面板 |
| `ELEM-1358` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TrashDrawer.svelte:127` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1359` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TrashDrawer.svelte:129` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1360` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TrashDrawer.svelte:145` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1361` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TrashDrawer.svelte:216` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1362` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/TrashDrawer.svelte:238` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1363` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:1` | 弹窗容器 | 弹窗: VCardDialog | 提供模态交互浮层、支持ESC与遮罩点击关闭 |
| `ELEM-1364` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:410` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1365` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:421` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1366` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:433` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1367` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:451` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1368` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:468` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1369` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:471` | 按钮 | 下载带标准表头的 CSV/Excel 模版文件，填好后可直接 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1370` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:474` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1371` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:490` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1372` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:493` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1373` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:496` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1374` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:498` | 按钮 | 当前项结束后暂停 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1375` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:502` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1376` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:503` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1377` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:504` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1378` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:506` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1379` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:510` | 按钮 | 仅核实重试失败/未知项 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1380` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:563` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1381` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:564` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1382` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:567` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1383` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:568` | 按钮 | 重新选择文件 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1384` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:581` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1385` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:593` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1386` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:611` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1387` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:645` | 按钮 | 选择文件 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1388` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:654` | 按钮 | 关闭 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1389` | Batch-3 | 联系人名册与详情 (People) | `src/components/people/VCardDialog.svelte:656` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1390` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1` | 主页面/视图 | 主视图: SettingsView | 承载主导航与一级核心业务大盘 |
| `ELEM-1391` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:92` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-1392` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1104` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1393` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1114` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1394` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1117` | 分段/标签切换控件 | 视图或子分类 Tab 切换 | 切换当前活动视图或子页面 |
| `ELEM-1395` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1171` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1396` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1207` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1397` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1210` | 单行输入框 | 自定义 | 编辑修改并双向绑定状态值 |
| `ELEM-1398` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1217` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1399` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1219` | 按钮 | 上传图片 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1400` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1220` | 按钮 | 移除图片 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1401` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1227` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1402` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1236` | 按钮 | 打开文档 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1403` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1251` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1404` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1270` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1405` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1273` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1406` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1279` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1407` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1280` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1408` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1289` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1409` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1290` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1410` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1298` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1411` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1307` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1412` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1316` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1413` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1323` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1414` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1331` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1415` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1342` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1416` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1353` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1417` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1358` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1418` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1363` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1419` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1369` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1420` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1383` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1421` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1391` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1422` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1414` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1423` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1431` | 单选框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1424` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1439` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1425` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1447` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1426` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1448` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1427` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1449` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1428` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1450` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1429` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1453` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1430` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1469` | 按钮 | 确认切换数据库 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1431` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1470` | 按钮 | 取消重绑预览 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1432` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1479` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1433` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1484` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1434` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1505` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1435` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1515` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1436` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1515` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1437` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1527` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1438` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1529` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1439` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1539` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1440` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1559` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1441` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1569` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1442` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1579` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1443` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1590` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1444` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1617` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1445` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1630` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1446` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1643` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1447` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1649` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1448` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1651` | 按钮 | 重试差异明细 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1449` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1654` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1450` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1698` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1451` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1708` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1452` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1715` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1453` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1724` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1454` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1749` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1455` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1760` | 下拉选择框 | 下拉选择选项 | 下拉切换选中枚举项 |
| `ELEM-1456` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1769` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1457` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1773` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1458` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1785` | 按钮 | 确认补建并核实 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1459` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1786` | 按钮 | 重新核实补列预览 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1460` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1787` | 按钮 | 取消补列预览 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1461` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1797` | 按钮 | 运行资料体检 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1462` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1817` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1463` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1821` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1464` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1833` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1465` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1849` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1466` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1865` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1467` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1867` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1468` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1871` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1469` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1873` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1470` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1877` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1471` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1879` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1472` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1885` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1473` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1889` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1474` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1911` | 复选框/开关 | 开关/勾选项 | 编辑修改并双向绑定状态值 |
| `ELEM-1475` | Batch-5 | 全局设置 (Settings) | `src/components/SettingsView.svelte:1917` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1476` | Batch-5 | 通用与公共组件 | `src/components/StatusNotice.svelte:39` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1477` | Batch-5 | 通用与公共组件 | `src/components/StatusNotice.svelte:41` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1478` | Batch-5 | 通用与公共组件 | `src/components/ViewState.svelte:24` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1479` | Batch-5 | 通用与公共组件 | `src/components/ViewState.svelte:25` | 错误态/提示反馈 | 错误反馈或告警提示条 | 提示错误原因并支持重新尝试或跳过 |
| `ELEM-1480` | Batch-5 | 通用与公共组件 | `src/components/ViewState.svelte:33` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1481` | Batch-5 | 通用与公共组件 | `src/components/ViewState.svelte:59` | 空态提示/占位 | 空数据引导或未匹配占位 | 显示空态说明与快速创建/收编引导动作 |
| `ELEM-1482` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:1` | 主页面/视图 | 主视图: Workbench | 承载主导航与一级核心业务大盘 |
| `ELEM-1483` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:664` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1484` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:675` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1485` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:686` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1486` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:700` | 单行输入框 | 输入字段 | 编辑修改并双向绑定状态值 |
| `ELEM-1487` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:702` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1488` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:703` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1489` | Batch-1 | 工作台外壳与导航 (Workbench) | `src/components/Workbench.svelte:711` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1490` | Batch-5 | 通用与公共组件 | `src/components/WorkspaceRecovery.svelte:115` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1491` | Batch-5 | 通用与公共组件 | `src/components/WorkspaceRecovery.svelte:116` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1492` | Batch-5 | 通用与公共组件 | `src/components/WorkspaceRecovery.svelte:117` | 按钮 | 操作按钮 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1493` | Batch-5 | 通用与公共组件 | `src/components/WorkspaceRecovery.svelte:118` | 按钮 | 进入初始化向导（明确新建或复用） | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1494` | Batch-5 | 通用与公共组件 | `src/components/WorkspaceRecovery.svelte:128` | 按钮 | 预览重绑 | 点击触发对应业务逻辑或状态切换 |
| `ELEM-1495` | Batch-5 | 通用与公共组件 | `src/components/WorkspaceRecovery.svelte:136` | 按钮 | 确认重绑并恢复工作台 | 点击触发对应业务逻辑或状态切换 |
