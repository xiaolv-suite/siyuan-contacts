# 小驴人脉（siyuan-contacts）全入口功能与 UI/UX 深度排查待办池（2026-10-31 只查不改轮）

- **排查基线版本**：`v0.7.1`（Commit `79d741b`）
- **本轮原则**：只排查不开发，源码与样式一行不改；UI 审查结合 `$ui-ux-pro-max` 规范与 5 项专项补充维度（令牌与硬编码、跨面板控件一致性、交互 9 态齐备性、125%/150% 系统缩放与窄窗口截断、首屏关键操作可见性）；功能审查遍历一/二/三级全部入口并验证“输入 $\rightarrow$ 处理 $\rightarrow$ 持久化 $\rightarrow$ 重载 $\rightarrow$ 异常恢复”全链路。
- **统计总览**：
  - **UI 审查共查出**：**10 条**（`UI-01` ~ `UI-10`，已合并同根因项）
  - **功能实现共查出**：**12 条**（其中 **10 条**为可开发修复的缺陷/半成品/未完成功能 `FUNC-01` ~ `FUNC-10`；**2 条**判定为**受平台限制无法实现** `LIMIT-01` ~ `LIMIT-02`）

---

## 一、 全界面一 / 二 / 三级入口全景核验表

在进入待办池明细前，先列出全插件所有交互入口的三态核验结论（**已实现且可用** / **链路不完整或有缺陷 [入池]** / **技术上可行但未做 [入池]** / **受平台限制无法实现**）：

### 1.1 宿主级与跨插件入口（一级 $\rightarrow$ 二级）

| 一级入口 | 二级/三级子入口与触发方式 | 全链路核验结论 | 对应待办编号与说明 |
| :--- | :--- | :--- | :--- |
| **思源顶栏按钮** | 点击 `iconLvContacts` 图标打开工作台 Tab（移动端打开全屏 Dialog） | 已实现且可用 | 持久化上次停留视图，重载正常 |
| **命令面板 / 快捷键** | `openWorkbench`（打开工作台）、`captureFromNote`（从当前笔记捕获人脉） | 已实现且可用 | 未初始化时给出明确提示 |
| **插件管理设置齿轮** | 思源“设置 $\rightarrow$ 集市 $\rightarrow$ 已安装 $\rightarrow$ 小驴人脉设置”（`openSetting`） | 已实现且可用 | 桌面独立设置窗 / 工作台设置页正常 |
| **编辑器右键/块菜单** | 选中文本右键「人脉：识别资料」$\rightarrow$ `QuickFillDialog` $\rightarrow$ `PersonEditDialog` / `AddPersonDialog` | **链路有缺陷 [入池]** | `src/index.ts:715` 挂载 `PersonEditDialog` 漏传 `onUpdateOrgMembership` 与 `onRemoveOrgMembership`（见 `FUNC-04`） |
| **编辑器右键/块菜单** | 文档内右键「人脉：从笔记捕获人脉」$\rightarrow$ `CaptureDialog` 三步向导 | **链路有缺陷 [入池]** | `CaptureDialog.svelte:355` 随路沉淀事实失败被 `catch` 静默吞掉无反馈（见 `FUNC-02`） |
| **文档顶部浮动档案条（人物）** | 电话/微信/邮箱点击复制、`+N` 展开、会前简报折叠、「记互动」弹窗、「编辑资料」弹窗、「打开人脉」 | **链路有缺陷 [入池]** | `person-panel.ts:604` 打开 `PersonEditDialog` 漏传全部 8 个组织归属与关系称谓回调，且保存后未广播 `emitDataChanged`（见 `FUNC-04`） |
| **文档顶部浮动档案条（组织）** | 「名册成员」下钻按钮、「组织全景」跳转按钮 | **链路断链 [入池]** | 工作台未打开时 `CustomEvent` 同步发出即丢失；且 `openPeople` 未消费 `workQuery`（见 `FUNC-04`） |
| **文档顶部浮动档案条（城市）** | 「同城好友」下钻按钮、「行程规划」按钮 | **链路断链 [入池]** | 工作台未打开时事件丢失；「行程规划」仅切到 `home` 未打开 `RegionExplorerDialog`（见 `FUNC-04`） |
| **跨插件联邦与外部桥** | 打卡事件订阅/记录、雷切小组件注册、管家到期问候同步、`window.siyuanContactsBridge` v2 | 已实现且可用 | 均带安全降级与幂等请求核实 |

### 1.2 工作台外壳与五大主视图（一级 $\rightarrow$ 二级 $\rightarrow$ 三级）

| 主视图（一级） | 二级面板 / 弹窗 / 抽屉 | 三级操作与全链路核验结论 | 对应待办编号与说明 |
| :--- | :--- | :--- | :--- |
| **工作台外壳 (`Workbench`)** | 左侧栏/底栏 5 导航、顶栏搜索、新建按钮、右侧 `ContextPanel` 速览面板 | **半成品 [入池]** | `ContextPanel.svelte:43` 将联络周期写死为 `30` 天、`paused` 写死为 `false`，且未接入离席隐私保护盾（见 `FUNC-06`） |
| **1. 首页 (`DashboardView`)** | 关注摘要、快速开始、4 统计卡、黑金里程碑、那年今日、温度卡、近期走势、城市卡、漏斗卡 | 已实现且可用 | 跨午夜自动刷新、下钻与撤销正常 |
| 首页 $\rightarrow$ 二级组件 | 年度交往活跃度热力图 (`ActivityHeatmap`) | **半成品 [入池]** | 格子设为 `button` 且 `cursor: pointer`，但 `DashboardView.svelte:1456` 未传 `onSelectDate`，点击无任何反应（见 `FUNC-07`） |
| 首页 $\rightarrow$ 二级弹窗 | 「✨ 潜在关联发现」弹窗 (`discoveryOpen`) | **链路有缺陷 [入池]** | `DashboardView.svelte:950,963` 读取失败静默返回 `[]` 伪装成“无潜在关联”空态，建链失败仅打 `console.warn` 无提示（见 `FUNC-05`） |
| 首页 $\rightarrow$ 二级弹窗 | 「🧧 人情账本」(`ExchangesHubDialog`)、「🛡️ 会前速查」(`PreMeetingHubDialog`)、「🧊 降温预警」(`CoolingRadarDialog`)、「🎊 近期纪念日」(`AnniversariesHubDialog`) | **链路断链 [入池]** | 点击人物调用 `onOpenPeople({ memberDocIds: [docId] })` 未传 `label` 且未调 `onOpenDetail`，跳到名册后既不开详情也不过滤（见 `FUNC-01`） |
| 首页 $\rightarrow$ 二级弹窗 | 「🎪 群体活动大盘」(`OccasionsHubDialog`) | **链路断链 [入池]** | 1. 点击人物无 `label` 过滤失效；2. 未访问过名册时 `peopleOrder` 为空导致「名册下钻」匹配 0 人；3. 点击「+ 记一场群体活动」未打开 `OccasionDialog`（见 `FUNC-01`） |
| **2. 联系人 (`PeopleView`)** | 搜索、卡片/表格、排序、分组胶囊、A-Z 索引、保存视图 (`viewsmenu`)、更多筛选 (`morefilter`)、列配置 (`colmenu`) | **UI 与缩放缺陷 [入池]** | 150% 缩放与窄屏下 `.lvct-people__toolbar` 横向溢出；条件超过 4 项时未折叠收纳（见 `UI-04`、`FUNC-09`） |
| 联系人 $\rightarrow$ 二级弹窗/抽屉 | 新建 (`AddPersonDialog`)、粘贴识别 (`QuickFillDialog`)、vCard (`VCardDialog`)、收编 (`ImportDialog`)、补录 (`ProfileCompletionDialog`)、合并向导 (`ContactMergeWizard`)、待安顿 (`TidyDrawer`)、回收站 (`TrashDrawer`) | **缩放与阻塞确认问题 [入池]** | 1. 125%/150% 缩放下新建与粘贴识别的「创建联系人」按钮掉出首屏（`UI-05`）；2. 批量导出/制卡仍用原生 `window.confirm`（`UI-07`） |
| 联系人 $\rightarrow$ 二级弹窗 | 名册工具栏「🎪 群体活动大盘」(`OccasionsHubDialog`) $\rightarrow$ 三级「名册下钻」 | **链路断链 [入池]** | `PeopleView.svelte:2973,2981` 直接将 `docId` 赋给存 `itemId` 的 `focusIds`，导致下钻恒为 0 人（见 `FUNC-01`） |
| **3. 人物详情 (`PersonDetail`)** | 头部操作栏、会前 30 秒速览卡、概览/互动/相关人三 Tab 及 20 个业务子模块 | **多处链路缺陷 [入池]** | 1. `doc-section.ts:142,157` 静默吞掉事实画像读写异常，导致失败仍显示成功、重开丢失（`FUNC-02`）；<br>2. 谈资/时间线/块引用/反链摘要 4 处剪贴板复制在 `catch` 块中伪造“已复制 ✓”（`FUNC-03`）；<br>3. 潜在交集推荐 `discoverPersonTies` 硬编码传 `[]` 导致共同组织推荐失效（`FUNC-05`）；<br>4. 礼物转入账本后未更新礼物状态为 `given` 且未刷新 `personExchanges`（`FUNC-05`）；<br>5. 概览页「记一笔互动」排在第 19 个区块（首屏下方 1350px 处，见 `UI-05`）。 |
| **4. 关系图谱 (`RelationGraph`)** | 关系图/引用图、画布/文本、范围/深度/搜索/分组/孤立节点、路径/共同查询、布局/缩放/全屏、时间演化滑轨、枢纽分析 (`NetworkHubsModal`)、底部交互式图例 | **平台限制 1 项** | 插件内功能均可用；直接打开并定位思源原生局部图面板受宿主 API 限制（见 `LIMIT-02`） |
| **5. 组织 (`OrgsView`)** | 搜索、状态过滤、组织卡片、新建/编辑资料 (`OrganizationProfileEditor`)、组织管理 (`OrgManagerDialog`) | **链路遗漏 1 项 + 未做 1 项 [入池]** | 1. `src/index.ts:1335` 打开 `OrgManagerDialog` 漏传 `onEditOrganization`（`FUNC-04`）；2. 部门稳定 ID 改名联动与独立只读组织总览页未做（`FUNC-10`） |
| **6. 设置 (`SettingsView`)** | 通用、数据与字段、提醒、AI 与隐私、服务桥、关于 | **链路遗漏 1 项 + 未做 1 项 [入池]** | 1. 内嵌 `ReviewReportDialog` 漏传 `onOpenDoc`（`FUNC-04`）；2. 备份合并仍用 `window.confirm`（`UI-07`）；3. CardDAV 在线同步标“未接入”（`FUNC-08`） |

