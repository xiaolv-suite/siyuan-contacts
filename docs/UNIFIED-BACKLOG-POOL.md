# 小驴人脉（siyuan-contacts）存量材料盘点、全链路审计、单一事实来源待办池与批次验收总录

- **更新时间**：2026-10-31
- **当前版本**：`v0.7.4`（回滚产物已保留于 `package-v0.7.3.zip`、`package-v0.7.2.zip`、`package-v0.7.1.zip` 与 `package-v0.7.0.zip`）
- **方向基准（D-0040 · 2026-10-31 起生效）**：产品收缩到「**查人 → 会前回顾 → 记一笔 → 下次联系**」唯一主线，硬性执行 `AGENTS.md` 方向铁律 R1–R8（功能冻结、不新增插件 JSON 存储、不做无依据评分、详情与首页一屏预算、修复先看去留）。
- **定位**：本项目待办池、真实使用记录、存量材料盘点、原型对照与批次验收的**单一事实来源（Single Source of Truth）**。`docs/AUDIT-BACKLOG-2026-10-31.md` 作为 10-31 只读排查附件保留，其批次顺序已被下方 §零 按 D-0040 R5 重排取代。

---

## 零、 D-0040 真实使用记录与重排后执行队列（唯一现行待办源）

### 0.1 真实使用记录（R1 新需求准入依据）

- **2026-10-31 基线实测**：真实思源库停留于 `v0.6.12`（10-28），共 40 位联系人、历史累计 7 条互动（其中 4 条来自外部插件桥接 `ensurePerson` + `recordInteraction`）。摩擦根因：
  1. **互动记错无法修改，只能删除重记** → 已在 `v0.7.2` 落地锁内墓碑旧事件 + 追加修正事件（保留来源与场合标识，含未保存离开守卫）。
  2. **名册默认打开空右侧速览栏挤压主区，卡片姓名/生日只剩 46px 宽度逐字竖排，工具栏占高 269px 挤出首屏卡片** → 已在 `v0.7.2` 修复（右侧速览默认收起、卡片次级按钮下移页脚、桌面工具栏 7 个低频按钮收纳进「整理与导入」菜单，首屏完整呈现卡片）。
  3. **人物文档「谈资与关键事实」读取失败被静默返回空数组，存在写回覆盖已有内容风险** → 已在 `v0.7.2` 修复（显式抛错 + 未核实基线前禁止盲覆盖）。
  4. **关于一个人的偏好忌口分散在多处，详情概览高达 4550px（5.5 屏）、首页满是无依据评分与重复区块** → 已在 `v0.7.2` 将喜好/忌口红线（`isTaboo`）统一打通至人物文档事实段（自动同步头部微标签、会前 30 秒速览与全库会前速查），删除互惠指数/社交资产雷达/生命周期合作率/状态极佳横幅与重复联系节奏，并将详情概览与首页低频区折叠收纳至一屏。
- **两周真实试用期观察项**（试用期间遇到的真实卡点追加在此，不凭想象扩池）：
  - `[待试用记录]` 将 `v0.7.2` 装入真实思源库日常使用两周，记录实际用到的入口与任何卡顿点。

### 0.2 `AUDIT-BACKLOG-2026-10-31.md` 按 D-0040 R5 重排状态

- **已在 `v0.7.2` ~ `v0.7.4` 关闭（主线断点 + 真宿主全栈实测 + 跨弹窗按钮与高分屏缩放修复）**：
  - `FUNC-01`：首页大盘查看人物直接联动详情并补齐 `label`，工作台冷启动 `memberDocIds -> itemId` 换算与名册活动大盘 `itemId` 下钻修复；首页群体活动大盘「记录新活动」直开录入弹窗（`v0.7.4`）。
  - `FUNC-02`：`loadPersonFactsFromDoc` / `savePersonFactsToDoc` 移除静默吞错与多受控块保护，详情页写入前强制核实读取基线；`QuickRecordDialog` 随路写事实等待落盘并具备防重复记互动保护，手动「同步档案到正文」严格透传写入错误（`v0.7.4`）。
  - `FUNC-03`：详情页 4 处剪贴板复制 `catch` 块移除伪造成功状态，改为显式错误提示。
  - `FUNC-04`：文档浮动档案条与识别补充统一走完整回调的 `openPersonEditDialog`（补齐组织归属、关系称谓与实时广播），新增 `requestWorkbenchNavigation` 冷启动队列解决工作台未开时组织/城市档案条丢事件问题，城市「行程规划」直开 `RegionExplorerDialog`，补齐 `OrgManagerDialog` 与设置页 `ReviewReportDialog` 回调（`v0.7.4`）。
  - `FUNC-05`：接入 `org-membership.json` 与 `commonOrgs` 真实共同机构推荐（消除把普通分组误判为共同机构的缺陷），补齐礼物「转入账本」防重与 `ExchangeLedger` 原地刷新，以及首页潜在关联弹窗错误与重试态（`v0.7.4`）。
  - `FUNC-06`：右侧上下文面板接入人物真实联系节奏与暂停态、接入离席隐私盾遮罩电话/微信、删除或外部变更联系人时即时清空/刷新已删人物（`v0.7.4`）。
  - `FUNC-07`：首页年度交往活跃度热力图补齐 `personDocIds` 与活跃日期格点击下钻（`v0.7.4`）。
  - `UI-01` / `UI-02`（关键项）/ `UI-04` / `UI-05` / `UI-07` / `UI-08`（重叠项）：清零 5 个组件未定义的 `--b3-theme-*` 变量、双图标重叠（`粘贴并识别` / `本周日程视窗`）与无障碍 `aria-label` 缺失；修复思源窄分栏下首页统计卡与热力图溢出、150% 缩放（`853×533`）与 `390px` 窄屏下名册工具栏/底部导航横向溢出；新建/编辑联系人弹窗底部主操作栏吸底固定（150% 缩放首屏可见）；全站 7 处原生 `window.confirm` 统一收口至 `confirmDialog`（`v0.7.4`）。
