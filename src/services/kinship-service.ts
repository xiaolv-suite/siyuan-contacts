/**
 * 家谱亲属服务与种子组织调度器 (KinshipService)
 *
 * 核心职责：
 * 1. 种子家庭组织后台自愈调度（scheduleDefaultFamilyInit / cancel / run）；
 * 2. 亲属家庭成员增删查（loadPersonKinships / addPersonKinship / removePersonKinship）；
 * 3. 完整的生命周期防线与 Disposer 级联清理集成，杜绝内存泄露与挂起任务竞争。
 */

import type { Plugin } from "siyuan";
import type { ContactsSettings } from "../domain/model";
import type { LifecycleToken } from "../domain/lifecycle";
import type { KinshipMemberItem } from "../domain/kinship";
import { addPersonKinship, loadPersonKinships, removePersonKinship } from "../data/kinship";
import { ensureDefaultFamilyOrganization } from "./org";
import type { DataChangeDetail } from "../libs/data-events";

export interface KinshipHost {
    readonly plugin: Plugin;
    readonly settings: ContactsSettings | null;
    readonly lifecycleToken: LifecycleToken;
    isLifecycleActive(token?: LifecycleToken): boolean;
    getWorkspaceStateKind?(): string;
    emitDataChanged(payload: Omit<DataChangeDetail, "revision">): void;
}

export class KinshipService {
    private familyInitTimer = 0;
    private familyInitGeneration = 0;
    private inFlightFamilyInit: Promise<void> | null = null;

    constructor(private readonly host: KinshipHost) {}

    /** 读取指定人物的家庭亲属列表 */
    async loadPersonKinships(personDocId: string): Promise<KinshipMemberItem[]> {
        return loadPersonKinships(this.host.plugin, personDocId);
    }

    /** 为指定人物新增或更新亲属成员并派发数据事件 */
    async addPersonKinship(item: KinshipMemberItem): Promise<KinshipMemberItem[]> {
        const res = await addPersonKinship(this.host.plugin, item);
        this.host.emitDataChanged({ topics: ["people"], docIds: [item.personDocId] });
        return res;
    }

    /** 移除指定人物的家庭亲属成员并派发数据事件 */
    async removePersonKinship(personDocId: string, memberId: string): Promise<KinshipMemberItem[]> {
        const res = await removePersonKinship(this.host.plugin, personDocId, memberId);
        this.host.emitDataChanged({ topics: ["people"], docIds: [personDocId] });
        return res;
    }

    /**
     * 安排后台延迟初始化“家庭”种子组织（推迟 3000ms 执行）
     * 返回注销/取消函数，可直接入册 DisposerRegistry
     */
    scheduleDefaultFamilyInit(settings: ContactsSettings, delayMs = 3000): () => void {
        this.cancelScheduledFamilyInit();
        if (typeof window === "undefined") return () => {};

        const scheduledGen = this.familyInitGeneration;
        this.familyInitTimer = window.setTimeout(() => {
            this.familyInitTimer = 0;
            if (
                !this.host.isLifecycleActive() ||
                (this.host.getWorkspaceStateKind && this.host.getWorkspaceStateKind() !== "ready") ||
                this.familyInitGeneration !== scheduledGen
            ) {
                return;
            }
            void this.runDefaultFamilyInit(settings);
        }, delayMs);

        return () => this.cancelScheduledFamilyInit();
    }

    /** 取消当前排队与进行中的种子组织初始化任务 */
    cancelScheduledFamilyInit(): void {
        this.familyInitGeneration += 1;
        if (this.familyInitTimer) {
            if (typeof window !== "undefined") {
                window.clearTimeout(this.familyInitTimer);
            } else {
                clearTimeout(this.familyInitTimer as any);
            }
            this.familyInitTimer = 0;
        }
        this.inFlightFamilyInit = null;
    }

    /** 执行种子组织自愈创建（带单飞守卫与生命周期检查） */
    async runDefaultFamilyInit(settings: ContactsSettings): Promise<void> {
        if (this.inFlightFamilyInit) return this.inFlightFamilyInit;

        const currentGen = this.familyInitGeneration;
        const cleanup = () => {
            if (this.familyInitGeneration === currentGen) {
                this.inFlightFamilyInit = null;
            }
        };

        const task = (async () => {
            try {
                if (!this.host.isLifecycleActive() || this.familyInitGeneration !== currentGen) return;
                const result = await ensureDefaultFamilyOrganization(this.host.plugin, settings, {
                    shouldAbort: () => !this.host.isLifecycleActive() || this.familyInitGeneration !== currentGen,
                });
                if (!this.host.isLifecycleActive() || this.familyInitGeneration !== currentGen) return;
                if (result.created && this.host.isLifecycleActive()) {
                    this.host.emitDataChanged({ topics: ["organizations"] });
                }
            } catch (error) {
                console.warn("[LvContacts] 默认组织“家庭”初始化待续做", error);
            } finally {
                cleanup();
            }
        })();

        this.inFlightFamilyInit = task;
        await task;
    }

    /** 释放资源与注销定时器 */
    dispose(): void {
        this.cancelScheduledFamilyInit();
    }
}