---

## 二、 受平台限制无法实现项（共 2 条 · 明确限制来源与替代方案）

以下 2 项经核对思源内核源码与 `siyuan.d.ts` 公共契约，确认为**受平台限制无法实现**，不列入代码开发批次，保留现有替代方案：

### `LIMIT-01`：在思源原生属性视图（Attribute View）单列中直接存储多电话/多邮箱/多网址结构化对象
- **判定结论**：`受平台限制无法实现`
- **限制来源**：思源笔记内核的 Attribute View 数据库列类型（`phone`、`email`、`url`）底层数据结构均为单标量字符串（Single Scalar Value），不支持单单元格内存储带类型标签（如“工作/住宅/主号”）的多值数组，也不支持跨数据库的二级子表关联。
- **当前替代方案**：主用电话、邮箱、网址保存在 Attribute View 原生列中以支持名册展示、排序与 vCard 主值映射；联系人的第 2~N 个电话、邮箱、网址保存在人物文档受控块驱动的「补充资料（`PersonFieldsEditor`）」两层分组中，支持同名重复条目、筛选与一键复制，并在 UI 中明确提示边界。

### `LIMIT-02`：从插件内无副作用地直接打开思源原生局部关系图（Local Graph）dock 面板并定位到指定人物节点
- **判定结论**：`受平台限制无法实现`
- **限制来源**：
  1. 思源宿主打开原生图面板的 `openGraph` 函数属于宿主内部模块（`app/src/layout/dock/util.ts`），未在插件公共 API（`siyuan.d.ts` 的 `openTab` / `openMobileFileById`）中开放；
  2. 思源内核 `/api/graph/getGraph` 与 `/api/graph/getLocalGraph` 端点在被调用时会把传入的查询参数直接覆写保存到用户的全局图谱配置（`conf.Graph`）中，产生破坏用户思源原生图设置的副作用（实证见 `docs/GRAPH-RESEARCH-2026-10-12.md`）。
- **当前替代方案**：插件在关系图谱视图内提供独立的「文档引用图（`native`）」模式，通过只读查询思源 `refs` 与 `blocks` SQL 表，在插件自有 Cytoscape 画布中零副作用地还原文档双链引用网络，并提供一键在主编辑器打开来源文档。

---

## 三、 合并去重后的完整待办池（共 20 条可开发项：功能 10 条 + UI 10 条）

- **去重与合并说明**：相同根因的跨文件问题已合并为同一条目并在标题和描述中注明全部关联位置。
- **优先级公式**：$\text{优先级得分} = \frac{\text{影响面 (1-5)} \times \text{频率 (1-5)}}{\text{成本 (1-5)}}$（影响面、频率、成本均为 1~5 整数，成本：`1=小[≤0.5h]`、`2=中小[1h]`、`3=中[2h]`、`4=中大[4h]`、`5=大[≥1d]`）。

---

### 第一部分：功能实现与全链路排查待办（`FUNC-01` ~ `FUNC-10`）

#### `[FUNC-01]` 【缺陷】首页五大中枢弹窗与名册群体活动大盘点击人物/下钻/新建活动存在 4 处跨组件断链
- **合并关联项**：首页 `ExchangesHubDialog` / `PreMeetingHubDialog` / `CoolingRadarDialog` / `AnniversariesHubDialog` / `OccasionsHubDialog` 点击人物无响应、首页未进过名册时活动参会人下钻为 0 人、名册 `OccasionsHubDialog` 下钻将 `docId` 当 `itemId` 导致 0 人、首页活动大盘点击「+ 记一场群体活动」未弹出录入框。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/components/dashboard/DashboardView.svelte:2136-2140, 2150-2154, 2164-2168, 2179-2182, 2202-2213`
    2. `src/components/Workbench.svelte:467-486`
    3. `src/components/people/PeopleView.svelte:2969-2985`
  - **操作步骤**：
    1. 打开工作台首页，依次打开「🧧 人情账本」、「🛡️ 会前速查」、「🧊 降温预警」、「🎊 近期纪念日」、「🎪 群体活动」五个大盘弹窗，点击任意联系人姓名或「查看画像 / 去破冰联系」按钮；
    2. 刚打开工作台停留在首页（尚未点击左侧“联系人”导航）时，打开「🎪 群体活动」大盘，点击某场活动的「名册下钻」；
    3. 在首页「🎪 群体活动」大盘右上角点击「+ 记一场群体活动」；
    4. 切换到「联系人」名册页，从名册工具栏打开「🎪 群体活动」大盘，点击某场活动的「名册下钻」。
  - **当前表现**：
    1. 步骤 1 中弹窗关闭后仅切换到名册全量列表，因 `onOpenPeople({ memberDocIds: [docId] })` 未传 `label`，`PeopleView.svelte:713`（`if (!focusLabel) return true`）不做任何过滤，也未打开该人物详情；
    2. 步骤 2 中因尚未访问过名册页，`Workbench.svelte:478` 的 `peopleOrder` 为空数组 `[]`，无法将 `memberDocIds` 映射为 `itemIds`，导致名册显示 `0 人`；
    3. 步骤 3 中仅关闭了大盘并切到名册页，未弹出 `OccasionDialog`；
    4. 步骤 4 中 `PeopleView.svelte:2981` 直接执行 `focusIds = filter.memberDocIds`（把 `docId` 赋给了存 `itemId` 的 `focusIds`），导致 `focus.has(person.itemId)` 恒为 `false`，名册显示 `来自活动：xxx（0 人）`。
  - **期望表现**：
    1. 在五大中枢弹窗点击具体联系人时，应直接调用 `onOpenDetail`（或 `openPersonByDocId`）打开该联系人的详情窗口；
    2. 无论是否提前访问过名册页，从首页或名册的群体活动大盘点击「名册下钻」，均能正确匹配全部参会联系人；
    3. 在首页群体活动大盘点击「+ 记一场群体活动」应直接打开新建群体活动弹窗。
- **解决方案**：
  1. 在 `DashboardView.svelte` 中将五大中枢弹窗的 `onOpenPerson={(docId) => ...}` 改为从 `data?.allPeople` 查找对应 `ContactSummary` 并调用 `onOpenDetail(person)`（找不到时回退带 `label` 的 `onOpenPeople`）；在 `AnniversariesHubDialog` 的 `onLogInteraction` 中增加 `try/catch` 错误提示；
  2. 在 `PeopleView.svelte:704` 的 `filtered` 派生中，使 `focus` 集合同时匹配 `focus.has(person.itemId) || focus.has(person.docId)`，并在 `Workbench.svelte:478` 中当 `peopleOrder` 为空时直接保留 `memberDocIds` 传入 `peopleFocusIds`；
  3. 在 `DashboardView.svelte`（或 `Workbench.svelte`）支持打开 `OccasionDialog`，使首页活动大盘点击「+ 记一场群体活动」直接弹出新建活动窗口。
- **成本**：**小（1）** —— 仅涉及 3 个组件的事件回调与 ID 集合匹配逻辑，约 30 行代码。
- **风险**：无外部依赖；需确保 `PeopleView` 的 `focusIds` 兼容 `itemId` 与 `docId` 后不影响“选择全部筛选”批量操作（批量操作基于 `filtered` 结果的 `person.itemId`，不受影响）。
- **优先级**：影响面 `5` × 频率 `5` ÷ 成本 `1` = **25.0（P0）** —— 首页与名册五大高频中枢的核心出口断链，影响面与频率最高、修复成本最低。

---

#### `[FUNC-02]` 【缺陷】人物事实画像读写与文档正文同步底层静默吞掉异常，导致读取失败时新增事实会覆盖清空原块、写入失败仍提示成功
- **合并关联项**：`doc-section.ts` 中 `loadPersonFactsFromDoc` / `savePersonFactsToDoc` / `syncPersonProfileDocSection` 等 7 处静默 `catch`、`PersonDetail.svelte` 记互动/采纳事实/同步正文的悬空 Promise 与无错误反馈、`QuickRecordDialog.svelte` 与 `CaptureDialog.svelte` 随路沉淀事实静默失败。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/services/doc-section.ts:67, 85, 100, 115, 130, 142-145, 157-159`
    2. `src/components/people/PersonDetail.svelte:462-466, 1036-1038, 1048-1050, 1071-1102, 2096-2111`
    3. `src/components/people/QuickRecordDialog.svelte:92-107`
    4. `src/components/capture/CaptureDialog.svelte:355`
  - **操作步骤**：
    1. 当人物思源文档不可达或内核 `readMarkedBlocks` / `upsertMarkedBlock` 返回错误时，打开人物详情页查看“事实画像”区块；
    2. 在详情页手动添加一条事实、或点击“采纳提炼事实”、或在记互动时勾选“同时沉淀为人物事实画像”并保存；
    3. 点击详情页顶部的「同步档案到正文」按钮。
  - **当前表现**：
    1. `loadPersonFactsFromDoc`（`doc-section.ts:142`）在 `catch` 中静默返回 `[]`，导致 `PersonDetail.svelte:1061` 的 `factsError` 永远无法触发；若此时用户添加新事实，会将 `[newItem]` 写回文档，覆盖丢失原有的全部事实；
    2. `savePersonFactsToDoc`（`doc-section.ts:157`）在 `catch` 中静默吞掉异常不抛错，导致 `PersonDetail.svelte:1084` 直接执行 `facts = next` 假装保存成功，关闭重开后数据全部丢失；
    3. `QuickRecordDialog.svelte:93` 使用未 `await` 的 `void (async () => { ... })()` 写事实，窗口立即关闭且异常静默吞掉；
    4. `handleSyncDocProfile`（`PersonDetail.svelte:2100`）因底层 `syncFullPersonDocument` 吞掉全部子异常，即使文档已被删除或写入失败，界面仍显示绿色“已同步到文档 ✓”。
  - **期望表现**：
    1. `loadPersonFactsFromDoc` 与 `savePersonFactsToDoc` 失败时必须向上抛出异常，由 UI 层 `factsError` 展示错误与「重试」按钮，且在 `factsError` 未解除前禁止盲目覆盖写回；
    2. 记互动随路沉淀事实必须 `await` 完成后再关闭弹窗，若互动已记但事实沉淀失败，明确给出分项提示；
    3. 手动点击「同步档案到正文」时若失败应展示错误提示，不得伪报“已同步 ✓”。
