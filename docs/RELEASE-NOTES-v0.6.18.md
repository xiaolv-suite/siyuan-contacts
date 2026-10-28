# v0.6.18 发布说明

发布日期：2026-10-28

## 核心亮点：单个联系人标准 vCard 3.0 / .vcf 名片导出与一键复制（Single Contact vCard Export）

本版本贯彻落实第二阶段 2.4 节关于通讯录互通与跨设备名片流通的规划，全面打通了单个联系人的原生名片导出通道：

### 1. 单联系人全要素 vCard 序列化纯函数（exportSinglePersonVcf）
- **全要素高保真映射**：纯函数零外部依赖，严格遵循 RFC 6350 / vCard 3.0 标准；
- **全字段覆盖**：
  - 姓名（`FN` / `N`）；
  - 组织机构（`ORG`）与职务（`TITLE`）；
  - 电话（`TEL;TYPE=CELL`）、电子邮箱（`EMAIL;TYPE=INTERNET`）；
  - 微信号（`X-WECHAT`）、常驻城市（`ADR;TYPE=HOME`）；
  - 个人主页（`URL`）、生日（`BDAY` / `X-LVCT-BDAY-LUNAR`）、标签（`CATEGORIES`）。

### 2. 详情页顶栏快捷下载与复制名片（PersonDetail）
- **一键下载 .vcf 格式名片**：在联系人详情页顶部的快捷操作条中新增 **`[导出名片 (.vcf)]`** 按钮，点击即可直接下载标准 `${姓名}.vcf` 文件，支持直接通过微信、邮件或隔空投送发给手机，iPhone / 安卓手机点击即可一键存入手机通讯录；
- **复制名片文本**：新增 **`[复制名片]`** 按钮，一键将标准 RFC vCard 文本复制到剪贴板，方便在协同办公场景中快速传递联系人资料。

## 验证与门禁
- `pnpm check`：0 errors / 0 warnings（TypeScript 与 Svelte）
- `pnpm test`：全部自动化单元测试通过（945/945 PASS，通过率 100%）
- `tests/architecture.test.ts`：7/7 架构分层守门全部通过
- 浏览器真实环境 UI 回归（`ui-smoke`）：全场景 E2E 用例 100% PASS
- `pnpm build` 与 `pnpm check:release`：生产单 chunk 产物与 Release 发布门禁全部 PASS
