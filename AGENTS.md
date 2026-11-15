# AGENTS.md — 开发协议

给在本仓库工作的 AI/人类贡献者的硬性约定。

## 铁律

1. **不臆造思源 API**。端点/参数以 `docs/DATA-CONTRACT.md` 与 `scripts/spike/av-spike.mjs` 实证为准；
   新端点先在隔离内核 spike 验证再进 api/ 层。
2. **分层单向依赖**（`tests/architecture.test.ts` 守门）：
   `components/ → (types, services, domain, data, api)`；`domain/` 是纯函数层，禁 import svelte/siyuan/api/data。
3. **内核交互只准出现在 `src/api/`**；组件与 services 不得直接 fetch 端点。
4. **itemID ≠ 绑定文档 ID**，换算只经 `api/av.ts#mapBoundDocIds`（DATA-CONTRACT §1.3）。
5. **插件自管 JSON 一律经 `data/storage.ts`**（normalize + 写后回读 + Web Lock），禁止裸调 loadData/saveData。
6. **颜色一律 b3 CSS 变量**，类名前缀 `lvct-`；不硬编码色值。
7. **zip 产物 mtime 用真实构建时间**（回滚事故教训）；发版走仓库 Latest Release 的 package.zip。
8. 移动端判定用 `getFrontend()`，禁 UA 嗅探。

## 方向铁律（D-0040，2026-10-31 起）

主线只有一条：**查人 → 会前回顾 → 记一笔 → 下次联系**。动手前先对照：

1. **功能冻结**：不新增模块、面板、大盘弹窗；例外只有主线断点修复与数据安全修复。新需求须指向 `docs/UNIFIED-BACKLOG-POOL.md`「真实使用记录」里的一条摩擦。
2. **不新增插件自管 JSON 存储**：新的人物信息类别进人物文档（事实段分类、补充资料、个人备注）；确需新存储先写 `docs/DECISIONS.md` 条目。
3. **不做无数据依据的评分**：不展示 0–100 指数、健康度、转化率、「状态极佳」类文案；只展示日期、天数、次数、名单。
4. **一屏预算**：人物详情概览首屏只放基本资料与关系、最近互动与下一步、记住的事、记一笔；新增区块默认进「更多」。
5. **修复先看去留**：计划删除或收起的面板不修其缺陷。
6. **不做逐面板样式统一批次**；样式修正只随功能改动或缺陷修复。
7. **发版**：累积 3–5 项升一个小版本本地发版，不每项升号，不新增 `RELEASE-NOTES-v*.md`。
8. **单一待办源**：`docs/UNIFIED-BACKLOG-POOL.md`。

## 工作流

- 里程碑：M0 spike ✅ → M1 脚手架 → M2 联系人核心 → M3 关系图谱 → M4 提醒仪表盘 → M5 移动端+发布。
- 每个里程碑结束：更新 `docs/PROGRESS.md`、有决策写 `docs/DECISIONS.md`、跑 `pnpm check && pnpm test`、git 提交。
- 测试：`node --test tests/`（域层纯函数 + 架构守门）；E2E 用真内核隔离工作区（参照 scripts/spike 的启动模式）。
- 存储/数据契约变更：先改 `docs/DATA-CONTRACT.md`，再改代码。