- **解决方案**：
  1. 移除 `src/services/doc-section.ts` 中 `loadPersonFactsFromDoc` 与 `savePersonFactsToDoc` 的静默 `catch` 吞错逻辑，让异常正常上抛；
  2. 在 `PersonDetail.svelte` 的 `handleAddFact`、`handleRemoveFact`、`adoptExtractedFact`、`adoptAllExtractedFacts` 中捕获异常并写入 `factsError`，且在 `factsError` 非空时禁用新增/删除以避免空基线覆盖；
  3. 在 `QuickRecordDialog.svelte:93` 中改为 `await` 事实写入；
  4. 为 `syncFullPersonDocument` 增加严格模式参数或返回失败子项列表，供 `handleSyncDocProfile` 展示真实结果。
- **成本**：**中（2）** —— 涉及 `doc-section.ts` 服务层与 3 个组件的异步错误处理闭环。
- **风险**：需检查现有单元测试与 UI 冒烟中是否有故意在不提供文档块 mock 时调用 `loadPersonFactsFromDoc` 的用例（看 `PersonDetail.svelte:1058` 已有 `try/catch` 处理 `factsError`，不会破坏组件挂载）。
- **优先级**：影响面 `5` × 频率 `4` ÷ 成本 `2` = **10.0（P0）** —— 涉及用户数据静默覆盖丢失与假成功反馈，属于高危数据安全缺陷。

---

#### `[FUNC-03]` 【缺陷】人物详情页 4 处剪贴板复制操作在 `catch` 失败分支中反将状态设为“已复制 ✓”（假成功反馈）
- **合并关联项**：`handleCopyTopic`（复制会面谈资）、`copyTimelineMarkdown`（复制往来记录 Markdown）、`copyBlockUri`（复制块引用链接）、`copyBacklinkSummaryMarkdown`（复制反链摘要 Markdown）、`handleCopyVcf`（复制名片文本失败无提示）。
- **问题描述（可复现）**：
  - **位置**：`src/components/people/PersonDetail.svelte:1359-1366, 1452-1454, 1862-1869, 1943-1950, 1971-1978`
  - **操作步骤**：在剪贴板权限受限或 `copyPlainText` 抛出异常的环境下，点击人物详情页的「复制谈资」、「复制时间线 Markdown」、「复制块引用」、「复制反链摘要」或「复制 vCard 文本」。
  - **当前表现**：前 4 处函数的 `catch (err)` 块中编写了 `copiedTopicId = topic.id`、`timelineCopied = true`、`copiedBlockUriId = blockId`、`backlinkSummaryCopied = true`，导致复制失败时按钮依然变成绿色“✓ 已复制”；第 5 处 `handleCopyVcf` 仅打 `console.warn` 无任何界面提示。
  - **期望表现**：复制成功才显示“✓ 已复制”；复制失败时不得伪造成功状态，应通过 `copyFieldError` 或 `StatusNotice` 提示用户“复制失败，请手动复制”。
- **解决方案**：清理 `PersonDetail.svelte` 上述 4 处 `catch` 块中将 `copied*` 设为 `true` 的错误代码，统一走 `copyFieldError = requestErrorMessage(err)` 显示失败提示。
- **成本**：**小（1）** —— 仅单文件 `PersonDetail.svelte` 内部 5 个函数的 `catch` 分支修正。
- **风险**：需同步检查 UI 回归测试中是否有在不提供剪贴板 API 的环境里断言 `copied*` 状态的用例（`copyPlainText` 在 `src/shared/clipboard.ts` 中已有 `execCommand("copy")` 降级兜底，正常测试环境均走 `try` 成功分支）。
- **优先级**：影响面 `4` × 频率 `4` ÷ 成本 `1` = **16.0（P0）** —— 典型的假反馈缺陷，改动极小、收益直接。

---

#### `[FUNC-04]` 【缺陷】文档浮动档案条与多处独立弹窗挂载入口漏传核心 Props 回调，导致子功能消失或事件丢失
- **合并关联项**：
  1. `person-panel.ts:604` 档案条打开 `PersonEditDialog` 漏传全部 8 个组织/称谓回调且保存未广播 `emitDataChanged`；
  2. `src/index.ts:715` 识别资料打开 `PersonEditDialog` 漏传 `onUpdateOrgMembership` / `onRemoveOrgMembership`；
  3. `person-panel.ts:280, 351, 370` 组织/城市档案条在工作台未打开时同步派发 `CustomEvent` 丢失，且城市「行程规划」按钮仅切到 `home` 未打开 `RegionExplorerDialog`；
  4. `src/index.ts:1335` 独立打开 `OrgManagerDialog` 漏传 `onEditOrganization`；
  5. `SettingsView.svelte:1798` 资料体检内嵌 `ReviewReportDialog` 漏传 `onOpenDoc`。
- **问题描述（可复现）**：
  - **位置**：`src/panels/person-panel.ts:278-302, 348-373, 599-614`、`src/index.ts:715-733, 1335-1352`、`src/components/SettingsView.svelte:1798`
  - **操作步骤**：
    1. 在思源编辑器打开任意联系人文档，点击顶部浮动档案条的「编辑资料」，展开“补充资料”；
    2. 关闭人脉工作台 Tab，打开任意组织文档或城市专题文档，点击浮动档案条的「名册成员」、「同城好友」或「行程规划」；
    3. 在设置页点击「运行资料体检」，点击生成体检报告文档后的打开文档入口。
  - **当前表现**：
    1. 从文档档案条打开的编辑弹窗中，因未传组织与关系称谓回调，无法查看或维护该联系人的组织经历与关系称谓；且修改姓名/电话保存后，已打开的工作台不会自动刷新；
    2. 当工作台未打开时，点击组织/城市档案条按钮会先异步创建工作台 Tab，但 `lvct-workbench-view` 事件在同步下一行即发出，此时 `Workbench.svelte` 尚未挂载监听，事件直接丢失；且点击城市档案条「行程规划」只切到首页，未打开城市行程助手弹窗；
    3. 从设置页资料体检或独立组织管理弹窗操作时，缺少打开文档或编辑组织资料入口。
  - **期望表现**：所有入口打开的同一弹窗具备完整一致的回调能力；工作台冷启动时仍能准确接收档案条的下钻/弹窗请求。
- **解决方案**：
  1. 在 `src/index.ts` 中封装统一的 `openPersonEditDialog(person, initialPatch?)` 方法，注入完整的组织归属与关系称谓回调及 `emitDataChanged`，供 `person-panel.ts` 与 `openPersonEditPrefilled` 复用；
  2. 在 `LvContactsPlugin` 实例上维护 `pendingWorkbenchRequest`（支持携带 `view`、`focus`、`openRegionExplorer`），当 `Workbench.svelte` 在 `onMount` 挂载完成后主动消费该挂起请求，解决冷启动事件丢失；
  3. 为 `src/index.ts:1335` 的 `OrgManagerDialog` 补传 `onEditOrganization`，为 `SettingsView.svelte:1798` 的 `ReviewReportDialog` 补传 `onOpenDoc={(docId) => facade.openPersonDoc?.(docId)}`。
- **成本**：**中（2）** —— 涉及 `src/index.ts`、`src/panels/person-panel.ts`、`Workbench.svelte` 与 `SettingsView.svelte` 的接线统一。
- **风险**：需注意 `person-panel.ts` 位于 `panels/` 层，通过 `context.plugin` 调用插件方法时应保持生命周期 token 校验，避免插件卸载后回调。
- **优先级**：影响面 `4` × 频率 `4` ÷ 成本 `2` = **8.0（P1）** —— 修复文档与工作台双向联动的多个断链点。

---

#### `[FUNC-05]` 【缺陷】详情页潜在交集推荐写死空组织数组、礼物转入账本未更新状态与刷新、首页潜在关联异常伪装空态
- **合并关联项**：
  1. `PersonDetail.svelte:1179` 调用 `discoverPersonTies` 第 3 参数硬编码 `[]`（只对单一数据形态生效的半成品分支）；
  2. `PersonDetail.svelte:1591-1615` `handleConvertGiftToExchange` 记入账本后未将礼物状态更新为 `"given"`、未重读 `personExchanges`；
  3. `PersonDetail.svelte:2640-2658` 数据刷新 `$effect` 漏掉 `loadGiftIdeas()` 与 `loadPersonExchanges()`；
  4. `DashboardView.svelte:945-968` 潜在关联挖掘 `loadPotentialConnections` 失败静默返回 `[]` 伪装成“网络连接紧密”空态，`handleEstablishConnection` 建链失败无错误提示。