- **保留待做（下一批·两周真实试用后按实际摩擦取用）**：
  - **体验增强与远期集成**：`FUNC-08`（群体活动同步当日思源日记汇总）、`FUNC-09`（名册 4 项以上复杂筛选芯片折叠）、`FUNC-10`（组织部门稳定 ID 联动与 CardDAV）。
  - **未公开发布自管存储二期物理收编**：试用确认无回退需求后，将 `person-scratchpads`（并入个人备注）、`person-promises` / `person-itineraries`（并入跟进计划）、`person-kinship`（并入关系称谓）、`person-origins`（并入人物文档初识段）与 `person-lifecycle-stage` 完成存储文件级裁撤（减至 ≤17 个自管文件）。
- **随产品收缩推迟或不再投入（R5 / R6）**：
  - `UI-03`、`UI-06`（次级大盘微动效）、`UI-09`、`UI-10`：涉及低频次级弹窗或逐面板样式统一，待二期存储裁撤与面板精简定型后，仅对留存主线面板按需处理。

---

## 一、 存量材料全量盘点与四态判定

全量扫描工作区 `D:\思源插件\小驴人脉` 下除源码（`src/`、`tests/`）、构建产物（`dist/`）、依赖与工具缓存（`node_modules/`、`.git/`、`.jeikcode/`、`.mimosa/`、`.workbuddy/`、`.zcode/`）以外的全部存量材料，按内容归类并判定为 **有效**、**过期**、**重复**、**已落地未标记** 四态之一：

### 1.1 待办、规划与任务单类（12 份）

| 文件路径 | 内容摘要 | 四态判定 | 整合与处置动作 |
| :--- | :--- | :--- | :--- |
| `.tasks/TASK-20261031-github-benchmark-fusion.md` | 对标 Monica / Twenty / Simple-PRM 三大开源 PRM 的融合任务单 | **已落地未标记**（主功能已合入，但迁移包、联系人合并、有向边保真与草稿守卫余项未闭环） | 提取余项并入本文待办池（`BUG-01`~`BUG-04`、`UX-01`）并在本轮全部收口 |
| `ECOSYSTEM-INTEGRATION-DIRECTIVE.md` | 小驴生态中枢下发的 8 项必修任务（关键词、`settingsWindow`、打卡事件名、顶栏图标、SQL 校验等） | **已落地未标记** | 核实代码已 100% 落地；原文件不删，顶部已加注落地与归档迁移声明 |
| `docs/NEXT-DEV-ROADMAP-2026.md` | 2026-2027 短中长期演进路线图 | **有效**（其中 1.3 条件折叠、2.1 图例交互、2.3 智能字段嗅探已落地；其余保留为远期功能池） | 顶部已注明迁移去向，未完成远期项归入本文待办池 `FEAT-*` |
| `docs/ACTIVE-BACKLOG.md` | 2026-09~10 待办总索引 | **过期/重复**（含大量已交付 v0.4~v0.5 快照与少量有效宿主待验项） | 原文件保留，顶部已注明有效项迁移至本文 |
| `docs/AGENT-DEVELOPMENT-BACKLOG.md` | Agent 原子任务看板（262 KB） | **过期/重复**（绝大多数隔离任务已完成，仅剩 Host Queue 与远期候选） | 原文件保留，顶部已注明有效项迁移至本文 |
| `docs/AGENT-EXECUTION-QUEUE.md` | Agent 执行短队列视图 | **重复**（`AGENT-DEVELOPMENT-BACKLOG.md` 的摘要视图） | 原文件保留，顶部已注明迁移至本文 |
| `docs/FEEDBACK-BACKLOG.md` | 用户反馈与审计转化记录（186 KB） | **已落地未标记**（B01~B14、E-01~E-60 主线已落地） | 原文件保留作历史需求溯源，顶部已注明迁移至本文 |
| `docs/NEXT-DEVELOPMENT-PLAN.md` | 历史阶段开发计划（67 KB） | **过期**（记录 v0.5.17~v0.5.18 收口过程） | 原文件保留，顶部已注明迁移至本文 |
| `docs/ROADMAP.md` | 早期特性设计与路线图 | **过期/重复**（已被 `NEXT-DEV-ROADMAP-2026.md` 取代） | 原文件保留，顶部已注明迁移至本文 |
| `docs/PRODUCT-PLAN.md` | 产品愿景与 F01~F16 原始规划 | **已落地未标记**（F01~F16 均已交付） | 原文件保留，顶部已注明迁移至本文 |
| `docs/UI-REFACTOR-PLAN.md` | 早期 UI-01~UI-12 改造排期表 | **已落地未标记** | 原文件保留，顶部已注明迁移至本文 |
| `docs/AUDIT-REPAIR-PLAN-2026-10-18.md` | 2026-10-18 四张审计修复执行卡 | **已落地未标记** | 原文件保留，顶部已注明迁移至本文 |

### 1.2 原型与视觉规范类（15 份）

