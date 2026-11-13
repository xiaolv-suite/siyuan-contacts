# 小驴人脉（siyuan-contacts）全量 bug / 缺陷 / 优化排查待办池（2026-11-04 只查不改轮）

- **排查基线版本**：`v0.7.8`（Commit `cedc5c8`，本地 tag `v0.7.8`，`package.zip` SHA-256 `9546f23b…` 完好）
- **本轮原则**：只排查不开发，源码与样式一行不改；三路并行深度代码审查（增量缺陷 / 静默失败与状态同步 / UI 生命周期与体验）+ 全量门禁实测，逐条人工核实去重。
- **门禁实测（v0.7.8 发版基线）**：`pnpm check` 0/0；`pnpm test` 1130/1130；`pnpm test:ui` 528/528；`pnpm e2e:isolated` 全绿（10 张桌面截图）。
- **门禁实测（当前工作区，含未提交外来改动）**：`pnpm check` 0/0；`pnpm test` **1124/1130（6 失败）**；`pnpm test:ui` **527/528（1 失败）** → 见 `INTG-01`。
- **统计总览**：
  - **源码完整性**：**1 条**（`INTG-01`，最高优先，先于一切开发批次处理）
  - **功能实现共查出**：**8 条**（`FUNC-11` ~ `FUNC-18`）
  - **UI/UX 共查出**：**4 条**（`UI-11` ~ `UI-14`，已合并同根因项）
  - **平台限制**：**0 条新增**（`LIMIT-01` / `LIMIT-02` 维持 10-31 判定不变）
- **条目基线标注**：除 `INTG-01` 外，所有条目均以 **v0.7.8 已提交代码**为准核实（工作区回退导致的三项"复发"不重复计条，归入 `INTG-01`）。

---

## 零、 源码完整性（最高优先，先于一切开发批次）

### `[INTG-01]` 【阻塞】工作区存在一份未提交的外来改动：回退了 v0.7.8 三处已发版修复，新增约 1079 行未评审代码，且门禁实测 6+1 项失败
- **问题描述（可复现）**：
  - **位置**：`src/libs/lv-notice-kit.ts`（工作区 vs `HEAD cedc5c8`：+1079 / -133 行）；文件最后修改时间 2026-11-04 07:53（v0.7.8 提交时间为 06:53，即发版提交 1 小时后产生，非本会话所为）。
  - **操作步骤**：在当前工作区直接跑 `pnpm test`、`pnpm test:ui`，并与 `git diff HEAD src/libs/lv-notice-kit.ts` 对照。
  - **当前表现**：
    1. **回退了 v0.7.8 三处修复**：① 通知合并分支不再继承 actions/level、不再重置自动关闭计时器（撤销按钮指向旧事件、合并包提前消失）；② `snoozeTimers` 集合被整体删除（hub 销毁后稍后提醒仍触发且永不渲染）；③ `withDocLock` 键清理改回恒不成立的旧比较（Map 键永久残留）。注意：**v0.7.8 发版包本身完好**（`package.zip` SHA 一致，三处修复在 tag 内），仅工作区被回退。
    2. **新增未提交、未评审的约 1079 行**：移动端统一弹射坞（Bottom Sheet）、罗盘悬浮球（拖拽/贴边/闲置半隐/沉浸模式）、设备矩阵适配、触感反馈、入口模式持久化等（`ensureMobileEntry` / `MOBILE_BALL_*` / `lv-ball` 等）。
    3. **门禁实测失败（工作区）**：`pnpm test` 6 失败——`tests/architecture.test.ts` 报「lv-notice-kit.ts 直接发网络请求或导入内核传输函数，内核交互必须经 api/ 层」（外来代码违反分层铁律）+ 撤销微胶囊 / showMessage 分流 / lvBackup / lvLaunchpad / lvOmnisearch 五项既有生态契约测试失败；`pnpm test:ui` 527/528（移动端工具栏收纳 B09-1 FAIL）。
  - **期望表现**：工作区要么与 v0.7.8 基线一致，要么在外来改动补齐分层代理、恢复三处修复并全量门禁转绿后作为独立 commit 收尾。