- **问题描述（可复现）**：
  - **位置**：`src/components/people/PersonDetail.svelte:1177-1184, 1591-1615, 2640-2658`、`src/components/dashboard/DashboardView.svelte:945-968, 2064-2072`
  - **操作步骤**：
    1. 设联系人 A 与联系人 B 同属“远山科技”组织，但从未共同出席过互动事件；打开 A 的详情页切换到「相关人」Tab 查看「潜在交集伙伴推荐」；
    2. 在 A 的详情页「礼物点子」中添加一条“已采购”礼物，点击「记入账本」，观察礼物状态与上方互惠天平卡片的净差额；
    3. 在首页点击「✨ 潜在关联」，当底层读取抛错或点击「一键正式建链」失败时观察弹窗。
  - **当前表现**：
    1. 因 `discoverPersonTies(current.docId, others, [], ...)` 第 3 个参数 `memberships` 被硬编码为 `[]`，同组织同事/校友推荐分支完全失效，A 的推荐列表找不到 B；
    2. 礼物点击「记入账本」后，状态仍为“已采购”，无成功提示，再次点击会重复记账，且互惠天平卡片的账本数据不刷新；
    3. 首页潜在关联读取失败时显示“🎉 太棒了！当前没有发现频繁同场却未建链的潜在人物”，建链失败无任何提示。
  - **期望表现**：
    1. 详情页潜在交集推荐应结合组织成员数据与共同出席数据共同推荐；
    2. 礼物转入账本后自动将状态更新为 `"given"`（已送出），刷新 `personExchanges` 并给出成功反馈；
    3. 首页潜在关联读取或建链失败时明确展示 `StatusNotice` 错误与重试按钮。
- **解决方案**：
  1. 在 `PersonDetail.svelte` 中结合已加载的 `commonOrgs`（或传入全量组织成员关系）构造 `OrgMembership` 数组传给 `discoverPersonTies`；
  2. 在 `handleConvertGiftToExchange` 成功后调用 `onUpdateGiftIdea(current.docId, item.id, { status: "given" })` 与 `loadPersonExchanges()`，并将 `loadGiftIdeas()`、`loadPersonExchanges()` 补入 `refreshPending` 的 `$effect`；
  3. 在 `DashboardView.svelte` 增加 `discoveryError` 状态，区分加载错误与正常空态。
- **成本**：**中（2）** —— 涉及 `PersonDetail.svelte` 与 `DashboardView.svelte` 局部状态闭环。
- **风险**：无外部依赖；礼物状态自动流转为 `given` 后，`convertGiftIdeaToExchange` 按钮对 `status === "given"` 默认隐藏或禁用，可自然防止重复点击记账。
- **优先级**：影响面 `4` × 频率 `4` ÷ 成本 `2` = **8.0（P1）** —— 消除典型的硬编码半成品分支与状态未闭环问题。

---

#### `[FUNC-06]` 【缺陷】工作台右侧速览面板（`ContextPanel.svelte`）写死联络周期为 30 天、忽略暂停状态、未接入隐私保护盾且删除人物后残留
- **问题描述（可复现）**：
  - **位置**：`src/components/ContextPanel.svelte:38-47, 149-155`、`src/components/Workbench.svelte:151-152, 405-412, 877-889, 1016-1019`
  - **操作步骤**：
    1. 将联系人甲的联系节奏设为“自定义 180 天”或“暂停提醒”，且上次互动为 40 天前；在设置中开启“离席隐私保护盾”；
    2. 在名册中点击联系人甲（然后关闭详情弹窗），观察工作台右侧 `ContextPanel` 面板；
    3. 将联系人甲移入回收站删除，观察右侧 `ContextPanel` 面板。
  - **当前表现**：
    1. `ContextPanel.svelte:43-45` 将 `cadenceDays: 30` 和 `paused: false` 写死为常量，导致甲在名册中为“🔥 温热”或“⏸️ 已暂停”，但在右侧面板却显示“🌬️ 微凉 / ❄️ 渐冻”；
    2. 隐私保护盾开启时，右侧面板第 150、153 行依然明文显示甲的电话号码与微信号；
    3. 甲被删除后，`Workbench.svelte:1016` 只关闭了 `detailPerson`，未清空 `contextPerson`，被删人物仍残留在右侧面板且可点击“快捷记录”。
  - **期望表现**：
    1. `ContextPanel` 异步读取 `facade.getPersonCadence(person.docId)` 并回退 `preferences.staleThresholdDays` 真实计算温度；
    2. 遵循 `preferences.privacyShieldEnabled` 调用 `maskPhone` / `maskWechat` 脱敏展示；
    3. 当联系人被编辑或删除时，同步更新或清空 `contextPerson`，并将 `contextPanelOpen` 开关状态持久化到 `view-preferences.json`。
- **解决方案**：在 `ContextPanel.svelte` 的 `$effect` 中一并加载 `facade.getPersonCadence?.(docId)`，引入 `maskPhone`/`maskWechat`；在 `Workbench.svelte` 的 `onDeleted` 及名册刷新时同步核对 `contextPerson`。
- **成本**：**小（1）** —— 仅涉及 `ContextPanel.svelte` 与 `Workbench.svelte` 约 35 行代码。
- **风险**：无风险，纯展示与状态同步修复。
- **优先级**：影响面 `4` × 频率 `3` ÷ 成本 `1` = **12.0（P1）** —— 消除写死常量与隐私保护盾漏洞。

---

#### `[FUNC-07]` 【体验/功能】首页年度交往活跃度热力图（`ActivityHeatmap.svelte`）日期单元格定义了点击事件但父层未传回调，点击无反应
- **问题描述（可复现）**：
  - **位置**：`src/components/dashboard/ActivityHeatmap.svelte:12, 79-87`、`src/components/dashboard/DashboardView.svelte:1456-1459`
  - **操作步骤**：在首页“年度交往活跃度”热力图中，将鼠标悬停在任意有互动记录的琥珀色格子（鼠标变为手型并放大 1.3 倍），点击该格子。
  - **当前表现**：`ActivityHeatmap.svelte` 定义了 `onSelectDate?: (dateKey: string) => void` 并将有记录的格子渲染为可点击 `<button>`，但 `DashboardView.svelte:1456` 挂载 `<ActivityHeatmap data={data.activityHeatmap} {i18n} />` 时未传入 `onSelectDate` 回调，点击后无任何反应。
  - **期望表现**：点击有互动记录的热力图日期格时，应下钻到联系人名册并筛选出当日互动过的联系人（即设置 `recentFrom = dateKey, recentTo = dateKey` 或传入当日互动人物 `itemIds` 与 `label: "{dateKey} 互动联系人"`）。
- **解决方案**：在 `DashboardView.svelte:1456` 为 `<ActivityHeatmap>` 传入 `onSelectDate={(dateKey) => ...}`，从 `data`（或通过 `onOpenPeople` 携带日期筛选标签）下钻展示该日互动的联系人列表。
- **成本**：**小（1）** —— `ActivityHeatmapData` 的 `HeatmapDay` 已包含当日互动信息，扩展 `personDocIds` 并调用 `onOpenPeople` 仅需约 15 行代码。
- **风险**：无风险。
- **优先级**：影响面 `3` × 频率 `3` ÷ 成本 `1` = **9.0（P1）** —— 补齐悬停放大按钮的真实点击反馈，消除假按钮感。

---

#### `[FUNC-08]` 【功能】多参与者群体活动（`Occasions`）保存时未在思源当日日记（Daily Note）自动生成同场汇总双链记录
- **问题描述（可复现）**：
  - **位置**：`src/services/occasions.ts:45-105`、`src/services/diary.ts`、`docs/NEXT-DEV-ROADMAP-2026.md:51-54`
  - **操作步骤**：在名册点击「记群体活动」，填写活动标题“大湾区开发者晚餐”、选择 3 位参会联系人并保存。
  - **当前表现**：保存后在 `occasions.json` 和 `interaction-events.json` 中生成了记录，并在活动源文档（若指定）写入受控块，但未像单人记互动（`appendInteractionToDailyNote`）那样在思源当日日记（Daily Note）中追加一条同场出席汇总记录（如 `- 🍲 餐饮宴请：大湾区开发者晚餐（[张三]、[李四]、[王五]）`）。
  - **期望表现**：新建群体活动时提供“同步到当日思源日记”选项（默认开启），保存后在当日 Daily Note 中生成带全员 `siyuan://blocks/<id>` 双链的单行汇总记录，且重复保存同一活动 ID 时幂等不重复追加。
- **解决方案**：在 `src/domain/diary-sync.ts` 与 `src/services/diary.ts` 中新增 `appendOccasionToDailyNote(notebookId, occasion)`，并在 `OccasionDialog.svelte` 与 `services/occasions.ts` 中接入。
- **成本**：**中（2）** —— 复用现有 `diary.ts` 的 Daily Note 查找与创建链路。
- **风险**：需确保日记未配置或创建失败时仅降级告警，不阻断群体活动本身的保存。
- **优先级**：影响面 `3` × 频率 `3` ÷ 成本 `2` = **4.5（P2）** —— 路线图短期规划第 1.1 项，完善多人活动与思源日记的反链闭环。

---

#### `[FUNC-09]` 【体验/功能】联系人名册激活 4 项以上复杂筛选条件时未折叠收纳，且组织/成员管理导出缺少范围选择
- **问题描述（可复现）**：
  - **位置**：`src/components/people/PeopleView.svelte:985-1035, 2240-2270`、`docs/NEXT-DEV-ROADMAP-2026.md:59-62`
  - **操作步骤**：在联系人名册同时激活分组、标签、城市、生命周期阶段、关系温度、资料缺口等 5 项以上筛选条件，观察名册顶部的「生效条件流（Active Filter Chips）」区域。
  - **当前表现**：所有生效条件胶囊全部平铺展开，在窄窗口或 125%/150% 缩放下占满 2~3 行高度，挤压下方名册列表可视空间。
  - **期望表现**：当生效筛选条件超过 3 项时，首行默认展示前 3 项高频条件胶囊，其余自动收纳为可点击展开/收起的 `+N 项生效条件 ▾` 胶囊，右侧固定保留 `[清除全部]` 按钮。
- **解决方案**：在 `PeopleView.svelte` 中引入 `activeFiltersExpanded = $state(false)`，当 `activeFilterChips.length > 3 && !activeFiltersExpanded` 时切片前 3 项并渲染展开触发器。
- **成本**：**小（1）** —— 纯前端状态与切片展示，约 25 行代码。
- **风险**：需确保 UI 回归测试中检查生效条件芯片文本的用例兼容展开或前 3 项可见。
- **优先级**：影响面 `3` × 频率 `3` ÷ 成本 `1` = **9.0（P1）** —— 路线图短期规划第 1.3 项，显著提升多条件筛选时的首屏名册空间利用率。

---