| 文件路径 | 内容摘要 | 四态判定 | 整合与处置动作 |
| :--- | :--- | :--- | :--- |
| `../design/lvct-ui-prototype.html` 及 `../design/prototype-screens/*.png` (4张) | 立项初期 v1.0 暗紫主题静态草图（含右侧 Peek 抽屉与“建议”占位） | **过期** | 原文件保留不删；已在 HTML 顶部写入归档注释，并新增 `../design/ARCHIVE-NOTICE.md` 归档说明 |
| `docs/ui-prototype.html` | v0.4~v0.5 全产品交互原型（11 个产品表面 + 1 规范页） | **过期**（部分结构有效，色彩令牌与 v0.6~v0.7 新增模块落后于生产实现） | 见下文 §二「原型与实现逐项对照表」 |
| `docs/CONTACT-CREATE-PROTOTYPE.md` | 新建联系人分层表单原型说明 | **有效** | 与当前 `AddPersonDialog.svelte` 对照见 §二 |
| `docs/ORGANIZATION-PROTOTYPE.md` | 组织列表与新建组织资料页原型说明 | **有效** | 与当前 `OrgsView.svelte` / `OrganizationProfileEditor.svelte` 对照见 §二 |
| `docs/UI-SYSTEM-SPEC.md`、`docs/DESIGN-SYSTEM-SPEC.md`、`docs/COMPONENT-CATALOG.md` | UI 系统规范、设计令牌规范与组件目录 | **有效** | 保持作为现行 UI 约束参考 |
| `docs/UI-HANDOFF.md`、`docs/UI-CURRENT-BASELINE.md`、`docs/UI-REGRESSION.md`、`docs/PAGE-STATUS.md` | v0.2~v0.5 阶段 UI 移交、状态矩阵与回归说明 | **过期** | 作为历史迭代快照保留，当前状态以本文为准 |
| `docs/UI-NORMS-PROMAX-SHADCN-2026-10-11.md`、`docs/UI-REFERENCE-R54-2026-10-11.md`、`docs/UI-REFERENCE-CROSS-PLUGIN-2026-10-12.md`、`docs/UI-UPGRADE-2026-10-11.md`、`docs/TOKEN-CONSOLIDATION-2026-10-14.md` | 视觉升级与跨插件对齐专项文档 | **已落地未标记** | 均已融入 `src/style/_tokens.scss` 与 `src/index.scss` |

### 1.3 契约、治理、调研、发布说明与实证归档类

| 类别与文件路径 | 四态判定 | 说明 |
| :--- | :--- | :--- |
| `AGENTS.md`、`BRANCH-PROTOCOL.md`、`docs/DATA-CONTRACT.md`、`docs/DECISIONS.md`、`docs/DEVELOPMENT.md`、`docs/E2E-SMOKE-RUNBOOK.md`、`docs/BRIDGE.md`、`docs/FIELD-SUPPORT.md`、`docs/HANDOFF.md` | **有效** | 核心开发铁律与数据契约；本轮已在 `docs/DATA-CONTRACT.md` 补齐 `person-origins.json` 等 9 个新模块与 24 模块迁移契约 |
| `README.md`、`README.en-US.md`、`CHANGELOG.md`、`docs/RELEASE.md`、`docs/PROGRESS.md` | **有效** | 本轮已优化双语 `README` 首屏与折叠历史日志，并同步升级至 `v0.7.1` |
| `docs/CHANGELOG.md` | **重复/过期** | 停留在 v0.6.42，顶部已注明以根目录 `CHANGELOG.md` 为唯一事实源 |
| `docs/RELEASE-NOTES-v0.5.0.md` ~ `v0.6.29.md`（126 份） | **过期** | 历史单版本发布说明归档，保留备查 |
| `docs/CARDAV-RESEARCH-*.md`、`docs/CONTACT-*-2026-10-09.md`、`docs/GRAPH-RESEARCH-2026-10-12.md`、`docs/OCR-RESEARCH-2026-10-11.md` | **有效** | 外部同步、图谱无副作用读取与 OCR 宿主边界调研依据 |
| `docs/CURRENT-STATUS-AUDIT-2026-10-18.md`、`docs/verification/*`（99 份）、`scripts/spike/*`（75 份） | **过期** | 历史隔离内核 spike 与阶段审计证据快照，保留备查 |

---

## 二、 原型与当前生产实现逐项对照表

对照范围：`../design/lvct-ui-prototype.html`（已归档早期草图）、`docs/ui-prototype.html`（库内交互原型）、`docs/CONTACT-CREATE-PROTOTYPE.md`、`docs/ORGANIZATION-PROTOTYPE.md` 与当前 `v0.7.1` 生产代码。

