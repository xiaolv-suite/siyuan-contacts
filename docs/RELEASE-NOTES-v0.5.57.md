# v0.5.57 发布说明

发布日期：2026-10-25

## 核心亮点：全链路参数防截断排雷、反链段落级去重与多行文本列表符深度清洗

本版本深入排查了主工作台参数透传、多引用段落索引与复杂格式文本提炼等隐藏深处的关键边界缺陷：

### 1. 修复主工作台 onRecord 参数截断 Bug
- **深度链路修复**：修复在主工作台 `Workbench.svelte` 中透传 `onRecord` 属性时漏传第四个参数 `options` 的关键缺陷；
- **全链路参数直达**：确保反链转录时解析出的真实历史时间戳（`occurredAt`）、日记来源标识（`source: diary`）与块引锚点（`externalRef: block:xxx`）能够 100% 畅通直达内核与自管 JSON，杜绝时间被错误回退为当前时刻。

### 2. 反链检索段落级严格去重与老版本兼容
- **消除重复行**：在 `findPersonBacklinks` 检索时加入 `seenBlockIds` 段落级查重，彻底杜绝同一笔记段落内多次引用同一个联系人时在列表中生成重复卡片的问题；
- **兼容根块双链**：SQL 查询加入 `(r.def_block_root_id = ? OR r.def_block_id = ?)`，兼容思源笔记不同历史版本下的块引索引形态。

### 3. 多行文本与任务列表符深度清洗
- **清洗顺序优化**：重塑 `cleanInteractionNote` 纯函数，先清洗双链语法保留换行结构，再完整剥离每行行首的列表符号（`- `、`* `、`1. `）与待办任务框（`[x] `），解决第二行及后续行首列表符号被残留的格式 Bug。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：911 自动化单元测试全部通过（通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- Chrome 桌面 UI、390px 移动端 UI、宿主样式 UI 各 **488/488 完整通过**
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