#### `[FUNC-10]` 【功能】组织部门树稳定 ID 改名联动、独立只读组织百科总览页与 CardDAV 在线同步通道尚未开发
- **合并关联项**：`docs/ORGANIZATION-PROTOTYPE.md:45-48`（部门稳定 ID 联动与组织只读详情页）、`docs/CARDAV-RESEARCH-2026-10-09.md`（CardDAV 在线同步，`SettingsView.svelte:1314` 当前标“未接入”）。
- **问题描述（可复现）**：
  - **位置**：`src/components/org/OrgsView.svelte`、`src/components/org/OrganizationProfileEditor.svelte`、`src/components/SettingsView.svelte:1314`
  - **操作步骤**：
    1. 在「组织资料编辑器」中修改某个部门的名称并保存，然后打开「组织管理」查看原属于该部门的成员记录；
    2. 在「组织」视图点击某个组织卡片，尝试查看包含组织介绍、Logo、企查查链接、部门树与成员分组的只读百科总览页；
    3. 在「设置 $\rightarrow$ 数据与字段」查看 CardDAV 在线同步状态。
  - **当前表现**：
    1. 成员记录中的 `department` 存储为纯文本字符串而非部门稳定 ID，修改组织资料中的部门名称后，已有成员的部门名称不会联动更新；
    2. 组织卡片只有「管理（直接进成员增删表）」和「编辑资料（进表单）」两个按钮，没有独立的只读组织详情总览视图；
    3. CardDAV 在线同步明确标注“暂未接入”，当前仅支持本地 `.vcf` 文件导入导出。
  - **期望表现**：
    1. 成员登记支持从当前组织部门树下拉选择并绑定 `departmentId`，部门改名时自动投影最新部门名（保留手工输入兜底）；
    2. 提供只读组织详情总览弹窗，集中呈现组织画像、部门树结构与成员分布；
    3. （远期，**方案待确认**）接入 CardDAV 手动单向/双向同步。
- **解决方案**：
  - 部门联动与组织总览：在 `OrgMembership` 中增加可选 `departmentId?: string`，读取展示时优先按 `organization-profiles.json` 中的部门 ID 解析最新名称；新增 `OrganizationDetailModal.svelte` 只读总览组件；
  - CardDAV 同步（**待确认：需先在真实思源宿主环境验证第三方 CardDAV 服务器的 CORS 限制、自签名证书/HTTPS 代理行为及应用密码安全存储方式**）。
- **成本**：**大（5）** —— 涉及 `org-membership.json` 数据模型扩展、迁移兼容、新总览组件及 CardDAV 外部协议状态机。
- **风险**：部门 ID 联动需保持对旧纯文本 `department` 字段的 100% 向后兼容；CardDAV 依赖外部服务器凭据与网络环境。
- **优先级**：影响面 `3` × 频率 `2` ÷ 成本 `5` = **1.2（P3）** —— 属于中长期增强功能，排在所有缺陷与体验修复之后。

---

### 第二部分：UI/UX 深度审查待办（`$ui-ux-pro-max` + 5 项补充检查，`UI-01` ~ `UI-10`）

#### `[UI-01]` 【缺陷/体验】6 个组件引用了思源与令牌表中根本不存在的 `--b3-theme-*` 变量，且 29 个 Svelte 组件共 260+ 处直接绕过 `--lvct-*` 语义令牌
- **合并关联项**：`$ui-ux-pro-max` Rule 4 `Token-driven theming` & Rule 6 `color-semantic` + 补充检查「样式是否真引用统一令牌与有无硬编码色值间距」。
- **问题描述（可复现）**：
  - **位置**：
    1. **引用不存在的 CSS 变量（无 fallback 或 fallback 为刺眼蓝色）**：
       - `src/components/people/RelationshipStageTracker.svelte:244, 273, 351, 416`（使用无 fallback 的 `var(--b3-theme-primary-lightest)` 与 `var(--b3-theme-on-surface-variant)`）
       - `src/components/people/PersonMilestonesTimeline.svelte:360, 365, 370, 471`（使用不存在的 `--b3-theme-on-surface-variant`、`--b3-theme-primary-lightest`、`--b3-theme-success-lightest`、`--b3-theme-info-lightest`）
       - `src/components/people/PersonPromisesLedger.svelte:689, 694, 752`（同上）
       - `src/components/dashboard/AnniversariesHubDialog.svelte:585`、`src/components/dashboard/PreMeetingHubDialog.svelte:473, 511, 516`
    2. **Svelte 模板内联硬编码色值（38 处）与直接 `--b3-*` 引用（29 个组件）**：
       - 如 `CoolingRadarDialog.svelte:139` (`#f59e0b`)、`OrgMembershipResult.svelte:34` (`#f59e0b`)、`FamilyKinshipTree.svelte:109` (`#e11d48`)、`DashboardView.svelte:1368` (`#0284c7`)、`PersonDetail.svelte:3383` (`#0284c7`)。
  - **操作步骤**：打开人物详情页查看「交往生命周期阶段（`RelationshipStageTracker`）」、「历程编年史长卷（`PersonMilestonesTimeline`）」、「双向信诺履约本（`PersonPromisesLedger`）」，并在明暗主题下对比节点背景与辅助文字颜色。
  - **当前表现**：因思源官方主题与 `_tokens.scss` 均未定义 `--b3-theme-primary-lightest` 和 `--b3-theme-on-surface-variant`，`RelationshipStageTracker` 的激活阶段圆点背景完全透明失效，编年史与信诺本的次级文本回退为高对比正文色（失去主次层级），其余带 fallback 的位置则显示为与暖干邑橙品牌色格格不入的 Windows 亮蓝 `rgba(0, 120, 212, 0.15)`。
  - **期望表现**：所有组件严格消费 `_tokens.scss` 中已定义的 `--lvct-*` 与 `--lv-*` 语义令牌（如 `--lv-brand-soft`、`--lvct-text-2`、`--lvct-text-3`、`--lvct-success-soft`、`--lvct-danger-soft`），零未定义变量、零硬编码 hex 色值。
- **解决方案**：
  1. 将 6 个组件中的 `--b3-theme-primary-lightest` 替换为 `var(--lv-brand-soft)`，`--b3-theme-on-surface-variant` 替换为 `var(--lvct-text-3)`，`--b3-theme-error-lightest` / `success-lightest` / `info-lightest` 替换为 `--lvct-danger-soft` / `--lvct-success-soft` / `--lvct-info-soft`；
  2. 将 29 个 Svelte 组件 `<style>` 中的 `var(--b3-*)` 及模板中的内联硬编码色值统一收敛至 `--lvct-*` / `--lv-*` 令牌，并在 `audit-design-tokens.mjs` 中增加对未定义变量的门禁检查。
- **成本**：**中（2）** —— 批量替换 29 个组件的 CSS 变量引用并跑通样式单测。
- **风险**：纯 CSS 变量映射替换，不影响业务逻辑；需在桌面/移动/宿主三套 UI 回归中核对明暗对比度。
- **优先级**：影响面 `5` × 频率 `4` ÷ 成本 `2` = **10.0（P0）** —— 解决多处进度条/时间轴圆点背景透明失效与亮蓝违和色问题。

---