| 原型模块 / 视图 | 原型设计描述 | 当前生产代码实现 | 对照结论（三选一） | 说明与处置 |
| :--- | :--- | :--- | :--- | :--- |
| **全局色彩与表面体系** | `design/` 原型用暗紫 `#6366f1`；`docs/ui-prototype.html` 用青绿 `#129e9a` 与蓝灰底 `#f3f6fc` | 生产代码采用暖米白底 `#FAF8F6` 托纯白浮卡 + 暖干邑橙 `#EA580C`（操作）与向阳琥珀金 `#D97706`（数据）双色分工 | **原型已过期** | 生产已按高奢暖调体系演进；早期原型已归档说明 |
| **主导航栏（侧栏/底栏）** | 早期原型包含 disabled 的“建议（即将推出）”第 5 导航项 | 生产 `Workbench.svelte` 提供“首页 / 联系人 / 图谱 / 组织 / 设置”五项正式导航，移除未开放的“建议”占位 | **原型已过期** | 符合“未开发候选不占用正式导航”规范 |
| **人物详情呈现方式** | `design/lvct-ui-prototype.html` 为右侧 400px 无遮罩 Peek 抽屉 | 生产统一为 `LvctDialog` 居中宽版模态窗（移动端全屏），支持前后翻人与三 Tab 切换 | **原型已过期** | 见 `DECISIONS.md` 与 `UI-PROTOTYPE-AUDIT`，居中模态为正式定稿 |
| **新建联系人（`CONTACT-CREATE-PROTOTYPE.md`）** | 粘贴并识别 + 基础资料（姓名唯一必填） + 可折叠补充资料（多组织/经历、别名、与我的关系、人物备注） | `AddPersonDialog.svelte` 完整实现分层录入、同名消歧、新建组织联动与部分失败保留 | **已对齐（无走样）** | 生产实现更进一步支持同组织多段经历补录 |
| **组织页与新建组织（`ORGANIZATION-PROTOTYPE.md`）** | 组织列表搜索/状态过滤/卡片 + 七类起点模板 + 基本资料/Logo/部门树/自定义字段；后续规划含部门稳定 ID 联动与只读组织详情总览 | `OrgsView.svelte`、`OrgManagerDialog.svelte`、`OrganizationProfileEditor.svelte` 已落地列表、管理与资料编辑；“部门稳定 ID 自动改名联动”与“独立只读组织百科总览页”尚未做 | **部分未实现** | 已将“组织部门树稳定 ID 联动与详情总览”归入本文待办池 `FEAT-03` |
| **文档浮动档案条（Doc Strip）** | `docs/ui-prototype.html` 展示人物姓名、联系方式复制、展开简报，并画有行内直接“+记互动 / +建跟进”按钮 | `src/panels/person-panel.ts` 已实现人物/组织/城市三位一体档案条、联系方式一键复制、简报展开、编辑资料及携稳定 ID 打开工作台定位 | **部分原型已过期 / 生产增强** | 生产扩展了组织与城市档案条；记互动通过打开工作台人物详情完成，避免在编辑器顶部塞入复杂表单 |
| **人物详情：初识溯源、会前速览与 Twenty 时间轴** | 旧 HTML 原型中无此三项，系 `.tasks/TASK-20261031-github-benchmark-fusion.md` 新增设计 | `PersonDetail.svelte` 已实现，但基线存在首次空库保存失败、无错误提示、草稿被刷新覆盖与样式令牌偏差 | **实现走样（本轮已修复）** | 本轮通过 `BUG-01`~`BUG-04` 与 `UX-01` 已彻底修复并对齐规范 |

---

## 三、 缺陷排查报告（按适用类别实测取证）

按照项目实际情况，选取**崩溃与逻辑类**、**状态类**、**数据类**、**交互类**、**集成类**五大适用类别进行全仓排查。不适用项（如服务端 SQL 注入——本插件仅调本地思源内核 SQL 且已全部经块 ID 正则与单引号转义校验）直接跳过。所有选中项均附可复现步骤与基线实际表现：

### 3.1 `[BUG-01]` 崩溃与逻辑类：关系图谱 `orderGraph` 将有向引荐边（`introducer`）按字典序反转，导致引荐方向与悬停说明颠倒
- **位置**：`src/domain/graph.ts:148`、`src/domain/graph.ts:301`
- **可复现步骤**：
  1. 创建两位联系人：被引荐人甲（`docId: "20260101000000-aaaaaaa"`）与引荐人乙（`docId: "20261231235959-zzzzzzz"`），满足 `docTarget < docIntroducer`。
  2. 在甲的“初识溯源与引荐人”中将引荐人设为乙，保存后打开「关系图谱」。
  3. 观察画布上甲与乙之间的有向虚线边箭头方向，并悬停查看边证据卡片。
- **基线表现**：`buildGraph` 生成了正确的 `{ source: 乙, target: 甲, kind: "introducer" }`，但随后 `graphRegistry` 调用 `orderGraph` 时执行了无差别的 `const [source, target] = [edge.source, edge.target].sort()`，因甲的 ID 字典序小于乙，边被反转篡改为 `{ source: 甲, target: 乙 }`。画布箭头反过来从被引荐人甲指向引荐人乙，悬停气泡显示“被引荐人甲 是 引荐人乙 的初识引荐人”，事实完全颠倒。
- **本轮修复**：`orderGraph` 对有向边 `kind === "introducer"` 保留原始 `[edge.source, edge.target]` 方向，不作字典序交换；`GraphEdgeKind` 补齐 `"introducer"`。

### 3.2 `[BUG-02]` 数据与崩溃类：初识溯源（`person-origins.json`）在全新工作区首次保存必抛 `StoreIntegrityError`，且未纳入数据迁移包
- **位置**：`src/domain/person-origin.ts:111`、`src/data/person-origins.ts:40`、`src/services/migration-bundle.ts`
- **可复现步骤**：
  1. 在从未写入过 `person-origins.json` 的工作区（`plugin.loadData("person-origins.json")` 返回 `null` 或空串 `""`），打开任意联系人详情页，点击「编辑初识」，输入“2025春季峰会”，点击「保存初识信息」。
  2. 在「设置 → 导出中心」导出插件数据迁移包，检查 JSON 中的 `modules`。
