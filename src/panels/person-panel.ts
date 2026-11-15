/**
 * 人物文档档案条：打开联系人的人物文档时，在标题下方注入一条轻量档案
 * （电话/微信/生日/分组/标签 + 编辑资料按钮）。
 * 判定走名册缓存（rootID 是否为联系人文档），非联系人文档不注入、零 DOM 干扰。
 * 本模块是 protyle DOM 与组件层之间的 glue，位于 panels/（视图层之上）。
 */
import { getRoster, invalidateRoster } from "../services/roster";
import { loadInteractionStoreStrict } from "../data/interactions";
import type { InteractionEvent } from "../domain/interactions";
import { loadFollowUpStoreStrict } from "../data/followups";
import { lastInteractionByPerson } from "../domain/interactions";
import { buildMeetingBriefing } from "../domain/briefing";
import type { MeetingBriefingItem } from "../domain/briefing";
import { getOrgDisplayForDoc, scanOrganizations } from "../services/org";
import type { OrganizationSummary } from "../domain/organization-scan";
import { formatBirthdayDisplay, nextBirthday } from "../domain/occasions";
import { copyPlainText } from "../shared/clipboard";
import { svelteDialog } from "../libs/dialog";
import { emitDataChanged, requestPersonNavigation, requestWorkbenchNavigation, subscribeDataChanged } from "../libs/data-events";
import PersonEditDialog from "../components/people/PersonEditDialog.svelte";
import QuickRecordDialog from "../components/people/QuickRecordDialog.svelte";
import { translateText } from "../domain/translation";
import { extractNormalizedRegion } from "../domain/region";
import { CITY_TOPIC_ATTR } from "../domain/city-topic";
import { querySql, assertSafeBlockId } from "../api/client";
import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model";
import type { ContactSummary } from "../domain/person";
import type { LifecycleToken } from "../domain/lifecycle";

const STRIP_CLASS = "lvct-doc-strip";
let stripOverflowSequence = 0;
const stripRequests = new WeakMap<HTMLElement, number>();
/** FUNC-01.7-a：已注入档案条的活跃文档登记——数据变化时原地重渲染（不整页刷新） */
const activeStrips = new Map<HTMLElement, { context: PanelContext; protyle: ProtyleLike; rootId: string }>();
let dataSubscription: (() => void) | null = null;
const lifecycleCleanups = new Map<Plugin, () => void>();

export interface PanelContext {
    plugin: Plugin;
    settings: ContactsSettings | null;
    i18n?: Record<string, string>;
    lifecycleToken?: LifecycleToken;
}

interface ProtyleLike {
    element: HTMLElement;
    block?: { rootID?: string };
}

type ProtyleEvent = { detail?: { protyle?: ProtyleLike } };

