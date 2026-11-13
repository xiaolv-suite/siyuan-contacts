# 小驴人脉（siyuan-contacts）存量材料盘点、全链路审计、单一事实来源待办池与批次验收总录

> 当前短摘要唯一见 [CURRENT-STATUS](CURRENT-STATUS.md)。本轮RM-R2-01已改币种分组；以下日期版本和旧统计为历史快照，不能覆盖当前提交。

> 2026-11-09 审计整改：RM-001 人情总账严格读取失败不再归空，禁止据此生成假空账簿；RM-002共同背景fallback保留“日期未知不推断同期”语义，移动导航门禁改验可见底部几何与内容滚动，独立fixture按真实宿主填满视口。修复既有类型/无效投影字段门禁错误。无新增模块或私有JSON，真实宿主/手机验收未扩大。证据与最终测试结果见`D:\思源插件配套\整改\2026-11-09\人脉管家常用-修复记录.md`。

- **更新时间**：2026-11-04
- **当前版本**：`v0.7.8`（回滚产物已保留于 `package-v0.7.7.zip`、`package-v0.7.6.zip`、`package-v0.7.5.zip`、`package-v0.7.4.zip`、`package-v0.7.3.zip`、`package-v0.7.2.zip`、`package-v0.7.1.zip` 与 `package-v0.7.0.zip`）
- **方向基准（D-0040 · 2026-10-31 起生效）**：产品收缩到「**查人 → 会前回顾 → 记一笔 → 下次联系**」唯一主线，硬性执行 `AGENTS.md` 方向铁律 R1–R8（功能冻结、不新增插件 JSON 存储、不做无依据评分、详情与首页一屏预算、修复先看去留）。
- **定位**：本项目待办池、真实使用记录、存量材料盘点、原型对照与批次验收的**单一事实来源（Single Source of Truth）**。`docs/AUDIT-BACKLOG-2026-10-31.md` 与 `docs/AUDIT-BACKLOG-2026-11-04.md` 作为两轮只读排查附件保留（10-31 批次已被 §零 重排取代；**11-04 轮新增 `INTG-01` 源码完整性阻塞项与 `FUNC-11~18`、`UI-11~14` 待办，当前执行顺序以 11-04 附件 §三 分批建议为准**）。

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