- **基线表现**：
  1. `normalizePersonOriginStoreForWrite(raw)` 对 `null` 或 `""` 直接执行 `if (!raw || typeof raw !== "object") throw new StoreIntegrityError(...)`，导致首次保存 100% 抛错失败；
  2. `migration-bundle.ts` 仅导出 23 个模块，完全漏掉 `person-origins.json`，导出与恢复后初识溯源及引荐链路全部丢失。
- **本轮修复**：`normalizePersonOriginStoreForWrite` 兼容 `raw == null || raw === ""` 返回空 store；`savePersonOrigin` 支持全空内容自动删除记录；实现 `mergePersonOriginStore` 并接入 `migration-bundle.ts`（扩充为 **24 模块**全要素无损迁移包）。

### 3.3 `[BUG-03]` 数据类：合并重复联系人（`executeContactMerge`）遗漏初识溯源、关系称谓与群体活动出席人的迁移
- **位置**：`src/services/duplicate-merge.ts:39-424`
- **可复现步骤**：
  1. 为次要联系人 `secondary` 录入初识溯源信息，并将第三位联系人 C 的引荐人设为 `secondary`；同时为 `secondary` 登记“与我的关系称谓”并加入一场群体活动的 `attendees`。
  2. 使用「合并重复联系人向导」将 `secondary` 合并入主要联系人 `primary`。
- **基线表现**：合并服务迁移了 16 类存储，但遗漏了 `person-origins.json`、`person-relationship-labels.json` 与 `occasions.json`：`secondary` 的初识溯源与关系称谓丢失，第三人 C 的引荐人仍指向已移入回收站的 `secondary`，群体活动出席人未替换为 `primary`。
- **本轮修复**：在 `executeContactMerge` 锁内事务补齐第 18~20 步：合并初识溯源并自动将全库指向 `secondary` 的 `introducedByDocId` 重定向至 `primary`（带防自环保护）、去重合并关系称谓、替换并去重群体活动 `attendees`。

### 3.4 `[BUG-04]` 状态与交互类：初识溯源编辑与管家问候提醒静默吞异常、外部刷新覆盖编辑草稿、缺少关闭未保存守卫
- **位置**：`src/components/people/PersonDetail.svelte:79-144, 2654, 3270-3342, 4783`
- **可复现步骤**：
  1. 在详情页打开「编辑初识」，输入草稿期间若触发数据 `revision` 更新，观察输入框；或输入未保存直接按 `Esc` 关闭详情弹窗。
  2. 当保存初识失败，或未启用小驴管家时点击「提醒问候（同步到小驴管家）」，观察界面反馈。
- **基线表现**：`revision` 刷新时未检查 `!originEditing && !originSaving` 直接重跑 `loadOrigin()` 冲掉用户草稿；按 `Esc` 直接关闭无未保存提示；保存异常仅打 `console.warn`，管家未启用返回 `false` 时按钮闪一下无任何提示。
- **本轮修复**：接入 `useCloseGuard` 保护 `originDirty` 未保存草稿与 `originSaving` 忙碌态；`refreshPending` 守卫排除编辑态；新增 `originError` 与 `greetingReminderError` 行内错误提示。

### 3.5 `[BUG-05]` 数据与集成类：已保存视图缺少 `lifecycleStage` / `heatLevel` 枚举白名单校验，且全仓残留 26 处 UTC 日期切片偏差
- **位置**：`src/domain/saved-views.ts:77-78`、`src/index.ts:1939`、`src/domain/lifecycle-stage.ts`、`src/domain/social-radar.ts` 等 18 个文件共 26 处
- **可复现步骤**：
  1. 向 `normalizeSavedViews` 传入含非法 `lifecycleStage: "bad"` 或 `heatLevel: "bad"` 的视图对象，观察输出。
  2. 在北京时间凌晨 `00:00 ~ 07:59`（UTC 前一日 `16:00 ~ 23:59`）新建行程、承诺或计算社交雷达逾期，观察默认日期。
- **基线表现**：`normalizeSavedViews` 使用 `as any` 放行任意非空字符串，导致坏枚举视图使名册筛选恒为 0 人；26 处 `new Date().toISOString().slice(0, 10)` 取 UTC 日期，在东八区凌晨 8 点前全部产生“差一天（取到昨天）”偏差。
- **本轮修复**：`saved-views.ts` 增加 `isLifecycleStageFilter` 与 `isHeatLevelFilter` 白名单校验；全仓 26 处 `toISOString().slice(0, 10)` 统一替换为本地时区 `toLocalDateKey(new Date())`，并新增自动化扫描单测守门。

---

## 四、 核心功能全链路验证与半成品识别

对插件全部核心模块逐项验证“输入 $\rightarrow$ 处理 $\rightarrow$ 持久化 $\rightarrow$ 重载后仍在 $\rightarrow$ 异常后可恢复”完整链路。识别出的半成品（`person-origins.json` 缺迁移与首次空库崩溃、初识异常静默吞掉）均已在本轮清零，代码库中不留半成品。