#### `[UI-02]` 【体验】31 个含表单的面板/弹窗缺少 `aria-describedby` 字段级错误绑定与错误摘要聚焦，且 `RegionExplorerDialog` 搜索框缺少无障碍标签
- **合并关联项**：`$ui-ux-pro-max` Rule 1 `aria-labels` / `form-labels` & Rule 8 `input-labels` / `error-placement` / `error-summary` / `focus-management`。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/components/people/RegionExplorerDialog.svelte:298`（`<input type="search" class="b3-text-field b3-text-field--small" placeholder="搜索城市、省份或大区..." bind:value={citySearch} />` 既无 `<label>` 也无 `aria-label`）；
    2. `src/components/ContextPanel.svelte:181`（快捷互动输入框仅有 `placeholder`，无 `aria-label` 或 `<label for>`）；
    3. `AddPersonDialog.svelte`、`OrganizationProfileEditor.svelte`、`OccasionDialog.svelte`、`PersonItinerary.svelte`、`PersonPromisesLedger.svelte`、`FamilyKinshipTree.svelte`、`ExchangeLedger.svelte` 等 31 个含错误提示的组件。
  - **操作步骤**：
    1. 使用屏幕阅读器（NVDA/VoiceOver）或键盘 Tab 聚焦到「城市与行程助手」弹窗的搜索框、右侧 `ContextPanel` 的快捷互动输入框；
    2. 在「新建组织（`OrganizationProfileEditor`）」或「记群体活动（`OccasionDialog`）」中填写非法内容（如非 qcc.com 链接或空标题）并点击保存。
  - **当前表现**：
    1. 读屏软件在 `RegionExplorerDialog` 搜索框和 `ContextPanel` 输入框上只能读出“编辑框 空白”，无语义名称；
    2. 31 个表单组件校验失败时仅在顶部或底部渲染 `<div class="lvct-form__error" role="alert">`，未在对应出错 `<input>` 上设置 `aria-invalid="true"` 与 `aria-describedby`，且多字段报错后未将键盘焦点移至错误摘要或首个非法输入框（仅 `PersonEditDialog` 实现了焦点迁移）。
  - **期望表现**：所有输入框 100% 具备可见 `<label>` 或显式 `aria-label`；表单校验失败时出错字段具备 `aria-invalid="true"` 与 `aria-describedby` 关联，并自动聚焦首个出错字段或顶部可聚焦错误摘要。
- **解决方案**：
  1. 为 `RegionExplorerDialog.svelte`、`ContextPanel.svelte` 等缺失标签的输入框补齐 `aria-label`；
  2. 为核心表单弹窗（`AddPersonDialog`、`OrganizationProfileEditor`、`OccasionDialog`、`PersonItinerary`、`PersonPromisesLedger`、`ExchangeLedger`）补齐字段级 `aria-invalid`、`aria-describedby` 与提交失败后的焦点引导。
- **成本**：**中（2）** —— 模板属性补充与错误焦点辅助函数复用。
- **风险**：无数据风险，纯无障碍与表单交互增强。
- **优先级**：影响面 `4` × 频率 `4` ÷ 成本 `2` = **8.0（P1）** —— 符合 WCAG 2.2 AA 与 `$ui-ux-pro-max` CRITICAL 级无障碍规范。

---

#### `[UI-03]` 【体验】跨面板搜索框、空态与错误提示三类基础控件在不同二级弹窗中形态与结构不一致
- **合并关联项**：补充检查「同一控件在不同面板是否一致」+ `$ui-ux-pro-max` Rule 4 `consistency`。
- **问题描述（可复现）**：
  - **位置**：
    1. **搜索框形态分裂**：`RegionExplorerDialog.svelte:296`、`PreMeetingHubDialog.svelte`、`CoolingRadarDialog.svelte`、`AnniversariesHubDialog.svelte`、`OccasionsHubDialog.svelte` 使用了带前置 `<Search size={14} />` 图标的胶囊容器；而 `OrgsView.svelte:208`、`OrgManagerDialog.svelte:1058`、`PersonDetail.svelte:4443`、`TrashDrawer.svelte:135` 却是无前置图标的裸 `<input class="b3-text-field" type="search">`；
    2. **空态控件分裂**：主视图使用统一的 `<ViewState>` 组件（带 Lucide 图标、主标题、副标题与行动按钮），而 `DashboardView.svelte:2069`（潜在关联弹窗）、`ExchangesHubDialog.svelte`、`PreMeetingHubDialog.svelte`、`AnniversariesHubDialog.svelte`、`ContextPanel.svelte:217` 则手写 `<div style="padding: 24px; text-align: center;">` 或 `<p class="ft__smaller">`；
    3. **错误提示分裂**：部分面板使用 `<StatusNotice error>`，部分面板使用 `<div class="lvct-form__error" role="alert">`，而 `DashboardView.svelte:1637`、`PersonDetail.svelte:3190`、`ContextPanel.svelte:204` 则手写 `<div class="ft__smaller lvct-text-danger">` 或 `<small class="ft__error">`。
  - **操作步骤**：依次打开名册、组织页、详情页互动流、回收站、人情账本大盘与潜在关联弹窗，对比搜索框外观、无数据空态和报错横幅样式。
  - **当前表现**：同类控件在不同面板的圆角、内边距、图标有无、字号层级存在明显差异。
  - **期望表现**：全站搜索框统一采用前置 1.6 细线 `Search` 图标 + 9999px 胶囊样式；所有面板空态统一复用 `<ViewState compact>`；所有非内联块级错误提示统一复用 `<StatusNotice error>` 或标准 `.lvct-form__error`。
- **解决方案**：在 `_controls.scss` 中提炼标准 `.lvct-search-box` 胶囊搜索框样式类，统一替换裸 `<input type="search">`；将各二级大盘弹窗的手写空态与报错统一替换为 `<ViewState compact>` 与 `<StatusNotice error>`。
- **成本**：**中（2）** —— 涉及约 10 个弹窗组件的模板与样式统一。
- **风险**：需注意保持现有 E2E 测试中通过 `input[type="search"]` 或 `.lvct-form__error` 查找元素的选择器兼容。
- **优先级**：影响面 `4` × 频率 `3` ÷ 成本 `2` = **6.0（P2）** —— 提升全产品跨面板的视觉与交互一致性。

---

#### `[UI-04]` 【缺陷/体验】系统缩放 150%（等效桌面宽 853px）与窄窗口 125%/150% 下，联系人名册工具栏 `.lvct-people__toolbar` 横向溢出截断
- **合并关联项**：补充检查「窄窗口与系统缩放 125% 和 150% 下是否错位截断」+ `$ui-ux-pro-max` Rule 5 `horizontal-scroll` / `breakpoint-consistency`。
- **问题描述（可复现）**：
  - **位置**：`src/components/people/PeopleView.svelte:2010-2185`、`src/index.scss:2650-2790`
  - **操作步骤**：
    1. 将系统显示缩放设为 **150%**（1280×800 屏幕等效 CSS 视口为 `853×533`），打开工作台进入「联系人」视图（卡片或表格模式）；
    2. 或在 390px 窄窗口下设置 125%（等效宽 `312px`）/ 150%（等效宽 `260px`）缩放，观察 `.lvct-people__toolbar` 工具栏。
  - **当前表现**：Headless Chrome 实测显示：
    - 在 `Desktop 150% (853x533)` 下，`.lvct-people__toolbar` 的 `scrollWidth (297px) > clientWidth (263px)`，右侧按钮被截断溢出 34px；
    - 在 `Narrow 390px @ 125% (312px)` 下，`scrollWidth (325px) > clientWidth (282px)`，溢出 43px；
    - 在 `Narrow 390px @ 150% (260px)` 下，`scrollWidth (299px) > clientWidth (230px)`，溢出 69px。
  - **期望表现**：在 125% 和 150% 系统缩放及窄视口下，`.lvct-people__toolbar` 内部搜索框与操作按钮组能够自适应折行或收缩 `min-width: 0`，保证 `scrollWidth <= clientWidth` 零横向截断。
- **解决方案**：检查 `.lvct-people__toolbar` 及其子元素（搜索框容器、视图切换 segmented control、动作按钮组）的 `min-width` 约束，将固定 `min-width` 改为 `min(100%, ...)` 并允许在容器宽度 `< 720px` 时搜索框独占首行、工具按钮自然换行。
- **成本**：**小（1）** —— 仅涉及 `src/index.scss` 中 `.lvct-people__toolbar` 的响应式 flex/grid 规则。
- **风险**：修改后需复跑 `node scripts/breakpoint-sweep.mjs` 确保 390/575/640/1280 四个标准断点布局不变。
- **优先级**：影响面 `4` × 频率 `4` ÷ 成本 `1` = **16.0（P0）** —— 实测必现的高分屏 125%/150% 系统缩放截断问题。

---

#### `[UI-05]` 【体验】125%/150% 缩放下新建/粘贴识别弹窗的「创建联系人」按钮掉出首屏，且人物详情页「记一笔互动」排在第 19 个区块需滚动 2~4 屏才可见
- **合并关联项**：补充检查「主次层级是否一眼可辨、关键操作是否需要滚动才能看见」+ `$ui-ux-pro-max` Rule 4 `primary-action` & Rule 5 `content-priority`。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/components/people/AddPersonDialog.svelte:250-380`、`src/components/people/QuickFillDialog.svelte:210-350`
    2. `src/components/people/PersonDetail.svelte:3180-4488`
  - **操作步骤**：
    1. 在 125%（视口高 `640px`）或 150%（视口高 `533px`）缩放下打开「新建联系人」或「粘贴并识别」弹窗，观察底部主 CTA「创建联系人」按钮是否在首屏内；
    2. 打开任意联系人的详情窗口（默认在“概览”Tab），不滚动页面，寻找「记一笔互动」输入框与「记录」按钮。
  - **当前表现**：
    1. Headless Chrome 实测：在 125%（`vh=640px`）下 `QuickFillDialog` / `AddPersonDialog` 的「创建联系人」按钮 `bottom = 684px > 640px`，在 150%（`vh=533px`）下 `bottom = 679px > 533px`，掉出可视区之外，必须向下滚动才能看到主提交按钮；
    2. 在人物详情“概览”Tab 中，高频核心操作「记一笔互动」被排在会前速览、档案摘要、初识溯源、关系称谓、温度快照、社交雷达、标签推断、谈资、礼物、纪念日、行程、项目、信诺、亲属树、社交偏好、便签、补充资料、独立备注 **共 18 个区块之后**（实测在 125% 桌面下位于 `bottom: 1350px`，移动端位于 `2383px`），必须滚动 2~4 屏或点击顶部辅助链接才能触达。
  - **期望表现**：
    1. `AddPersonDialog` 与 `QuickFillDialog` 的底部操作栏（「取消 / 创建联系人」）采用 `position: sticky; bottom: 0` 吸底固定，在任何缩放比例下无需滚动即可一眼看见并点击；
    2. 在 `PersonDetail.svelte` 概览页顶部（紧接「会前 30 秒破冰速览卡」或「关系温度快照」下方）提升「记一笔互动」区块的位置（或固定于概览首屏核心区），让打开详情即可直接输入互动备注。
- **解决方案**：
  1. 为 `AddPersonDialog` 与 `QuickFillDialog` 的表单底部操作区添加 sticky footer 样式（带背景毛玻璃与顶部分隔线）；
  2. 将 `PersonDetail.svelte` 概览 Tab 中的「记一笔互动」区块上移至首屏核心位置（`PersonProfileSummary` / `lvct-origin-section` 附近）。
- **成本**：**小（1）** —— 仅调整区块 DOM 顺序与弹窗底部 `position: sticky` 样式。
- **风险**：调整 `PersonDetail.svelte` 中「记一笔互动」的 DOM 位置时，需确认 `scripts/e2e/ui/smoke.js` 中的选择器（按 class `.lvct-detail__record` 查找，不依赖固定子节点序号）全部兼容。
- **优先级**：影响面 `5` × 频率 `4` ÷ 成本 `1` = **20.0（P0）** —— 极大地改善高频核心操作的首屏可达性。

---