- **解决方案（供决策，本轮未动手）**：
  - **推荐方案**：由产生该改动的并行会话继续收尾——把新增的网络/内核交互改经 `src/api/` 层（或恢复 `globalThis["fetch"]` 规避写法）、将 v0.7.8 的三处修复重新套用、跑通 `pnpm check / test / test:ui / e2e:isolated / check:release` 后独立提交（建议版本号另起，不覆写 v0.7.8）。
  - **备选方案**：若该改动放弃，`git checkout -- src/libs/lv-notice-kit.ts` 即可回到全绿的 v0.7.8 基线（会丢弃 1079 行未提交工作，需用户确认）。
- **成本**：**中（2）** —— 收尾或回滚均为单文件操作，主要工作量在补分层与过门禁。
- **风险**：该文件是全生态共享标准库（window 单例自协商），带着回退与分层违规发版会污染其他小驴插件；**在 INTG-01 收尾前不应进行任何新发版**。
- **优先级**：影响面 `5` × 频率 `5` ÷ 成本 `2` = **12.5（P0 · 阻塞级）**

---

## 一、 功能实现与全链路待办（`FUNC-11` ~ `FUNC-18`）

#### `[FUNC-11]` 【缺陷】互动「撤销」三处不闭环：日记竞态幽灵行、文档/日记清理失败被报完全成功、随路沉淀的事实不回滚
- **合并关联项**：`QuickRecordDialog.svelte` 撤销与日记追加竞态、`index.ts` deleteInteraction 吞清理错误、撤销不回滚 `saveAsFact` 写入的事实画像。
- **问题描述（可复现）**：
  - **位置**：
    1. `src/components/people/QuickRecordDialog.svelte:90-118, 134-144`（保存时日记追加为 `void … fire-and-forget`，撤销 capsule 先弹；撤销里 `void removeDailyNoteInteractionByEventId(eventId).catch(() => {})`）+ `src/services/diary.ts:72-75, 174-188`（`setBlockAttrs` 写 `custom-lvct-event-id` 失败被吞；remove 按 attr 定位不到时静默返回 false）；
    2. `src/index.ts:1233-1238`（`deleteInteraction` 内文档区块与日记清理均 `.catch(() => {})`，撤销 capsule 无条件显示「已撤销」）；
    3. `src/components/people/QuickRecordDialog.svelte:146-155`（勾选「沉淀为事实」后撤销只删互动，不回滚事实段）。
  - **操作步骤**：① 勾选「同步写入当日日记」快速记一笔互动，在日记尚未写完的数秒窗口内立即点通知上的「撤销」；② 在日记属性写入失败的环境下撤销；③ 勾选「同时沉淀为人物事实画像」记一笔后撤销。
  - **当前表现**：① 通知明示「已撤销」，但日记随后补写完成，留下一行永久孤儿互动（attr 写失败时永远删不掉）；② 数据库已删但人物文档互动区块/日记行残留，无任何提示；③ 备注仍留在「谈资与关键事实」区块中。
  - **期望表现**：撤销必须等日记追加落盘后再删（或撤销时等待追加 Promise）；任何一步清理失败时 capsule 降级为 warning（「互动已撤销，但日记/文档残留未清理」）；写了事实的撤销应同步从事实段剔除。
- **解决方案**：`QuickRecordDialog` 保存路径 `await` 日记追加（保持 UI 不阻塞可接受，但撤销回调需持有该 Promise）；`index.ts` 与组件的撤销统一聚合清理结果，失败部分用 `lvNotify` 降级提示；撤销时若 `saveAsFact` 生效，按文本+日期反查事实并重写 `savePersonFactsToDoc`。
- **成本**：**中（2）** —— 两个入口的撤销回调与 diary 服务小改。
- **风险**：需保持日记写入非阻塞体验（不拖慢保存主路径）；e2e 的日记行级同步断言需回归。
- **优先级**：影响面 `4` × 频率 `3` ÷ 成本 `2` = **6.0（P1）** —— 假成功反馈 + 文档残留，属用户可感知的数据一致性缺陷。

---