- **已在 `v0.7.2` ~ `v0.7.5` 关闭（主线断点 + 真宿主全栈实测 + 跨弹窗按钮与高分屏缩放修复 + 首页留白/右栏拉伸修复、仿真数据填充与三图 UI 专项精修）**：
    - `CLIPBOARD-RESILIENCE-AND-AVATAR-CONTINUITY`（剪贴板全局韧性防线与全景头像连续性收敛）：① 全站剪贴板复制 100% 具备异步异常捕获防线：涵盖文档浮动条、人物详情会前简报/思源块引/URI、图谱抽屉字段与闪卡、组织管理 TSV 批量导出、名册卡片微信/邮箱、拜访行程、城市探访备忘等，杜绝伪造对勾成功态与静默吞错，失败即时给出错误提示；② 全景真人头像贯通：补齐回收站抽屉（`TrashDrawer`）与纪念日大盘（`AnniversariesHubDialog`）的真人肖像快照持久化与防溢出渲染，消除删入回收站或进入大盘后头像降级为单字的体验断层；③ 门禁实据：单测 1102/1102、UI 回归 528/528、真内核 E2E 11/11 与 8 张桌面真机截图全量通过。
    - `ROUND-3-USER-JOURNEY-AND-HIGH-RISK-AUDIT`（第三轮高风险区完整链路走查、全局横向比对与全周期用户旅程走通）：① 第二层高风险区走查：核验新建/软删除回收站（30天缓冲与一键恢复）、日记互动就地修改与墓碑删除、设置属性视图重读与列修复完整闭环；② 第三层横向比对：字号间距设计令牌对齐、深色模式与强制对比度（`forced-colors: active` / `prefers-contrast: more`）零系统擦除、150% 缩放与 390px 窄视口零横向溢出且主按钮吸底、严格 Block ID 正则防注入；③ 用户全生命周期旅程实测闭环：零数据空态快速开始（QuickStartPanel）→ 2步完成首条人脉录入与互动速记 → 日常浮动档案条与块级高亮直达 → 异常误删30天回收站自愈 → 大数据量 VirtualList 虚拟列表与图像防爆压制 → 跨库换设备 6 模块迁移包现状优先无损恢复；④ 自动化门禁测试：单测 1102/1102、UI 回归 528/528、真内核 E2E 11/11 与 8 张桌面真机截图全量通过。
    - `ROUND-2-DEEP-CONVERGENCE`（第二轮深度专项收敛与块级高亮定位闭环）：① openSiYuanDocument 原生升级支持子块 targetBlockId 及 cb-get-hl 上下文高亮滚动定位（彻底攻克思源长文档精准跳转痛点）；② docs/SIYUAN-LINKAGE-VERIFICATION.md 联动 9 项中 8 项达成完全正常；③ docs/FULL-ELEMENT-INVENTORY.md 全量 1495 项终审确认；④ 单测 1097/1097 与隔离内核 E2E 11/11 全绿。
    - `BATCH-4-5-OPTIMIZATION`（第四批组织与图谱 + 第五批设置与通用组件走查收敛）：① 完成 Batch-4（251项）与 Batch-5（134项）三层全景走查与跨界面横向比对；② 全量交互清单 1495 项累计达成 100.0% 全量覆盖（`docs/FULL-ELEMENT-INVENTORY.md`）；③ 候选功能清单追加 `IDEA-08`（关系图谱高清 SVG 导出）与 `IDEA-09`（体检单项缺陷一键直达修复）；④ 跑通 1097/1097 单测与 11/11 真实内核端到端回归测试。
    - `BATCH-3-OPTIMIZATION`（第三批联系人名册与人物详情全模块走查收敛）：① 完成 Batch-3（843项）三层全景走查，累计覆盖 1110/1495 项（74.25%）；② 修复人物详情页名片文本/块引用/URI 复制异常捕获与失败反馈隐患；③ 候选功能清单追加 `IDEA-06`（名册多字段展示自选）与 `IDEA-07`（会前简报思源 Callout 导出）；④ 跑通 1097/1097 单测与 11/11 真实内核端到端回归。
    - `BATCH-2-OPTIMIZATION`（第二批首页 Dashboard 与五大 Hub 弹窗走查收敛）：① 完成 Batch-2（181项）三层全景走查与横向比对，累计覆盖 267/1495 项（17.86%）；② 补齐首页全量联系人（`allPeople`）头像批量回读与异步挂载管道，使行程足迹、群体活动等大盘全面呈现真人头像；③ 候选功能清单追加 `IDEA-04`（年度热力图无延迟互动气泡）与 `IDEA-05`（关注摘要永久折叠偏好）；④ 跑通 1097/1097 单测与 11/11 真实内核端到端测试。
    - `BATCH-1-OPTIMIZATION`（首轮全量元素盘点与第一批宿主/外壳/向导走查收敛）：① 扫描建立全量 1495 项交互元素清单（`docs/FULL-ELEMENT-INVENTORY.md`），划分 5 大推进批次；② 建立候选功能清单（`docs/CANDIDATE-IDEAS.md`），登记 `IDEA-01` ~ `IDEA-03` 并与待办池严格物理隔离；③ 完成 Batch-1（86项）三层全景走查，修复 `CaptureDialog` 随路沉淀事实失败静默吞错隐患，显式反馈未成功人员；④ 完成思源本体联动 9 项指标逐条实测（`docs/SIYUAN-LINKAGE-VERIFICATION.md`）；⑤ 跑通 1097/1097 单测与 11/11 隔离内核端到端回归（8 张真实桌面截图生成完毕）。
    - `FEAT-MULTI-CHANNELS-AND-BUSINESS-CARD`（多通讯条目系统与实体名片档案落地）：① 多通讯条目支持：新建与修改多种类型的多个条目（多个手机号、多个微信号、多个邮箱、座机、即时通讯、社交主页、地址、自定义条目等），提供预设微标签与一键呼叫/发信动作协议，存入人物文档块属性 `custom-lvct-channels`（URL安全防断裂编码）；主条目变动自动联动更新思源 AV 数据库；② 实体名片档案：研发长宽比自适应名片压缩引擎（长边限制 1200px，大小仅 80~180KB，文字微小排版清晰可辨），详情页提供名片微缩卡、悬浮更换/删除及沉浸式全屏大图查看器；③ 测试实据：单测 1097/1097 全过，UI 回归 528/528 全过，真实思源内核 E2E 测试全绿通过，种子数据已注入 D 盘隔离环境。
    - `FEAT-AVATAR-ALL-VIEWS-UNIFICATION`（全站联系人头像全量贯通与统一呈现）：① 外部名册卡片与首页大盘头像贯通：排查出名册卡片与首页仪表盘（今日行动、近期生日、久未联系）此前仅渲染单字并未接入 `avatar` 属性的缺陷，在 `PeopleView` 和 `DashboardView` 前端按需加载管道中批量回读联系人文档属性并原地附着；② 全视图统一样式：名册卡片（详细模式与紧凑模式）与首页大盘头像均增加 `overflow: hidden;` 与 `.lvct-avatar-img`，自动适配圆形/圆角裁剪，有照片呈现真人照片，无照片优雅回退首字；③ 重新执行 `seed:isolated`，向王浩然、林知夏、苏晚晴、顾言深等名册卡片全量贯通真人肖像。
  - `UX-PERSON-DETAIL-DESIGN-SYSTEM-OVERHAUL`（人物详情页全模块交互体验与设计系统深度优化）：① 信息架构重塑：首屏聚焦【核心名片矩阵（电话/微信加粗带一键复制与拨打）→ ⚡ 会前30秒破冰速览与忌口红线置顶 → 记一笔互动速记岛（回车提交/类型微药丸/智能提炼）→ 记住的事（偏好/观点卡片流）→ 组织经历（工牌卡片）】，长尾功能统一收拢在底部折叠区，保证首屏主线聚焦；② 视觉与字号体系规范：模块卡片升级为纯白 14px 大圆角卡片，边框对比度强化至 `rgba(0,0,0,0.08)`，卡片标题统一带有 3.5px 品牌橙色指示竖条（13px 字重 700），通讯录字段采用独立轻量微卡（Pill Tile）整齐对齐，间距规范为 12px，彻底消灭视觉粘连与文字过大；③ 交互微体验升级：互动输入框支持 Enter / Ctrl+Enter 快捷提交，主操作按钮采用胶囊高对比设计并带“已记录 ✓”即时绿光反馈；组织经历表单默认收起高级选填项，表单体积减少 60%。
  - `FEAT-AVATAR-AND-PHOTOS-PIPELINE`（联系人真人头像/照片裁切压缩、防冲刷修复与思源原生属性闭环）：① 彻底根治“一闪而过”：排查出 `PersonDetail` 在保存头像后触发 `onChanged` 导致 `loadOthers` 以未包含头像属性的旧联系人对象直接覆盖 `current` 的严重缺陷，加入 `matches[0].avatar = current.avatar` 原地附着与 `$effect` 自动加载回读，彻底根治上传头像后被冲刷消失的问题；② 头像尺寸引擎（`avatar-processor`）：优先采用现代 `createImageBitmap` 异步解码与 Canvas 中心正方形裁切（160×160，WebP/JPEG 0.85），单张大小严格限制在 10~15KB，防爆显存与卡顿；③ 种子全量注入：通过 `seed-isolated` 为王浩然、林知夏、苏晚晴、顾言深全量注入精美高质量人物头像；并在 `pnpm e2e:isolated` 中新增端到端真实文件注入与回显断言（全绿通过）；④ 原生属性直通：存入人物文档 `custom-lvct-avatar` 与原生 `icon`，全站卡片自适应呈现。
  - `DOC-FIELDS-GARBAGE-CLEANUP-AND-ORG-TABLE`（人物文档补充资料乱码根治与组织成员架构表格化）：① 图1/图2（正文裸露 JSON 乱码清除）：针对人物文档中 `custom-lvct-person-fields` 存储段落，增加 `.protyle-wysiwyg [custom-lvct-person-fields="1"]` 正文隐藏与微标展示样式，正文中裸露的长串大括号/双引号代码彻底不可见，彻底消除“乱码”感，同时保留底层无损回读能力；② 图3（组织当前成员架构表格化）：将原先在单行使用分号连成一坨的长串纯文本，彻底重构为美观规范的「👥 当前成员架构 Markdown 表格（带人数、成员姓名双链、所属部门、职位职务、在职状态）」，并支持思源笔记原生右键“转换为数据库”（属性视图 AV），后续规划直接嵌入以本组织为过滤源的原生数据库块。
  - `UI-REMOVE-CONTEXT-PANEL-PURE-A`（采纳方案 A 彻底移除右侧侧栏）：彻底从 `Workbench.svelte` 移除右侧伸缩侧边栏（ContextPanel）挂载、顶栏折叠按钮及冗余状态，消除宽度争抢与心智割裂；名册、大盘与图谱 100% 全宽自适应铺满；点击联系人统一直接呼出全功能详情弹窗（`openDetail`），主线极致纯粹。
  - `UI-SIX-FEEDBACK-SWEEP`（图1~图6 用户反馈深度专项收口）：① 图1（密度文案与紧凑留白）：卡片密度文案由「舒适/紧凑」调整为对仗明确的「详细/紧凑」；紧凑卡片高度由 68px 极致压缩至 46px，边距压至 5px 8px，彻底消除空旷留白；② 图2（详情页模块视觉区分度）：详情页概览各卡片边框对比度强化 48%，卡片纵向间距拉至 14px，各卡片标题左侧统一增加 3px 品牌橙色指示竖线，层次分明；③ 图3（全部采纳修复）：修复 `TidyDrawer` 中直接对象属性赋值未触发 Svelte 5 响应性 Proxy 的缺陷（改为不可变赋值 `drafts = { ...drafts }`），点击后即时呈现「✓ 已采纳」高亮状态；修复 `PersonDetail` 采纳标签与提取事实回调；④ 图4（组织文档架构）：梳理组织成员在思源正文使用 Markdown 表格 vs 属性视图 AV 的利弊与进阶同步路线；⑤ 图5（日记 LifeLog 与乱码根治）：日记互动与多人活动链接由非标 `siyuan://blocks/` 全量升级为思源原生带锚文本块引 `((docId '姓名'))`，彻底剔除待办任务后裸露的大括号假 IAL 乱码；⑥ 图6（农历生日存储机制）：明确思源数据库底层 `date` 为时间戳格式，插件端与正文均已通过 `formatBirthdayDisplay` 自动换算并展示公农历双重对应文本，杜绝误解；⑦ 地理城市规划：梳理通过 `/城市/{城市名}` 专题文档与 `((cityDocId))` 实现常驻人脉星系反链的落地闭环。
  - `UI-FOUR-POINTS-SWEEP`（图1~图4 用户体验深度专项收敛）：① 图1（侧栏定位与价值重构）：右侧面板重构为「伴随速览（Inspector）+ 全库交往脉搏」，侧栏开启时在名册点击联系人即时伴随切换右侧画像与时间线（不弹窗遮挡），未选人时展示全库最近交往事件流与快速切人；② 图2（工作台吸顶视口跟随）：`.lvct-workbench__sidebar` 增加 `position: sticky; top: 0; height: 100vh;`，页面向下拉时导航栏始终吸顶伴随视口往下走，绝不留在上面被滚出视野；页头高度自 96px 收敛至 58px 紧凑高度；③ 图3（组织成员卡片字号精修）：组织管理弹窗网格与下半区全貌看板成员姓名统一收敛至 12~13px 加粗，部门职务收敛至 11px，状态胶囊微型化，卡片内边距收敛至 8~9px，彻底根治文字突兀过大；④ 图4（联系人紧凑模式重构）：将单行硬塞 8 项导致 285px 挤压叠字的缺陷彻底重构为「双行精致微卡（Primary 姓名胶囊 / Secondary 职务电话单行截断+微操作组）」，消除文字竖排与按钮穿插错乱。
  - `UI-THREE-SCREENS`（图1/图2/图3 专项优化）：① 图1：清除紧凑资料组件（`PersonProfileSummary`）多余白框内边距与边框，限制单胶囊最大宽度消除与右侧「跳过本年」按钮碰撞；首页「待办跟进」桌面端跨双列铺满，修复标题 `flex-shrink: 0` 与「处理/推迟/完成/跳过」按钮挤压错位；② 图2：名册标签超过 10 个时默认单行折叠，展开后自动按「📍 城市地区 / 💼 身份与领域 / ✨ 兴趣与特征」三维度分组展示；修复联系人卡片互动行双列网格把 `(N次)` 挤进 16px 图标列导致断行、页脚标签过多撑破操作栏的问题；③ 图3：人物详情概览各模块统一封装为清晰圆角白卡，将重复冗长的「与我的关系称谓」收拢并下移至次级区，「添加归属」10 项表单规整为自适应网格。
  - `UI-HOME-STRETCH`（浏览器实测反馈 ① & ② 修复与仿真数据填充）：修复 `.lvct-workbench__main` 缺少 `flex: 1` 与 `.lvct-workbench__body` 固定 `max-width: 1240px` 导致右侧速览栏隐藏时中间区域无法横向拉伸铺满的问题；修复右侧速览栏展开时自动载入首位联系人并提供顶部人员切换胶囊；修复首页「今日行动」行内 `.lvct-dash__row-primary` 三层竖排导致的巨幅留白；新增 `scripts/e2e/seed-isolated-preview.mjs`（`pnpm seed:isolated`）向 D 盘隔离预览库注入 13 位跨地域联系人、5 大多级部门组织（含在职与校友/前同事成员）、21 对跨圈层双向关系、4 场群体活动、21 条历史/近期互动（含历史上的今天）、6 条待办跟进、7 笔人情往来、4 项重要纪念日及引荐溯源/亲属树/协作项目，并修复真内核下 `syncPersonFieldsDocSection` 与 `savePersonFields` 块类型冲突。
  - `FUNC-01`：首页大盘查看人物直接联动详情并补齐 `label`，工作台冷启动 `memberDocIds -> itemId` 换算与名册活动大盘 `itemId` 下钻修复；首页群体活动大盘「记录新活动」直开录入弹窗（`v0.7.4`）。
  - `FUNC-02`：`loadPersonFactsFromDoc` / `savePersonFactsToDoc` 移除静默吞错与多受控块保护，详情页写入前强制核实读取基线；`QuickRecordDialog` 随路写事实等待落盘并具备防重复记互动保护，手动「同步档案到正文」严格透传写入错误（`v0.7.4`）。
  - `FUNC-03`：详情页 4 处剪贴板复制 `catch` 块移除伪造成功状态，改为显式错误提示。
  - `FUNC-04`：文档浮动档案条与识别补充统一走完整回调的 `openPersonEditDialog`（补齐组织归属、关系称谓与实时广播），新增 `requestWorkbenchNavigation` 冷启动队列解决工作台未开时组织/城市档案条丢事件问题，城市「行程规划」直开 `RegionExplorerDialog`，补齐 `OrgManagerDialog` 与设置页 `ReviewReportDialog` 回调（`v0.7.4`）。
  - `FUNC-05`：接入 `org-membership.json` 与 `commonOrgs` 真实共同机构推荐（消除把普通分组误判为共同机构的缺陷），补齐礼物「转入账本」防重与 `ExchangeLedger` 原地刷新，以及首页潜在关联弹窗错误与重试态（`v0.7.4`）。
  - `FUNC-06`：右侧上下文面板接入人物真实联系节奏与暂停态、接入离席隐私盾遮罩电话/微信、删除或外部变更联系人时即时清空/刷新已删人物（`v0.7.4`）。
  - `FUNC-07`：首页年度交往活跃度热力图补齐 `personDocIds` 与活跃日期格点击下钻（`v0.7.4`）。
  - `UI-01` / `UI-02`（关键项）/ `UI-04` / `UI-05` / `UI-07` / `UI-08`（重叠项）：清零 5 个组件未定义的 `--b3-theme-*` 变量、双图标重叠（`粘贴并识别` / `本周日程视窗`）与无障碍 `aria-label` 缺失；修复思源窄分栏下首页统计卡与热力图溢出、150% 缩放（`853×533`）与 `390px` 窄屏下名册工具栏/底部导航横向溢出；新建/编辑联系人弹窗底部主操作栏吸底固定（150% 缩放首屏可见）；全站 7 处原生 `window.confirm` 统一收口至 `confirmDialog`（`v0.7.4`）。
