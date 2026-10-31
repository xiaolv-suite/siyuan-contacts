/**
 * 隔离全栈真实内核 + 真实思源桌面浏览器端到端验收（pnpm e2e:isolated）
 *
 * 100% 隔离保证：
 * - 仅在 os.tmpdir() 新建带 UUID 的独立思源工作区与独立 Chrome 用户目录，随机空闲回环端口；
 * - 绝不触碰用户正在运行的真实思源库（如 D:\SiYuan 或 6806 端口）；
 * - 串联两阶段实测：
 *   阶段一：11 步真内核服务回归 + 内核重启回读 + 多窗口真实 browser-desktop 前端验收（services-flow.mjs）；
 *   阶段二：1280×900 中文真实思源桌面主线走查（向导初始化 → 新建联系人 → 名册首屏与卡片几何核验 →
 *           详情首屏与文档忌口红线 SQL 落盘核验 → 会前 30 秒速览与会前速查大盘下钻 →
 *           互动记录、就地编辑、整页重载持久化及墓碑/人物文档双回读），输出真实桌面截图至 output/e2e-isolated/。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { assertIsolatedPath, assertTestPortAvailable, observeTestKernel, prepareIsolatedWorkspace } from "./kernel-safety.mjs";
import { readBrowserDebuggingPort, removeIsolatedBrowserProfile, stopIsolatedBrowser } from "./browser-cleanup.mjs";
import { guardScratch, kernelTokenFromConfig, makeApi, sweepOrphans } from "../lib/smoke-kernel.mjs";

const PLUGIN_NAME = "siyuan-contacts";
const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.join(ROOT, "dist");
const ARTIFACT_DIR = process.env.LVCT_E2E_ARTIFACT_DIR
    ? path.resolve(process.env.LVCT_E2E_ARTIFACT_DIR)
    : path.join(ROOT, "output", "e2e-isolated");

for (const required of ["index.js", "index.css", "plugin.json", "i18n/zh-CN.json"]) {
    if (!fs.existsSync(path.join(DIST, required))) {
        throw new Error(`dist/${required} 不存在，请先运行 pnpm build`);
    }
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function resolveKernel() {
    const candidate = [
        "D:/biji/SiYuan/resources/kernel/SiYuan-Kernel.exe",
        "D:/RJ/SiYuan/resources/kernel/SiYuan-Kernel.exe",
        path.join(process.env.ProgramFiles || "C:/Program Files", "SiYuan/resources/kernel/SiYuan-Kernel.exe"),
    ].find((item) => fs.existsSync(item));
    if (!candidate) throw new Error("未找到本地 SiYuan-Kernel.exe");
    return { kernel: candidate, appDir: path.resolve(path.dirname(candidate), "..") };
}

function resolveBrowser() {
    const candidate = [
        process.env.LVCT_TEST_BROWSER,
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe") : undefined,
    ].find((item) => item && fs.existsSync(item));
    if (!candidate) throw new Error("未找到 Chrome 测试浏览器");
    return candidate;
}

async function allocateFreePort() {
    const port = await new Promise((resolvePort, rejectPort) => {
        const server = net.createServer();
        server.once("error", rejectPort);
        server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
            const assigned = server.address().port;
            server.close((err) => (err ? rejectPort(err) : resolvePort(assigned)));
        });
    });
    if (port === 6806) return allocateFreePort();
    await assertTestPortAvailable("127.0.0.1", port);
    return port;
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(deadline, predicate, label) {
    while (Date.now() < deadline) {
        if (await predicate()) return;
        await pause(120);
    }
    throw new Error(`等待超时：${label}`);
}

/* ================= 阶段一：11 步真内核服务 + 内核重启 + 多窗口真前端回归 ================= */
if (!process.argv.includes("--stage2-only")) {
    console.log("== [1/2] 运行隔离真内核 11 步服务回归 + 多窗口真实 browser-desktop 前端验收 ==");
    const stage1Evidence = path.join(ARTIFACT_DIR, "stage1-services-and-frontend.json");
    const stage1 = spawnSync(process.execPath, [path.join(ROOT, "scripts/e2e/services-flow.mjs")], {
        cwd: ROOT,
        stdio: "inherit",
        env: {
            ...process.env,
            LVCT_REAL_FRONTEND: "1",
            LVCT_E2E_ARTIFACT_DIR: ARTIFACT_DIR,
            LVCT_E2E_EVIDENCE_FILE: stage1Evidence,
        },
    });
    if (stage1.status !== 0) {
        process.exit(stage1.status ?? 1);
    }
}

