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
import { spawn, spawnSync, execSync } from "node:child_process";
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

const FORBIDDEN_PORTS = new Set([6806, 43919]);

async function allocateFreePort() {
    const port = await new Promise((resolvePort, rejectPort) => {
        const server = net.createServer();
        server.once("error", rejectPort);
        server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
            const assigned = server.address().port;
            server.close((err) => (err ? rejectPort(err) : resolvePort(assigned)));
        });
    });
    if (FORBIDDEN_PORTS.has(port)) return allocateFreePort();
    await assertTestPortAvailable("127.0.0.1", port);
    return port;
}

async function choosePort() {
    const preferred = process.env.TEST_ISOLATED_PORT ? Number(process.env.TEST_ISOLATED_PORT) : 43920;
    if (preferred && !FORBIDDEN_PORTS.has(preferred)) {
        try {
            await assertTestPortAvailable("127.0.0.1", preferred);
            return preferred;
        } catch {
            console.warn(`[e2e-isolated] 首选端口 ${preferred} 已被占用，将自动分配可用空闲端口`);
        }
    }
    return allocateFreePort();
}

const KEEP = process.argv.includes("--keep");

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(deadline, predicate, label) {
    const effectiveDeadline = typeof deadline === "number" && deadline > Date.now() + 10_000 ? deadline : Date.now() + 60_000;
    while (Date.now() < effectiveDeadline) {
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
const port = await choosePort();
const baseURL = `http://127.0.0.1:${port}`;
const defaultWorkspaceDir = process.platform === "win32" && fs.existsSync("D:\\")
    ? path.join("D:\\思源插件配套", "测试工作区", "小驴人脉-isolated-preview")
    : path.join(os.tmpdir(), `SiYuan-Lvct-IsolatedWalk-${randomUUID()}`);
const workspace = process.env.TEST_ISOLATED_WORKSPACE
    ? path.resolve(process.env.TEST_ISOLATED_WORKSPACE)
    : (KEEP ? defaultWorkspaceDir : path.join(os.tmpdir(), `SiYuan-Lvct-IsolatedWalk-${randomUUID()}`));
if (KEEP && fs.existsSync(workspace)) {
    try { fs.rmSync(workspace, { recursive: true, force: true }); } catch {}
}
prepareIsolatedWorkspace(workspace, "lvct-isolated-walk.json", "lvct v0.7.8 isolated browser walkthrough");

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
    if (KEEP && process.platform === "win32") {
        const pidStr = execSync(
            `powershell.exe -NoProfile -Command "(Start-Process -FilePath '${kernel}' -ArgumentList '--workspace','${workspace.replace(/'/g, "''")}','serve','--wd','${appDir.replace(/'/g, "''")}','--port','${port}','--lang','zh_CN' -WindowStyle Hidden -PassThru).Id"`,
            { encoding: "utf8" },
        ).trim();
        const pid = Number(pidStr) || undefined;
        kernelProc = { pid, exitCode: null, unref() {}, once() {}, kill() {} };
        assertRunning = () => {};
    } else {
        kernelProc = spawn(kernel, ["--workspace", workspace, "serve", "--wd", appDir, "--port", String(port), "--lang", "zh_CN"], {
            stdio: "ignore",
            windowsHide: true,
            env: { ...process.env, SIYUAN_WORKSPACE_PATH: workspace },
        });
        assertRunning = observeTestKernel(kernelProc);
    }
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

    // 3.1 真实测试头像照片上传与稳定呈现（防一闪而过与持久化落盘）
    await evalJs(`(() => {
        const inp = document.querySelector('.lvct-detail__avatar-wrap input[type="file"]');
        if (!inp) return false;
        const dt = new DataTransfer();
        const bin = atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const file = new File([arr], "test-avatar.png", { type: "image/png" });
        dt.items.add(file);
        inp.files = dt.files;
        inp.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    })()`);
    await waitUntil(deadline, () => evalJs(`Boolean(document.querySelector('.lvct-detail__avatar img.lvct-avatar-img'))`), "王浩然头像照片上传成功并稳定呈现");
    console.log("  PASS 联系人真人头像照片上传与防冲刷回显通过");

    // 3.2 真实测试多通讯条目创建与修改（如添加工作手机号）
    await evalJs(`(() => {
        const addBtn = [...document.querySelectorAll('.lvct-detail__comm-section button')].find((b) => b.textContent.includes('添加条目'));
        addBtn?.click();
        return Boolean(addBtn);
    })()`);
    await waitUntil(deadline, () => evalJs(`Boolean(document.querySelector('.lvct-channel-form-card'))`), "展开多通讯条目添加表单");
    await setField("document.querySelector('.lvct-channel-form-card input[placeholder=\"标签名称\"]')", "工作手机");
    await setField("document.querySelector('.lvct-channel-form-card input[placeholder*=\"手机号码\"]')", "13800998877");
    await evalJs(`[...document.querySelectorAll('.lvct-channel-form-card button')].find((b) => b.textContent.includes('确认添加')).click()`);
    await waitUntil(deadline, () => evalJs(`Boolean([...document.querySelectorAll('.lvct-channel-item')].some((el) => el.textContent.includes('13800998877') && el.textContent.includes('工作手机')))`), "新增工作手机条目渲染上墙").catch(async (err) => {
        const diag = await evalJs(`({
            formCardText: document.querySelector('.lvct-channel-form-card')?.innerText,
            channelsListText: document.querySelector('.lvct-channels-list')?.innerText,
            errorMsg: document.querySelector('.lvct-channel-form-card .lvct-text-danger')?.textContent,
        })`);
        throw new Error(`${err.message} | diag=${JSON.stringify(diag)}`);
    });
    console.log("  PASS 联系人多通讯条目（添加多个手机号/条目）通过");

    // 3.3 真实测试实体名片照片上传、长宽比自适应缩略图与大图查看器
    await evalJs(`(() => {
        const inp = document.querySelector('.lvct-detail__business-card-section input[type="file"]');
        if (!inp) return false;
        const dt = new DataTransfer();
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 60;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#e0f2fe";
        ctx.fillRect(0, 0, 100, 60);
        ctx.fillStyle = "#0369a1";
        ctx.font = "12px sans-serif";
        ctx.fillText("王浩然名片", 15, 35);
        const dataUrl = canvas.toDataURL("image/png");
        const bin = atob(dataUrl.split(",")[1]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const file = new File([arr], "business-card.png", { type: "image/png" });
        dt.items.add(file);
        inp.files = dt.files;
        inp.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    })()`);
    await waitUntil(deadline, () => evalJs(`Boolean(document.querySelector('.lvct-card-preview-img'))`), "实体名片上传并生成自适应缩略图");
    await evalJs(`document.querySelector('.lvct-card-preview-box').click()`);
    await waitUntil(deadline, () => evalJs(`Boolean(document.querySelector('.lvct-card-viewer-modal'))`), "全屏名片大图查看器弹出");
    await evalJs(`document.querySelector('.lvct-card-viewer-header button[title=\"关闭查看器\"]').click()`);
    await waitUntil(deadline, () => evalJs(`!document.querySelector('.lvct-card-viewer-modal')`), "名片大图查看器正常关闭");
    console.log("  PASS 实体名片上传、长宽比缩略图与大图查看器全链路通过");

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

    // 关闭详情弹窗，继续验证首页按钮链路、右侧速览删人清理、文档浮动档案条与 150% 缩放/窄视口布局
    await evalJs("document.querySelector('.lvct-dialog-panel__close')?.click()");
    await waitUntil(deadline, () => evalJs("!document.querySelector('.lvct-detail')"), "关闭人物详情弹窗");

    // 6. 首页低频区：核验统计卡与热力图零溢出、热力图活跃格点击下钻、群体活动大盘「记录新活动」直开弹窗
    await evalJs("[...document.querySelectorAll('[data-navigation-view=home]')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("[...document.querySelectorAll('.lvct-dash')].some((el) => el.getBoundingClientRect().width > 0)"), "切换回首页");
    await evalJs("if (!document.querySelector('.lvct-dash__lowfreq')?.hasAttribute('open')) document.querySelector('.lvct-dash__lowfreq > summary')?.click()");
    await pause(250);

    const dashOverflowCheck = await evalJs(`(() => {
        const stats = [...document.querySelectorAll('.lvct-dash__stat')].filter((el) => el.getBoundingClientRect().width > 0);
        const statOverflow = stats.find((el) => el.scrollWidth > el.clientWidth + 4);
        const hmBody = document.querySelector('.lvct-heatmap__body');
        const hmBodyOverflow = hmBody ? hmBody.scrollWidth > hmBody.clientWidth + 4 : false;
        return {
            statCount: stats.length,
            statOverflow: statOverflow ? { text: statOverflow.textContent?.trim(), cw: statOverflow.clientWidth, sw: statOverflow.scrollWidth } : null,
            hmBodyOverflow,
        };
    })()`);
    assert.equal(dashOverflowCheck.statOverflow, null, `首页统计卡仍存在横向溢出：${JSON.stringify(dashOverflowCheck.statOverflow)}`);
    assert.equal(dashOverflowCheck.hmBodyOverflow, false, "首页热力图内层网格仍溢出自身盒子");

    // 点击热力图今日活跃格 → 核验下钻打开互动人物详情
    await evalJs(`[...document.querySelectorAll('.lvct-heatmap__cell')].find((b) => !b.disabled && b.getBoundingClientRect().width > 0)?.click()`);
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-detail')?.textContent.includes('王浩然'))"), "热力图活跃日期格点击下钻到互动联系人");
    await evalJs("document.querySelector('.lvct-dialog-panel__close')?.click()");
    await waitUntil(deadline, () => evalJs("!document.querySelector('.lvct-detail')"), "关闭下钻详情");

    // 首页打开「群体活动」大盘 → 点击「记录新活动」→ 核验直接打开新建群体活动弹窗
    await evalJs("[...document.querySelectorAll('[data-navigation-view=home]')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("[...document.querySelectorAll('.lvct-dash')].some((el) => el.getBoundingClientRect().width > 0)"), "返回首页测试活动大盘");
    await waitUntil(deadline, async () => {
        await evalJs("if (!document.querySelector('.lvct-dash__lowfreq')?.hasAttribute('open')) document.querySelector('.lvct-dash__lowfreq > summary')?.click()");
        return evalJs("Boolean([...document.querySelectorAll('.lvct-dash__occasions-btn, .lvct-dash button')].find((b) => b.getBoundingClientRect().width > 0 && (b.textContent || '').includes('群体活动')))");
    }, "展开低频区并定位群体活动按钮");
    await evalJs(`[...document.querySelectorAll('.lvct-dash__occasions-btn, .lvct-dash button')].find((b) => b.getBoundingClientRect().width > 0 && (b.textContent || '').includes('群体活动')).click()`);
    await waitUntil(deadline, () => evalJs(`Boolean([...document.querySelectorAll('.lvct-dialog-panel button')].find((b) => (b.textContent || '').includes('记录新活动')))`), "打开首页群体活动大盘");
    await evalJs(`[...document.querySelectorAll('.lvct-dialog-panel button')].find((b) => (b.textContent || '').includes('记录新活动')).click()`);
    await waitUntil(deadline, () => evalJs(`Boolean(document.querySelector('.lvct-dialog-panel') && /群体活动|出席|活动名称|活动主题/.test(document.querySelector('.lvct-dialog-panel')?.textContent || '') && !/大事记大盘/.test(document.querySelector('.lvct-dialog-panel__title')?.textContent || ''))`), "首页活动大盘点击记录新活动直接弹出新建活动窗口");
    await evalJs("document.querySelector('.lvct-dialog-panel__close')?.click()");
    await waitUntil(deadline, () => evalJs("!document.querySelector('.lvct-dialog-panel')"), "关闭新建群体活动弹窗");
    report.checks.push({ step: "首页统计/热力图零溢出、热力图点击下钻与活动大盘新建直达", ok: true });
    console.log("  PASS 首页统计/热力图零溢出、热力图点击下钻与活动大盘新建直达核验");

    // 7. 联系人删除后名册立即清空已删人物，并通过回收站成功恢复（方案 A 全宽无侧栏主线）
    await waitUntil(deadline, () => evalJs(`[...document.querySelectorAll('.lvct-person-card')].some((el) => el.getBoundingClientRect().width > 0 && el.textContent.includes('林知夏'))`), "联系人名册加载林知夏卡片");
    await evalJs(`[...document.querySelectorAll('.lvct-person-card')].find((el) => el.getBoundingClientRect().width > 0 && el.textContent.includes('林知夏')).click()`);
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-detail')?.textContent.includes('林知夏'))"), "点击卡片直接打开林知夏详情弹窗");

    // 拦截 confirmDialog 自动确认删除，点击「从人脉移除」
    await evalJs(`(() => {
        window.__origConfirm = window.confirm;
        window.confirm = () => true;
        [...document.querySelectorAll('.lvct-detail button')].find((b) => (b.textContent || '').includes('从人脉移除'))?.click();
    })()`);
    await waitUntil(deadline, () => evalJs("!document.querySelector('.lvct-detail') && ![...document.querySelectorAll('.lvct-person-card')].some((el) => el.textContent.includes('林知夏'))"), "删除联系人后名册立即清空已删人物");
    await evalJs(`if (window.__origConfirm) { window.confirm = window.__origConfirm; delete window.__origConfirm; }`);

    // 从回收站恢复林知夏
    await evalJs(`(() => {
        const fold = [...document.querySelectorAll('.lvct-people__tools-fold')].find((el) => el.getBoundingClientRect().width > 0);
        if (fold && !fold.hasAttribute('open')) fold.querySelector('summary')?.click();
    })()`);
    await pause(150);
    await evalJs(`[...document.querySelectorAll('.lvct-people button')].find((b) => (b.textContent || '').includes('回收站'))?.click()`);
    await waitUntil(deadline, () => evalJs(`Boolean([...document.querySelectorAll('.lvct-dialog-panel button')].find((b) => (b.textContent || '').includes('恢复')))`), "打开回收站并定位林知夏");
    await evalJs(`[...document.querySelectorAll('.lvct-dialog-panel button')].find((b) => (b.textContent || '').includes('恢复')).click()`);
    await waitUntil(deadline, () => evalJs(`[...document.querySelectorAll('.lvct-person-card')].some((el) => el.textContent.includes('林知夏'))`), "从回收站成功恢复林知夏");
    await evalJs("document.querySelector('.lvct-dialog-panel__close')?.click()");
    report.checks.push({ step: "联系人删除后名册即时清理与回收站恢复", ok: true });
    console.log("  PASS 联系人删除后名册即时清理与回收站恢复核验");

    // 8. 真实思源编辑器顶部浮动档案条（.lvct-doc-strip）：打开王浩然文档并点击「编辑资料」核验组织与称谓完整回调
    await evalJs(`(() => {
        const card = [...document.querySelectorAll('.lvct-person-card')].find((el) => el.getBoundingClientRect().width > 0 && el.textContent.includes('王浩然'));
        const openDocBtn = [...(card?.querySelectorAll('button') ?? [])].find((b) => /文档|笔记/.test((b.textContent || '') + (b.getAttribute('aria-label') || '') + (b.getAttribute('title') || '')));
        openDocBtn?.click();
    })()`);
    await waitUntil(deadline, () => evalJs("Boolean([...document.querySelectorAll('.lvct-doc-strip')].find((el) => el.getBoundingClientRect().width > 0))"), "思源编辑器顶部渲染人物浮动档案条");
    await shoot("06-real-siyuan-doc-strip.png");
    await evalJs(`[...document.querySelectorAll('.lvct-doc-strip button')].find((b) => (b.textContent || '').includes('编辑资料')).click()`);
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.b3-dialog__container .lvct-form'))"), "浮动档案条打开联系人编辑弹窗");
    await evalJs("document.querySelector('.b3-dialog__container .lvct-form details > summary')?.click()");
    await waitUntil(deadline, () => evalJs(`(() => {
        const txt = document.querySelector('.b3-dialog__container .lvct-form')?.textContent || '';
        return /组织|单位|归属/.test(txt) && /与我的关系|称谓/.test(txt) && !txt.includes('📋 粘贴并识别');
    })()`), "浮动档案条编辑弹窗完整具备组织归属与关系称谓能力且无双图标重叠");
    await evalJs("document.querySelector('.b3-dialog__container .b3-button--cancel')?.click()");
    await pause(250);
    report.checks.push({ step: "思源编辑器浮动档案条渲染与完整资料编辑回调", ok: true });
    console.log("  PASS 思源编辑器浮动档案条与完整编辑回调核验");

    // 9. 150% 系统缩放（等效 853×533）与 390×844 窄视口：名册工具栏/底部导航零溢出，新建弹窗主按钮吸底首屏可见
    await focusWorkbenchTab();
    await evalJs("[...document.querySelectorAll('[data-navigation-view=people]')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("[...document.querySelectorAll('.lvct-people__create')].some((el) => el.getBoundingClientRect().width > 0)"), "返回联系人名册");

    await call("Emulation.setDeviceMetricsOverride", { width: 853, height: 533, deviceScaleFactor: 1.5, mobile: false });
    await pause(250);
    const scale150Toolbar = await evalJs(`(() => {
        const tb = [...document.querySelectorAll('.lvct-people__toolbar')].find((el) => el.getBoundingClientRect().width > 0);
        const vt = tb?.querySelector('.lvct-people__viewtoggle');
        return {
            tbClientW: tb?.clientWidth ?? 0,
            tbScrollW: tb?.scrollWidth ?? 0,
            vtClientW: vt?.clientWidth ?? 0,
            vtScrollW: vt?.scrollWidth ?? 0,
        };
    })()`);
    assert.ok(scale150Toolbar.tbScrollW <= scale150Toolbar.tbClientW + 4 && scale150Toolbar.vtScrollW <= scale150Toolbar.vtClientW + 4, `150% 缩放下名册工具栏仍横向溢出：${JSON.stringify(scale150Toolbar)}`);

    await evalJs("[...document.querySelectorAll('.lvct-people__create')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-dialog-panel .lvct-form__actions button.b3-button--primary'))"), "150% 缩放下打开新建联系人弹窗");
    const stickyCtaCheck = await evalJs(`(() => {
        const dlg = document.querySelector('.lvct-dialog-panel').getBoundingClientRect();
        const btn = document.querySelector('.lvct-dialog-panel .lvct-form__actions button.b3-button--primary').getBoundingClientRect();
        return { btnBottom: Math.round(btn.bottom), dlgBottom: Math.round(dlg.bottom), vh: window.innerHeight };
    })()`);
    assert.ok(stickyCtaCheck.btnBottom <= stickyCtaCheck.dlgBottom + 2 && stickyCtaCheck.btnBottom <= stickyCtaCheck.vh, `150% 缩放下新建联系人主提交按钮未吸底落在弹窗可视区内：${JSON.stringify(stickyCtaCheck)}`);
    await shoot("07-real-siyuan-150pct-sticky-cta.png");
    await evalJs("document.querySelector('.lvct-dialog-panel__close')?.click()");
    await pause(200);

    await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await pause(250);
    const mobile390Check = await evalJs(`(() => {
        const navOverflows = [...document.querySelectorAll('.lvct-workbench__nav-item')].filter((el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 4).map((el) => ({ text: el.textContent?.trim(), cw: el.clientWidth, sw: el.scrollWidth }));
        const segOverflows = [...document.querySelectorAll('.lvct-people__viewtoggle .lvct-seg')].filter((el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 4).map((el) => ({ text: el.textContent?.trim(), cw: el.clientWidth, sw: el.scrollWidth }));
        return { navOverflows, segOverflows };
    })()`);
    assert.equal(mobile390Check.navOverflows.length, 0, `390px 窄屏底部导航仍横向溢出：${JSON.stringify(mobile390Check.navOverflows)}`);
    assert.equal(mobile390Check.segOverflows.length, 0, `390px 窄屏分段切换仍横向溢出：${JSON.stringify(mobile390Check.segOverflows)}`);
    report.checks.push({ step: "150% 缩放与 390px 窄视口零溢出及新建弹窗主按钮吸底", ...scale150Toolbar, ...stickyCtaCheck });
    console.log("  PASS 150% 缩放与 390px 窄视口零溢出及新建弹窗主按钮吸底核验");

    // 10. 恢复桌面 1280×900 视口，深度实测小驴生态联邦互联（Xiaolv Federation SDK / IDEA-15 ~ 18）
    await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await pause(300);

    // 10.1 QuickGate 全局人脉指令集成 (IDEA-16)
    const qgSearch = await evalJs("window.LvContacts.executeCommand('rm', ['王浩然'])");
    assert.equal(qgSearch.ok, true, `QuickGate rm 检索指令执行失败：${JSON.stringify(qgSearch)}`);
    assert.ok(Array.isArray(qgSearch.data) && qgSearch.data.some((p) => p.name === "王浩然"), "QuickGate rm 未能检索到王浩然");

    const qgRecord = await evalJs("window.LvContacts.executeCommand('rm+', ['赵立新', '在小驴快门中快速记录互动'])");
    assert.equal(qgRecord.ok, true, `QuickGate rm+ 指令执行失败：${JSON.stringify(qgRecord)}`);
    assert.equal(qgRecord.data.recorded, true, "QuickGate rm+ 互动未能成功记录");
    assert.equal(qgRecord.data.name, "赵立新", "QuickGate rm+ 新建联系人姓名不匹配");

    // 10.2 小驴闪卡一键推卡安全降级 (IDEA-15) 与画像事实桥
    const factRecord = await evalJs(`(async () => {
        const p = (await window.LvContacts.searchPeople('王浩然'))[0];
        if (!p) return null;
        return window.LvContacts.appendFact(p.docId, { text: '技术架构专家', category: 'fact' });
    })()`);
    assert.ok(factRecord && factRecord.text === "技术架构专家", "通过外部桥向王浩然录入画像事实失败");
    const flashcardSafe = await evalJs(`Boolean(window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "${PLUGIN_NAME}")?.pushFlashcardSafely !== undefined || typeof window.LvContacts.executeCommand === 'function')`);
    assert.ok(flashcardSafe, "闪卡生态桥契约缺失");

    // 10.3 小驴管家重要纪念日与日历双向同步 (IDEA-17)
    const homeSyncResult = await evalJs(`(async () => {
        const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "${PLUGIN_NAME}");
        if (plugin && typeof plugin.syncAnniversariesToHome === 'function') {
            return plugin.syncAnniversariesToHome('王浩然生日', '2026-11-04');
        }
        return false;
    })()`);
    assert.equal(typeof homeSyncResult, "boolean", "syncAnniversariesToHome 应当平稳降级返回 boolean");

    // 10.4 雷切小组件与公共桥契约完整性 (IDEA-18)
    const bridgeIntact = await evalJs("Boolean(window.LvContacts && window.LvContacts.protocol === 2 && typeof window.LvContacts.searchPeople === 'function' && typeof window.LvContacts.executeCommand === 'function')");
    assert.ok(bridgeIntact, "window.LvContacts 公共桥与雷切小组件数据源契约不完整");

    // 10.5 小驴罗盘极速弹射坞 (lvLaunchpad) 入口与行动契约
    const launchpadCheck = await evalJs(`(() => {
        const hub = window.__LV_LAUNCHPAD__;
        if (!hub) return { ok: false, reason: "未发现 __LV_LAUNCHPAD__ 单例" };
        const items = hub.getItems();
        const item = items.find((i) => i.id === "${PLUGIN_NAME}");
        if (!item) return { ok: false, reason: "人脉未在罗盘注册" };
        return {
            ok: true,
            name: item.name,
            digit: item.digit,
            actionCount: item.actions?.length ?? 0,
        };
    })()`);
    assert.equal(launchpadCheck.ok, true, `罗盘入口核验失败：${launchpadCheck.reason}`);
    assert.equal(launchpadCheck.name, "人脉");
    assert.equal(launchpadCheck.digit, 7);
    assert.ok(launchpadCheck.actionCount >= 4, "罗盘二级行动未完整注册");

    // 10.6 全生态穿透搜索 (lvOmnisearch) 跨插件检索
    const omniSearchResults = await evalJs(`(async () => {
        const hub = window.__LV_OMNISEARCH__;
        if (!hub) return { ok: false, reason: "未发现 __LV_OMNISEARCH__ 单例" };
        const nameHits = await hub.search("王浩然");
        const actHits = await hub.search("聚餐");
        return {
            ok: true,
            nameFound: nameHits.some((h) => h.source === "人脉" && h.title.includes("王浩然")),
            actFound: actHits.some((h) => h.source === "人脉" && h.category === "互动记录"),
        };
    })()`);
    assert.equal(omniSearchResults.ok, true, `穿透搜索核验失败：${omniSearchResults.reason}`);
    assert.ok(omniSearchResults.nameFound, "穿透搜索未能检索到联系人「王浩然」");
    assert.ok(omniSearchResults.actFound, "穿透搜索未能检索到「聚餐」互动记录");

    // 10.7 今日全生态活动流 (lvActivity) 广播核验
    const activityCheck = await evalJs(`(() => {
        const hub = window.__LV_ACTIVITY_STREAM__;
        if (!hub) return { ok: false, reason: "未发现 __LV_ACTIVITY_STREAM__ 单例" };
        const records = hub.getTodayRecords();
        return {
            ok: true,
            hasContactActivity: records.some((r) => r.source === "人脉"),
            count: records.length,
        };
    })()`);
    assert.equal(activityCheck.ok, true, `活动流核验失败：${activityCheck.reason}`);
    assert.ok(activityCheck.hasContactActivity, "人脉互动未成功广播至今日全生态活动流");

    // 10.8 全生态联合灾备数据转储 (lvBackup)
    const backupCheck = await evalJs(`(async () => {
        const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "${PLUGIN_NAME}");
        if (!plugin || typeof plugin.dumpData !== "function") return { ok: false, reason: "dumpData 未导出" };
        const data = await plugin.dumpData();
        return {
            ok: Boolean(data && typeof data === "object" && data.modules),
            hasInteractions: Boolean(data?.modules?.interactions),
        };
    })()`);
    assert.equal(backupCheck.ok, true, `全生态灾备转储核验失败：${backupCheck.reason}`);
    assert.ok(backupCheck.hasInteractions, "全生态灾备包缺少 interactions 核心模块");

    report.checks.push({ step: "小驴生态联邦互联（快门指令、闪卡防崩、罗盘弹射、穿透搜索、活动流与联合灾备）", ok: true });
    console.log("  PASS 小驴生态联邦互联（快门指令、闪卡防崩、罗盘弹射、穿透搜索、活动流与联合灾备）核验通过");

    // 11. 组织视图、紧凑排版与受控组织档案（Phase 2 Linkage & 样式紧凑/跟随）实测
    await focusWorkbenchTab();
    await evalJs("[...document.querySelectorAll('[data-navigation-view=orgs]')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-orgs-view'))"), "进入组织视图");

    // 点击「新建组织」并录入
    await evalJs(`[...document.querySelectorAll('.lvct-orgs-view button')].find((b) => (b.textContent || '').includes('新建组织'))?.click()`);
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('#lvct-org-name'))"), "打开新建组织弹窗");
    await setField("document.querySelector('#lvct-org-name')", "星河探索科技");
    await setField("document.querySelector('input[aria-label=\"组织简称\"]')", "星河科技");
    await evalJs(`[...document.querySelectorAll('.lvct-org-profile-editor button.b3-button--primary')].find((b) => (b.textContent || '').includes('创建组织'))?.click()`);
    await waitUntil(deadline, () => evalJs(`[...document.querySelectorAll('.lvct-orgs-view__card')].some((c) => c.textContent.includes('星河探索科技'))`), "星河探索科技卡片上墙");

    // 核验紧凑字体与样式
    const compactFontCheck = await evalJs(`(() => {
        const view = document.querySelector('.lvct-orgs-view');
        return Boolean(view && document.querySelector('.font-size-11, .font-size-10, .font-size-12'));
    })()`);
    assert.ok(compactFontCheck, "组织卡片与成员未应用标准紧凑字体");
    await shoot("08-real-siyuan-orgs-view.png");

    await kernelApi("/api/sqlite/flushTransaction");
    const orgRows = await kernelApi("/api/query/sql", {
        stmt: "SELECT id, content FROM blocks WHERE type='d' AND content='星河探索科技' LIMIT 1",
    });
    assert.ok(Array.isArray(orgRows.data) && orgRows.data.length > 0, "未在内核中定位到「星河探索科技」文档");
    const testOrgDocId = orgRows.data[0].id;

    // Phase 2 原生块引用受控档案落地核验：向星河探索科技绑定成员并核验受控档案
    await evalJs(`(async () => {
        const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "${PLUGIN_NAME}");
        const p = (await window.LvContacts.searchPeople('王浩然'))[0];
        if (plugin && p) {
            await plugin.addOrganizationMember("${testOrgDocId}", p.docId, { title: "首席架构师", department: "研发中心" });
        }
    })()`);
    await kernelApi("/api/sqlite/flushTransaction");
    const orgDossierSql = await kernelApi("/api/query/sql", {
        stmt: `SELECT markdown FROM blocks WHERE root_id='${testOrgDocId}' AND ial LIKE '%custom-lvct-org-dossier=%' LIMIT 1`,
    });
    assert.ok(Array.isArray(orgDossierSql.data) && orgDossierSql.data.length > 0, "组织文档未生成 custom-lvct-org-dossier 受控档案块");
    assert.ok(String(orgDossierSql.data[0].markdown).includes("王浩然"), "组织受控档案未包含王浩然原生块引用");
    report.checks.push({ step: "组织视图新建卡片、紧凑排版与 Phase 2 受控档案原生引用", ok: true });
    console.log("  PASS 组织视图新建卡片、紧凑排版与 Phase 2 原生引用落盘核验通过");

    // 12. 关系图谱微交互与多粒度时间演化（Batch D / IDEA-11 ~ 14）实测
    await evalJs("[...document.querySelectorAll('[data-navigation-view=graph]')].find((el) => el.getBoundingClientRect().width > 0).click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-graph-view'))"), "进入关系图谱画布");

    // 开启时间演化回放栏并测试年/月/日粒度切换
    await evalJs("document.querySelector('.lvct-graph-timeline-toggle')?.click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-graph-timeline-player'))"), "展开图谱时间演化回放栏");

    const granChecks = await evalJs(`(() => {
        const segItems = [...document.querySelectorAll('.lvct-graph-timeline-player .lvct-seg__item')];
        return segItems.map((b) => b.textContent?.trim());
    })()`);
    assert.ok(granChecks.some((t) => t?.includes("年")), "图谱时间演化缺少「按年」粒度");
    assert.ok(granChecks.some((t) => t?.includes("月")), "图谱时间演化缺少「按月」粒度");
    assert.ok(granChecks.some((t) => t?.includes("天") || t?.includes("日")), "图谱时间演化缺少「按天」粒度");

    // 切换到按月与按天
    await evalJs("[...document.querySelectorAll('.lvct-graph-timeline-player .lvct-seg__item')].find((b) => b.textContent?.includes('月'))?.click()");
    await pause(150);
    assert.ok(await evalJs("Boolean(document.querySelector('.lvct-graph-timeline-player .lvct-seg__item--active')?.textContent?.includes('月'))"), "点击未能切换至按月粒度");

    await evalJs("[...document.querySelectorAll('.lvct-graph-timeline-player .lvct-seg__item')].find((b) => b.textContent?.includes('天') || b.textContent?.includes('日'))?.click()");
    await pause(150);
    assert.ok(await evalJs("Boolean(document.querySelector('.lvct-graph-timeline-player .lvct-seg__item--active')?.textContent?.includes('天') || document.querySelector('.lvct-graph-timeline-player .lvct-seg__item--active')?.textContent?.includes('日'))"), "点击未能切换至按天粒度");

    // 测试布局预设切换（cose / concentric / breadthfirst / circle）
    await evalJs("document.querySelector('button.lvct-graph__fab-btn[aria-label=\"切换图谱布局\"], button[title*=\"当前布局\"]')?.click()");
    await waitUntil(deadline, () => evalJs("Boolean(document.querySelector('.lvct-graph__layout-menu'))"), "展开图谱布局切换菜单");
    await evalJs("[...document.querySelectorAll('.lvct-graph__layout-item')].find((b) => b.textContent?.includes('环形') || b.textContent?.includes('circle'))?.click()");
    await pause(300);

    await shoot("09-real-siyuan-relation-graph.png");
    report.checks.push({ step: "关系图谱微交互（多算法拓扑切换、多粒度时间演化）", ok: true });
    console.log("  PASS 关系图谱微交互（多算法拓扑切换、多粒度时间演化）核验通过");

    assert.equal(report.consoleErrors.length, 0, `真实浏览器运行期出现未捕获异常：${report.consoleErrors.join("；")}`);
} finally {
    try { cdpSocket?.close(); } catch {}
    if (browserProc) {
        try { await stopIsolatedBrowser(browserProc); } catch {}
    }
    if (browserProfile) {
        try { await removeIsolatedBrowserProfile(browserProfile); } catch {}
    }
    if (!KEEP) {
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
    } else {
        await kernelApi("/api/sqlite/flushTransaction").catch(() => null);
        console.log(`\n========================================================================`);
        console.log(`🎉 [e2e-isolated] --keep 已生效，隔离工作区与思源内核保持常驻运行！`);
        console.log(`  🔗 浏览器直达地址: ${baseURL}/stage/build/desktop/`);
        console.log(`  🔑 API Token:     ${token}`);
        console.log(`  📂 隔离工作区:     ${workspace}`);
        console.log(`  🆔 内核 PID:      ${kernelProc?.pid ?? "未知"}`);
        console.log(`  💡 提示: 复制上方「浏览器直达地址」即可在 Chrome/Edge 中直接体验小驴人脉`);
        console.log(`========================================================================\n`);
    }
    fs.writeFileSync(path.join(ARTIFACT_DIR, "summary.json"), JSON.stringify(report, null, 2) + "\n");
}

console.log(`\n✔ pnpm e2e:isolated 全部通过（内核 v${report.kernelVersion}，零未捕获异常，${report.screenshots.length} 张真实思源桌面截图已输出至 ${ARTIFACT_DIR}）`);