- **用户核准待开发队列（2026-11-01 审阅确认：IDEA-02~10 全部转入待办池）**：
  - **Batch A（微交互与即时反馈速胜批 · 已于 2026-11-01 全量实现并经单测与 E2E 验证通过）**：
    - `IDEA-10`：名册搜索单唯一匹配项回车直达详情（已完成：桌面/移动搜索框实时过滤结果为 1 时按 Enter 键直开详情，0 项时保持新建向导）
    - `IDEA-07`：会前破冰简报导出为思源 Callout 引述块（已完成：会前 30 秒破冰速览新增复制为思源 `>>>` 原生引述块 Markdown 选项与反馈锁）
    - `IDEA-05`：首页关注摘要支持永久默认折叠偏好（已完成：`ViewPreferences` 增补 `dashSummaryDefaultCollapsed` 偏好并在设置页提供切换开关，首页关注摘要支持收起紧凑条与即时展开）
    - `IDEA-04`：首页年度热力图方格即时悬浮气泡（已完成：`ActivityHeatmap.svelte` 增加 0ms 延迟即时悬浮气泡，动态展示当日互动数、联系人姓名与统计标签）
  - **Batch B（图形、数据治理与拓展批 · 已于 2026-11-01 全量实现并经单测与 E2E 验证通过）**：
    - `IDEA-08`：关系图谱按组织/标签隔离子网与矢量 SVG/PNG 导出（已完成：`RelationGraph` 增补按标签筛选子网、高清 PNG 与独立矢量 SVG 导出引擎）
    - `IDEA-09`：数据健康体检单项缺陷一键直达修补（已完成：体检报告每项提供直达修补、预览清单支持逐项直达修补与打开原文档、一键直达全部待修补联系人）
    - `IDEA-06`：名册卡片支持自定义多字段展示与排序预设（已完成：`PersonCard` 支持城市/生日/单位/互动等按需显隐，设置页提供展示字段复选与频次/创建时间排序预设）
    - `IDEA-02`：编辑器块内容拖拽置入人脉识别区（已完成：名册顶部与快速识别弹窗全面支持 HTML5 拖放思源块文本，拖入自动触发结构化解析与建档向导）
  - **Batch C（架构级原生化专项 · 推进中）**：
    - `IDEA-03`：全量剔除 Lucide 第三方库，收口思源本体原生 SVG 图标（已建立 `src/components/LvctIcon.svelte` 原生 Symbol 渲染体系，主工作台导航与搜索/新建入口收口至思源原生 `#iconHome`、`#iconAccount`、`#iconInbox`、`#iconGraph`、`#iconSettings`、`#iconSearch`、`#iconAdd`；后续分批协同样式单测 AST 正则平滑推进）
  - **Batch D（图谱高质感微交互批 · 已于 2026-11-01 全量实现并经单测与 E2E 验证通过）**：
    - `IDEA-11`：关系图谱悬停一阶邻居聚光聚焦，无关节点与边动态半透明淡出（解决密集网络线条眼花问题）
    - `IDEA-12`：最短关系链路在画布上的发光路径可视化，自动平滑 fit 镜头聚焦
    - `IDEA-13`：图谱多种经典布局算法一键切换（力导向 `cose` / 同心圆 `concentric` / 层次树状 `breadthfirst` / 环形 `circle`）
    - `IDEA-14`：图谱节点就地快捷动作岛（⚡ 记互动 / 🎯 设为中心 / 📄 打开思源笔记），就地 1 步直达
  - **Batch E（生态联邦跨插件深化批 · 已于 2026-11-01 全量实现并经单测与 E2E 验证通过）**：
    - `IDEA-15`：小驴闪卡（siyuan-lv-cards）人脉常识与事实一键直通制卡（调用 `CardsBridgeApi.createCard` 自动推入牌组，未安装优雅回退剪贴板）
    - `IDEA-16`：小驴快门（siyuan-quickgate）全局人脉指令集成（`executeCommand` 开放 `rm` 搜人与 `rm+` 快捷记交往）
    - `IDEA-17`：小驴管家（siyuan-home）重要纪念日与生日一键/自动同步管家日历日程（`syncAnniversariesToHome`）
    - `IDEA-18`：小驴雷切（siyuan-speed-switch）桌面动态小组件增强（实时呈现今日待办数、近期生日名单与久未联系预警并支持 1 步直达）
  - **保留待做（下一批·围绕思源文档深度联动与存储归位推进）**：
  - **思源笔记原生文档深度联动四期蓝图（专题规划见 `docs/DOCUMENT-LINKAGE-PLAN.md`）**：
    - 一期（P0 · 已于 2026-11-01 全量实现并经验证）：补充资料支持可读 Markdown 分组列表、清理跟进待办双轨重复块（静态块完全收口至原生任务块）、人物别名增删改及合并后全链路直通思源文档根块原生 `alias` 属性、自动按块防抖投影调度器常驻调度；
    - 二期（P1 · 已于 2026-11-01 全量实现并经验证）：初识溯源引荐人、亲属关系与相关人物全面升级为思源原生 `((docId 'name'))` 块引用双链，100% 打通思源原生反向链接面板与局部图谱；事实画像与谈资统一可读列表投影；
    - 三期（P2 · 已于 2026-11-01 全量实现并经验证）：组织文档全要素受控档案上墙（简介、部门架构树、在职与历史离职成员双链，`org-dossier.ts`）；人物文档组织归属支持思源原生块引用双链语法 `((orgDocId 'orgName'))`；群体活动大事记大盘支持一键导出带参会人员思源块引用双链的纪要文档（`FEAT-01`，`buildOccasionMemoMarkdown`）；
    - 四期（P3 · 已于 2026-11-01 全量实现并经验证）：每日日记（Daily Note）行级 `custom-lvct-event-id` 幂等锚点接入；插件内就地修改互动时自动精准定位日记对应行更新正文与时间，删除互动时自动移除日记对应行，杜绝日记残留错误文字与重复追加；浮动档案条反链提及感知与受控块手改保护到位；
    - 五期（综合闭环 · 已于 2026-11-01 全量实现并经验证）：组织资料修改及成员增删变动自动静默刷新组织文档受控档案；联系人总表（原生 AV 属性视图数据库）与全库双向强对齐，零未捕获异常与零脏状态；
    - 六期（架构级联动扩展 · 已于 2026-11-01 全量实现并经验证）：`FEAT-03` / `FUNC-10` 组织部门架构树稳定 ID 联动（`cascadeRenameDepartmentMembers` 确保部门改名时自动级联更新该组织下全部关联成员的部门记录）；名册 4 项以上复杂筛选芯片动态折叠（`FUNC-09`）；组织工作台人脉全貌看板与部门导航全闭环。
  - **用户截屏体验反馈专项优化（已于 2026-11-01 全量实现并经单测与 E2E 验证通过）**：
    - `UI-TIMELINE-CUSTOM`（图1）：图谱时间演化浮动条增补多粒度切换（按年 / 按月 / 按天），按天支持步长自定义（+1天 / +7天 / +30天），进度条滑动与自动播放自适应当前粒度；
    - `UI-SIDEBAR-STICKY`（图2 ①）：修复 `.lvct-tab-root` 设置 `overflow: auto` 导致列表滚动时左侧导航栏被整体顶上去的缺陷，锁定外层为 `overflow: hidden; height: 100%`，确保组织与联系人列表下滑时左侧导航固定吸顶跟随；
    - `UI-TYPOGRAPHY-COMPACT`（图2 ②）：补全全仓缺失的 `.font-size-10` ~ `.font-size-13` 全局字体尺寸阶梯，修正组织全貌看板成员人名与职级文字过大的问题（降至 11.5px / 10.5px 精细排版），全局排查收拢排版层级。
  - **其余体验增强**：`FUNC-09`（名册 4 项以上复杂筛选芯片折叠）、`FUNC-10`（组织部门稳定 ID 联动与 CardDAV）。
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