/* ================= 阶段二：中文 1280×900 真实思源桌面主线交互与视觉几何实测 ================= */
console.log("\n== [2/2] 运行中文真实思源桌面主线交互、一屏几何与截图实测 ==");
const { kernel, appDir } = resolveKernel();
const chromePath = resolveBrowser();
const port = await allocateFreePort();
const baseURL = `http://127.0.0.1:${port}`;
const workspace = path.join(os.tmpdir(), `SiYuan-Lvct-IsolatedWalk-${randomUUID()}`);
prepareIsolatedWorkspace(workspace, "lvct-isolated-walk.json", "lvct v0.7.2 isolated browser walkthrough");

const pluginTarget = path.join(workspace, "data", "plugins", PLUGIN_NAME);
assertIsolatedPath(workspace, pluginTarget);
fs.mkdirSync(path.dirname(pluginTarget), { recursive: true });
fs.cpSync(DIST, pluginTarget, { recursive: true, force: true });

let kernelProc;
let assertRunning;
let browserProc;
let browserProfile;
let cdpSocket;
let token = "";
let createdNotebookId = "";
const deadline = Date.now() + 240_000;
const report = {
    kernelVersion: "",
    port,
    workspace,
    screenshots: [],
    checks: [],
    consoleErrors: [],
};