#### `[FUNC-12]` 【缺陷/生态】撤销互动不回滚小驴打卡事件，且 CheckinBridgeApi 无删除能力
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:1172-1180`、`src/components/people/QuickRecordDialog.svelte:121-127`（保存时 `void logCheckinEventSafely(...)`）；`src/libs/ecosystem-bridge-kit.ts:110-119`（`CheckinBridgeApi` 仅有 `recordEventsBatch`，无删除/回滚 API）。
  - **操作步骤**：配置 `checkinItemId` 后记一笔互动（打卡 +1），随即点撤销。
  - **当前表现**：互动已删，但打卡应用的当天计数/连击保留，两生态数据不一致且无提示。
  - **期望表现**：撤销时回滚对应打卡事件（按 `externalRef: contacts:{docId}:{date}:{ts}` 反查删除）；或短期在撤销文案中明示「打卡记录不回滚」。
- **解决方案**：为 `CheckinBridgeApi` 增加 `deleteEventsByExternalRef(ref)` 能力并在两条撤销路径调用（**方案待确认：涉及跨插件契约扩展，需与小驴打卡侧协同**）。
- **成本**：**中（3）** —— 生态桥双侧契约扩展。
- **风险**：依赖打卡插件版本；旧版本打卡无此能力时需静默降级。
- **优先级**：影响面 `3` × 频率 `2` ÷ 成本 `3` = **2.0（P3）**

---

#### `[FUNC-13]` 【缺陷】AI 提炼降级分支会对思源原生 AI 双发请求
- **问题描述（可复现）**：
  - **位置**：`src/services/ai-extract.ts:80-98`。
  - **操作步骤**：未配置生态共享 AI Key（走 `aiChat` 分支）且内核 AI 未配置/超时/网络失败时，触发「识别资料」。
  - **当前表现**：`catch` 不区分失败来源，无条件再调一次 `aiChat`——同一失败请求重发，耗时与计费翻倍，首次错误信息丢失（lvAi 自身最多 3 次退避重试时最坏累计 5 次请求）。
  - **期望表现**：仅「lvAi 网关分支失败」才回退 `aiChat`；原生分支失败直接上抛。
- **解决方案**：用标志位记录本次是否已走 lvAi 分支，catch 内仅在 `usedLvAi === true` 时回退。
- **成本**：**小（1）** —— 约 5 行。
- **风险**：无。
- **优先级**：影响面 `3` × 频率 `2` ÷ 成本 `1` = **6.0（P1）**

---

#### `[FUNC-14]` 【缺陷】跟进提醒链路接线不全：启动不首跑导致徽章/提醒最长迟到 1 小时，「去记录」不定位联系人
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:570-582`（仅 `lvTicker.onHour/onDateCross` 触发 `checkFollowups`）、`src/index.ts:2586-2599`（跟进卡「去记录」onClick 只 `openWorkbench()` + `emitDataChanged`，未 `openPersonDoc(firstDocId)`；`void this.listContacts().then(...)` 无 `.catch`）。
  - **操作步骤**：① 启动思源时即存在今日到期跟进，观察罗盘徽章与提醒卡；② 到期提醒卡弹出后点「去记录」。
  - **当前表现**：① `followupDueCount` 保持 0、无提醒卡，直到约 1 小时后首个整点心跳；② 落在工作台首页而非该联系人详情，且名册读取失败会产生 unhandled rejection。
  - **期望表现**：workspace ready 后立即首跑一次；数据变更（建跟进/记互动）后刷新徽章；「去记录」直达该联系人。
- **解决方案**：在 workspace ready 回调中 `void this.checkFollowups(true)`；「去记录」改为 `openWorkbench("people") + openPersonDoc(firstDocId)` 并补 `.catch`。
- **成本**：**小（1）**
- **风险**：无。
- **优先级**：影响面 `3` × 频率 `4` ÷ 成本 `1` = **12.0（P1）**

---