/** protyle 事件入口（loaded-protyle-static/dynamic、switch-protyle） */
export function handleProtyleEvent(context: PanelContext, event: ProtyleEvent): void {
    if (context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
    if (context.lifecycleToken && !lifecycleCleanups.has(context.plugin)) {
        lifecycleCleanups.set(context.plugin, context.lifecycleToken.onDispose(() => disposePersonPanels(context.plugin)));
    }
    ensureDataSubscription();
    const protyle = event.detail?.protyle;
    if (!protyle?.element || !context.settings) return;
    const rootId = protyle.block?.rootID ?? "";
    void updateStrip(context, protyle, rootId);
}

export function disposePersonPanels(plugin: Plugin): void {
    const detach = lifecycleCleanups.get(plugin);
    lifecycleCleanups.delete(plugin);
    detach?.();
    for (const [element, entry] of activeStrips) {
        if (entry.context.plugin !== plugin) continue;
        stripRequests.set(element, (stripRequests.get(element) ?? 0) + 1);
        element.querySelector(`.${STRIP_CLASS}`)?.remove();
        activeStrips.delete(element);
    }
    if (activeStrips.size === 0) {
        dataSubscription?.();
        dataSubscription = null;
    }
}

/** 数据变化（含跨窗口）：名册缓存立即失效，活跃档案条逐个重渲染（乱序由 stripRequests 代际挡） */
function ensureDataSubscription(): void {
    if (dataSubscription) return;
    dataSubscription = subscribeDataChanged(() => {
        invalidateRoster();
        for (const [element, entry] of [...activeStrips]) {
            if (!element.isConnected || entry.context.lifecycleToken && !entry.context.lifecycleToken.isAlive()) {
                activeStrips.delete(element);
                continue;
            }
            void updateStrip(entry.context, entry.protyle, entry.rootId);
        }
    });
}

async function updateStrip(context: PanelContext, protyle: ProtyleLike, rootId: string): Promise<void> {
    if (context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
    const request = (stripRequests.get(protyle.element) ?? 0) + 1;
    stripRequests.set(protyle.element, request);
    const isCurrent = () => stripRequests.get(protyle.element) === request
        && protyle.block?.rootID === rootId && protyle.element.isConnected
        && (!context.lifecycleToken || context.lifecycleToken.isAlive());
    protyle.element.querySelector(`.${STRIP_CLASS}`)?.remove();
    if (!rootId || !context.settings || !/^\d{14}-[0-9a-z]{7}$/.test(rootId)) {
        activeStrips.delete(protyle.element);
        return;
    }
    activeStrips.set(protyle.element, { context, protyle, rootId });
    try {
        const roster = await getRoster(context.settings);
        if (!isCurrent()) return;
        const person = roster.find((item) => item.docId === rootId);
        if (!person) {
            const orgs = await scanOrganizations().catch(() => []);
            if (!isCurrent()) return;
            const org = orgs.find((item) => item.docId === rootId && !item.removed);
            if (org) {
                const strip = buildOrgStrip(context, protyle, org);
                const title = protyle.element.querySelector(".protyle-title");
                if (title) {
                    title.insertAdjacentElement("afterend", strip);
                } else {
                    protyle.element.prepend(strip);
                }
                return;
            }

            // 检查是否为城市人脉实体专题文档
            assertSafeBlockId(rootId, "rootId");
            const cityRows = await querySql<unknown>(
                `SELECT content, ial FROM blocks WHERE id = '${rootId}' AND type = 'd' AND ial LIKE '%${CITY_TOPIC_ATTR}="%' LIMIT 1`,
            ).catch(() => []);
            if (!isCurrent()) return;
            if (cityRows.length > 0) {
                const row = cityRows[0] as { ial?: string; content?: string };
                const match = row.ial?.match(new RegExp(`${CITY_TOPIC_ATTR}="([^"]+)"`));
                const cityName = match?.[1] || row.content || "未知";
                const cityContactsCount = roster.filter((p) => extractNormalizedRegion(p).city === cityName).length;
                const strip = buildCityStrip(context, protyle, cityName, cityContactsCount);
                const title = protyle.element.querySelector(".protyle-title");
                if (title) {
                    title.insertAdjacentElement("afterend", strip);
                } else {
                    protyle.element.prepend(strip);
                }
                return;
            }

            activeStrips.delete(protyle.element);
            return;
        }
        const [interactionStore, followUpStore] = await Promise.all([
            /* 档案条是人物详情的展示读：坏库/读取失败必须进入错误态，
             * 不能把互动与跟进静默归一为空而显示“尚未互动/无待办”。 */
            loadInteractionStoreStrict(context.plugin),
            loadFollowUpStoreStrict(context.plugin),
        ]);
        if (!isCurrent()) return;
        const lastInteraction = lastInteractionByPerson(interactionStore, [person]).get(person.docId);
        const birthday = person.birthday ? nextBirthday(person.birthday, person.isLunar) : undefined;
        /* B12：简报追加「单位」组织归属行（失败降级为无该行） */
        const orgLine = await getOrgDisplayForDoc(person.docId).catch(() => "");
        if (!isCurrent()) return;
        const briefing = buildMeetingBriefing(
            person,
            roster,
            interactionStore.events,
            orgLine ? [{ label: t(context, "peopleColumnOrg", "单位"), value: orgLine }] : [],
        );
        const openFollowUps = followUpStore.items.filter(
            (item) => item.personDocId === person.docId && item.status === "open",
        ).length;
        const latestEvent = interactionStore.events.reduce<InteractionEvent | null>(
            (acc, event) => (event.personDocId === person.docId && (!acc || event.occurredAt > acc.occurredAt) ? event : acc),
            null,
        );
        const strip = buildStrip(context, protyle, person, briefing, birthday?.daysUntil, lastInteraction?.lastDaysAgo, {
            openFollowUps,
            latestNote: latestEvent?.note,
        });
        const title = protyle.element.querySelector(".protyle-title");
        if (title) {
            title.insertAdjacentElement("afterend", strip);
        } else {
            protyle.element.prepend(strip);
        }
    } catch (error) {
        console.warn("[LvContacts] 档案条渲染失败", error);
    }
}

/** 档案条文案取值（i18n 可选，缺失回退中文） */
function t(context: PanelContext, key: string, fallback: string, values?: Record<string, string | number>): string {
    return translateText(context.i18n, key, fallback, values);
}
/** 档案条 chips 最多直接展示的枚数，超出折叠为可展开的 +N。 */
const STRIP_CHIPS_MAX = 6;

interface StripChipItem {
    text: string;
    copyValue?: string;
    ariaLabel?: string;
    title?: string;
}

function renderStripChip(context: PanelContext, item: StripChipItem): HTMLElement {
    if (!item.copyValue) {
        const span = document.createElement("span");
        span.className = "lvct-chip";
        span.textContent = item.text;
        if (item.title) span.title = item.title;
        return span;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lvct-chip lvct-strip__chip-action";
    btn.textContent = item.text;
    if (item.title) btn.title = item.title;
    if (item.ariaLabel) btn.setAttribute("aria-label", item.ariaLabel);

    let copyTimer: ReturnType<typeof setTimeout> | null = null;
    btn.addEventListener("click", () => {
        void copyPlainText(item.copyValue!).then(() => {
            btn.textContent = t(context, "stripCopied", "✓ 已复制");
            btn.classList.add("lvct-strip__chip--copied");
            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                btn.textContent = item.text;
                btn.classList.remove("lvct-strip__chip--copied");
            }, 1500);
        }).catch((err) => {
            btn.textContent = t(context, "stripCopyFailed", "复制失败");
            btn.classList.add("lvct-strip__chip--error");
            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                btn.textContent = item.text;
                btn.classList.remove("lvct-strip__chip--error");
            }, 2000);
            console.warn("[LvContacts] 复制联系方式失败", err);
        });
    });
    return btn;
}

