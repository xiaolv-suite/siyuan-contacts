# 小驴人脉：多通讯条目系统与实体名片档案落地记录

- **发布日期**：2026-11-01
- **对应版本**：`v0.7.6`
- **核心需求**：
  1. 支持可创建和修改多种条目，可以创建多条条目（例如：多个手机号、多个微信号、多个邮箱、社交账号、地址、自定义条目等）；
  2. 支持上传实体名片（保留原图长宽比、长边 1200px 高清压缩、微缩预览与沉浸式大图查看器）。

---

## 一、 多通讯条目与多维度信息条目系统（Multi-Channels）

### 1.1 领域模型规范（`src/domain/person-channels.ts`）
- **条目结构**：
  ```typescript
  export type ChannelType = "phone" | "wechat" | "email" | "landline" | "im" | "social" | "address" | "custom";
  export interface ContactChannel {
      id: string;
      type: ChannelType;
      label: string;
      value: string;
      isPrimary?: boolean;
      createdAt?: number;
  }
  ```
- **8 种通用分类与预设微标签**：
  - `phone`（手机号 📱）：支持预设标签“工作手机”、“个人手机”、“常用手机”、“备用号码”；
  - `wechat`（微信号 💬）：支持“主微信”、“工作微信”、“生活微信”、“微信小号”；
  - `email`（电子邮箱 ✉️）：支持“常用邮箱”、“工作邮箱”、“个人邮箱”、“企业邮箱”；
  - `landline`（电话/座机 ☎️）：支持“公司座机”、“办公室电话”、“家庭座机”、“传真”；
  - `im`（即时通讯 🗨️）：支持“QQ”、“飞书”、“钉钉”、“企业微信”、“Telegram”、“WhatsApp”；
  - `social`（社交主页 🌐）：支持“领英 LinkedIn”、“即刻”、“小红书”、“GitHub”、“知乎”、“微博”、“Twitter / X”；
  - `address`（地址 📍）：支持“公司地址”、“家庭住址”、“常驻地”、“收发快递地址”；
  - `custom`（自定义 🏷️）：支持“工号”、“会员卡号”、“车牌号”等任意个性化信息。
- **纯函数工具集**：
  - `normalizeChannels(raw: unknown)`：严格过滤非法字段与控制字符，自动去重与补齐 UUID；
  - `alignChannelsWithContact(contact, channels)`：无缝对齐思源联系人总表已有单值，自动提升为主条目，向后 100% 兼容；
  - `getChannelActionHref(channel)`：电话/座机自动产出 `tel:` 呼叫协议，邮箱产出 `mailto:`，主页与社交账号产出网页安全超链接。

### 1.2 思源块属性原子持久化（`src/index.ts`）
- 存储于人物文档块属性 `custom-lvct-channels`；
- **防断裂编码保护**：采用 `encodeURIComponent(JSON.stringify(channels))` 编码入库，杜绝双引号与大括号破坏思源 IAL 标签语法（`{: key="value" }`），确保内核与外部查询器 100% 稳固；
- 当用户将某个手机号或微信号标记为主条目（`isPrimary`）时，自动同步至思源联系人数据库 AV 单值单元格，名册卡片与快速拨号即时联动。

### 1.3 人物详情页交互（`src/components/people/PersonDetail.svelte`）
- **条目展示流**：
  - 各条目带分类色彩药丸徽章（如蓝调手机、绿调微信、紫调邮箱、橙调地址）；
  - 主条目展示专属金色微徽章；
  - 接入离席隐私盾（Privacy Shield），离席或投屏时敏感号码自动打码遮罩；
  - 1-Click 一键复制（显示“已复制 ✓”绿光反馈）；
- **行内添加与修改面板**：
  - 点击【+ 添加条目】就地展开添加卡片，支持分类一键切换、常用预设标签快速填入、设为主条目；
  - 点击任意条目右侧编辑图标，即可行内展开修改标签与内容；点击删除图标即可安全移除。

---

## 二、 实体纸质名片档案系统（Business Card Photo）

### 2.1 高清等比例无损压缩引擎（`src/shared/avatar-processor.ts`）
- **长宽比自适应（AspectRatioFit）**：
  - 区别于正方形头像，名片照片严禁居中裁切（防止切掉公司名与电话）；
  - `calculateAspectRatioFit(srcW, srcH, 1200)`：横版与竖版名片严格保持原图比例，长边上限设为 1200px；
  - 原图 4000×3000（5~10MB）经 Canvas 压缩为 1200×900 WebP/JPEG（质量 0.85），体积仅 80~180KB，文字微小排版清晰锐利，内存零卡顿。

### 2.2 思源块属性直存（`src/index.ts`）
- 存储于人物文档属性 `custom-lvct-business-card`；
- 支持 `savePersonBusinessCard`、`loadPersonBusinessCard` 与删除名片。

### 2.3 人物详情页卡片与全屏大图查看器（`PersonDetail.svelte`）
- **实体名片卡片**：
  - 无名片时：展示虚线上传框，提示“点击上传纸质名片照片，自动保留原始排版与微小文字，支持点击放大查阅”；
  - 有名片时：展示自适应长宽比的仿真名片卡片（圆角、阴影），悬停呈现【点击放大查看名片】遮罩与操作栏（【更换】、【删除】）；
- **全屏沉浸式大图查看器**：
  - 点击缩略图即刻呼出大图弹窗，原图居中铺满视口（最大 90vw / 85vh），深色沉浸式背景；
  - 支持按 Esc 键、点击遮罩或关闭按钮快速退出，支持在大图界面直接点击【更换名片】。

---

## 三、 测试与验证实据

1. **单元测试（Unit Tests）**：
   - 运行 `pnpm test`：**1097 / 1097 全绿通过**（包含 `tests/person-channels.test.ts` 与 `tests/avatar-processor.test.ts`）；
2. **UI 回归测试（UI Smoke Tests）**：
   - 运行 `pnpm test:ui`：**528 / 528 全绿通过**，零未捕获异常，零响应式死循环；
3. **真实思源内核 + 真实桌面浏览器全栈端到端测试（`pnpm e2e:isolated`）**：
   - 阶段一：11 / 11 真实内核服务全绿通过；
   - 阶段二：8 / 8 真实桌面主线走查全绿通过；
   - 包含新增自动化断言：
     - `PASS 联系人多通讯条目（添加多个手机号/条目）通过`
     - `PASS 实体名片上传、长宽比缩略图与大图查看器全链路通过`
   - 输出 8 张 1280×900 真实思源桌面截图至 `output/e2e-isolated/`；
4. **常驻隔离预览环境（D 盘 http://127.0.0.1:43920/）**：
   - 热同步构建产物至 `D:\思源插件\小驴人脉-isolated-preview\data\plugins\siyuan-contacts\`；
   - 运行 `pnpm seed:isolated` 为王浩然、林知夏等种子联系人成功注入多个手机号、多个微信号、地址与实体名片；
   - 浏览器直接访问 `http://127.0.0.1:43920/stage/build/desktop/` 即可即时体验。