| 功能模块 | 结论分类（三选一） | 验证证据与限制说明 / 替代方案 |
| :--- | :--- | :--- |
| 工作空间初始化、锚点核验与故障恢复 | **已实现且可用** | `tests/workspace-state.test.ts`、UI 冒烟 529/529 验证创建、复用、失联重绑与中断恢复 |
| 联系人 CRUD、同名消歧、批量操作与软删除回收站 | **已实现且可用** | AV 9 字段写后回读、30 天回收站快照与一键恢复闭环（`tests/trash.test.ts`、UI `B-15`） |
| 圈层联络周期、关系温度计与降温预警雷达 | **已实现且可用** | 14/30/90/180 天四档预设、五阶温度推导、名册「待问候/渐冷」筛选与降温大盘全通 |
| 初识溯源、引荐人链路与会前 30 秒破冰速览卡 | **已实现且可用** | 本轮修复首次空库写入、清空移除、草稿守卫、有向图边保真并纳入 24 模块迁移包 |
| 互动记录、场景模板、Twenty 月度分布与编年史长卷 | **已实现且可用** | Web Lock + 写后回读、墓碑防复活、模板并发冲突基线保护、一键沉淀思源实体文档 |
| 跟进计划、思源文档任务块双向对账 | **已实现且可用** | 稳定请求 ID 幂等、原生任务块勾选/改期/删除对账与 `docMissing` 保护 |
| 组织档案、多段成员任职历史、共同背景与双链投影 | **已实现且可用** | 支持在职/历史多段经历、归档保护、共同背景重叠期计算与 `custom-lvct-org-links` 投影 |
| 双模式关系图谱（显式/引荐/共现 + 文档引用）与枢纽分析 | **已实现且可用** | Cytoscape 四布局、时间轴演化回放、跨圈桥梁人挖掘与 Markdown 导出 |
| 会客行程、社交偏好忌口、双向信诺、往来账本、亲属树 | **已实现且可用** | 全部具备独立 schema 1 存储、Web Lock 保护、写后回读、迁移包覆盖与联系人合并迁移 |
| vCard 导入导出、CSV（带 UTF-8 BOM）导出、iCal (`.ics`) 导出 | **已实现且可用** | 符合 RFC 6350 / RFC 4180 / RFC 5545，支持农历除夕（腊月三十）平年自适应回退廿九 |
| 笔记捕获、粘贴识别（QuickFill）与 AI 隐私预检 | **已实现且可用** | 发送前强制展示全文、字节数与字段预检，支持脱敏与随时取消，候选须人工确认才落库 |
| 跨插件联邦桥（小驴打卡、小驴雷切、小驴管家） | **已实现且可用** | `ecosystem-bridge-kit.ts` 安全降级调用，本轮已补齐管家未启用时的用户可见提示 |
| 组织部门稳定 ID 改名联动与独立只读组织总览页 | **技术上可行但未做** | 当前部门按名称记录在成员经历中，组织资料已有部门树；后续可按稳定部门 ID 联动（见 `FEAT-03`） |
| CardDAV 在线通讯录双向同步 | **技术上可行但未做** | 已有完整协议调研（`CARDAV-RESEARCH-2026-10-09.md`），需远端账户凭据与同步游标状态机；当前通过 `.vcf` 导入导出替代（见 `FEAT-02`） |
| 正式多值联系方式（多电话/多邮箱主次与 AV 投影） | **受平台限制无法实现（原生 AV 单列限制）** | **限制来源**：思源 Attribute View 的 `phone`/`email`/`url` 列类型均为单标量值，不支持单格多值结构化存储。<br>**当前替代方案**：主号码/主邮箱存 AV 列供名册展示与筛选；其余多个号码/邮箱保存在人物文档的「补充资料（`PersonFieldsEditor`）」两层分组中，支持重复同名条目与一键复制。 |
| 编程方式直接打开并定位思源原生局部关系图面板 | **受平台限制无法实现（宿主 API 未开放）** | **限制来源**：思源 `openGraph` 属于宿主内部 `layout/dock/util.ts` 私有实现，插件公共 API（`siyuan.d.ts`）未暴露打开原生图面板并定位节点的稳定接口，且直接调用 `/api/graph/getLocalGraph` 会覆盖用户全局图配置（实证见 `GRAPH-RESEARCH-2026-10-12.md`）。<br>**当前替代方案**：插件内置「文档引用图」模式，直接只读查询思源 `refs`/`blocks` 表，在插件画布内无副作用渲染原生双链引用网络。 |

---

## 五、 界面审查报告（含代码位置与实测截图）

审查覆盖桌面端（1280px）、平板（640px/575px）、移动端（390px）、明暗双主题与思源宿主样式基线：