async function kernelApi(route, body = {}) {
    assertRunning?.();
    const res = await fetch(`${baseURL}${route}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
    });
    assertRunning?.();
    return res.json();
}

try {
    kernelProc = spawn(kernel, ["--workspace", workspace, "serve", "--wd", appDir, "--port", String(port), "--lang", "zh_CN"], {
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env, SIYUAN_WORKSPACE_PATH: workspace },
    });
    assertRunning = observeTestKernel(kernelProc);
    await waitUntil(deadline, async () => {
        const boot = await kernelApi("/api/system/bootProgress").catch(() => null);
        return Boolean(boot?.code === 0 && boot.data?.progress >= 100);
    }, "隔离思源内核启动");

    const conf = JSON.parse(fs.readFileSync(path.join(workspace, "conf/conf.json"), "utf8"));
    token = kernelTokenFromConfig(conf);
    assert.ok(token, "隔离内核未生成 API token");

    const guardedApi = makeApi(baseURL, token);
    await sweepOrphans(guardedApi);
    await guardScratch(guardedApi, { base: baseURL });

    const verRes = await kernelApi("/api/system/version");
    report.kernelVersion = verRes.data;

    // 切换中文界面并启用插件
    if (conf.appearance && conf.appearance.lang !== "zh_CN") {
        await kernelApi("/api/setting/setAppearance", { ...conf.appearance, lang: "zh_CN" });
    }
    assert.equal((await kernelApi("/api/setting/setBazaar", { trust: true })).code, 0);
    assert.equal((await kernelApi("/api/petal/setPetalEnabled", { packageName: PLUGIN_NAME, enabled: true })).code, 0);
    const petals = await kernelApi("/api/petal/loadPetals", { frontend: "browser-desktop" });
    assert.ok(Array.isArray(petals.data) && petals.data.some((p) => p.name === PLUGIN_NAME), "内核未下发 siyuan-contacts 插件");

    browserProfile = fs.mkdtempSync(path.join(os.tmpdir(), "lvct-isolated-chrome-"));
    browserProc = spawn(chromePath, [
        "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
        "--lang=zh-CN", "--window-size=1280,900", "--remote-debugging-port=0",
        `--user-data-dir=${browserProfile}`, "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });

    let debugPort;
    await waitUntil(deadline, async () => {
        debugPort = readBrowserDebuggingPort(browserProfile);
        return Boolean(debugPort);
    }, "Chrome 调试端口启动");

    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
    const page = targets.find((t) => t.type === "page");
    assert.ok(page?.webSocketDebuggerUrl, "未找到 Chrome 页面调试目标");

    cdpSocket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        cdpSocket.addEventListener("open", res, { once: true });
        cdpSocket.addEventListener("error", rej, { once: true });
    });

    let nextId = 0;
    const pending = new Map();
    cdpSocket.addEventListener("message", (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.method === "Runtime.exceptionThrown") {
            report.consoleErrors.push(msg.params?.exceptionDetails?.text || "Runtime.exceptionThrown");
            return;
        }
        const entry = pending.get(msg.id);
        if (entry) {
            pending.delete(msg.id);
            if (msg.error) entry.rej(new Error(msg.error.message));
            else entry.res(msg.result);
        }
    });
    const call = (method, params = {}) => new Promise((res, rej) => {
        const id = ++nextId;
        pending.set(id, { res, rej });
        cdpSocket.send(JSON.stringify({ id, method, params }));
    });
    const evalJs = async (expression) => {
        const out = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (out.exceptionDetails) {
            throw new Error(out.exceptionDetails.exception?.description || out.exceptionDetails.text || "页面脚本异常");
        }
        return out.result?.value;
    };
    const shoot = async (filename) => {
        await pause(300);
        const snap = await call("Page.captureScreenshot", { format: "png" });
        const fullPath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(fullPath, Buffer.from(snap.data, "base64"));
        report.screenshots.push(fullPath);
        console.log(`  📸 已保存真实浏览器截图：${fullPath}`);
    };
    const setField = async (selectorExpr, value) => {
        const ok = await evalJs(`(() => {
            const el = ${selectorExpr};
            if (!el || el.disabled) return false;
            const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (!setter) return false;
            el.focus();
            setter.call(el, ${JSON.stringify(value)});
            el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ${JSON.stringify(value)} }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return el.value === ${JSON.stringify(value)};
        })()`);
        assert.ok(ok, `输入框写入失败：${selectorExpr}`);
    };

    await call("Runtime.enable");
    await call("Network.enable");
    await call("Page.enable");
    await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await call("Network.setExtraHTTPHeaders", { headers: { Authorization: `Token ${token}`, "Accept-Language": "zh-CN,zh;q=0.9" } });

    await call("Page.navigate", { url: `${baseURL}/stage/build/desktop/` });
    await waitUntil(deadline, () => evalJs("Boolean(window.LvContacts && window.LvContacts.protocol === 2)"), "思源桌面加载与插件桥就绪");

    const focusWorkbenchTab = async () => {
        const visible = await evalJs("Boolean([...document.querySelectorAll('.lvct-workbench')].some((w) => w.getBoundingClientRect().width > 0))");
        if (visible) return true;
        return evalJs(`(() => {
            const tab = [...document.querySelectorAll('.layout-tab-bar .item')].find((n) => /小驴人脉|Lv Contacts/.test(n.textContent || ''));
            if (tab) { tab.click(); return true; }
            const el = [...document.querySelectorAll('#barPlugins [aria-label], .toolbar__item, [title], button')].find((n) =>
                /小驴人脉|Lv Contacts/.test(n.getAttribute('title') || n.getAttribute('aria-label') || n.textContent || ''));
            if (!el) return false;
            el.click();
            return true;
        })()`);
    };

    // 1. 打开/聚焦工作台并走真实向导初始化（onLayoutReady 后顶栏图标出现）
    await waitUntil(deadline, async () => {
        await focusWorkbenchTab();
        return evalJs("Boolean([...document.querySelectorAll('.lvct-wizard__cta:not([disabled])')].some((b) => b.getBoundingClientRect().width > 0))");
    }, "初始化向导预检完成");

    const nbName = `lvct-contacts-isolated-${Date.now()}`;
    await setField("[...document.querySelectorAll('.lvct-wizard input.b3-text-field')].find((el) => el.getBoundingClientRect().width > 0)", nbName);
    await waitUntil(deadline, () => evalJs(`Boolean([...document.querySelectorAll('.lvct-wizard')].some((w) => w.getBoundingClientRect().width > 0 && w.querySelector('.lvct-wizard__plan')?.textContent?.includes(${JSON.stringify(nbName)}) && w.querySelector('.lvct-wizard__cta:not([disabled])')))`), "自定义笔记本名预检完成");
    await evalJs("[...document.querySelectorAll('.lvct-wizard__cta:not([disabled])')].find((b) => b.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, async () => {
        await focusWorkbenchTab();
        const err = await evalJs("document.querySelector('.lvct-wizard__error')?.textContent || ''");
        if (err && err.includes("初始化失败")) throw new Error(`向导初始化报错：${err}`);
        const selfBtn = await evalJs("Boolean(document.querySelector('.lvct-wizard__error[role=\"status\"]') && document.querySelector('.lvct-wizard__cta:not([disabled])'))");
        if (selfBtn) await evalJs("document.querySelector('.lvct-wizard__cta:not([disabled])').click()");
        return Boolean(await evalJs("[...document.querySelectorAll('.lvct-dash__actions')].some((el) => el.getBoundingClientRect().width > 0)"));
    }, "向导初始化完成并进入首页");

    const settingsPath = path.join(workspace, "data/storage/petal", PLUGIN_NAME, "contacts-settings.json");
    const savedSettings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    createdNotebookId = savedSettings.notebookId;

    // 若全新空库显示新手快速开始面板，先验证并收起新手引导再测量常态首页一屏高度
    await evalJs(`(() => {
        const qs = [...document.querySelectorAll('.lvct-dash__quickstart button')].find((b) => /知道了|不再显示|收起|Dismiss|Got it/i.test(b.textContent || b.getAttribute('aria-label') || ''));
        qs?.click();
    })()`);
    await pause(250);

    // 核验首页一屏预算与去伪评分
    const homeCheck = await evalJs(`(() => {
        const dash = [...document.querySelectorAll('.lvct-dash')].find((el) => el.getBoundingClientRect().width > 0);
        const actions = dash?.querySelector('.lvct-dash__actions')?.getBoundingClientRect();
        const lowfreq = dash?.querySelector('.lvct-dash__lowfreq');
        const text = dash?.textContent || '';
        return {
            actionsTop: Math.round(actions?.top ?? 9999),
            actionsWidth: Math.round(actions?.width ?? 0),
            hasQuickStart: Boolean(dash?.querySelector('.lvct-dash__quickstart')),
            lowfreqClosed: Boolean(lowfreq && !lowfreq.hasAttribute('open')),
            noFakeCheer: !text.includes('人脉连接状态极佳') && !text.includes('深度合作率'),
        };
    })()`);
    assert.ok(homeCheck.actionsWidth > 300 && homeCheck.actionsTop > 0 && (homeCheck.hasQuickStart || homeCheck.actionsTop < 480), `首页「今日行动」未落在可见首屏上半区：${JSON.stringify(homeCheck)}`);
    assert.ok(homeCheck.lowfreqClosed, "首页低频统计区未默认收起");
    assert.ok(homeCheck.noFakeCheer, "首页仍残留已删除的无依据评分或激励文案");
    report.checks.push({ step: "首页向导初始化与首屏收敛", ...homeCheck });
    await shoot("01-real-siyuan-home.png");
    console.log("  PASS 首页向导初始化与一屏预算核验", JSON.stringify(homeCheck));

    // 2. 切换到联系人名册，通过真实弹窗新建两位联系人并核验卡片几何
    await evalJs("[...document.querySelectorAll('[data-navigation-view=people]')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("[...document.querySelectorAll('.lvct-people__create')].some((el) => el.getBoundingClientRect().width > 0)"), "进入联系人名册");

    for (const c of [
        { name: "王浩然", phone: "13800138000", birthday: "1988-11-04", group: "朋友" },
        { name: "林知夏", phone: "13900139000", birthday: "1993-05-20", group: "同事" },
    ]) {
        await focusWorkbenchTab();
        await evalJs("[...document.querySelectorAll('.lvct-people__create')].find((el) => el.getBoundingClientRect().width > 0).click()");
        await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-form input[placeholder*=\"姓名\"], .lvct-form input[type=\"text\"]')) && !document.querySelector('.lvct-dialog-panel__close')?.disabled"), "打开新建联系人弹窗并完成候选预载");
        await setField("document.querySelector('.lvct-form input[placeholder*=\"姓名\"], .lvct-form input[type=\"text\"]')", c.name);
        await setField("document.querySelector('.lvct-form input[type=\"tel\"]')", c.phone);
        await setField("document.querySelector('.lvct-form input[type=\"date\"]')", c.birthday);
        await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-form__actions button.b3-button--primary:not([disabled])'))"), "新建联系人保存按钮可用");
        await evalJs("document.querySelector('.lvct-form__actions button.b3-button--primary').click()");
        await waitUntil(deadline, async () => {
            const formErr = await evalJs("document.querySelector('.lvct-form [role=\"alert\"]')?.textContent || ''");
            if (formErr) {
                if (/Access is denied/i.test(formErr)) {
                    await pause(400);
                    await evalJs("document.querySelector('.lvct-form__actions button.b3-button--primary:not([disabled])')?.click()");
                    return false;
                }
                throw new Error(`新建联系人 ${c.name} 失败：${formErr}`);
            }
            await focusWorkbenchTab();
            return evalJs(`!document.querySelector('.lvct-form') && [...document.querySelectorAll('.lvct-person-card')].some((el) => el.getBoundingClientRect().width > 0 && el.textContent.includes(${JSON.stringify(c.name)}))`);
        }, `联系人 ${c.name} 卡片渲染`);
    }

    const rosterCheck = await evalJs(`(() => {
        const people = [...document.querySelectorAll('.lvct-people')].find((el) => el.getBoundingClientRect().width > 0);
        const card = [...(people?.querySelectorAll('.lvct-person-card') ?? [])].find((el) => el.textContent.includes('王浩然'));
        const r = card.getBoundingClientRect();
        const main = card.querySelector('.lvct-person-card__main').getBoundingClientRect();
        const sub = card.querySelector('.lvct-person-card__sub').getBoundingClientRect();
        const toolbar = people.querySelector('.lvct-people__toolbar').getBoundingClientRect();
        return {
            toolbarH: Math.round(toolbar.height),
            cardW: Math.round(r.width),
            cardTop: Math.round(r.top),
            cardBottom: Math.round(r.bottom),
            mainW: Math.round(main.width),
            subH: Math.round(sub.height),
            contextClosedByDefault: !document.querySelector('.lvct-workbench__context'),
        };
    })()`);
    assert.ok(rosterCheck.mainW >= 130, `名册卡片姓名区仍被挤压：mainW=${rosterCheck.mainW}px`);
    assert.ok(rosterCheck.subH <= 24, `名册卡片生日副标题未单行展示：subH=${rosterCheck.subH}px`);
    assert.ok(rosterCheck.cardBottom <= 890, `首行联系人卡片未完整落在 900px 首屏内：bottom=${rosterCheck.cardBottom}px`);
    assert.ok(rosterCheck.contextClosedByDefault, "右侧空速览栏未默认收起");
    report.checks.push({ step: "名册新建联系人与首屏卡片几何", ...rosterCheck });
    await shoot("02-real-siyuan-roster.png");
    console.log("  PASS 名册新建联系人与卡片首屏几何核验", JSON.stringify(rosterCheck));

    // 3. 打开王浩然详情：核验一屏核心块、无伪评分、录入忌口红线并核验真实思源文档 SQL 落盘
    await evalJs(`[...document.querySelectorAll('.lvct-person-card')].find((el) => el.getBoundingClientRect().width > 0 && el.textContent.includes('王浩然')).click()`);
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-detail__person-facts .lvct-facts-form'))"), "打开人物详情概览并完成事实区块读取");

    const detailFirstScreen = await evalJs(`(() => {
        const text = document.querySelector('.lvct-detail')?.textContent || '';
        const adv = document.querySelector('.lvct-detail__advanced');
        return {
            noScores: !text.includes('互惠指数') && !text.includes('社交资产') && !text.includes('交往生命周期阶段') && !/\b\d+%/.test(document.querySelector('.lvct-detail__title-row')?.textContent || ''),
            advancedFolded: Boolean(adv && !adv.hasAttribute('open')),
            hasRecordAndFacts: Boolean(document.querySelector('[aria-label="互动备注"]') && document.querySelector('.lvct-detail__person-facts')),
        };
    })()`);
    assert.ok(detailFirstScreen.noScores, "人物详情仍残留无依据评分或温度百分比");
    assert.ok(detailFirstScreen.advancedFolded, "人物详情低频扩展区未默认收起");
    assert.ok(detailFirstScreen.hasRecordAndFacts, "人物详情概览缺少记互动或记住的事区块");

    // 录入「花生严重过敏」忌口红线到人物文档
    await evalJs(`[...document.querySelectorAll('.lvct-detail__person-facts .lvct-facts-form__cats button')].find((b) => b.textContent.includes('喜好/忌口')).click()`);
    await waitUntil(deadline, () => evalJs(`Boolean([...document.querySelectorAll('.lvct-detail__person-facts .lvct-facts-form__cats button')].find((b) => b.textContent.includes('忌口红线')))`), "显示忌口红线开关");
    await evalJs(`[...document.querySelectorAll('.lvct-detail__person-facts .lvct-facts-form__cats button')].find((b) => b.textContent.includes('忌口红线')).click()`);
    await setField("document.querySelector('.lvct-detail__person-facts .lvct-facts-form > input.b3-text-field')", "花生严重过敏");
    await evalJs(`[...document.querySelectorAll('.lvct-detail__person-facts button')].find((b) => b.textContent.includes('记录事实')).click()`);
    await waitUntil(deadline, () => evalJs(`Boolean(document.querySelector('.lvct-detail__micro-prefs-ribbon')?.textContent.includes('花生严重过敏'))`), "忌口红线同步至详情头部微标签");

    await evalJs("document.querySelector('.lvct-premeeting-brief > summary').click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-premeeting-brief[open]')?.textContent.includes('花生严重过敏'))"), "忌口红线同步至会前 30 秒速览卡");
    await shoot("03-real-siyuan-detail-taboo-and-brief.png");

    await kernelApi("/api/sqlite/flushTransaction");
    const factSql = await kernelApi("/api/query/sql", {
        stmt: "SELECT markdown FROM blocks WHERE ial LIKE '%custom-lvct-facts=\"%' LIMIT 5",
    });
    assert.ok(Array.isArray(factSql.data) && factSql.data.some((row) => String(row.markdown).includes("🚫 [忌口红线]") && String(row.markdown).includes("花生严重过敏")), "思源人物文档未真实落盘 🚫 [忌口红线] 受控块");
    report.checks.push({ step: "人物文档忌口红线落盘与会前 30 秒速览联动", sqlVerified: true });
    console.log("  PASS 人物文档忌口红线 SQL 落盘与头部/会前 30 秒速览同步");

    // 4. 记录一笔互动 → 切换到「互动」页签就地编辑 → 整页重载浏览器后核验持久化、墓碑与文档同步
    await setField("document.querySelector('input[aria-label=\"互动备注\"]')", "周三下午咖啡聊合作");
    await evalJs(`[...document.querySelectorAll('.lvct-detail__record button')].find((b) => b.textContent.trim() === '记录').click()`);
    await waitUntil(deadline, () => evalJs(`Boolean([...document.querySelectorAll('.lvct-detail__record button')].find((b) => b.textContent.includes('已记录') && !b.disabled))`), "首次互动记录及回读完成");

    await evalJs("document.querySelector('#lvct-detail-tab-activity').click()");
    await waitUntil(deadline, async () => {
        const ok = await evalJs(`Boolean(document.querySelector('#lvct-detail-panel-activity')?.textContent?.includes('周三下午咖啡聊合作'))`);
        return ok;
    }, "时间线显示新互动").catch(async (e) => {
        const diag = await evalJs(`({
            activeTab: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
            closeGuard: document.querySelector('.lvct-closeguard')?.textContent,
            activityText: document.querySelector('#lvct-detail-panel-activity')?.textContent?.slice(0, 500),
            noteVal: document.querySelector('input[aria-label="互动备注"]')?.value,
            errorText: document.querySelector('.lvct-detail [role="alert"]')?.textContent,
        })`);
        throw new Error(`${e.message} | diag=${JSON.stringify(diag)}`);
    });
    await evalJs("document.querySelector('#lvct-detail-panel-activity button[aria-label^=\"修改 \"]').click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-detail__timeline-edit textarea'))"), "打开互动就地编辑框");
    await setField("document.querySelector('.lvct-detail__timeline-edit select')", "meal");
    await setField("document.querySelector('.lvct-detail__timeline-edit textarea')", "周三晚聚餐敲定下月合作方案");
    await evalJs("document.querySelector('.lvct-detail__timeline-edit button[type=\"submit\"]').click()");
    await waitUntil(deadline, () => evalJs(`!document.querySelector('.lvct-detail__timeline-edit') && document.querySelector('#lvct-detail-panel-activity')?.textContent.includes('周三晚聚餐敲定下月合作方案')`), "互动就地修改保存并刷新");
    await shoot("04-real-siyuan-interaction-amended.png");

    // 整页刷新真实思源桌面浏览器，重新进入核验持久化
    await call("Page.reload", { ignoreCache: false });
    await waitUntil(deadline, () => evalJs("Boolean(window.LvContacts && window.LvContacts.protocol === 2)"), "浏览器整页重载后插件桥恢复");
    await waitUntil(deadline, async () => {
        await focusWorkbenchTab();
        return evalJs("[...document.querySelectorAll('.lvct-workbench')].some((el) => el.getBoundingClientRect().width > 0)");
    }, "重载后打开可见工作台");

    // 5. 首页核验有真实联系人后的一屏「今日行动」位置，并打开「会前速查」大盘核验下钻
    await evalJs("[...document.querySelectorAll('[data-navigation-view=home]')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("[...document.querySelectorAll('.lvct-dash__pre-meeting-btn')].some((el) => el.getBoundingClientRect().width > 0)"), "返回首页");
    const populatedHome = await evalJs(`(() => {
        const dash = [...document.querySelectorAll('.lvct-dash')].find((el) => el.getBoundingClientRect().width > 0);
        const actions = dash?.querySelector('.lvct-dash__actions')?.getBoundingClientRect();
        return { actionsTop: Math.round(actions?.top ?? 9999), actionsBottom: Math.round(actions?.bottom ?? 9999) };
    })()`);
    assert.ok(populatedHome.actionsTop > 0 && populatedHome.actionsTop < 520 && populatedHome.actionsBottom <= 900, `有数据后首页「今日行动」未完整落在 900px 首屏内：${JSON.stringify(populatedHome)}`);
    report.checks.push({ step: "有数据常态首页今日行动一屏位置", ...populatedHome });
    await shoot("05a-real-siyuan-home-populated.png");
    await evalJs("[...document.querySelectorAll('.lvct-dash__pre-meeting-btn')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-premeeting-hub')?.textContent.includes('花生严重过敏'))"), "会前速查大盘读取到人物文档忌口红线");
    await shoot("05-real-siyuan-premeeting-hub.png");

    await evalJs(`[...document.querySelectorAll('.lvct-premeeting-hub .dossier-actions button')].find((b) => b.textContent.includes('查看画像')).click()`);
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-detail')?.textContent.includes('王浩然'))"), "会前速查点击查看画像直接打开人物详情");
    await waitUntil(deadline, async () => {
        await evalJs(`if (document.querySelector('[role="tab"][aria-selected="true"]')?.id !== 'lvct-detail-tab-activity') document.querySelector('#lvct-detail-tab-activity')?.click()`);
        const tl = await evalJs(`document.querySelector('#lvct-detail-panel-activity .lvct-detail__timeline')?.textContent || ''`);
        return tl.includes('周三晚聚餐敲定下月合作方案') && !tl.includes('周三下午咖啡聊合作');
    }, "浏览器重载后修改后的互动持久存在且旧内容未复活");

    const interactionStorePath = path.join(workspace, "data/storage/petal", PLUGIN_NAME, "interaction-events.json");
    const interactionStore = JSON.parse(fs.readFileSync(interactionStorePath, "utf8"));
    assert.equal(interactionStore.events.length, 1, "互动存储应只剩 1 条有效事件");
    assert.equal(interactionStore.tombstones.length, 1, "旧互动事件应已写入墓碑");
    assert.equal(interactionStore.events[0].note, "周三晚聚餐敲定下月合作方案");

    await kernelApi("/api/sqlite/flushTransaction");
    const interSql = await kernelApi("/api/query/sql", {
        stmt: "SELECT markdown FROM blocks WHERE ial LIKE '%custom-lvct-interactions=\"%' LIMIT 5",
    });
    assert.ok(Array.isArray(interSql.data) && interSql.data.some((row) => String(row.markdown).includes("周三晚聚餐敲定下月合作方案") && !String(row.markdown).includes("周三下午咖啡聊合作")), "人物文档往来记录受控块未同步更新为修改后的内容");

    report.checks.push({
        step: "互动就地编辑、浏览器整页重载、墓碑与文档区块同步及会前速查下钻",
        activeEvents: interactionStore.events.length,
        tombstones: interactionStore.tombstones.length,
        docBlockSynced: true,
    });
    console.log("  PASS 互动就地修改、整页重载、墓碑落盘、文档同步与会前速查下钻全链路通过");
    assert.equal(report.consoleErrors.length, 0, `真实浏览器运行期出现未捕获异常：${report.consoleErrors.join("；")}`);
} finally {
    try { cdpSocket?.close(); } catch {}
    if (browserProc) {
        try { await stopIsolatedBrowser(browserProc); } catch {}
    }
    if (browserProfile) {
        try { await removeIsolatedBrowserProfile(browserProfile); } catch {}
    }
    if (createdNotebookId && token) {
        try { await kernelApi("/api/notebook/removeNotebook", { notebook: createdNotebookId }); } catch {}
    }
    if (kernelProc) {
        try {
            await kernelApi("/api/sqlite/flushTransaction").catch(() => null);
            await stopIsolatedBrowser(kernelProc, { requestClose: () => kernelApi("/api/system/exit", { force: true }) });
        } catch {}
    }
    try { fs.rmSync(workspace, { recursive: true, force: true }); } catch {}
    fs.writeFileSync(path.join(ARTIFACT_DIR, "summary.json"), JSON.stringify(report, null, 2) + "\n");
}

console.log(`\n✔ pnpm e2e:isolated 全部通过（内核 v${report.kernelVersion}，零未捕获异常，5 张真实思源桌面截图已输出至 ${ARTIFACT_DIR}）`);
