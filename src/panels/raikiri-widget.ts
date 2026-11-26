import { registerRaikiriModuleSafely } from "../libs/ecosystem-bridge-kit";
import type { ContactsPluginFacade } from "../types";

export function registerRaikiriWidget(facade: ContactsPluginFacade): () => void {
    return registerRaikiriModuleSafely({
        moduleId: "contacts-upcoming",
        title: "人脉动态",
        icon: "iconLvContacts",
        category: "人脉",
        description: "近期生日与待跟进人脉",
        source: { pluginId: "siyuan-contacts", name: "小驴人脉" },
        read: async () => {
            if (!facade.settings) return { title: "人脉动态", items: [{ label: "工作空间未初始化" }] };
            try {
                const data = await facade.loadDashboard({ birthdayWindowDays: 7 });
                const items: Array<{ label: string; value?: string; command?: string }> = [];
                const todayBdays = data.birthdays.filter((b) => b.bucket === "today");
                if (todayBdays.length > 0) {
                    items.push({
                        label: `🎂 今日生日 (${todayBdays.length})`,
                        value: todayBdays.map((b) => b.person.name).join("、"),
                        command: "contacts:open-people?sort=birthday",
                    });
                }
                const weekBdays = data.birthdays.filter((b) => b.bucket === "week");
                if (weekBdays.length > 0) {
                    items.push({
                        label: `🎉 本周生日 (${weekBdays.length})`,
                        value: weekBdays.map((b) => b.person.name).join("、"),
                        command: "contacts:open-people?sort=birthday",
                    });
                }
                const openFus = (data.followUps ?? []).filter((f) => f.item.status === "open");
                if (openFus.length > 0) {
                    items.push({
                        label: `📌 待跟进事项 (${openFus.length})`,
                        value: openFus.slice(0, 3).map((f) => f.person?.name || f.item.title).join("、"),
                        command: "contacts:open-people?view=followups",
                    });
                }
                const overdueItems = (data.actions ?? []).filter((a) => a.bucket === "overdue");
                if (overdueItems.length > 0) {
                    items.push({
                        label: `⌛ 待问候/逾期 (${overdueItems.length})`,
                        value: overdueItems.slice(0, 3).map((a) => a.person.name).join("、"),
                        command: "contacts:open-people?filter=overdue",
                    });
                }
                if (items.length === 0) {
                    items.push({ label: "人脉交往一切就绪", value: "近期无待办与生日" });
                }
                return { title: "人脉动态", items };
            } catch {
                return { title: "人脉动态", items: [{ label: "暂无数据" }] };
            }
        },
        open: () => {
            facade.openWorkbench?.();
        },
    });
}