#### `[FUNC-15]` 【半成品】小驴罗盘（lvLaunchpad）只注册不挂载，磁贴/徽记/四个二级行动对用户完全不可见
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:1885-1902`（仅 `lvLaunchpad.register(...)`）；v0.7.8 的 `src/libs/lv-notice-kit.ts` 无 `ensureMobileEntry` 实现，`lv:launchpad:open/close` CustomEvent 全库无监听，桌面端无任何挂载调用。
  - **操作步骤**：加载 v0.7.8，在桌面与移动端寻找罗盘入口/人脉磁贴。
  - **当前表现**：入口不存在（e2e 10.5 只断言了注册数据，未断言 UI 呈现，故测试全绿但用户不可见）。工作区外来改动已实现移动端弹射坞与悬浮球，但 `index.ts` 仍未调用接线。
  - **期望表现**：桌面端有顶栏/坞入口、移动端有悬浮球或弹射坞入口，四个二级行动可直达。
- **解决方案**：与 `INTG-01` 收尾联动：接线 `ensureMobileEntry()`（cleaner 挂 lifecycleToken），桌面端入口待弹射坞桌面形态定型后接入。
- **成本**：**中（2）**
- **风险**：入口 UI 与思源顶栏/移动端布局的层叠需真机验证。
- **优先级**：影响面 `4` × 频率 `3` ÷ 成本 `2` = **6.0（P1）**

---

#### `[FUNC-16]` 【缺陷】`syncFullPersonDocument` 中跟进任务同步绕过 withDocLock，与其余 5 个受锁区块并发写同一文档
- **问题描述（可复现）**：
  - **位置**：`src/services/doc-section.ts:224`（Promise.all 中唯一未包 `withDocLock` 的写路径，内部直接 `deleteBlock/updateTaskListItemMarker/writeFollowUpTask` 写内核）。
  - **操作步骤**：手动点「同步档案到正文」，同时内核繁忙（如大文档多窗口编辑）。
  - **当前表现**：与持锁兄弟任务并发写同一 docId，`document is locked` 冲突在此可能复现，失败仅 console.warn，跟进任务块静默不同步。
  - **期望表现**：全部文档写路径统一排队。
- **解决方案**：将该调用包进 `withDocLock(person.docId, ...)` 或移出 Promise.all 串行执行。
- **成本**：**小（1）**
- **风险**：无（同锁 FIFO 排队，不死锁）。
- **优先级**：影响面 `3` × 频率 `2` ÷ 成本 `1` = **6.0（P1）**

---

#### `[FUNC-17]` 【体验】文档镜像同步全链吞错：UI「保存成功」但思源正文区块可能静默过期
- **问题描述（可复现）**：
  - **位置**：`src/components/people/PersonDetail.svelte` 9 处 `void onSyncDocProfile(current).catch(() => {})`（:1807、2214、2231、2249、2543、2575、2600、2903、5722）→ `src/index.ts` → `src/services/doc-section.ts`（各 section 失败仅 console.warn）。
  - **操作步骤**：文档不可达（被删除/内核繁忙）时在详情页编辑资料或记互动。
  - **当前表现**：数据库保存成功、UI 提示成功，但打开思源文档看到旧内容，无任何失败提示。
  - **期望表现**：镜像失败时给一次可关闭的降级通知（节流去重，避免轰炸），提供「重试同步」入口。
- **解决方案**：在 `schedulePersonDocMirror` 失败分支接入 `lvNotify` 静默→胶囊两级降噪提示（同 docId 同轮去重）。
- **成本**：**中（2）**
- **风险**：注意通知频率控制（防打扰体系已就绪，用 category 聚合即可）。
- **优先级**：影响面 `3` × 频率 `3` ÷ 成本 `2` = **4.5（P2）**

---

#### `[FUNC-18]` 【清理批】通知/搜索套件低危缺陷合并批（8 小项）
- **合并关联项**（均在 v0.7.8 基线核实）：
  1. `lv_notice_mute_YYYY-MM-DD` 历史 key 永不清理，localStorage 无限累积（`lv-notice-kit.ts` muteToday）；
  2. lvOmnisearch 每 provider 每次检索泄漏一个 1s 超时 setTimeout（race 胜出后不 clearTimeout）；
  3. 弹射坞/穿透搜索输入无防抖，每键击触发全量 provider 检索；
  4. 常驻通知超过 3 张时第 4+ 张既看不见也关不掉（`slice(-3)`，error 常驻卡可堆满）；
  5. `lvSurfaceStack` 对返回 `"keep"` 的浮层仍执行 splice，违反自身契约（当前无调用方，属标准库陷阱）；
  6. 通知卡 Esc 关闭后 surfaceStack 句柄被永久移出，余下可见卡无法再用 Esc 关闭；
  7. `lvActivity.getTodayRecords` 不做跨日校验（深夜读到昨日记录）、生态徽章模板一次性求值不刷新（`SettingsView.svelte:1174/2005`）；
  8. `src/index.ts` 两处仍用 `store.events[length-1]` 而非已返回的 `recordResult.event`（recorded=false 时日记锚点防御缺口，当前调用方暂不触发）；`syncFollowUpsDocSection` 为全库零调用的死代码。
- **解决方案**：逐项小修（清理旧 key、clearTimeout、200-300ms 防抖、溢出转 silent、keep 不 splice、Esc 后重压栈、跨日校验 + `$state` 刷新、统一用 `recordResult.event`、删除死代码）。
- **成本**：**小（1）** —— 每项 ≤10 行，合并一批处理。
- **风险**：改 surfaceStack 语义需跑 close-guard 相关 UI 回归。
- **优先级**：影响面 `2` × 频率 `2` ÷ 成本 `1` = **4.0（P2）**

---

## 二、 UI/UX 待办（`UI-11` ~ `UI-14`）

#### `[UI-11]` 【缺陷】通知卡可见时，lvSurfaceStack 的 window capture Esc 仲裁会吞掉 close-guard 三选一与思源原生弹窗的 Esc
- **问题描述（可复现）**：
  - **位置**：`src/libs/lv-notice-kit.ts`（surfaceStack window capture 注册，早于 `src/libs/dialog.ts:104-108` 的 window capture 与 `src/components/close-guard.ts:312` 的 document capture）；`src/components/close-guard.ts`、`src/libs/dialog.ts`。
  - **操作步骤**：屏幕上存在任一通知卡（如刚记完互动的胶囊带撤销、或错误卡）时，在有关闭守卫的弹窗中按 Esc，或按 Esc 关闭思源原生对话框。
  - **当前表现**：Esc 先被通知层消费（dismiss 一张卡 + preventDefault + stopPropagation），close-guard 的 `finish("cancel")` 收不到、原生对话框关不掉；最多 3 张卡需按 3 次才轮到真正目标。
  - **期望表现**：存在更上层模态（close-guard 浮层 / `.b3-dialog`）时通知层让路，或消费后不阻断传播。
- **解决方案**：surfaceStack 命中时检测 `.lvct-closeguard` / `.b3-dialog` 在场则返回 false 让路；或改为不 `stopPropagation` 仅处理自身。
- **成本**：**中（2）** —— 需真机核对三层注册顺序与回归 close-guard 全部用例。
- **风险**：让路逻辑过宽会导致通知卡自身无法 Esc 关闭，需两侧都验证。（**待真机复验**：层序结论来自静态溯源，建议先在隔离预览库实测一次。）
- **优先级**：影响面 `4` × 频率 `3` ÷ 成本 `2` = **6.0（P1）**

---

#### `[UI-12]` 【疑似红线违规·待实测】人物详情概览首屏一屏预算疑被 v0.7.6 新增区块打破，「记一笔互动」与「记住的事」跌出首屏
- **问题描述（可复现）**：
  - **位置**：`src/components/people/PersonDetail.svelte` 概览 Tab 渲染顺序：资料条（:4065，含通讯与多维条目）→ 实体名片（:4348，有卡时约 300px 高）→ 人物笔记（:4678）→ 组织经历（:4760）→ 记一笔互动（:4434）→ 事实画像（:4545）；面板 `max-height: min(90vh, 760px)`（`src/index.scss:3994`）。
  - **操作步骤**：在 1280×900 与 150% 缩放（853×533）下打开任意有名片/通讯条目资料的联系人详情，不滚动，找「记一笔」输入框与「记住的事」。
  - **当前表现（静态测算，**待真机实测确认**）**：1280×900 下首屏累计约 900px+，「记一笔」被挤出；853×533 下面板仅约 480px，通讯条目及以下全部在折叠线下。与 `AGENTS.md`「概览首屏只放基本资料与关系、最近互动与下一步、记住的事、记一笔」红线冲突。现有 e2e 仅断言区块存在与折叠态，未断言首屏位置，故未拦截。
  - **期望表现**：通讯条目、实体名片、组织经历、人物笔记默认收进已有 `<details class="lvct-detail__advanced">` 或矮化为一行入口，恢复「资料条 → 关系快照 → 记一笔 → 记住的事」首屏顺序。
- **解决方案**：先在隔离预览库按两个分辨率实测首屏边界；坐实后将四个低频区块收进折叠区。
- **成本**：**中（2）**
- **风险**：详情页 DOM 顺序调整需回归 e2e 步骤 3 与 D 系列冒烟（均按 class 查找，理论兼容）。
- **优先级**：影响面 `5` × 频率 `4` ÷ 成本 `2` = **10.0（P0 · 待实测坐实）**

---

#### `[UI-13]` 【体验】穿透搜索结果在移动端造成「全屏工作台 + 底层文档」双面叠加，且未初始化时无门禁
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:1934/1962/1988`（onClick 先 `openWorkbench` 再 `openPersonDoc`）；`openWorkbenchDialog`（移动端 Dialog 100vw 全屏）；`src/libs/open-document.ts:19-21`（移动端 `openMobileFileById` 切换整个窗口）。
  - **操作步骤**：移动端（或未打开工作台时）点击穿透搜索结果。
  - **当前表现**：移动端先弹全屏工作台 Dialog 且保持挂载，随后整个窗口切到人物文档——文档渲染在 Dialog 底下，必须手动关掉工作台才能看到；未初始化工作区时照样打开文档，观感割裂。
  - **期望表现**：移动端二选一（只开文档，或只开工作台并高亮该人）；未初始化时只走工作台。