#### `[UI-06]` 【体验】可交互元素 9 态不全：多处列表行/卡片按钮缺少 `:active` 按下反馈，且名册底部浮动批量栏与详情吸顶栏缺少 `scroll-padding` 导致遮挡键盘焦点
- **合并关联项**：补充检查「可交互元素的默认、悬停、按下、聚焦、选中、禁用、加载、空与错误是否齐备且视觉可区分」+ `$ui-ux-pro-max` Rule 1 `focus-not-obscured` & Rule 2 `press-feedback` & Rule 7 `scale-feedback`。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/index.scss:2900-3100`（`.lvct-people__list` 与底部浮动批量操作栏 `.lvct-people__batch-bar`）、`src/index.scss:3900-4100`（`.lvct-detail` 吸顶头部 `.lvct-detail__header`）；
    2. `src/index.scss:11435`（`.lvct-exchanges-hub__row`）、`src/components/dashboard/AnniversariesHubDialog.svelte`、`PreMeetingHubDialog.svelte`、`CoolingRadarDialog.svelte`、`OccasionsHubDialog.svelte` 的卡片按钮。
  - **操作步骤**：
    1. 在联系人名册勾选 1 位联系人使底部弹出浮动批量操作栏（`.lvct-people__batch-bar`），然后按 `Tab` 键逐个聚焦名册下方的联系人卡片；
    2. 在人物详情弹窗中向下滚动一段距离后，按 `Shift+Tab` 反向聚焦上方的按钮；
    3. 点击各大盘弹窗中的操作胶囊与卡片按钮，观察按下（`:active`）瞬间的视觉反馈。
  - **当前表现**：
    1. 当名册底部浮动批量栏出现时，列表容器未设置足够的 `scroll-padding-bottom`（约 `88px`），导致键盘 Tab 聚焦到视口底部的卡片时，焦点环被悬浮的批量操作栏遮挡（违反 WCAG 2.2 AA `focus-not-obscured`）；同理人物详情弹窗滚动容器缺少 `scroll-padding-top`，反向 Tab 聚焦时控件易被 sticky 头部遮挡；
    2. 二级大盘弹窗中的自定义 `.filter-btn`、`.action-btn`、`.hub-card` 仅定义了 `:hover`，缺少 `:active`（如 `transform: scale(0.98)` 或深一阶底色）按下态以及 `:focus-visible` 独立焦点环。
  - **期望表现**：
    1. 名册滚动容器设置 `scroll-padding-bottom: 96px`，详情弹窗滚动容器设置 `scroll-padding-top: 84px`，确保键盘焦点永远不被吸顶/吸底栏遮挡；
    2. 所有可点击按钮、胶囊与卡片补齐 `:active` 按下微缩/加深反馈与 `:focus-visible` 焦点环。
- **解决方案**：在 `src/index.scss` 与 `src/style/_controls.scss` 中统一为滚动容器注入 `scroll-padding-top` / `scroll-padding-bottom`，并为 `.b3-chip`、大盘卡片按钮补充统一的 `:active` 和 `:focus-visible` 样式规则。
- **成本**：**小（1）** —— 纯全局 SCSS 增强，约 30 行样式代码。
- **风险**：无风险。
- **优先级**：影响面 `4` × 频率 `3` ÷ 成本 `1` = **12.0（P1）** —— 低成本全面补齐交互 9 态与键盘焦点防遮挡。

---

#### `[UI-07]` 【体验】4 个核心组件共 7 处破坏性或覆盖性操作仍使用浏览器原生阻塞式 `window.confirm`，未对齐全站无障碍 `confirmDialog`
- **合并关联项**：`$ui-ux-pro-max` Rule 8 `confirmation-dialogs` / `destructive-emphasis` + 补充检查「同一控件在不同面板是否一致」。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/components/people/PeopleView.svelte:1730`（批量制作闪卡含隐藏选中人确认）
    2. `src/components/people/PeopleView.svelte:1759`（批量导出 vCard 含隐藏选中人确认）
    3. `src/components/people/PeopleView.svelte:1785`（批量导出 CSV 含隐藏选中人确认）
    4. `src/components/people/PersonDetail.svelte:1139`（应用互动模板覆盖已有备注草稿确认）
    5. `src/components/people/PersonItinerary.svelte:179`（删除会面行程备忘确认）
    6. `src/components/SettingsView.svelte:971`（合并跟进备份确认）
    7. `src/components/SettingsView.svelte:1030`（合并互动备份确认）
  - **操作步骤**：在详情页输入互动草稿后选择套用模板、或在详情页删除一条会面行程、或在设置页导入合并互动/跟进备份。
  - **当前表现**：上述 7 处调用了浏览器原生的 `window.confirm(...)`，不仅阻塞主线程、在思源暗色主题下呈现突兀的系统默认弹窗，而且与项目其他位置（如删除联系人、删除亲属、替换谈资草稿）使用的自定义无障碍 `confirmDialog`（`src/libs/confirm-dialog.ts`）风格分裂。
  - **期望表现**：全站所有二次确认统一使用 `await confirmDialog({ title, message, confirmLabel, cancelLabel, danger })`。
- **解决方案**：将上述 4 个文件中的 7 处 `window.confirm` 替换为 `await confirmDialog(...)`（注意将 `applyTemplate` 和 `exportSelectedCsv` 改为 `async` 函数）。
- **成本**：**小（1）** —— 7 处定点替换，复用现有 `src/libs/confirm-dialog.ts`。
- **风险**：需同步检查 E2E 测试（如 `scripts/e2e/ui/` 下测试备份导入或模板覆盖的脚本）是否有拦截 `window.confirm` 的桩代码，若有则同步适配 `confirmDialog` 按钮点击。
- **优先级**：影响面 `3` × 频率 `3` ÷ 成本 `1` = **9.0（P1）** —— 彻底清零原生 `window.confirm` 残留。

---

#### `[UI-08]` 【体验】170 处结构性标题、按钮与状态标签混用彩色 Emoji 与 Lucide 细线矢量图标（含同标题双图标重叠）
- **合并关联项**：`$ui-ux-pro-max` Rule 4 `no-emoji-icons` ("Use SVG icons, not emojis") & `icon-style-consistent`。
- **问题描述（可复现）**：
  - **位置**：
    1. **同标题 SVG + Emoji 双重重叠**：`src/components/dashboard/DashboardView.svelte:1537`（`<Calendar size={14} strokeWidth={1.6} /> 📅 本周日程视窗`，同时渲染了 SVG 日历和 `📅` Emoji）；
    2. **主页与弹窗标题栏/按钮混用 Emoji**：`DashboardView.svelte:1241, 1251, 1451, 1489, 1498, 1507, 1516, 2058, 2131, 2145, 2159, 2173, 2197`（`🌡️`、`🧊`、`📅`、`🧧`、`🛡️`、`🎊`、`🎪`）、`PersonDetail.svelte:197, 220, 224, 229, 239, 249, 273, 428`（会前速览卡与初识溯源标题中的 `⚡`、`💬`、`🌱`、`❤️`、`⚠️`、`👥`、`📈`）、`person-panel.ts:263, 336, 430-457`（档案条中的 `🏢`、`📍`、`📞`、`💬`、`✉️`、`🎂`）。
  - **操作步骤**：打开首页仪表盘查看“本周日程视窗”标题、四大中枢按钮，或打开人物详情页查看会前速览卡、初识溯源区块与文档浮动档案条。
  - **当前表现**：
    1. “本周日程视窗”左侧紧挨着出现两个日历图标（一个 Lucide `<Calendar>` + 一个 `📅` Emoji）；
    2. 同一个按钮栏里，有的按钮用 1.6px 细线单色 Lucide SVG（如 `<Sparkles /> 潜在关联`），旁边的按钮却用彩色系统 Emoji（如 `🧧 人情账本`、`🛡️ 会前速查`），在不同操作系统（Windows 10 / Windows 11 / macOS / Android）下字体渲染大小不一、基线不齐，且无法随主题色令牌变色。
  - **期望表现**：移除重复的 `📅` Emoji；将结构性导航按钮、区块标题、状态徽标中的彩色 Emoji 统一替换为 `@lucide/svelte` 的 `strokeWidth={1.6}` 细线矢量图标（仅在用户自定义的纪念日祝福文案或纯趣味空态文案中保留文字表情）。
- **解决方案**：
  1. 立即移除 `DashboardView.svelte:1537` 等处的重复 Emoji；
  2. 将首页四大中枢按钮、详情页会前速览卡/初识溯源/Twenty 时间轴标题、上下文面板及浮动档案条中的结构性 Emoji 替换为对应的 Lucide 1.6 细线图标（如 `Gift`, `ShieldAlert`, `Snowflake`, `PartyPopper`, `CalendarRange`, `Zap`, `MessageCircle`, `Sprout`, `Heart`, `TriangleAlert`, `Users`, `ChartBar`）。
- **成本**：**中（3）** —— 涉及约 15 个组件的模板图标替换，以及核对 E2E テスト中是否有按含 Emoji 的按钮文本匹配的选择器（`button(root, "降温预警")` 使用 `.includes()` 或精确相等需逐一核对）。
- **风险**：部分 UI 冒烟测试（如 `smoke.js`）可能通过 `textContent` 查找按钮，替换时若测试断言了 Emoji 字符需同步更新测试断言。
- **优先级**：影响面 `4` × 频率 `4` ÷ 成本 `3` = **5.3（P2）** —— 全面落实 `$ui-ux-pro-max` 的 `no-emoji-icons` 核心视觉规范。

---

#### `[UI-09]` 【体验】旁侧有可见文本的装饰性 SVG 图标未设置 `aria-hidden="true"`，且多处微小型图标按钮与热力图格尺寸小于 24×24px / 44×44px
- **合并关联项**：`$ui-ux-pro-max` Rule 1 `icon-context` / `web-target-size` & Rule 2 `touch-target-size`。
- **问题描述（可复现）**：
  - **位置**：
    1. **装饰性图标未隐藏**：`DashboardView.svelte`、`PeopleView.svelte`、`PersonDetail.svelte`、`OrgsView.svelte` 等组件中，按钮内部旁侧已有可见文字的 `<LucideIcon class="lvct-icon-inline" />` 未显式声明 `aria-hidden="true"`；
    2. **点击热区过小**：
       - `ActivityHeatmap.svelte:81`（`.lvct-heatmap__cell` 宽高仅为 `11px × 11px`，间距 `3px`，远小于 WCAG 2.2 AA 的 `24×24px` 最小指针目标）；
       - `DashboardView.svelte:1260-1308`（`.lvct-heat-bar__segment` 温度比例条分段按钮高度仅 `8px`）；
       - `DashboardView.svelte:1100-1112, 1408, 1617, 1627`、`PersonDetail.svelte:3650, 4482, 4497`（内联写了 `padding: 0 4px; font-size: 11px;` 或 `padding: 1px 6px;`，导致按钮高度仅 `18px~20px`，在移动端 390px 下极易误触）。
  - **操作步骤**：使用屏幕阅读器朗读带图标的按钮，或在触控屏/鼠标下点击首页温度分布细条（高 8px）、热力图格子（11×11px）及卡片右上角 `padding: 0 4px` 的微型文字按钮。
  - **当前表现**：微小按钮点击热区不足 `20px`，触控屏上极难精准点中。
  - **期望表现**：
    1. 装饰性图标统一具备 `aria-hidden="true"`；
    2. 最小点击热区在桌面 Web 端满足 `≥ 24×24px`，在移动端（`isMobile` 或 `@media (pointer: coarse)`）通过 `min-height: 36px~44px` 或 `::after` 伪元素扩展透明点击热区，做到视觉紧凑但热区达标。
