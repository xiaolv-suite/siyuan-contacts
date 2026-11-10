#!/usr/bin/env node
/**
 * 隔离预览环境全量仿真数据填充脚本（seed-isolated-preview.mjs）
 *
 * 连接正在运行的隔离思源实例（默认 http://127.0.0.1:43920），
 * 通过真实浏览器上下文中的小驴人脉插件实例（ContactsPlugin & window.LvContacts）
 * 填充多位联系人、多个组织（含部门树与在职/离职/校友成员）、多条跨圈层关系、
 * 初识引荐溯源、家庭亲属树、协作项目、忌口红线与事实画像、分组补充资料、
 * 历史上的今天与跨月互动、待办跟进、人情往来账本、重要纪念日与群体活动，
 * 并将所有人物文档与组织文档同步落盘为思源原生 Markdown 区块与双链。
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
    removeIsolatedBrowserProfile,
    stopIsolatedBrowser,
} from "./browser-cleanup.mjs";

const PORT = Number(process.env.TEST_ISOLATED_PORT || 43920);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function createIsolatedBrowserProfile(prefix = "lvct-seed") {
    const dir = path.join(os.tmpdir(), `${prefix}-${randomUUID()}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function pause(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function findBrowser() {
    const candidates = [
        process.env.CHROME_PATH,
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ].filter(Boolean);
    return candidates.find((item) => fs.existsSync(item)) ?? null;
}

async function main() {
    console.log(`[seed-isolated] 正在检查隔离思源实例 ${BASE_URL} ...`);
    const verRes = await fetch(`${BASE_URL}/api/system/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    }).then((r) => r.json()).catch((e) => {
        throw new Error(`无法连接隔离思源实例 ${BASE_URL}（请先运行 pnpm preview:isolated）：${e.message}`);
    });
    console.log(`[seed-isolated] 已连接思源内核 v${verRes.data}，启动无头浏览器执行全链路数据填充...`);

    const browserBin = findBrowser();
    if (!browserBin) throw new Error("未找到 Chrome 或 Edge 可执行文件");

    const browserProfile = createIsolatedBrowserProfile("lvct-seed");
    let browserProc = null;
    let cdpSocket = null;

    try {
        browserProc = spawn(browserBin, [
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--window-size=1440,900",
            "--remote-debugging-port=0",
            "--remote-allow-origins=*",
            `--user-data-dir=${browserProfile}`,
            "about:blank",
        ], { stdio: ["ignore", "pipe", "pipe"] });

        const devtoolsActivePortFile = path.join(browserProfile, "DevToolsActivePort");
        const deadline = Date.now() + 30000;
        let wsUrl = null;
        while (Date.now() < deadline) {
            if (fs.existsSync(devtoolsActivePortFile)) {
                const lines = fs.readFileSync(devtoolsActivePortFile, "utf8").trim().split(/\r?\n/);
                if (lines.length >= 2 && lines[0]) {
                    const cdpPort = Number(lines[0]);
                    const list = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json()).catch(() => []);
                    const page = Array.isArray(list) ? list.find((item) => item.type === "page" && item.webSocketDebuggerUrl) : null;
                    if (page) {
                        wsUrl = page.webSocketDebuggerUrl;
                        break;
                    }
                }
            }
            await pause(150);
        }
        if (!wsUrl) throw new Error("等待 Chrome CDP 调试端口超时");

        cdpSocket = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
            cdpSocket.addEventListener("open", resolve, { once: true });
            cdpSocket.addEventListener("error", reject, { once: true });
        });

        let seq = 0;
        const pending = new Map();
        cdpSocket.addEventListener("message", (event) => {
            const msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
            if (msg.id && pending.has(msg.id)) {
                const p = pending.get(msg.id);
                pending.delete(msg.id);
                if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                else p.resolve(msg.result);
            }
        });

        const call = (method, params = {}) => new Promise((resolve, reject) => {
            const id = ++seq;
            pending.set(id, { resolve, reject });
            cdpSocket.send(JSON.stringify({ id, method, params }));
        });

        const evalJs = async (expression) => {
            const res = await call("Runtime.evaluate", {
                expression,
                awaitPromise: true,
                returnByValue: true,
            });
            if (res?.exceptionDetails) {
                throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || "JS 执行异常");
            }
            return res?.result?.value;
        };

        await call("Page.enable");
        await call("Runtime.enable");
        await call("Page.navigate", { url: `${BASE_URL}/stage/build/desktop/` });

        for (let i = 0; i < 60; i++) {
            const ready = await evalJs(`Boolean(window.LvContacts && window.siyuan?.ws?.app?.plugins?.some((p) => p.name === "siyuan-contacts"))`).catch(() => false);
            if (ready) break;
            await pause(300);
        }

        console.log("[seed-isolated] 插件实例已就绪，开始注入丰富的人脉、组织、关系与互动数据...");

        const seedSummary = await evalJs(`(async () => {
            const stepLog = [];
            try {
                const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-contacts");
                const bridge = window.LvContacts;
                if (!plugin || !bridge) throw new Error("未找到 siyuan-contacts 插件实例");

                if (!plugin.settings) {
                    await plugin.initialize("小驴人脉示例库");
                }
                stepLog.push("init");

                const now = new Date();
                const pad = (n) => String(n).padStart(2, "0");
                const fmtDate = (d) => \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}\`;
                const daysOffset = (offset) => {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
                    return fmtDate(d);
                };
                const yearsOffsetDate = (yearsAgo, dayDelta = 0) => {
                    const d = new Date(now.getFullYear() - yearsAgo, now.getMonth(), now.getDate() + dayDelta, 15, 30, 0);
                    return { dateStr: fmtDate(d), ts: d.getTime() };
                };
                const daysAgoTs = (daysAgo, hour = 14) => {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, 20, 0);
                    return d.getTime();
                };
                const monthDayOffset = (daysDelta) => {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysDelta);
                    return \`\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}\`;
                };

                const makePortrait = (bg1, bg2, emoji) =>
                    'data:image/svg+xml;utf8,' + encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">' +
                        '<defs><linearGradient id="bg" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="' + bg1 + '"/><stop offset="100%" stop-color="' + bg2 + '"/></linearGradient></defs>' +
                        '<rect width="160" height="160" rx="36" fill="url(#bg)"/>' +
                        '<text x="80" y="108" font-size="76" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">' + emoji + '</text>' +
                        '</svg>'
                    );

                const avatarHaoran = makePortrait('#1e3a8a', '#3b82f6', '👨‍💻');
                const avatarZhixia = makePortrait('#c2410c', '#f97316', '👩‍🎨');
                const avatarWanqing = makePortrait('#581c87', '#9333ea', '👩‍💼');
                const avatarYanshen = makePortrait('#064e3b', '#10b981', '👨‍🏫');

                const makeCardDataUrl = (name, title, company, phone, email) =>
                    'data:image/svg+xml;charset=utf-8,' +
                    encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">' +
                        '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>' +
                        '<linearGradient id="bar" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ea580c"/><stop offset="100%" stop-color="#f97316"/></linearGradient></defs>' +
                        '<rect width="600" height="360" rx="16" fill="url(#g)" stroke="#cbd5e1" stroke-width="2"/>' +
                        '<rect x="0" y="0" width="600" height="8" fill="url(#bar)"/>' +
                        '<circle cx="56" cy="64" r="20" fill="#ea580c" opacity="0.12"/>' +
                        '<text x="56" y="70" font-size="16" font-family="sans-serif" font-weight="bold" fill="#ea580c" text-anchor="middle">LV</text>' +
                        '<text x="90" y="62" font-size="17" font-family="sans-serif" font-weight="bold" fill="#0f172a">' + company + '</text>' +
                        '<text x="90" y="78" font-size="11" font-family="sans-serif" fill="#64748b">INNOVATION LABS</text>' +
                        '<text x="56" y="160" font-size="32" font-family="sans-serif" font-weight="bold" fill="#0f172a">' + name + '</text>' +
                        '<text x="56" y="195" font-size="15" font-family="sans-serif" font-weight="500" fill="#ea580c">' + title + '</text>' +
                        '<line x1="56" y1="225" x2="544" y2="225" stroke="#e2e8f0" stroke-width="1.5"/>' +
                        '<text x="56" y="260" font-size="13" font-family="sans-serif" fill="#475569">📱 手机：' + phone + '</text>' +
                        '<text x="56" y="290" font-size="13" font-family="sans-serif" fill="#475569">✉️ 邮箱：' + email + '</text>' +
                        '<text x="56" y="320" font-size="13" font-family="sans-serif" fill="#475569">📍 地址：杭州市西湖区文三路创智中心 A 座 18F</text>' +
                        '<rect x="470" y="245" width="74" height="74" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/>' +
                        '<text x="507" y="286" font-size="10" font-family="sans-serif" fill="#94a3b8" text-anchor="middle">名片码</text>' +
                        '</svg>'
                    );

                // 1. 准备本人档案（陈致远）
                let selfIdentity = await plugin.loadSelfIdentity();
                if (!selfIdentity) {
                    selfIdentity = await plugin.createSelfProfile();
                }
                const selfDocId = selfIdentity.selfDocId;
                let roster = await plugin.listContacts();
                const selfEntry = roster.find((p) => p.docId === selfDocId);
                if (selfEntry) {
                    await plugin.updatePersonFields(selfEntry.itemId, {
                        name: "陈致远",
                        phone: "13600136000",
                        wechat: "chen_zhiyuan",
                        email: "zhiyuan@yuanjing.tech",
                        website: "https://yuanjing.tech",
                        birthday: "1990-06-15",
                        isLunar: false,
                        group: "家人",
                        tags: ["杭州", "产品架构", "主理人"],
                    });
                }
                stepLog.push("selfProfile");

                // 2. 定义 12 位全维度联系人画像
                const contactSpecs = [
                    {
                        name: "王浩然",
                        avatar: avatarHaoran,
                        businessCard: makeCardDataUrl("王浩然", "联合创始人兼 CTO", "远景科技", "13800138000", "haoran@yuanjing.tech"),
                        phone: "13800138000",
                        wechat: "wanghaoran_hz",
                        email: "haoran@yuanjing.tech",
                        channels: [
                            { id: "whr-p1", type: "phone", label: "手机", value: "13800138000", isPrimary: true },
                            { id: "whr-p2", type: "phone", label: "工作备用手机", value: "13900008888" },
                            { id: "whr-w1", type: "wechat", label: "主微信", value: "wanghaoran_hz", isPrimary: true },
                            { id: "whr-w2", type: "wechat", label: "技术小号", value: "haoran_dev_sec" },
                            { id: "whr-e1", type: "email", label: "企业邮箱", value: "haoran@yuanjing.tech", isPrimary: true },
                            { id: "whr-a1", type: "address", label: "研发中心地址", value: "浙江省杭州市西湖区文三路创智中心 A 座 18F" },
                        ],
                        birthday: \`1988-\${monthDayOffset(4)}\`,
                        isLunar: false,
                        group: "朋友",
                        tags: ["杭州", "技术合伙人", "AI基础设施", "徒步"],
                        aliases: ["浩然兄", "Haoran"],
                        relationLabels: ["创业合伙人", "技术挚友"],
                        lifecycle: { stage: "confidant", note: "多年共同创业与技术攻关的核心搭档" },
                        cadence: { days: 14, paused: false },
                        note: "远景科技联合创始人兼 CTO，浙大计算机系师兄。架构视野极强，周末常一起走西湖群山标毅线。",
                        fields: {
                            groups: [
                                {
                                    label: "常驻与联络",
                                    entries: [
                                        { label: "常驻城市", value: "浙江省杭州市西湖区" },
                                        { label: "GitHub", value: "https://github.com/haoran-arch" },
                                        { label: "紧急联系人", value: "周清雅（配偶，浙医二院）" },
                                    ],
                                },
                                {
                                    label: "家庭与生活习惯",
                                    entries: [
                                        { label: "饮品偏好", value: "冰美式、武夷岩茶（大红袍）" },
                                        { label: "运动爱好", value: "西湖标毅线徒步、公路自行车" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "花生严重过敏，聚餐点菜务必提前叮嘱后厨禁放花生碎与花生油", isTaboo: true },
                            { category: "preference", content: "习惯上午 9:30 前喝一杯冰美式，下午茶偏爱温润岩茶", isTaboo: false },
                            { category: "milestone", content: "2023年3月辞去大厂P9职务，共同创立远景科技", isTaboo: false },
                            { category: "quote", content: "“好架构不是设计出来的，是在真实业务泥潭里演化出来的。”", isTaboo: false },
                        ],
                    },
                    {
                        name: "林知夏",
                        avatar: avatarZhixia,
                        businessCard: makeCardDataUrl("林知夏", "体验设计总监", "远景科技", "13900139000", "zhixia@yuanjing.tech"),
                        phone: "13900139000",
                        wechat: "linzhixia_design",
                        email: "zhixia@yuanjing.tech",
                        channels: [
                            { id: "lzx-p1", type: "phone", label: "手机", value: "13900139000", isPrimary: true },
                            { id: "lzx-w1", type: "wechat", label: "微信", value: "linzhixia_design", isPrimary: true },
                            { id: "lzx-w2", type: "wechat", label: "设计实验室微信", value: "summer_design_lab" },
                            { id: "lzx-e1", type: "email", label: "企业邮箱", value: "zhixia@yuanjing.tech", isPrimary: true },
                            { id: "lzx-e2", type: "email", label: "私人邮箱", value: "summer.lin@icloud.com" },
                            { id: "lzx-s1", type: "social", label: "个人作品集", value: "https://summerlin.design" },
                        ],
                        birthday: "1993-05-20",
                        isLunar: false,
                        group: "同事",
                        tags: ["上海", "设计总监", "用户体验", "手冲咖啡"],
                        aliases: ["知夏", "Summer"],
                        relationLabels: ["核心同事", "设计搭档"],
                        lifecycle: { stage: "partner", note: "主导产品全线交互与设计系统升级" },
                        cadence: { days: 14, paused: false },
                        note: "曾任知名设计咨询公司体验总监，对字体排印与微交互极度敏锐，常往返沪杭高铁。",
                        fields: {
                            groups: [
                                {
                                    label: "常驻与工作",
                                    entries: [
                                        { label: "常驻城市", value: "上海市徐汇区武康路 / 杭州市西湖区" },
                                        { label: "个人作品集", value: "https://summerlin.design" },
                                        { label: "高频高铁班次", value: "G7305 / G7328（上海虹桥 ↔ 杭州东）" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "对二手烟及浓烈香水气味极度敏感，会面宜选无烟通风咖啡馆", isTaboo: true },
                            { category: "preference", content: "钟爱埃塞俄比亚水洗耶加雪菲手冲咖啡", isTaboo: false },
                            { category: "topic", content: "近期关注生成式 UI（GenUI）与本地优先软件设计范式", isTaboo: false },
                        ],
                    },
                    {
                        name: "苏晚晴",
                        avatar: avatarWanqing,
                        phone: "13700137001",
                        wechat: "suwanqing_vc",
                        email: "wanqing@qiming-cap.cn",
                        birthday: \`1989-\${monthDayOffset(0)}\`,
                        isLunar: false,
                        group: "朋友",
                        tags: ["北京", "早期投资人", "TMT创投", "网球"],
                        aliases: ["晚晴姐", "Grace Su"],
                        relationLabels: ["天使投资人", "良师益友"],
                        lifecycle: { stage: "confidant", note: "Pre-A 轮领投方合伙人，多次引荐关键法务与客户资源" },
                        cadence: { days: 21, paused: false },
                        note: "启明创投华东基金合伙人，常驻北京与上海。做事干脆利落，帮团队对接了大量早期种子客户。",
                        fields: {
                            groups: [
                                {
                                    label: "常驻与投资领域",
                                    entries: [
                                        { label: "常驻城市", value: "北京市朝阳区国贸三期 / 上海市浦东新区" },
                                        { label: "关注赛道", value: "AI Native 应用、开发者工具、企业协同" },
                                        { label: "秘书联络", value: "陈助理（13700137999）" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "海鲜甲壳类（虾蟹）严重过敏，商务宴请切忌点虾蟹海鲜煲", isTaboo: true },
                            { category: "preference", content: "偏爱清淡粤菜与新派淮扬菜，席间常饮白毫银针", isTaboo: false },
                            { category: "milestone", content: "2024年11月拍板领投远景科技天使轮，两周内完成交割", isTaboo: false },
                        ],
                    },
                    {
                        name: "顾言深",
                        avatar: avatarYanshen,
                        phone: "13500135002",
                        wechat: "guyanshen_ai",
                        email: "yanshen@xinghai-lab.org",
                        birthday: \`1985-\${monthDayOffset(2)}\`,
                        isLunar: false,
                        group: "同学",
                        tags: ["杭州", "浙大校友", "大模型算法", "围棋"],
                        aliases: ["言深兄", "Yanshen"],
                        relationLabels: ["同门师兄", "科研伙伴"],
                        lifecycle: { stage: "partner", note: "星海智能研究院首席科学家，联合攻关知识图谱推理" },
                        cadence: { days: 21, paused: false },
                        note: "浙大计算机系 2010 级博士师兄，赵敏之教授大弟子。现主持星海研究院基础大模型研发。",
                        fields: {
                            groups: [
                                {
                                    label: "学术与工作",
                                    entries: [
                                        { label: "常驻城市", value: "浙江省杭州市余杭区未来科技城" },
                                        { label: "Google Scholar", value: "https://scholar.google.com/citations?user=guyanshen" },
                                        { label: "业余段位", value: "围棋业余 5 段" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "严重乳糖不耐受，切勿点含牛奶/奶油饮品（拿铁、奶盖等）", isTaboo: true },
                            { category: "preference", content: "酷爱凤凰单丛与手谈对弈，聊技术喜欢直接画白板推公式", isTaboo: false },
                            { category: "topic", content: "正在探索轻量端侧推理与个人知识库检索增强（GraphRAG）", isTaboo: false },
                        ],
                    },
                    {
                        name: "沈书仪",
                        phone: "13600136088",
                        wechat: "shenshuyi_art",
                        email: "shuyi@hz-art.cn",
                        birthday: "1962-09-25",
                        isLunar: true,
                        group: "家人",
                        tags: ["杭州", "长辈至亲", "书画策展", "茶道"],
                        aliases: ["书仪姨", "沈书仪策展"],
                        relationLabels: ["小姨", "至亲长辈"],
                        lifecycle: { stage: "confidant", note: "从小照顾我长大的小姨，退休前任美术馆策展人" },
                        cadence: { days: 14, paused: false },
                        note: "定居杭州南山路附近，平时喜欢宋画临摹与江南园林寻访，每逢节假日都会张罗家宴。",
                        fields: {
                            groups: [
                                {
                                    label: "家庭住址与健康",
                                    entries: [
                                        { label: "常驻城市", value: "浙江省杭州市上城区南山路" },
                                        { label: "体检医院", value: "邵逸夫医院国际保健中心" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "血糖偏高，控糖忌高糖糕点与甜饮料，送礼宜选无糖滋补品或老白茶", isTaboo: true },
                            { category: "preference", content: "钟爱福鼎三年以上寿眉老白茶与苏式评弹", isTaboo: false },
                        ],
                    },
                    {
                        name: "陆景行",
                        phone: "18600186003",
                        wechat: "lujingxing_sz",
                        email: "jingxing@cloudnative.io",
                        birthday: "1991-03-18",
                        isLunar: false,
                        group: "同事",
                        tags: ["深圳", "云原生架构", "开源维护者", "马拉松"],
                        aliases: ["景行兄", "Luke Lu"],
                        relationLabels: ["前同事", "外部技术顾问"],
                        lifecycle: { stage: "partner", note: "前远景科技云原生负责人，现赴深圳创业仍保持顾问合作" },
                        cadence: { days: 30, paused: false },
                        note: "CNCF 开源项目 Committer，执行力极强，全马 PB 3小时15分。",
                        fields: {
                            groups: [
                                {
                                    label: "常驻与联络",
                                    entries: [
                                        { label: "常驻城市", value: "广东省深圳市南山区粤海街道科技园" },
                                        { label: "开源主页", value: "https://github.com/luke-cloud" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "赛前备战期严格戒酒戒宵夜，聚餐宜选轻食或潮汕牛肉火锅", isTaboo: true },
                            { category: "topic", content: "近期在深圳筹备下一代边缘算力调度平台", isTaboo: false },
                        ],
                    },
                    {
                        name: "唐沐雪",
                        phone: "15800158005",
                        wechat: "tangmuxue_law",
                        email: "muxue@jincheng-law.com",
                        birthday: \`1992-\${monthDayOffset(6)}\`,
                        isLunar: false,
                        group: "朋友",
                        tags: ["上海", "知识产权律师", "合规顾问", "古典乐"],
                        aliases: ["沐雪", "Michelle Tang"],
                        relationLabels: ["常年法律顾问", "老友"],
                        lifecycle: { stage: "partner", note: "负责公司开源许可证合规、商标专利及融资法务审阅" },
                        cadence: { days: 30, paused: false },
                        note: "锦城知识产权律所高级合伙人，思维严密，上海交响乐团常客。",
                        fields: {
                            groups: [
                                {
                                    label: "执业与常驻",
                                    entries: [
                                        { label: "常驻城市", value: "上海市静安区南京西路越洋广场" },
                                        { label: "执业专长", value: "开源软件许可证（GPL/Apache）、AI 数据合规、跨境并购" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "对猫毛过敏，线下会面勿约猫咖或携带宠物场所", isTaboo: true },
                            { category: "preference", content: "喜欢巴赫大提琴无伴奏组曲与云南普洱熟茶", isTaboo: false },
                        ],
                    },
                    {
                        name: "周牧野",
                        phone: "18900189007",
                        wechat: "zhoumuye_cd",
                        email: "muye@chuanwei-food.cn",
                        birthday: "1987-08-12",
                        isLunar: false,
                        group: "其他",
                        tags: ["成都", "供应链大咖", "品牌主理人", "徕卡摄影"],
                        aliases: ["牧野兄", "Muye Zhou"],
                        relationLabels: ["重点客户", "西南渠道伙伴"],
                        lifecycle: { stage: "acquaintance", note: "西南大区标杆企业客户，正推进二期数字化采购签约" },
                        cadence: { days: 30, paused: false },
                        note: "成都新派川味食品供应链集团创始人，为人豪爽重义气，酷爱川西自驾与人文纪实摄影。",
                        fields: {
                            groups: [
                                {
                                    label: "企业与常驻",
                                    entries: [
                                        { label: "常驻城市", value: "四川省成都市高新区天府大道麓湖生态城" },
                                        { label: "主营业务", value: "西南精品餐饮连锁供应链与数字化仓储" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "痛风史，严禁啤酒、浓肉汤及动物内脏等高嘌呤饮食", isTaboo: true },
                            { category: "preference", content: "爱喝蒙顶山黄芽与单一麦芽威士忌（少量）", isTaboo: false },
                        ],
                    },
                    {
                        name: "赵敏之",
                        phone: "13300133009",
                        wechat: "zhaominzhi_zju",
                        email: "minzhi@zju.edu.cn",
                        birthday: "1975-04-08",
                        isLunar: false,
                        group: "同学",
                        tags: ["杭州", "计算机系博导", "学术顾问", "浙大校友"],
                        aliases: ["敏之恩师", "Minzhi Zhao"],
                        relationLabels: ["研究生导师", "恩师"],
                        lifecycle: { stage: "confidant", note: "硕士阶段指导恩师，一直在学术与人才推荐上鼎力支持" },
                        cadence: { days: 45, paused: false },
                        note: "浙江大学求是特聘教授、智能计算研究所博导，治学严谨又极具人文关怀。",
                        fields: {
                            groups: [
                                {
                                    label: "学术与办公",
                                    entries: [
                                        { label: "常驻城市", value: "浙江省杭州市西湖区浙大玉泉校区曹光彪楼" },
                                        { label: "研究方向", value: "知识工程、符号神经结合推理、分布式系统" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "咽炎忌辛辣油炸及冰镇饮品，交谈时常备温水或明前龙井", isTaboo: true },
                            { category: "quote", content: "“做工程要先想清楚第一性原理，不要为了追风口丢掉扎实的数据底座。”", isTaboo: false },
                        ],
                    },
                    {
                        name: "许知微",
                        phone: "15000150011",
                        wechat: "xuzhiwei_pm",
                        email: "zhiwei@yuanjing.tech",
                        birthday: "1996-12-03",
                        isLunar: false,
                        group: "同事",
                        tags: ["杭州", "产品经理", "用户增长", "羽毛球"],
                        aliases: ["知微", "Vivi"],
                        relationLabels: ["团队核心PM", "下属搭档"],
                        lifecycle: { stage: "partner", note: "负责小驴人脉与知识库联动模块需求调研与用户访谈" },
                        cadence: { days: 14, paused: false },
                        note: "逻辑清晰、用户同理心极强的年轻产品经理，每周组织公司羽毛球活动。",
                        fields: {
                            groups: [
                                {
                                    label: "工作与常驻",
                                    entries: [
                                        { label: "常驻城市", value: "浙江省杭州市西湖区文三路" },
                                        { label: "负责模块", value: "思源原生文档深度联动、用户增长闭环" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "香菜重度抗拒者，点餐切记备注不要香菜", isTaboo: true },
                            { category: "preference", content: "喜欢桂花乌龙茶与胶片相机扫街", isTaboo: false },
                        ],
                    },
                    {
                        name: "程叙白",
                        phone: "13100131022",
                        wechat: "chengxubai_sh",
                        email: "xubai@qiming-cap.cn",
                        birthday: "1990-07-21",
                        isLunar: false,
                        group: "朋友",
                        tags: ["上海", "硬科技投研", "大学室友", "浙大校友"],
                        aliases: ["叙白", "Xubai Cheng"],
                        relationLabels: ["大学室友", "十年挚友"],
                        lifecycle: { stage: "confidant", note: "本科四年上下铺兄弟，现就职于启明创投负责硬科技投研" },
                        cadence: { days: 25, paused: false },
                        note: "促成我们与苏晚晴相识的核心引荐人，每次去上海必约夜宵长谈。",
                        fields: {
                            groups: [
                                {
                                    label: "常驻与投研",
                                    entries: [
                                        { label: "常驻城市", value: "上海市静安区 / 浦东新区陆家嘴" },
                                        { label: "投研方向", value: "AI 基础设施、机器人具身智能、工业软件" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "无特殊饮食忌口，偏爱本帮红烧菜系与精酿IPA", isTaboo: false },
                            { category: "milestone", content: "2008年秋在浙大紫金港白沙宿舍相识，同寝四年", isTaboo: false },
                        ],
                    },
                    {
                        name: "姜南栀",
                        phone: "17700177033",
                        wechat: "jiangnanzhi_sz",
                        email: "nanzhi@xinghai-lab.org",
                        birthday: "1994-02-14",
                        isLunar: false,
                        group: "其他",
                        tags: ["深圳", "开发者生态", "社区主理人", "科技播客"],
                        aliases: ["南栀", "Nancy"],
                        relationLabels: ["开源生态伙伴", "播客主理人"],
                        lifecycle: { stage: "lead", note: "星海研究院开源生态负责人，正筹划联合举办开发者黑客松" },
                        cadence: { days: 30, paused: false },
                        note: "知名科技播客《编译未来》主播，在粤港澳与长三角开发者社区号召力极强。",
                        fields: {
                            groups: [
                                {
                                    label: "常驻与社区",
                                    entries: [
                                        { label: "常驻城市", value: "广东省深圳市南山区华侨城创意园" },
                                        { label: "播客节目", value: "《编译未来》（小宇宙 / Apple Podcasts）" },
                                    ],
                                },
                            ],
                        },
                        facts: [
                            { category: "preference", content: "录音前 24 小时忌辛辣与冰饮以保护嗓音", isTaboo: true },
                            { category: "topic", content: "计划下月邀请团队做一期关于“本地优先个人关系管理”的播客专访", isTaboo: false },
                        ],
                    },
                ];

                const byName = new Map();
                const updatedSelf = (await plugin.listContacts()).find((p) => p.docId === selfDocId);
                byName.set("陈致远", updatedSelf || selfEntry || { docId: selfDocId, name: "陈致远" });

                for (const spec of contactSpecs) {
                    roster = await plugin.listContacts();
                    let person = roster.find((p) => p.name === spec.name);
                    if (!person) {
                        const ensured = await bridge.ensurePerson(spec.name, { ref: \`seed-\${spec.name}\` });
                        roster = await plugin.listContacts();
                        person = roster.find((p) => p.docId === ensured.docId);
                    }
                    if (!person) continue;

                    await plugin.updatePersonFields(person.itemId, {
                        name: spec.name,
                        phone: spec.phone,
                        wechat: spec.wechat,
                        email: spec.email,
                        website: spec.website || "",
                        birthday: spec.birthday,
                        isLunar: spec.isLunar,
                        group: spec.group,
                        tags: spec.tags,
                    });

                    if (spec.relationLabels?.length) {
                        const currentRel = await plugin.loadPersonRelationshipLabels(person.docId);
                        await plugin.savePersonRelationshipLabels(person.docId, selfDocId, spec.relationLabels, currentRel.record);
                    }

                    const existingAliases = await plugin.listPersonAliases(person.docId);
                    const existingSet = new Set(existingAliases.map((a) => a.alias.trim().toLowerCase()));
                    for (const alias of spec.aliases || []) {
                        if (!existingSet.has(alias.toLowerCase())) {
                            await plugin.addPersonAlias(person.docId, alias);
                        }
                    }

                    if (spec.lifecycle) {
                        await plugin.updatePersonLifecycleStage(person.docId, spec.lifecycle.stage, fmtDate(now), spec.lifecycle.note);
                    }
                    if (spec.cadence) {
                        await plugin.savePersonCadence(person.docId, { days: spec.cadence.days, paused: Boolean(spec.cadence.paused) });
                    }

                    if (spec.note) {
                        const curNote = await plugin.loadPersonNote(person.docId);
                        if (curNote !== spec.note) {
                            await plugin.savePersonNote(person.docId, spec.note, curNote);
                        }
                    }

                    if (spec.fields) {
                        const curFields = await plugin.loadPersonFields(person.docId);
                        const items = [];
                        let gIdx = 1;
                        let eIdx = 1;
                        for (const g of spec.fields.groups) {
                            const gid = \`00000000-0000-4000-8000-\${String(gIdx++).padStart(12, "0")}\`;
                            items.push({ id: gid, kind: "group", label: g.label });
                            for (const entry of g.entries) {
                                const eid = \`00000000-0000-4000-9000-\${String(eIdx++).padStart(12, "0")}\`;
                                items.push({ id: eid, kind: "entry", label: entry.label, value: entry.value, parentId: gid });
                            }
                        }
                        await plugin.savePersonFields(person.docId, { schemaVersion: 1, ownerDocId: person.docId, items }, curFields);
                    }

                    if (spec.facts?.length) {
                        const factItems = spec.facts.map((f, idx) => ({
                            id: \`fact-\${person.docId.slice(-6)}-\${idx + 1}\`,
                            category: f.category,
                            text: f.content,
                            date: fmtDate(now),
                            isTaboo: Boolean(f.isTaboo),
                        }));
                        await plugin.savePersonFacts(person.docId, factItems);
                    }

                    if (spec.avatar && plugin.savePersonAvatar) {
                        await plugin.savePersonAvatar(person.docId, spec.avatar);
                    }

                    if (spec.channels && plugin.savePersonChannels) {
                        await plugin.savePersonChannels(person.docId, spec.channels);
                    }

                    if (spec.businessCard && plugin.savePersonBusinessCard) {
                        await plugin.savePersonBusinessCard(person.docId, spec.businessCard);
                    }

                    const refreshed = (await plugin.listContacts()).find((p) => p.docId === person.docId);
                    byName.set(spec.name, refreshed || person);
                }
                stepLog.push("contacts");

                // 3. 创建与完善 5 个组织及其部门树、在职与历史（校友/前同事）成员
                const orgSpecs = [
                    {
                        name: "远景科技",
                        profile: {
                            name: "远景科技",
                            shortName: "远景",
                            qccUrl: "",
                            logoUrl: "",
                            logoDataUrl: "",
                            description: "专注于本地优先知识图谱与智能关系网络研发的创新科技企业，总部位于杭州文三路创智中心。",
                            departments: [
                                { id: "dept-yj-rd", name: "研发中心", parentId: null, description: "核心引擎与跨端架构研发" },
                                { id: "dept-yj-ai", name: "AI 平台部", parentId: "dept-yj-rd", description: "本地语义理解与结构化抽取" },
                                { id: "dept-yj-cn", name: "云原生架构组", parentId: "dept-yj-rd", description: "底层同步与高可靠存储" },
                                { id: "dept-yj-pd", name: "产品与设计中心", parentId: null, description: "产品规划与用户体验" },
                                { id: "dept-yj-pm", name: "产品部", parentId: "dept-yj-pd", description: "核心工作流与生态联动" },
                                { id: "dept-yj-ux", name: "体验设计部", parentId: "dept-yj-pd", description: "设计系统与微交互" },
                            ],
                            customFields: [
                                { id: "cf-yj-1", label: "总部地址", value: "浙江省杭州市西湖区文三路创智中心 A 座 18F" },
                                { id: "cf-yj-2", label: "融资阶段", value: "Pre-A 轮（启明创投领投）" },
                            ],
                        },
                        members: [
                            { person: "陈致远", department: "产品与设计中心", title: "联合创始人兼产品负责人", joinedOn: "2023-03-01", status: "active", affiliationKind: "work", note: "全面负责产品战略与体验" },
                            { person: "王浩然", department: "研发中心", title: "联合创始人兼 CTO", joinedOn: "2023-03-01", status: "active", affiliationKind: "work", note: "主持核心存储与图谱引擎架构" },
                            { person: "林知夏", department: "体验设计部", title: "设计总监", joinedOn: "2023-06-01", status: "active", affiliationKind: "work", note: "负责全平台设计系统与视觉规范" },
                            { person: "许知微", department: "产品部", title: "高级产品经理", joinedOn: "2024-02-01", status: "active", affiliationKind: "work", note: "负责思源笔记深度联动与增长" },
                            { person: "陆景行", department: "云原生架构组", title: "前首席基础设施架构师", joinedOn: "2023-04-01", leftOn: "2025-05-30", status: "former", statusLabel: "已离职创业", affiliationKind: "work", note: "离职赴深圳创业，仍担任外部技术顾问" },
                        ],
                    },
                    {
                        name: "星海智能研究院",
                        profile: {
                            name: "星海智能研究院",
                            shortName: "星海研究院",
                            qccUrl: "",
                            logoUrl: "",
                            logoDataUrl: "",
                            description: "聚焦基础大模型、符号神经推理与开源开发者生态的新型研发机构，位于杭州未来科技城。",
                            departments: [
                                { id: "dept-xh-fm", name: "基础模型部", parentId: null, description: "预训练与图谱增强推理" },
                                { id: "dept-xh-os", name: "开源与开发者生态部", parentId: null, description: "开源社区与黑客松运营" },
                                { id: "dept-xh-ac", name: "学术委员会", parentId: null, description: "高校联合课题指导" },
                            ],
                            customFields: [
                                { id: "cf-xh-1", label: "机构地址", value: "浙江省杭州市余杭区未来科技城人工智能小镇 6 号楼" },
                                { id: "cf-xh-2", label: "代表成果", value: "Xinghai-7B / Xinghai-GraphRAG" },
                            ],
                        },
                        members: [
                            { person: "顾言深", department: "基础模型部", title: "首席科学家", joinedOn: "2022-09-01", status: "active", affiliationKind: "work", note: "主持大模型与知识图谱融合推理" },
                            { person: "姜南栀", department: "开源与开发者生态部", title: "开发者生态负责人", joinedOn: "2024-01-15", status: "active", affiliationKind: "work", note: "运营全国开源社区与黑客松" },
                            { person: "赵敏之", department: "学术委员会", title: "首席学术顾问", joinedOn: "2022-01-01", status: "active", affiliationKind: "work", note: "指导博士后与联合实验室课题" },
                            { person: "王浩然", department: "基础模型部", title: "前特聘访问学者", joinedOn: "2021-06-01", leftOn: "2023-02-28", status: "former", statusLabel: "访问期满", affiliationKind: "work", note: "参与早期分布式训练框架研发" },
                        ],
                    },
                    {
                        name: "启明创投华东基金",
                        profile: {
                            name: "启明创投华东基金",
                            shortName: "启明华东",
                            qccUrl: "",
                            logoUrl: "",
                            logoDataUrl: "",
                            description: "专注早期与成长期硬科技、AI 原生应用及企业服务赛道的创业投资基金。",
                            departments: [
                                { id: "dept-qm-es", name: "企业服务投资组", parentId: null, description: "SaaS 与生产力工具投资" },
                                { id: "dept-qm-ht", name: "硬科技投研部", parentId: null, description: "AI 基础设施与算力赛道" },
                            ],
                            customFields: [
                                { id: "cf-qm-1", label: "办公地址", value: "上海市浦东新区陆家嘴世纪大道金融中心 36F" },
                                { id: "cf-qm-2", label: "管理规模", value: "50 亿人民币 + 双币基金" },
                            ],
                        },
                        members: [
                            { person: "苏晚晴", department: "企业服务投资组", title: "主管合伙人", joinedOn: "2020-05-01", status: "active", affiliationKind: "work", note: "远景科技天使轮领投方董事" },
                            { person: "程叙白", department: "硬科技投研部", title: "投资副总裁（VP）", joinedOn: "2021-08-01", status: "active", affiliationKind: "work", note: "负责 AI 基础设施与算力赛道尽调" },
                        ],
                    },
                    {
                        name: "浙江大学计算机学院校友会",
                        profile: {
                            name: "浙江大学计算机学院校友会",
                            shortName: "浙大计院",
                            qccUrl: "",
                            logoUrl: "",
                            logoDataUrl: "",
                            description: "凝聚浙大计算机科学与技术学院师生与产业界校友的学术及创业共同体。",
                            departments: [
                                { id: "dept-zju-ic", name: "智能计算研究所", parentId: null, description: "人工智能与知识工程" },
                                { id: "dept-zju-sa", name: "系统结构实验室", parentId: null, description: "分布式与高性能计算" },
                                { id: "dept-zju-cs", name: "计算机科学与技术系", parentId: null, description: "本科与研究生培养" },
                            ],
                            customFields: [
                                { id: "cf-zju-1", label: "校区地址", value: "浙江省杭州市西湖区浙大路 38 号玉泉校区曹光彪大楼" },
                                { id: "cf-zju-2", label: "校训精神", value: "求是创新" },
                            ],
                        },
                        members: [
                            { person: "赵敏之", department: "智能计算研究所", title: "求是特聘教授 / 博导", joinedOn: "2008-09-01", status: "active", affiliationKind: "education", note: "实验室学术带头人" },
                            { person: "陈致远", department: "智能计算研究所", title: "2012级硕士研究生", joinedOn: "2012-09-01", leftOn: "2015-06-30", status: "former", statusLabel: "硕士毕业", affiliationKind: "education", note: "赵敏之教授指导硕士" },
                            { person: "顾言深", department: "智能计算研究所", title: "2010级博士研究生", joinedOn: "2010-09-01", leftOn: "2015-06-30", status: "former", statusLabel: "博士毕业", affiliationKind: "education", note: "实验室大师兄，国家奖学金得主" },
                            { person: "王浩然", department: "系统结构实验室", title: "2011级硕士研究生", joinedOn: "2011-09-01", leftOn: "2014-06-30", status: "former", statusLabel: "硕士毕业", affiliationKind: "education", note: "ACM 校队主力" },
                            { person: "程叙白", department: "计算机科学与技术系", title: "2008级本科校友", joinedOn: "2008-09-01", leftOn: "2012-06-30", status: "former", statusLabel: "本科毕业", affiliationKind: "education", note: "紫金港白沙四舍 402 室友" },
                        ],
                    },
                    {
                        name: "锦城知识产权律所",
                        profile: {
                            name: "锦城知识产权律所",
                            shortName: "锦城律所",
                            qccUrl: "",
                            logoUrl: "",
                            logoDataUrl: "",
                            description: "深耕开源软件治理、AI 训练数据合规、专利布局与科技投融资并购的精品律所。",
                            departments: [
                                { id: "dept-jc-ip", name: "开源软件与专利合规部", parentId: null, description: "开源许可证与专利诉讼" },
                                { id: "dept-jc-ma", name: "投融资并购法务部", parentId: null, description: "科技企业早期与成长期融资法务" },
                            ],
                            customFields: [
                                { id: "cf-jc-1", label: "律所地址", value: "上海市静安区南京西路越洋广场 28F" },
                            ],
                        },
                        members: [
                            { person: "唐沐雪", department: "开源软件与专利合规部", title: "高级合伙人律师", joinedOn: "2019-07-01", status: "active", affiliationKind: "work", note: "担任多家开源软件基金会法律顾问" },
                        ],
                    },
                ];

                let existingOrgs = await plugin.listOrganizations();
                for (const oSpec of orgSpecs) {
                    let org = existingOrgs.find((item) => item.name === oSpec.name);
                    if (!org) {
                        const created = await plugin.createOrganization(oSpec.name, oSpec.profile);
                        org = { docId: created.docId, name: oSpec.name };
                    } else {
                        const currentProfile = await plugin.loadOrganizationProfile(org.docId).catch(() => null);
                        await plugin.saveOrganizationProfile(org.docId, oSpec.profile, currentProfile);
                    }

                    const curMembers = await plugin.listOrganizationMembers(org.docId);
                    for (const m of oSpec.members) {
                        const p = byName.get(m.person);
                        if (!p) continue;
                        const already = curMembers.some((cm) => cm.personDocId === p.docId && cm.status === m.status);
                        if (!already) {
                            await plugin.addOrganizationMember(org.docId, p.docId, {
                                department: m.department,
                                title: m.title,
                                joinedOn: m.joinedOn,
                                leftOn: m.leftOn || "",
                                status: m.status,
                                statusLabel: m.statusLabel || "",
                                affiliationKind: m.affiliationKind || "work",
                                note: m.note || "",
                            });
                        }
                    }
                }
                stepLog.push("orgs");

                // 4. 建立丰富的跨圈层双向人脉关系
                const relationPairs = [
                    ["王浩然", "林知夏"],
                    ["王浩然", "顾言深"],
                    ["王浩然", "陆景行"],
                    ["王浩然", "赵敏之"],
                    ["王浩然", "苏晚晴"],
                    ["王浩然", "周牧野"],
                    ["林知夏", "许知微"],
                    ["苏晚晴", "程叙白"],
                    ["苏晚晴", "唐沐雪"],
                    ["苏晚晴", "周牧野"],
                    ["顾言深", "赵敏之"],
                    ["顾言深", "姜南栀"],
                    ["陆景行", "姜南栀"],
                    ["唐沐雪", "程叙白"],
                    ["陈致远", "王浩然"],
                    ["陈致远", "林知夏"],
                    ["陈致远", "苏晚晴"],
                    ["陈致远", "顾言深"],
                    ["陈致远", "沈书仪"],
                    ["陈致远", "赵敏之"],
                    ["陈致远", "程叙白"],
                ];
                for (const [nameA, nameB] of relationPairs) {
                    const pA = byName.get(nameA);
                    const pB = byName.get(nameB);
                    if (pA && pB) {
                        await plugin.establishPotentialConnection(pA.docId, pB.docId).catch(() => {});
                    }
                }
                stepLog.push("relations");

                // 5. 初识引荐溯源（person-origin）
                const origins = [
                    {
                        person: "苏晚晴",
                        metAt: "2023-11-18 乌镇互联网创投闭门夜话",
                        introducer: "程叙白",
                        preferences: "对本地优先架构与个人知识库商业化见解极为犀利，当场约定了次周上海办公室深聊。",
                    },
                    {
                        person: "唐沐雪",
                        metAt: "2024-03-12 上海静安嘉里中心开源软件合规沙龙",
                        introducer: "苏晚晴",
                        preferences: "仅用半小时就帮我们理清了双许可协议与插件生态的边界问题，专业度满分。",
                    },
                    {
                        person: "姜南栀",
                        metAt: "2025-04-20 西湖开源大模型开发者黑客松",
                        introducer: "顾言深",
                        preferences: "现场控场与开发者沟通极具感染力，对技术产品的叙事表达很有洞察。",
                    },
                    {
                        person: "周牧野",
                        metAt: "2025-06-08 成都麓湖新消费与供应链数字化私享会",
                        introducer: "王浩然",
                        preferences: "实干派企业家，茶席间聊起川味食材产区如数家珍，对数字化工具选型非常务实。",
                    },
                    {
                        person: "顾言深",
                        metAt: "2012-09-10 浙大智能计算研究所迎新组会",
                        introducer: "赵敏之",
                        preferences: "赵老师指定由顾师兄带我熟悉图数据库代码库，师兄手把手教我调通了第一个分布式基准测试。",
                    },
                ];
                for (const o of origins) {
                    const p = byName.get(o.person);
                    const intro = byName.get(o.introducer);
                    if (p) {
                        await plugin.savePersonOrigin({
                            personDocId: p.docId,
                            metAt: o.metAt,
                            ...(intro?.docId ? { introducedByDocId: intro.docId } : {}),
                            preferences: o.preferences,
                        });
                    }
                }
                stepLog.push("origins");

                // 6. 家庭与亲属关系树（person-kinship）
                const whr = byName.get("王浩然");
                const ssy = byName.get("沈书仪");
                const czy = byName.get("陈致远");
                if (whr) {
                    const existingK = await plugin.loadPersonKinships(whr.docId);
                    if (existingK.length === 0) {
                        await plugin.addPersonKinship({
                            id: "kin-whr-spouse",
                            personDocId: whr.docId,
                            role: "spouse",
                            relationLabel: "妻子",
                            name: "周清雅",
                            birthYearOrDate: "1990-04-12",
                            note: "浙医二院心内科主治医师，温婉细心",
                            createdAt: Date.now(),
                        });
                        await plugin.addPersonKinship({
                            id: "kin-whr-child",
                            personDocId: whr.docId,
                            role: "child",
                            relationLabel: "女儿",
                            name: "王小满",
                            birthYearOrDate: "2020-05-21",
                            note: "最喜欢拼乐高机械组与听恐龙故事绘本",
                            createdAt: Date.now(),
                        });
                    }
                }
                if (ssy && czy) {
                    const existingK = await plugin.loadPersonKinships(ssy.docId);
                    if (existingK.length === 0) {
                        await plugin.addPersonKinship({
                            id: "kin-ssy-nephew",
                            personDocId: ssy.docId,
                            role: "relative",
                            relationLabel: "外甥",
                            name: "陈致远",
                            linkedDocId: czy.docId,
                            note: "姐姐家的孩子，在杭州创业做软件产品",
                            createdAt: Date.now(),
                        });
                    }
                }
                stepLog.push("kinships");

                // 7. 协作项目（person-projects）
                const lzx = byName.get("林知夏");
                const xzw = byName.get("许知微");
                const gys = byName.get("顾言深");
                const swq = byName.get("苏晚晴");
                const cxb = byName.get("程叙白");
                const tmx = byName.get("唐沐雪");
                const jnz = byName.get("姜南栀");
                const ljx = byName.get("陆景行");

                const projectGroups = [
                    {
                        title: "小驴人脉与思源原生文档深度联动 2.0",
                        status: "active",
                        note: "打通思源笔记原生属性视图、文档受控区块增量镜像与本地关系图谱的核心工程。",
                        participants: [
                            { person: whr, role: "首席架构师 / 联创" },
                            { person: lzx, role: "体验设计负责人" },
                            { person: xzw, role: "核心产品经理" },
                            { person: gys, role: "图谱算法顾问" },
                        ],
                    },
                    {
                        title: "远景科技 Pre-A 轮融资与专利合规交割",
                        status: "completed",
                        note: "顺利完成投资协议签署、核心知识产权合规审查及资金交割。",
                        participants: [
                            { person: swq, role: "领投方董事合伙人" },
                            { person: cxb, role: "尽调与投研负责人" },
                            { person: tmx, role: "专项法务与合规总顾问" },
                            { person: whr, role: "技术尽调对接人" },
                        ],
                    },
                    {
                        title: "2026 华东开源大模型与本地知识库开发者季",
                        status: "active",
                        note: "联合星海研究院与开源社区举办的跨城市技术巡回沙龙。",
                        participants: [
                            { person: gys, role: "联合出品人 / 评委主席" },
                            { person: jnz, role: "社区主理与统筹" },
                            { person: ljx, role: "深圳站架构专题讲师" },
                        ],
                    },
                ];
                for (const pg of projectGroups) {
                    for (const part of pg.participants) {
                        if (!part.person) continue;
                        const curP = await plugin.loadPersonProjects(part.person.docId);
                        if (!curP.some((item) => item.title === pg.title)) {
                            await plugin.addPersonProject({
                                id: \`prj-\${part.person.docId.slice(-5)}-\${Math.random().toString(36).slice(2, 6)}\`,
                                personDocId: part.person.docId,
                                title: pg.title,
                                status: pg.status,
                                role: part.role,
                                note: pg.note,
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                            });
                        }
                    }
                }
                stepLog.push("projects");

                // 8. 历史上的今天（1年前、2年前同月同日）+ 跨月/近期互动记录
                const oneYearAgo = yearsOffsetDate(1, 0);
                const twoYearsAgo = yearsOffsetDate(2, 0);

                const interactionPlan = [
                    { person: "苏晚晴", note: "在北京国贸三期景福轩为晚晴姐庆生，席间敲定天使轮投资核心条款，聊到深夜意犹未尽", type: "meal", occurredAt: oneYearAgo.ts },
                    { person: "顾言深", note: "在浙大玉泉校区青芝坞茶馆重聚，顾师兄分享了图神经网络在个人知识库中的推理思路", type: "meeting", occurredAt: oneYearAgo.ts - 3600 * 1000 * 3 },
                    { person: "程叙白", note: "外滩源咖啡馆叙旧，老程刚升任启明创投 VP，约定共同关注 AI Native 工具赛道", type: "meeting", occurredAt: twoYearsAgo.ts },

                    { person: "王浩然", note: "上午在白板前推演文档增量镜像调度器防抖方案，确认打字态零干扰策略", type: "meeting", occurredAt: daysAgoTs(1, 10) },
                    { person: "王浩然", note: "周末清晨一起走西湖十里琅珰徒步线，下山在龙井村喝早茶复盘 Q4 研发节奏", type: "meeting", occurredAt: daysAgoTs(5, 9) },
                    { person: "王浩然", note: "同步小驴人脉 v0.7 架构收敛方案，决定砍掉伪评分聚焦核心四步闭环", type: "call", occurredAt: daysAgoTs(12, 16) },
                    { person: "林知夏", note: "评审首页与人物详情一屏紧凑化视觉稿，敲定 1.6px 细线图标与琥珀暖棕令牌", type: "meeting", occurredAt: daysAgoTs(2, 14) },
                    { person: "林知夏", note: "上海虹桥高铁站旁手冲咖啡店碰头，核对 150% 缩放与移动端 390px 响应式断点细节", type: "meeting", occurredAt: daysAgoTs(9, 15) },
                    { person: "许知微", note: "一起梳理 40 位真实种子用户的访谈录音，提炼出“会前 30 秒速查忌口”刚需场景", type: "meeting", occurredAt: daysAgoTs(1, 17) },
                    { person: "许知微", note: "下班后公司羽毛球馆双打局，状态神勇连赢三场", type: "other", occurredAt: daysAgoTs(7, 19) },
                    { person: "苏晚晴", note: "微信同步三季度经营简报与现金流预测，晚晴姐主动提出帮引荐两家华东标杆客户", type: "message", occurredAt: daysAgoTs(4, 11) },
                    { person: "苏晚晴", note: "上海陆家嘴办公室午餐会，复盘下半年产品商业化路线", type: "meal", occurredAt: daysAgoTs(18, 12) },
                    { person: "顾言深", note: "未来科技城星海研究院拜访，测试端侧本地向量与双链图谱混合检索性能", type: "meeting", occurredAt: daysAgoTs(6, 15) },
                    { person: "沈书仪", note: "周日晚去南山路小姨家吃桂花糖藕与清蒸鲈鱼，送去今年新出的福鼎老白茶饼", type: "meal", occurredAt: daysAgoTs(3, 18) },
                    { person: "沈书仪", note: "陪小姨去浙江美术馆看宋元书画特展，听她讲解古画装裱形制", type: "other", occurredAt: daysAgoTs(16, 10) },

                    { person: "程叙白", note: "电话交流下半年大模型算力成本趋势，老程分享了最新的投研行业周报", type: "call", occurredAt: daysAgoTs(23, 20) },
                    { person: "唐沐雪", note: "邮件确认 MIT 与 Apache 2.0 依赖库归属声明文本，唐律给出了详尽修订批注", type: "email", occurredAt: daysAgoTs(28, 11) },
                    { person: "陆景行", note: "远程语音探讨深圳创业近况与跨端同步冲突合并策略", type: "call", occurredAt: daysAgoTs(32, 21) },

                    { person: "周牧野", note: "在成都麓湖茶叙，体验川味供应链数字化看板原型，约定秋茶上市后再聚", type: "meal", occurredAt: daysAgoTs(68, 14) },
                    { person: "赵敏之", note: "教师节前夕赴玉泉校区看望赵老师，汇报团队近期在图谱数据一致性上的工程突破", type: "other", occurredAt: daysAgoTs(75, 15) },
                ];

                const existingEvents = await plugin.loadInteractionEvents();
                const existingNotes = new Set(existingEvents.map((e) => \`\${e.personDocId}|\${e.note}\`));
                for (const item of interactionPlan) {
                    const p = byName.get(item.person);
                    if (!p) continue;
                    const key = \`\${p.docId}|\${item.note}\`;
                    if (!existingNotes.has(key)) {
                        await plugin.recordInteraction(p.docId, item.note, item.type, {
                            occurredAt: item.occurredAt,
                            skipDailyNoteSync: true,
                        });
                        existingNotes.add(key);
                    }
                }
                stepLog.push("interactions");

                // 9. 待办跟进计划
                const followUpPlan = [
                    { person: "周牧野", title: "寄送狮峰龙井秋茶礼盒并回访西南二期数字化签约进度", dueDate: daysOffset(-2) },
                    { person: "苏晚晴", title: "发送生日祝福并同步 Q4 核心产品路线图", dueDate: daysOffset(0) },
                    { person: "赵敏之", title: "发邮件请教知识图谱双链消歧论文审稿意见", dueDate: daysOffset(1) },
                    { person: "顾言深", title: "核对华东 AI 峰会圆桌论坛联合演讲幻灯片终稿", dueDate: daysOffset(2) },
                    { person: "王浩然", title: "预订生日庆生餐厅（切记提醒后厨花生严重过敏红线）", dueDate: daysOffset(4) },
                    { person: "唐沐雪", title: "提交新版企业版服务协议与隐私条款请唐律终审", dueDate: daysOffset(6) },
                ];
                for (const fu of followUpPlan) {
                    const p = byName.get(fu.person);
                    if (!p) continue;
                    const list = await plugin.listPersonFollowUps(p.docId);
                    if (!list.some((item) => item.title === fu.title)) {
                        await plugin.createFollowUp(p.docId, fu.title, fu.dueDate).catch(() => {});
                    }
                }
                stepLog.push("followups");

                // 10. 人情往来账本
                const exchangePlan = [
                    { reqId: "20261031180000-exch001", person: "王浩然", direction: "payable", kind: "item", description: "公司乔迁赠送铂富意式半自动咖啡机", occurredOn: daysOffset(-45), dueOn: daysOffset(15), status: "open", note: "放置在茶水间全员享用，计划年底回赠户外冲锋衣" },
                    { reqId: "20261031180000-exch002", person: "王浩然", direction: "receivable", kind: "money", description: "女儿王小满周岁贺礼红包", amount: 2000, occurredOn: "2026-05-21", status: "settled", settledOn: "2026-05-21", note: "祝小满健康快乐成长" },
                    { reqId: "20261031180000-exch003", person: "苏晚晴", direction: "payable", kind: "favor", description: "帮忙引荐两家华东标杆制造企业数字化负责人", occurredOn: daysOffset(-10), dueOn: daysOffset(20), status: "open", note: "感谢天使轮以来的鼎力支持与客户引荐，准备生日礼致谢" },
                    { reqId: "20261031180000-exch004", person: "沈书仪", direction: "payable", kind: "item", description: "中秋家宴馈赠武夷山桐木关金骏眉与手工月饼", occurredOn: "2026-09-25", dueOn: daysOffset(7), status: "open", note: "小姨珍藏好茶，重阳节需回礼体检卡" },
                    { reqId: "20261031180000-exch005", person: "沈书仪", direction: "receivable", kind: "money", description: "重阳节孝敬小姨健康体检礼金", amount: 2800, occurredOn: "2026-10-11", status: "settled", settledOn: "2026-10-11", note: "邵逸夫医院深度体检套餐" },
                    { reqId: "20261031180000-exch006", person: "周牧野", direction: "payable", kind: "item", description: "冷链直邮成都手工冷吃兔与非遗张飞牛肉礼盒", occurredOn: daysOffset(-30), dueOn: daysOffset(3), status: "open", note: "待回赠杭州狮峰明前龙井" },
                    { reqId: "20261031180000-exch007", person: "赵敏之", direction: "receivable", kind: "item", description: "教师节狮峰翁家山头采龙井茶礼", occurredOn: "2026-09-10", status: "settled", settledOn: "2026-09-10", note: "师母与赵老师都很喜欢" },
                ];
                for (const ex of exchangePlan) {
                    const p = byName.get(ex.person);
                    if (!p) continue;
                    const existingEx = await plugin.listPersonExchanges(p.docId);
                    if (!existingEx.some((item) => item.description === ex.description)) {
                        const created = await plugin.createPersonExchange({
                            requestId: ex.reqId,
                            personDocId: p.docId,
                            direction: ex.direction,
                            kind: ex.kind,
                            description: ex.description,
                            ...(ex.kind === "money" ? { amount: ex.amount, currency: "CNY" } : {}),
                            occurredOn: ex.occurredOn,
                            dueOn: ex.dueOn || "",
                            note: ex.note,
                        });
                        if (ex.status === "settled" && ex.settledOn) {
                            await plugin.changePersonExchangeStatus(created.id, "settled", ex.settledOn, { updatedAt: created.updatedAt });
                        }
                    }
                }
                stepLog.push("exchanges");

                // 11. 重要纪念日与里程碑
                const annivPlan = [
                    { person: "苏晚晴", title: "天使轮投资协议签署纪念日", category: "work", date: \`2024-\${monthDayOffset(1)}\`, isLunar: false, remindDaysBefore: 7, note: "远景科技首笔机构融资落地里程碑" },
                    { person: "王浩然", title: "远景科技联合创立纪念日", category: "work", date: \`2023-\${monthDayOffset(3)}\`, isLunar: false, remindDaysBefore: 7, note: "在文三路咖啡馆写下第一行代码的日子" },
                    { person: "程叙白", title: "浙大紫金港同寝相识纪念日", category: "acquaintance", date: \`2008-\${monthDayOffset(5)}\`, isLunar: false, remindDaysBefore: 7, note: "402 寝室十八年兄弟情谊" },
                    { person: "赵敏之", title: "拜入智能计算实验室门下纪念日", category: "other", date: "2012-09-10", isLunar: false, remindDaysBefore: 7, note: "科研与工程之路的起点" },
                ];
                for (const an of annivPlan) {
                    const p = byName.get(an.person);
                    if (!p) continue;
                    const existingAn = await plugin.loadPersonAnniversaries(p.docId);
                    if (!existingAn.some((item) => item.title === an.title)) {
                        await plugin.addPersonAnniversary({
                            id: \`anniv-\${p.docId.slice(-5)}-\${Math.random().toString(36).slice(2, 6)}\`,
                            personDocId: p.docId,
                            title: an.title,
                            category: an.category,
                            date: an.date,
                            isLunar: an.isLunar,
                            remindDaysBefore: an.remindDaysBefore,
                            note: an.note,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        });
                    }
                }
                stepLog.push("anniversaries");

                // 12. 群体活动与聚会大事记
                const existingOccasions = await plugin.listOccasions();
                const occasionPlan = [
                    {
                        title: "2026 华东人工智能与本地优先软件峰会",
                        type: "conference",
                        date: daysOffset(-10),
                        place: "杭州国际博览中心 3F 主会场",
                        participants: ["陈致远", "王浩然", "顾言深", "苏晚晴", "姜南栀", "陆景行"],
                        note: "围绕端侧大模型与思源笔记知识图谱生态展开圆桌对谈，会后共进晚餐。",
                    },
                    {
                        title: "浙大计算机系校友秋季龙井问茶雅集",
                        type: "party",
                        date: daysOffset(-18),
                        place: "杭州西湖龙井村十八棵御茶园茶室",
                        participants: ["赵敏之", "陈致远", "顾言深", "王浩然", "程叙白"],
                        note: "师门与校友久别重逢，赵老师题字勉励大家坚持长期主义。",
                    },
                    {
                        title: "远景科技 Q4 产品体验与架构冲刺工作坊",
                        type: "meeting",
                        date: daysOffset(-4),
                        place: "杭州文三路创智中心 18F 路演厅",
                        participants: ["陈致远", "王浩然", "林知夏", "许知微"],
                        note: "确立思源原生文档深度联动四期蓝图与一屏精简交互铁律。",
                    },
                    {
                        title: "上海静安硬科技创投法务与合规私享晚宴",
                        type: "meal",
                        date: daysOffset(-22),
                        place: "上海静安香格里拉大酒店夏宫",
                        participants: ["苏晚晴", "唐沐雪", "程叙白", "林知夏"],
                        note: "探讨生成式 AI 产品商业化合规边界与知识产权布局。",
                    },
                ];
                for (const occ of occasionPlan) {
                    if (!existingOccasions.some((item) => item.title === occ.title)) {
                        const attendees = occ.participants
                            .map((n) => byName.get(n))
                            .filter(Boolean)
                            .map((p) => ({ personDocId: p.docId, name: p.name }));
                        await plugin.createOccasion({
                            title: occ.title,
                            type: occ.type,
                            date: occ.date,
                            place: occ.place,
                            attendees,
                            note: occ.note,
                            deriveInteractions: false,
                        });
                    }
                }
                stepLog.push("occasions");

                // 13. 双向承诺（Promises）与会客行程（Itineraries）
                if (whr) {
                    const promises = await plugin.loadPersonPromises(whr.docId);
                    if (promises.length === 0) {
                        await plugin.addPersonPromise({
                            id: "prm-whr-1",
                            personDocId: whr.docId,
                            direction: "i_promised",
                            title: "帮王小满代购一套绝版乐高机械组保时捷模型",
                            detail: "已联系香港朋友帮忙留货，下周顺丰寄达杭州",
                            promisedOn: daysOffset(-5),
                            dueOn: daysOffset(5),
                            status: "pending",
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        });
                        await plugin.addPersonPromise({
                            id: "prm-whr-2",
                            personDocId: whr.docId,
                            direction: "they_promised",
                            title: "周末带我去体验新开的富阳高山星空露营基地",
                            promisedOn: daysOffset(-3),
                            dueOn: daysOffset(10),
                            status: "pending",
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        });
                    }
                }
                if (swq) {
                    const itineraries = await plugin.loadPersonItineraries(swq.docId);
                    if (itineraries.length === 0) {
                        await plugin.savePersonItinerary({
                            id: "itin-swq-1",
                            personDocId: swq.docId,
                            title: "赴上海陆家嘴向苏晚晴汇报年度产品商业化进展",
                            targetDate: daysOffset(3),
                            targetTime: "14:30",
                            location: "上海市浦东新区世纪大道金融中心 36F",
                            attendees: "陈致远、王浩然、苏晚晴、程叙白",
                            checklists: [
                                { id: "chk-1", text: "预订无虾蟹甲壳类的私房淮扬菜晚宴包厢", done: true },
                                { id: "chk-2", text: "准备思源原生文档深度联动实机演示环境", done: true },
                                { id: "chk-3", text: "携带福鼎白毫银针伴手茶礼", done: false },
                            ],
                            note: "演示新版本并请苏总引荐两家华东标杆企业客户",
                            status: "planned",
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        });
                    }
                }
                stepLog.push("promises_itineraries");

                // 14. 全量同步每一位联系人的思源原生文档区块
                const finalRoster = await plugin.listContacts();
                for (const person of finalRoster) {
                    await plugin.syncPersonDocument(person).catch(() => {});
                }
                stepLog.push("syncDocs");

                plugin.onDataChanged();

                return {
                    ok: true,
                    stepLog,
                    totalContacts: finalRoster.length,
                    totalOrgs: (await plugin.listOrganizations()).length,
                    totalOccasions: (await plugin.listOccasions()).length,
                    totalEvents: (await plugin.loadInteractionEvents()).length,
                };
            } catch (err) {
                throw new Error(\`[step after \${stepLog[stepLog.length - 1] || "start"}] \${err?.stack || err?.message || String(err)}\`);
            }
        })()`);

        console.log("[seed-isolated] 填充完成！统计摘要:", JSON.stringify(seedSummary));
        await fetch(`${BASE_URL}/api/sqlite/flushTransaction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
        }).catch(() => {});
    } finally {
        try { cdpSocket?.close(); } catch {}
        if (browserProc) {
            try { await stopIsolatedBrowser(browserProc); } catch {}
        }
        if (browserProfile) {
            try { await removeIsolatedBrowserProfile(browserProfile); } catch {}
        }
    }
}

main().catch((err) => {
    console.error("[seed-isolated] 失败:", err);
    process.exit(1);
});