- **解决方案**：onClick 内按 `isMobile` 分支；桌面维持双入口现状。
- **成本**：**小（1）**
- **风险**：无。
- **优先级**：影响面 `3` × 频率 `2` ÷ 成本 `1` = **6.0（P1）**

---

#### `[UI-14]` 【体验】通知层 z-index 固定 220，长会话后被思源递增 z-index 的原生弹窗反盖；移动端置顶通知 8 秒压住顶栏
- **问题描述（可复现）**：
  - **位置**：`src/libs/lv-notice-kit.ts` STYLES（`#lv-notice-host { z-index: 220 }`）与移动端 `≤640px` 顶部定位；思源原生 dialog/menu 使用 `++window.siyuan.zIndex`（初始 10，逐次自增）。
  - **操作步骤**：同一会话内累计打开约 210+ 个对话框/菜单后触发通知；或在移动端等一条 8s 通知自然消失。
  - **当前表现**：长会话中原生弹窗盖住通知卡及其按钮；移动端通知短暂遮挡顶栏按钮。
  - **期望表现**：通知 host 动态取 `Math.max(220, window.siyuan.zIndex + 1)`；移动端回到底部或缩短默认时长。
- **解决方案**：post/ensureStyles 时动态写入 host z-index；移动端定位回底部。
- **成本**：**小（1）**
- **风险**：无。
- **优先级**：影响面 `2` × 频率 `2` ÷ 成本 `1` = **4.0（P2）**