| 审查维度 | 发现问题与具体代码位置 | 修复方案 | 实测验证与截图证据 |
| :--- | :--- | :--- | :--- |
| **1. 样式统一令牌与硬编码核查** | 1. `src/index.scss:2846-2869` 中 `.lvct-people__group-tab--starred` 与 `--overdue` 误引用了不存在的 `--lvct-heat-chill` / `--lvct-heat-cool`（真实令牌名为 `--lv-heat-cool` / `--lv-heat-cold`），导致退化为硬编码 fallback 且暗色主题失配；<br>2. `src/components/people/PeopleView.svelte:2195` 星标图标内联硬编码 `fill="#f59e0b" color="#d97706"`；<br>3. `src/index.scss:12003` `.lvct-twenty-spark-bar--active` 数据柱误用操作色 `--lv-brand`。 | 1. 修正为真实令牌 `--lv-heat-cool`（微凉琥珀金）与 `--lv-heat-cold`（渐冻天青蓝）；<br>2. 移除 `PeopleView.svelte` 内联色值，改用 `currentColor`；<br>3. Twenty 月度互动分布柱改用数据金令牌 `--lv-data-amber`。 | 令牌审计脚本通过；截图见 `scripts/e2e/shots/workbench-people-desktop-light.png`、`scripts/e2e/shots/workbench-people-desktop-dark.png` |
| **2. 同一控件跨面板一致性** | `src/index.scss:11942` `.lvct-origin-edit-box` 中单行 `input, select` 设置了 `border-radius: 8px`，与全站单行输入框/选择器 `9999px` 全胶囊规范不一致。 | 将 `.lvct-origin-edit-box` 的 `input, select` 圆角对齐 `var(--lv-r-pill, 9999px)`，多行 `textarea` 对齐 `var(--lvct-r-md, 12px)`。 | 样式单测 `tests/a11y-contacts-styles.test.ts` 通过；截图见 `scripts/e2e/shots/workbench-peek-desktop-light.png` |
| **3. 可交互元素状态完整性与高对比度** | 1. `src/index.scss:11808` `.lvct-premeeting-brief__summary` 隐藏原生三角后缺少 `:hover` 与 `:focus-visible` 焦点环；<br>2. `src/index.scss:11995` `.lvct-twenty-spark-bar` 在 Windows 高对比度模式（`forced-colors: active`）下背景被系统擦除。 | 1. 为 `.lvct-premeeting-brief__summary` 补齐 `:hover` 微底色与 `:focus-visible` 2px 品牌色焦点环；<br>2. 为 `.lvct-twenty-spark-bar` 补齐 `@media (forced-colors: active)` 实体边框与 `forced-color-adjust: none`。 | 单测 `tests/a11y-contacts-styles.test.ts` 验证通过 |
| **4. 窄窗口与系统缩放下错位截断** | `src/index.scss:11842` `.lvct-premeeting-brief__headline` 强制 `white-space: nowrap`，在 390px 窄屏下被左侧徽标与右侧“复制速览”按钮挤压截断。 | 为 `.lvct-premeeting-brief__headline` 增加 `min-width: 0; flex: 1;`，并在 `@media (max-width: 640px)` 下切换为 `white-space: normal; flex-basis: 100%;` 完整换行显示。 | 390px/575px/640px/1280px 断点扫描 `scripts/e2e/shots/breakpoints/peek-390.png`、`people-390.png` 零横向溢出 |
| **5. 主次层级与首屏关键操作可见性** | 首页主行动区、名册吸顶搜索/筛选栏与详情页吸顶头部操作栏层级清晰，关键操作无需滚动即可触达。 | 保持现有吸顶/吸底固定区架构，无需额外改动。 | 截图见 `scripts/e2e/shots/breakpoints/home-1280.png`、`home-390.png` |

---

## 六、 单一事实来源待办池（Unified Backlog Pool）

- **优先级计算公式**：$\text{优先级得分} = \frac{\text{影响面 (1-5)} \times \text{触发频率 (1-5)}}{\text{实现成本 (1-5)}}$，按得分从高到低排序，并严格遵循“**先修缺陷 $\rightarrow$ 再补未完成功能 $\rightarrow$ 最后新增与体验优化**”的执行顺序。

| 编号 | 类型 | 待办事项描述 | 影响面 (1-5) | 频率 (1-5) | 成本 (1-5) | 优先级得分与理由 | 依赖项 | 验收方式 | 当前状态 |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **BUG-01** | 缺陷 | 关系图谱 `orderGraph` 将有向引荐边 `introducer` 按字典序反转，导致引荐方向颠倒 | 5 | 4 | 1 | **20.0（P0）**：直接篡改人脉引荐事实方向，单文件纯函数可修 | 无 | 单测验证 `target < source` 时 `orderGraph` 与 `graphRegistry` 保持 `source=引荐人` | ✅ **本轮已完成** |
| **BUG-02** | 缺陷 / 功能 | `person-origins.json` 在全新空库（`null`/`""`）首次保存抛错，且未纳入全要素数据迁移包 | 5 | 5 | 2 | **12.5（P0）**：阻断新用户首次保存初识信息且导致换机备份丢数据 | 无 | 单测与 UI 迁移回归验证 `null`/`""` 空库写入及 24 模块迁移往返 | ✅ **本轮已完成** |
| **BUG-03** | 缺陷 | 合并重复联系人（`executeContactMerge`）遗漏初识溯源（含引荐人重定向）、关系称谓与群体活动出席人迁移 | 4 | 3 | 2 | **6.0（P1）**：合并重复人脉时造成关联数据丢失或悬空指针 | BUG-02 | 单测验证合并后 19 项数据完整转移、第三人引荐指针重定向至主人物 | ✅ **本轮已完成** |
| **BUG-04** | 缺陷 / 体验 | 人物详情初识溯源保存与管家问候同步静默吞异常、外部刷新覆盖草稿、缺关闭守卫 | 4 | 4 | 2 | **8.0（P1）**：用户编辑草稿易被外部刷新冲掉且异常无感知 | BUG-02 | 单测与三套 UI 冒烟验证草稿守卫、清空删除与行内错误提示 | ✅ **本轮已完成** |
| **BUG-05** | 缺陷 / 技术债 | `saved-views.ts` 缺 `lifecycleStage`/`heatLevel` 白名单校验；全仓残留 26 处 `toISOString().slice(0, 10)` UTC 日期切片 | 4 | 4 | 2 | **8.0（P1）**：东八区 0~8 点产生跨天偏差，脏枚举导致视图空白 | 无 | 单测验证非法枚举过滤 + AST/文本扫描 `src/` 零 UTC 日期切片 | ✅ **本轮已完成** |
| **UX-01** | 体验 | 名册待问候/星标胶囊误用不存在的 `--lvct-heat-*` 变量、会前速览卡窄屏截断与焦点环缺失、Twenty 柱状图高对比度适配 | 3 | 4 | 1 | **12.0（P2）**：影响暗色主题、390px 窄屏可读性与高对比度无障碍 | 无 | 样式契约单测 + 28 景四断点截图扫描 + 三套 UI 529/529 | ✅ **本轮已完成** |
| **FEAT-01** | 功能 | 多参与者活动（Occasions）保存时在思源当日日记（Daily Note）生成同场汇总双链记录 | 3 | 3 | 2 | **4.5（P2）**：增强群体活动与思源日记的双向反链贯通 | 已关闭 | 单测验证日记 Markdown 汇总生成与幂等追加 | 待排期（下一批次） |
| **FEAT-02** | 功能 | CardDAV 在线通讯录手动单向/双向增量同步通道 | 4 | 2 | 5 | **1.6（P3）**：需外部 CardDAV 测试服、凭据安全存储与宿主 CORS 实证 | 外部凭据 | 真实 Radicale/Nextcloud 靶场 E2E 验证 | 待排期（需外部凭据） |
| **FEAT-03** | 功能 | 组织部门树稳定 ID 改名联动与独立只读组织详情总览页 | 3 | 2 | 4 | **1.5（P3）**：需扩展 `org-membership.json` 部门 ID 映射与迁移规则 | 已关闭 | 部门改名联动单测与组织详情 UI 回归 | 待排期 |
| **TECH-01** | 技术债 | 真实用户日常库、Android 真机软键盘/系统返回与多窗口并发竞争人工验收（Host Queue） | 3 | 2 | 4 | **1.5（P3）**：隔离 Chromium 与隔离内核已过，真机需物理设备环境 | 物理真机 | 按 `RELEASE.md` 手工清单在 Android 真机与日常库留证 | 待真机环境 |