- **解决方案**：在全局样式 `.b3-button--small`、`.lvct-heat-bar__segment`、`.lvct-heatmap__cell` 中利用 `::after { content: ""; position: absolute; inset: -6px; }` 扩展点击热区，清理组件内联的 `padding: 0 4px` 缩水样式。
- **成本**：**中（2）** —— 全局 CSS 伪元素热区扩展与内联微缩 padding 清理。
- **风险**：扩展 `::after` 热区时需确保相邻按钮有足够 `gap`（`≥ 6px`），避免伪元素热区互相重叠拦截点击。
- **优先级**：影响面 `3` × 频率 `4` ÷ 成本 `2` = **6.0（P2）** —— 提升触控与指针点击精准度及无障碍合规性。

---

#### `[UI-10]` 【体验】数据图表无障碍与交互增强：首页近期互动走势与详情页 Twenty 月度分布柱缺少读屏汇总与点击过滤联动
- **合并关联项**：`$ui-ux-pro-max` Rule 10 `screen-reader-summary` / `tooltip-keyboard` / `drill-down-consistency`。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/components/people/PersonDetail.svelte:5041-5055`（`.lvct-twenty-activity-header` 近一年互动分布 12 个月柱状图）；
    2. `src/components/dashboard/DashboardView.svelte:1364-1395`（`.lvct-trend-bars` 近期互动走势柱状图）。
  - **操作步骤**：
    1. 在人物详情页切换到「互动」Tab，观察顶部的“📈 近一年互动分布”12 个月柱状图（`.lvct-twenty-spark-bar-wrap`），尝试用键盘聚焦或点击某个月份柱筛选下方互动列表；
    2. 使用屏幕阅读器访问该图表区域。
  - **当前表现**：
    1. 详情页的 Twenty 12 个月柱状图使用的是非交互 `<div>` 且仅设置了鼠标悬停 `title="${month.monthKey}：${month.count}次互动"`，键盘用户与触控端用户无法查看各月数值（违反 `tooltip-keyboard`），点击某月柱也无法过滤下方的互动流水；
    2. 图表容器缺少 `role="region"` 与描述整体趋势的 `aria-label` 读屏摘要（违反 `screen-reader-summary`）。
  - **期望表现**：
    1. 图表外层容器提供 `role="region"` 与包含总次数、月峰值的 `aria-label` 读屏摘要；
    2. 详情页 Twenty 月度柱改为可聚焦 `<button>`，支持点击某月柱直接将该月份填入下方 `activitySearch` 过滤当月互动记录（再次点击取消过滤），并在柱顶或激活态直接显示次数。
- **解决方案**：将 `PersonDetail.svelte:5049` 的 `.lvct-twenty-spark-bar-wrap` 升级为 `<button type="button">`，绑定 `onclick={() => (activitySearch = activitySearch === month.monthKey ? "" : month.monthKey)}`，并补齐 `aria-label` 与 `:focus-visible` 样式。
- **成本**：**小（1）** —— 仅涉及 `PersonDetail.svelte` 约 20 行模板与 SCSS 微调。
- **风险**：无风险，复用现有的 `activitySearch` 过滤状态。
- **优先级**：影响面 `3` × 频率 `3` ÷ 成本 `1` = **9.0（P1）** —— 让静态装饰柱状图升级为可交互、可键盘访问的实用筛选器。

---

## 四、 优先级总排序与分批开发建议

将全部 20 条可开发待办按优先级得分与依赖关系排序，划分为 **4 个开发批次**，每批控制在单轮可稳妥完成并跑通全套门禁的体量（5 项/批），后续开发轮次可直接按批次取用：

### 第一批：P0 核心功能断链与数据安全抢修（共 5 项 · 建议下一轮最先执行）
> **目标**：彻底消灭跨组件点击断链、事实画像静默丢数据、剪贴板假成功反馈与写死常量漏洞。

1. **`[FUNC-01]`（得分 25.0 · 缺陷 · 成本小）**：修复首页五大中枢弹窗点击人物无响应、未访问名册时活动下钻 0 人、名册活动大盘 `docId`/`itemId` 混淆下钻 0 人、首页活动大盘新建活动按钮断链。
2. **`[FUNC-03]`（得分 16.0 · 缺陷 · 成本小）**：修复 `PersonDetail.svelte` 4 处剪贴板复制在 `catch` 块中伪造“✓ 已复制”成功状态的问题。
3. **`[FUNC-06]`（得分 12.0 · 缺陷 · 成本小）**：修复右侧 `ContextPanel` 写死 30 天周期与未暂停常量、补齐离席隐私保护盾脱敏及人物删除后状态清理。
4. **`[FUNC-02]`（得分 10.0 · 缺陷 · 成本中）**：移除 `doc-section.ts` 事实画像读写静默吞异常，补齐 `PersonDetail`、`QuickRecordDialog`、`CaptureDialog` 的错误恢复与真实同步状态反馈。
5. **`[FUNC-04]`（得分 8.0 · 缺陷 · 成本中）**：补齐文档浮动档案条与右键识别打开 `PersonEditDialog` 缺失的组织/称谓回调，修复工作台未打开时组织/城市档案条下钻事件丢失及「行程规划」按钮断链。

### 第二批：P0/P1 缩放截断、首屏可达性、无效变量与半成品闭环（共 5 项）
> **目标**：解决 125%/150% 缩放截断、核心操作首屏不可见、未定义 `--b3-*` 变量透明失效与详情页半成品分支。

1. **`[UI-05]`（得分 20.0 · 体验 · 成本小）**：为 `AddPersonDialog` 与 `QuickFillDialog` 增加 sticky 吸底操作栏防 125%/150% 缩放遮挡；将 `PersonDetail` 概览页的「记一笔互动」上移至首屏核心区。
2. **`[UI-04]`（得分 16.0 · 缺陷/体验 · 成本小）**：修复 150% 系统缩放与窄窗口下名册 `.lvct-people__toolbar` 工具栏横向截断溢出。
3. **`[UI-01]`（得分 10.0 · 缺陷/体验 · 成本中）**：清除 6 个组件中不存在的 `--b3-theme-primary-lightest` / `--b3-theme-on-surface-variant` 变量及 29 个组件中的直接 `--b3-*` / 内联硬编码色值，统一映射至 `--lvct-*` 令牌。
4. **`[FUNC-05]`（得分 8.0 · 缺陷 · 成本中）**：修复 `PersonDetail` 潜在交集推荐硬编码空组织数组 `[]`、礼物转入账本后自动更新为 `given` 并刷新账本、修复首页潜在关联异常伪装空态。
5. **`[FUNC-07]`（得分 9.0 · 体验/功能 · 成本小）**：为首页 `ActivityHeatmap` 年度热力图接入 `onSelectDate` 点击下钻名册联动。

### 第三批：P1 交互 9 态、无障碍表单关联、确认弹窗与图表交互统一（共 5 项）
> **目标**：全面对齐 `$ui-ux-pro-max` 的 CRITICAL/HIGH 级交互与无障碍规范。

1. **`[UI-06]`（得分 12.0 · 体验 · 成本小）**：为名册与详情滚动容器补齐 `scroll-padding` 防止底部批量栏/吸顶栏遮挡键盘焦点，为大盘卡片与胶囊补齐 `:active` 按下反馈。
2. **`[UI-07]`（得分 9.0 · 体验 · 成本小）**：将 `PeopleView`、`PersonDetail`、`PersonItinerary`、`SettingsView` 中残留的 7 处原生 `window.confirm` 统一替换为无障碍 `confirmDialog`。
3. **`[UI-10]`（得分 9.0 · 体验 · 成本小）**：将详情页 Twenty 近一年月度互动分布柱升级为可聚焦 `<button>`，支持点击月份柱过滤互动流水并补齐读屏摘要。
4. **`[FUNC-09]`（得分 9.0 · 体验/功能 · 成本小）**：实现名册超过 3 项生效筛选条件时的 `+N 项生效条件 ▾` 折叠与展开收纳。
5. **`[UI-02]`（得分 8.0 · 体验 · 成本中）**：为 `RegionExplorerDialog`、`ContextPanel` 补齐输入框 `aria-label`，为核心表单弹窗补齐 `aria-invalid` / `aria-describedby` 字段级错误绑定与焦点引导。

### 第四批：P2/P3 跨面板控件归一化、矢量图标替换与中长期功能扩展（共 5 项）
> **目标**：收口跨面板视觉一致性、矢量图标纯净化与路线图中长期功能。

1. **`[UI-03]`（得分 6.0 · 体验 · 成本中）**：统一全站二级弹窗的胶囊搜索框（前置 `Search` 图标）、`<ViewState compact>` 空态与 `<StatusNotice error>` 错误提示。
2. **`[UI-09]`（得分 6.0 · 体验 · 成本中）**：为旁侧有文字的装饰性图标补齐 `aria-hidden="true"`，并通过 `::after` 伪元素扩展热力图格、温度条与微型按钮的点击热区至 `≥ 24×24px`（移动端 `≥ 44×44px`）。
3. **`[UI-08]`（得分 5.3 · 体验 · 成本中）**：移除“本周日程视窗”等处的重复 Emoji，将结构性标题/按钮中的彩色 Emoji 统一替换为 1.6 细线 Lucide SVG 图标。
4. **`[FUNC-08]`（得分 4.5 · 功能 · 成本中）**：实现多参与者群体活动（`Occasions`）保存时同步在思源当日日记（Daily Note）生成同场出席双链汇总。
5. **`[FUNC-10]`（得分 1.2 · 功能 · 成本大）**：实现组织部门树稳定 ID 改名联动与独立只读组织详情总览页；CardDAV 在线同步待宿主 CORS 与凭据方案验证后独立立项。
