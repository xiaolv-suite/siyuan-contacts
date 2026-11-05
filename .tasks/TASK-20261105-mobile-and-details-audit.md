# 任务单：手机端与全量细节自查 · 打磨轮

- **执行日期**：2026-11-05
- **前置基线**：v0.7.8 + Mobile Spec v2（Commit `41272b2`）
- **状态**：已完成（全量编译通过、单测 1130/1130、UI 烟测 528/528、真内核 E2E 11+12 全绿、发布门禁 16/16 全绿）

---

## 一、 通用自查清单（12 类）核对与闭环结论

1. **资源生命周期**：
   - 全局扫描 `URL.createObjectURL`，对 `SettingsView.svelte`（5 处）、`AnniversariesHubDialog.svelte`（1 处）、`RelationGraph.svelte`（2 处）、`PeopleView.svelte`（2 处）、`PersonDetail.svelte`（2 处）、`VCardDialog.svelte`（1 处）等剩余导出全部统一为 `setTimeout(() => URL.revokeObjectURL(url), 0)` 异步延迟释放，根除移动端及 Webview 在下载请求未完成前对象 URL 被过早吊销导致的下载失败问题。
   - 所有全局事件监听（`visualViewport`, `popstate`, `keydown`, `scroll`, `visibilitychange`, `focus`）与定时器（`revealInterval`, `drawerRevealInterval`, `timelinePlayTimer` 等）均在组件销毁钩子中成对清理，无内存泄漏与悬挂引用。

2. **竞态时序**：
   - 异步回调全面核对 `alive` 与请求代际（`refreshGeneration`, `recentGeneration`, `rosterLoadGeneration`, `organizationsRequest` 等），过期请求结果严格丢弃。
   - 视口与列表渲染测量严格走 `requestAnimationFrame`（`virtualFrame`、`pendingViewportFrames`），后台状态享受 `document.visibilityState === "hidden"` 降级保护，绝不阻塞数据读取。

3. **剪贴板反馈**：
   - 全局排查 `copyPlainText` 26 处调用：补齐 `DashboardView.svelte` 中 `handleCopyMemory` 的 `catch` 异常捕获与降级提示，其余 25 处均已具备完备的 try/catch 及提示回退闭环。

4. **焦点管理**：
   - `LvctDialog` 具备标准的 Tab 循环焦点陷阱、挂载后首项聚焦以及退出时 `previousActive?.focus()` 原路恢复机制；`dialog.ts` 的 `hostCloseChannel` 与浮层栈支持按层逐级响应 Escape。

5. **对比度令牌**：
   - `.lvct-people__create-fab` 文字颜色由 `--b3-theme-primary-color` 对齐至 `--b3-theme-on-primary` 标准系统变量，保障在各类明暗与自定义主题下的对比度要求。

6. **移动端输入**：
   - 全库 6 处 `type="number"`（`SettingsView` 3 处、`ExchangeLedger` 1 处、`PersonDetail` 2 处）全量配备 `inputMode="numeric"`，手机软键盘准确唤起数字键盘。

7. **时序边界**：
   - 联络周期与生日检查走 `lvTicker.onHour` 与 `lvTicker.onDateCross`；`DashboardView.svelte` 挂载 `visibilitychange` 与 `focus` 触发 `onWakeCheck`，移动设备息屏与系统长时间睡眠唤醒后自动补偿检查。

8. **i18n 对齐**：
   - 对比 `public/i18n/` 下 `en.json`、`zh_CN.json`、`zh-CN.json`，三者键数量完全一致（均为 1689 个），差异数为 0。

9. **HTML 规范**：
   - 补齐 `src/panels/person-panel.ts` 动态创建的 7 处按钮（`filterMembers`, `openOrgsView`, `filterCityPeople`, `openTripPlanner`, `record`, `edit`, `open`）的 `type = "button"` 属性声明。

10. **XSS 面**：
    - `close-guard.ts` 中内插字符串全量经过 `escapeHtml` 转义；名片 `BusinessCardModal.svelte` 渲染的 `cardSvg` 在 `generateBusinessCardSvg` 中对姓名、公司、职位、标签与阶段全量经过 `escapeSvgText` 转义。

11. **渲染粒度**：
    - 花名册列表在移动端将初始与增量步长设置为 `50` 条（桌面端保持 200 条），满足移动端首屏轻量要求。

12. **状态时效**：
    - 全库全部 `busy` 状态均有 `try...finally { busy = false; }` 保障，异常或取消时均可靠复位。

---

## 二、 本插件专项疑点打磨

1. **拼音索引条联动与 300+ 名册视口定位**：
   - 解除之前意外限制在桌面端的 `!isMobile` 条件，使移动端同样呈现拼音跳跃索引条；
   - 针对 300+ 大名册滚动到底部后再点击首字母跳跃时可能产生的视口空白或偏移动作，封装 `selectLetterFilter` 与 `clearLetterFilter`：在切换字母过滤时同步执行 `peopleListElement.scrollTop = 0` 并调用 `updateVirtualViewport()`，使滚动条与虚拟列表瞬间精准定位到目标首字母的首位联系人。

2. **会前速览卡滑动与手势冲突防范**：
   - 在 `PersonDetail.svelte` 的 `onBriefTouchStart` 中加入目标元素拦截：若触摸起始于卡片内部交互元素（`button, a, input, select, textarea, [role='button'], [role='tab'], summary`），立即清空触摸起点记录，彻底隔离复制按钮、破冰 Chips 与指示圆点点击对卡片横滑翻页的误触发。

3. **快拨三按钮（电话/短信/复制）在无手机号时的禁用态**：
   - 优化前：无手机号时整行按钮消失，名册卡片高度不齐、布局跳跃；
   - 优化后：移动端卡片始终渲染快拨三按钮。未登记手机号时渲染为 `.lvct-person-card__quick-btn--disabled` 禁用态（`disabled`, `aria-disabled="true"`, `title="未登记手机号"`, 虚线弱化边框），保持卡片高度统一整齐且操作意图清晰。

---

## 三、 全量门禁验证

- `pnpm check`：**0 errors, 0 warnings**
- `pnpm test`：**1130 / 1130 PASS**
- `pnpm test:ui`（桌面烟测）：**528 / 528 PASS**
- `pnpm test:ui:mobile`（移动烟测）：**528 / 528 PASS**
- `pnpm test:ui:host`（宿主烟测）：**528 / 528 PASS**
- `pnpm run build`：**打包通过，dist 无额外 chunk，require 仅限 siyuan**
- `pnpm check:release`：**16 / 16 全部通过，包校验和与版本严格一致**
- `pnpm e2e:isolated`：**11/11 真实内核服务 + 12/12 真实桌面浏览器主线全绿通过（10 张真机截图生成）**