---

## 七、 本轮批次可复现验收步骤与实测结果

本轮共完成 **6 项**（5 项缺陷/半成品修复 + 1 项 UI 审查优化，另有存量盘点归档与双语 README 优化），达到“积累 3~5 项以上升一个小版本号做本地发版”的条件，因此将版本号从 `0.7.0` 升级至 **`0.7.1`**。

### 7.1 单项可复现验收步骤与执行结果

1. **`BUG-01`（图谱有向引荐边方向保真）**：
   - **验收步骤**：执行 `node --test tests/benchmark-fusion.test.ts`，构造 `docTarget = "20260101000000-aaaaaaa"` 与 `docIntroducer = "20261231235959-zzzzzzz"`，验证 `orderGraph` 与 `graphRegistry` 输出的 `introducer` 边 `source === docIntroducer` 且 `target === docTarget`。
   - **实测结果**：`PASS`（`BUG-01 回归 · orderGraph 与 graphRegistry 保留 introducer 有向引荐边原始方向`）。
2. **`BUG-02` & `BUG-04`（初识溯源空库首次写入、清空移除、草稿守卫与 24 模块迁移包）**：
   - **验收步骤**：执行 `node --test tests/benchmark-fusion.test.ts tests/migration-extended-modules.test.ts` 与 `pnpm test:ui`，验证 `loadData` 返回 `null` 或 `""` 时 `savePersonOrigin` 正常初始化落盘，全空保存自动移除记录，且 `exportMigrationBundle` 导出 24 模块（30 项 `MIGRATION_COVERAGE`）并在恢复后完整还原 `personOrigins`。
   - **实测结果**：`PASS`（单测与三套 UI 迁移回归 `C08/FUNC-01.6` 全部通过）。
3. **`BUG-03`（重复联系人合并 19 项关联数据迁移）**：
   - **验收步骤**：执行 `node --test tests/contact-write-services.test.ts`，验证 `executeContactMerge` 将次人物合并入主人物后，`person-origins.json`（含第三人 `introducedByDocId` 重定向）、`person-relationship-labels.json` 与 `occasions.json` 出席人全部迁移至主人物。
   - **实测结果**：`PASS`（`E-31 merge service: executeContactMerge 完整合并主次人物`）。
4. **`BUG-05`（已保存视图白名单与全仓零 UTC 日期切片）**：
   - **验收步骤**：执行 `node --test tests/benchmark-fusion.test.ts`，验证 `normalizeSavedViews` 过滤非法枚举并保留 `"overdue"`/`"cooling"`，同时全量扫描 `src/` 下所有 `.ts`/`.svelte` 文件确认 `toISOString().slice(0, 10)` 出现次数为 `0`。
   - **实测结果**：`PASS`（0 处残留）。
5. **`UX-01`（界面令牌、窄屏折行与高对比度适配）**：
   - **验收步骤**：串行执行 `node --test tests/a11y-contacts-styles.test.ts`、`node scripts/breakpoint-sweep.mjs` 与三套 UI 冒烟（`pnpm test:ui` / `pnpm test:ui:mobile` / `pnpm test:ui:host`）。
   - **实测结果**：`PASS`（28 景四断点截图全部生成且无跨页重复，桌面/移动/宿主三套 UI 回归各 **529/529** 全通）。
6. **版本四处一致、生产构建、发布门禁与本地安装验证**：
   - 版本号在 `package.json`（`0.7.1`）、`plugin.json`（`0.7.1`）、`README.md`（`v0.7.1`）与代码常量 `src/domain/model.ts#PLUGIN_VERSION`（`"0.7.1"`）四处严格一致，由 `pnpm check:release` 自动门禁核验。
   - 上一版可回滚产物已备份保存于 `package-v0.7.0.zip`（与 `package-v0.6.59.zip` 并存）。