---

## 三、 优先级总排序与分批建议

| 批次 | 条目 | 得分 | 目标 |
| :--- | :--- | :--- | :--- |
| **第 0 批（先于一切）** | `INTG-01` | 12.5 | 工作区收尾：恢复 v0.7.8 三修复 + 外来代码补 api/ 层代理 + 门禁转绿独立提交；**收尾前不发任何新版** |
| **第一批（P0/P1 速胜）** | `UI-12`（先实测）、`FUNC-14`、`FUNC-13`、`FUNC-16`、`UI-13` | 10.0 / 12.0 / 6.0 / 6.0 / 6.0 | 详情首屏红线坐实并修复、跟进提醒首跑与直达、AI 双发、绕锁写、移动端双面叠加 |
| **第二批（P1 一致性）** | `UI-11`、`FUNC-11`、`FUNC-15` | 6.0 / 6.0 / 6.0 | Esc 仲裁让路、撤销闭环、罗盘入口接线 |
| **第三批（P2 清理）** | `FUNC-17`、`FUNC-18`、`UI-14`、`FUNC-12` | 4.5 / 4.0 / 4.0 / 2.0 | 镜像失败降噪、套件低危清理、z-index 动态化、打卡回滚（待生态协同） |

- **与 2026-10-31 池的关系**：`FUNC-01~07`、`UI-01/02(关键项)/04/05/07/08(重叠项)` 已在 v0.7.2~v0.7.5 关闭（见 `UNIFIED-BACKLOG-POOL.md` §0.2）；`FUNC-08`（活动日记汇总）已实现；`FUNC-09`（筛选折叠）已实现；`FUNC-10` 部门联动已实现、CardDAV 维持待验证；`UI-03/06/09/10` 维持「随产品收缩推迟」判定，本轮不重复计条。
- **平台限制**：无新增；`LIMIT-01`（AV 单列多值）与 `LIMIT-02`（无副作用打开原生局部图）判定维持。