function buildOrgStrip(
    context: PanelContext,
    _protyle: ProtyleLike,
    org: OrganizationSummary,
): HTMLElement {
    const strip = document.createElement("div");
    strip.className = `${STRIP_CLASS} lvct-strip lvct-strip--org`;
    strip.dataset.orgDocId = org.docId;

    const avatar = document.createElement("span");
    avatar.className = "lvct-strip__avatar lvct-strip__avatar--org";
    avatar.textContent = org.name.slice(0, 1) || t(context, "stripAvatarFallbackOrg", "组");

    const main = document.createElement("div");
    main.className = "lvct-strip__main";
    const identity = document.createElement("div");
    identity.className = "lvct-strip__identity";

    const name = document.createElement("b");
    name.textContent = org.name;
    identity.appendChild(name);

    const badges = document.createElement("div");
    badges.className = "lvct-strip__badges";
    badges.appendChild(makeBadge(t(context, "stripOrgBadge", "🏢 组织"), "lvct-strip__badge--group"));
    if (org.archived) {
        badges.appendChild(makeBadge(t(context, "orgArchivedTag", "已归档"), "lvct-strip__badge--muted"));
    }
    identity.appendChild(badges);
    main.appendChild(identity);

    const actions = document.createElement("div");
    actions.className = "lvct-strip__actions";

    const filterMembers = document.createElement("button");
    filterMembers.type = "button";
    filterMembers.className = "b3-button b3-button--small b3-button--primary";
    filterMembers.textContent = t(context, "stripOrgMembers", "名册成员");
    filterMembers.title = t(context, "stripOrgMembersTitle", "在名册中筛选属于「{name}」的联系人", { name: org.name });
    filterMembers.addEventListener("click", () => {
        if (context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
        const openWorkbench = (context.plugin as Plugin & { openWorkbench?: () => void }).openWorkbench;
        requestWorkbenchNavigation(
            context.plugin,
            {
                view: "people",
                focus: {
                    workQuery: org.name,
                    label: `组织 · ${org.name}`,
                },
            },
            context.lifecycleToken,
        );
        openWorkbench?.call(context.plugin);
    });
    actions.appendChild(filterMembers);

    const openOrgsView = document.createElement("button");
    openOrgsView.type = "button";
    openOrgsView.className = "b3-button b3-button--small b3-button--outline";
    openOrgsView.textContent = t(context, "stripOrgsPanorama", "组织全景");
    openOrgsView.title = t(context, "stripOrgsPanoramaTitle", "打开小驴人脉组织全貌看板");
    openOrgsView.addEventListener("click", () => {
        if (context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
        const openWorkbench = (context.plugin as Plugin & { openWorkbench?: () => void }).openWorkbench;
        requestWorkbenchNavigation(context.plugin, { view: "orgs" }, context.lifecycleToken);
        openWorkbench?.call(context.plugin);
    });
    actions.appendChild(openOrgsView);

    strip.appendChild(avatar);
    strip.appendChild(main);
    strip.appendChild(actions);
    return strip;
}

function buildCityStrip(
    context: PanelContext,
    _protyle: ProtyleLike,
    cityName: string,
    contactCount: number,
): HTMLElement {
    const strip = document.createElement("div");
    strip.className = `${STRIP_CLASS} lvct-strip lvct-strip--city`;
    strip.dataset.city = cityName;

    const avatar = document.createElement("span");
    avatar.className = "lvct-strip__avatar lvct-strip__avatar--city";
    avatar.textContent = cityName.slice(0, 1) || t(context, "stripAvatarFallbackCity", "市");

    const main = document.createElement("div");
    main.className = "lvct-strip__main";
    const identity = document.createElement("div");
    identity.className = "lvct-strip__identity";

    const name = document.createElement("b");
    name.textContent = cityName;
    identity.appendChild(name);

    const badges = document.createElement("div");
    badges.className = "lvct-strip__badges";
    badges.appendChild(makeBadge(t(context, "stripCityBadge", "📍 城市人脉"), "lvct-strip__badge--city"));
    badges.appendChild(makeBadge(t(context, "stripCityContactsBadge", "常驻好友 {count} 人", { count: contactCount }), "lvct-strip__badge--activity"));
    identity.appendChild(badges);
    main.appendChild(identity);

    const actions = document.createElement("div");
    actions.className = "lvct-strip__actions";

    const filterCityPeople = document.createElement("button");
    filterCityPeople.type = "button";
    filterCityPeople.className = "b3-button b3-button--small b3-button--primary";
    filterCityPeople.textContent = t(context, "stripCityFriends", "同城好友");
    filterCityPeople.title = t(context, "stripCityFriendsTitle", "在名册中筛选常驻「{name}」的联系人", { name: cityName });
    filterCityPeople.addEventListener("click", () => {
        if (context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
        const openWorkbench = (context.plugin as Plugin & { openWorkbench?: () => void }).openWorkbench;
        requestWorkbenchNavigation(
            context.plugin,
            {
                view: "people",
                focus: {
                    label: `城市 · ${cityName}`,
                },
            },
            context.lifecycleToken,
        );
        openWorkbench?.call(context.plugin);
    });
    actions.appendChild(filterCityPeople);

    const openTripPlanner = document.createElement("button");
    openTripPlanner.type = "button";
    openTripPlanner.className = "b3-button b3-button--small b3-button--outline";
    openTripPlanner.textContent = t(context, "stripTripPlanner", "行程规划");
    openTripPlanner.title = t(context, "stripTripPlannerTitle", "打开小驴人脉城市与行程助手，探索同城与周边好友");
    openTripPlanner.addEventListener("click", () => {
        if (context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
        const openWorkbench = (context.plugin as Plugin & { openWorkbench?: () => void }).openWorkbench;
        requestWorkbenchNavigation(
            context.plugin,
            {
                view: "people",
                openRegionExplorer: { city: cityName },
            },
            context.lifecycleToken,
        );
        openWorkbench?.call(context.plugin);
    });
    actions.appendChild(openTripPlanner);

    strip.appendChild(avatar);
    strip.appendChild(main);
    strip.appendChild(actions);
    return strip;
}

function buildStrip(
    context: PanelContext,
    protyle: ProtyleLike,
    person: ContactSummary,
    briefingItems: readonly MeetingBriefingItem[],
    birthdayDaysUntil?: number,
    lastDaysAgo?: number,
    extras: { openFollowUps?: number; latestNote?: string } = {},
): HTMLElement {
    const strip = document.createElement("div");
    strip.className = `${STRIP_CLASS} lvct-strip`;
    strip.dataset.personDocId = person.docId;

    const avatar = document.createElement("span");
    avatar.className = "lvct-strip__avatar";
    avatar.textContent = person.name.slice(0, 1) || t(context, "stripAvatarFallbackPerson", "人");

    const main = document.createElement("div");
    main.className = "lvct-strip__main";
    const identity = document.createElement("div");
    identity.className = "lvct-strip__identity";
    const name = document.createElement("b");
    name.textContent = person.name;
    identity.appendChild(name);

    const badges = document.createElement("div");
    badges.className = "lvct-strip__badges";
    if (person.group) badges.appendChild(makeBadge(person.group, "lvct-strip__badge--group"));
    if (birthdayDaysUntil !== undefined) {
        badges.appendChild(makeBadge(birthdayDaysUntil === 0 ? t(context, "stripBirthdayToday", "生日今天") : t(context, "stripBirthdayIn", "生日 {n} 天后", { n: birthdayDaysUntil }), "lvct-strip__badge--birthday"));
    }
    badges.appendChild(
        makeBadge(
            lastDaysAgo === undefined ? t(context, "stripNever", "尚未互动") : lastDaysAgo === 0 ? t(context, "stripToday", "今天互动") : t(context, "stripLastDays", "最近互动 {n} 天前", { n: lastDaysAgo }),
            lastDaysAgo === undefined ? "lvct-strip__badge--muted" : "lvct-strip__badge--activity",
        ),
    );
    // B04：计划与关系计数上条，一眼看到「欠着几件事、连着几个人」
    if (extras.openFollowUps) {
        badges.appendChild(makeBadge(t(context, "stripFollowUpsOpen", "待跟进 {n}", { n: extras.openFollowUps }), "lvct-strip__badge--activity"));
    }
    if (person.relatedItemIds.length > 0) {
        badges.appendChild(makeBadge(t(context, "stripRelatedCount", "相关人 {n}", { n: person.relatedItemIds.length }), "lvct-strip__badge--muted"));
    }
    identity.appendChild(badges);

    const chips = document.createElement("div");
    chips.className = "lvct-strip__chips";
    const chipItems: StripChipItem[] = [];
    if (extras.latestNote) chipItems.push({ text: `🗒 ${extras.latestNote}`, title: extras.latestNote });
    if (person.phone) {
        chipItems.push({
            text: `📞 ${person.phone}`,
            copyValue: person.phone,
            title: t(context, "stripCopyPhone", "点击复制电话：{val}", { val: person.phone }),
            ariaLabel: t(context, "stripCopyPhoneAria", "复制电话 {val}", { val: person.phone }),
        });
    }
    if (person.wechat) {
        chipItems.push({
            text: `💬 ${person.wechat}`,
            copyValue: person.wechat,
            title: t(context, "stripCopyWechat", "点击复制微信：{val}", { val: person.wechat }),
            ariaLabel: t(context, "stripCopyWechatAria", "复制微信 {val}", { val: person.wechat }),
        });
    }
    if (person.email) {
        chipItems.push({
            text: `✉️ ${person.email}`,
            copyValue: person.email,
            title: t(context, "stripCopyEmail", "点击复制邮箱：{val}", { val: person.email }),
            ariaLabel: t(context, "stripCopyEmailAria", "复制邮箱 {val}", { val: person.email }),
        });
    }
    if (person.birthday) {
        chipItems.push({
            text: `🎂 ${formatBirthdayDisplay(person.birthday, person.isLunar)}`,
            title: formatBirthdayDisplay(person.birthday, person.isLunar),
        });
    }
    for (const tag of person.tags) chipItems.push({ text: `#${tag}`, title: `#${tag}` });
    if (chipItems.length === 0) {
        const empty = document.createElement("span");
        empty.className = "ft__smaller ft__on-surface";
        empty.textContent = t(context, "stripEmptyContact", "未填写联系资料，可点右侧编辑");
        chips.appendChild(empty);
    }
    // B04：chips 有上限，超出折叠为 +N，按需展开完整值。
    const visibleChips = chipItems.slice(0, STRIP_CHIPS_MAX);
    for (const item of visibleChips) {
        chips.appendChild(renderStripChip(context, item));
    }
    if (chipItems.length > visibleChips.length) {
        // 同一人物可在分屏编辑器中出现多次，ARIA 目标必须按档案条唯一。
        const overflowId = `lvct-strip-overflow-${++stripOverflowSequence}`;
        const more = document.createElement("button");
        more.type = "button";
        more.className = "lvct-chip lvct-strip__chip-more";
        more.textContent = t(context, "stripChipsMore", "+{n}", { n: chipItems.length - visibleChips.length });
        more.title = chipItems.slice(visibleChips.length).map((i) => i.text).join("、");
        more.setAttribute("aria-label", t(context, "stripChipsMoreAria", "展开其他联系资料（{n}）", { n: chipItems.length - visibleChips.length }));
        more.setAttribute("aria-expanded", "false");
        more.setAttribute("aria-controls", overflowId);
        chips.appendChild(more);

        /* The old title-only overflow marker was invisible to keyboard and touch
         * users. Keep the compact +N affordance, while exposing the complete
         * values on demand without changing the contact data contract. */
        const overflow = document.createElement("div");
        overflow.id = overflowId;
        overflow.className = "lvct-strip__chip-overflow";
        overflow.hidden = true;
        for (const item of chipItems.slice(visibleChips.length)) {
            overflow.appendChild(renderStripChip(context, item));
        }
        more.addEventListener("click", () => {
            overflow.hidden = !overflow.hidden;
            more.setAttribute("aria-expanded", String(!overflow.hidden));
            more.setAttribute(
                "aria-label",
                t(
                    context,
                    overflow.hidden ? "stripChipsMoreAria" : "stripChipsLessAria",
                    overflow.hidden ? "展开其他联系资料（{n}）" : "收起其他联系资料",
                    { n: chipItems.length - visibleChips.length },
                ),
            );
        });
        chips.appendChild(overflow);
    }
    main.appendChild(identity);
    main.appendChild(chips);

    const briefing = document.createElement("details");
    briefing.className = "lvct-strip__briefing";
    briefing.dataset.slot = "briefing";
    const briefingSummary = document.createElement("summary");
    briefingSummary.textContent = briefingItems.length > 0 ? t(context, "stripBriefingCount", "会前简报（{n}）", { n: briefingItems.length }) : t(context, "stripBriefingTitle", "会前简报");
    briefing.appendChild(briefingSummary);
    if (briefingItems.length === 0) {
        const empty = document.createElement("p");
        empty.className = "lvct-strip__briefing-empty ft__smaller ft__on-surface";
        empty.textContent = t(context, "stripBriefingEmpty", "暂无互动、关系或共同出席记录");
        briefing.appendChild(empty);
    } else {
        const list = document.createElement("dl");
        list.className = "lvct-strip__briefing-list";
        for (const item of briefingItems) {
            const row = document.createElement("div");
            const label = document.createElement("dt");
            label.textContent = item.label;
            const value = document.createElement("dd");
            value.textContent = item.value;
            row.append(label, value);
            list.appendChild(row);
        }
        briefing.appendChild(list);
    }
    main.appendChild(briefing);

    const actions = document.createElement("div");
    actions.className = "lvct-strip__actions";

    const record = document.createElement("button");
    record.type = "button";
    record.className = "b3-button b3-button--small b3-button--primary lvct-strip__record-btn";
    record.textContent = t(context, "stripRecord", "记互动");
    record.title = t(context, "stripRecordTitle", "为 {name} 记录一笔互动", { name: person.name });
    record.addEventListener("click", () => openRecordDialog(context, protyle, person));
    actions.appendChild(record);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "b3-button b3-button--small b3-button--text";
    edit.textContent = t(context, "stripEdit", "编辑资料");
    edit.addEventListener("click", () => openEditDialog(context, protyle, person));
    actions.appendChild(edit);

    const open = document.createElement("button");
    open.type = "button";
    open.className = "b3-button b3-button--small b3-button--outline";
    open.textContent = t(context, "stripOpen", "打开人脉");
    open.dataset.lvctPersonEntry = "true";
    open.addEventListener("click", () => {
        if (context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
        const workbench = (context.plugin as Plugin & { openWorkbench?: () => void }).openWorkbench;
        if (workbench) requestPersonNavigation(context.plugin, { docId: person.docId, source: "document", trigger: open }, context.lifecycleToken);
        workbench?.call(context.plugin);
    });
    actions.appendChild(open);

    strip.appendChild(avatar);
    strip.appendChild(main);
    strip.appendChild(actions);
    return strip;
}

function makeBadge(text: string, className: string): HTMLSpanElement {
    const badge = document.createElement("span");
    badge.className = `lvct-strip__badge ${className}`;
    badge.textContent = text;
    return badge;
}

function openRecordDialog(context: PanelContext, protyle: ProtyleLike, person: ContactSummary): void {
    if (!context.settings || context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
    svelteDialog({
        title: t(context, "stripRecordDialogTitle", "记一笔互动 · {name}", { name: person.name }),
        width: "500px",
        component: QuickRecordDialog,
        props: {
            plugin: context.plugin,
            person,
            i18n: context.i18n,
            onSaved: () => {
                void updateStrip(context, protyle, person.docId);
            },
        },
    });
}

function openEditDialog(context: PanelContext, protyle: ProtyleLike, person: ContactSummary): void {
    if (!context.settings || context.lifecycleToken && !context.lifecycleToken.isAlive()) return;
    const title = t(context, "stripEditDialogTitle", "编辑资料 · {name}", { name: person.name });
    const hostPlugin = context.plugin as Plugin & {
        openPersonEditDialog?: (
            target: ContactSummary,
            options?: { title?: string; width?: string; onSaved?: () => void },
        ) => void;
    };
    if (typeof hostPlugin.openPersonEditDialog === "function") {
        hostPlugin.openPersonEditDialog(person, {
            title,
            width: "620px",
            onSaved: () => {
                void updateStrip(context, protyle, person.docId);
            },
        });
        return;
    }
    svelteDialog({
        title,
        width: "620px",
        component: PersonEditDialog,
        props: {
            settings: context.settings,
            i18n: context.i18n,
            person,
            onSaved: () => {
                emitDataChanged({ topics: ["people"], docIds: [person.docId] }, context.lifecycleToken);
                void updateStrip(context, protyle, person.docId);
            },
        },
    });
}
