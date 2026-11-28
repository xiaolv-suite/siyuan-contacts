/**
 * 微任务级 SQL 批合并器与熔断降级调度器 (SQLQueryCoalescer)
 *
 * 核心契约与安全机制：
 * 1. 微任务批合并 (queueMicrotask)：聚合并发单卡/单行属性查询，N 次调用自动合并为单次 `WHERE id IN (...)` 查询；
 * 2. 单引号安全转义：对所有输入 ID 严格执行 `.replace(/'/g, "''")`，防止 SQL 注入与特殊字符截断；
 * 3. MAX_BATCH_SIZE=100 分批保护：超过 100 个 ID 时自动切片，避免超出 SQLite 变量与 SQL 语句长度上限；
 * 4. 3000ms 超时熔断保护：查询耗时超 3000ms 自动熔断超时；
 * 5. 有界并发逐项降级：批量 IN 查询发生错误或超时时，自动降级为限制并发（并发数 5）的单行逐项重试，
 *    单个异常或不存在的 ID 绝不拖垮同批其他正常查询；
 * 6. 短时缓存（默认 TTL 3000ms）：高频视图重新渲染时直接命中内存，降低思源内核 SQLite 互斥锁竞争；
 * 7. 依赖注入与独立实例构造：支持自定义 sqlExecutor 构造独立实例以供单元测试进行精确计数断言。
 */

import { querySql } from "./client";

export interface BlockIalRecord {
    id: string;
    ial: string;
    content: string;
}

export interface SQLQueryCoalescerOptions {
    sqlExecutor?: <T = any>(stmt: string) => Promise<T[]>;
    timeoutMs?: number;
    cacheTTL?: number;
    maxBatchSize?: number;
    fallbackConcurrency?: number;
}

interface Waiter<T> {
    resolve: (val: T) => void;
    reject: (err: any) => void;
}

interface CacheEntry {
    record: BlockIalRecord | null;
    expireAt: number;
}

export const MAX_BATCH_SIZE = 100;
export const DEFAULT_TIMEOUT_MS = 3000;
export const DEFAULT_CACHE_TTL = 3000;
export const DEFAULT_FALLBACK_CONCURRENCY = 5;

export class SQLQueryCoalescer {
    private readonly sqlExecutor: <T = any>(stmt: string) => Promise<T[]>;
    private readonly timeoutMs: number;
    private readonly cacheTTL: number;
    private readonly maxBatchSize: number;
    private readonly fallbackConcurrency: number;

    private readonly waiters = new Map<string, Array<Waiter<BlockIalRecord | null>>>();
    private readonly pendingIds = new Set<string>();
    private readonly cache = new Map<string, CacheEntry>();
    private scheduled = false;

    constructor(options?: SQLQueryCoalescerOptions) {
        this.sqlExecutor = options?.sqlExecutor ?? ((stmt) => querySql<any>(stmt, { dedupe: false }));
        this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.cacheTTL = options?.cacheTTL ?? DEFAULT_CACHE_TTL;
        this.maxBatchSize = options?.maxBatchSize ?? MAX_BATCH_SIZE;
        this.fallbackConcurrency = options?.fallbackConcurrency ?? DEFAULT_FALLBACK_CONCURRENCY;
    }

    /** 清空指定 ID 或全部内存缓存 */
    clearCache(id?: string): void {
        if (id) {
            this.cache.delete(id);
        } else {
            this.cache.clear();
        }
    }

    /** 查询单个块的记录（包含 id, ial, content） */
    async queryBlockRecord(id: string): Promise<BlockIalRecord | null> {
        if (!id) return null;

        const cached = this.cache.get(id);
        if (cached && cached.expireAt > Date.now()) {
            return cached.record;
        }

        return new Promise<BlockIalRecord | null>((resolve, reject) => {
            if (!this.waiters.has(id)) {
                this.waiters.set(id, []);
            }
            this.waiters.get(id)!.push({ resolve, reject });
            this.pendingIds.add(id);
            this.scheduleFlush();
        });
    }

    /** 快捷查询单个块的 IAL 字符串 */
    async queryBlockIal(id: string): Promise<string> {
        const record = await this.queryBlockRecord(id);
        return record?.ial ?? "";
    }

    /** 批量查询多个块的 IAL 字符串字典 */
    async queryBlocksIal(ids: readonly string[]): Promise<Map<string, string>> {
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        const records = await Promise.all(uniqueIds.map((id) => this.queryBlockRecord(id)));
        const map = new Map<string, string>();
        for (let i = 0; i < uniqueIds.length; i++) {
            const rec = records[i];
            if (rec && rec.ial) {
                map.set(uniqueIds[i], rec.ial);
            }
        }
        return map;
    }

    private scheduleFlush(): void {
        if (this.scheduled) return;
        this.scheduled = true;

        queueMicrotask(async () => {
            this.scheduled = false;
            const batch = Array.from(this.pendingIds);
            this.pendingIds.clear();
            if (batch.length === 0) return;

            // 依据 MAX_BATCH_SIZE 分批切片执行
            const chunks: string[][] = [];
            for (let i = 0; i < batch.length; i += this.maxBatchSize) {
                chunks.push(batch.slice(i, i + this.maxBatchSize));
            }

            for (const chunk of chunks) {
                await this.processChunk(chunk);
            }
        });
    }

    private async processChunk(chunk: string[]): Promise<void> {
        try {
            // 严格单引号 SQL 转义
            const inList = chunk.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
            const stmt = `SELECT id, ial, content FROM blocks WHERE id IN (${inList}) AND type = 'd'`;

            const rows = await this.withTimeout(
                this.sqlExecutor<{ id: string; ial?: string; content?: string }>(stmt),
                this.timeoutMs,
                `[SQLQueryCoalescer] queryBlocks batch timed out after ${this.timeoutMs}ms`,
            );

            const recordMap = new Map<string, BlockIalRecord>();
            if (Array.isArray(rows)) {
                for (const r of rows) {
                    if (r && typeof r.id === "string") {
                        recordMap.set(r.id, {
                            id: r.id,
                            ial: typeof r.ial === "string" ? r.ial : "",
                            content: typeof r.content === "string" ? r.content : "",
                        });
                    }
                }
            }

            const now = Date.now();
            for (const id of chunk) {
                const record = recordMap.get(id) ?? null;
                this.cache.set(id, { record, expireAt: now + this.cacheTTL });
                const waiters = this.waiters.get(id);
                this.waiters.delete(id);
                if (waiters) {
                    for (const w of waiters) w.resolve(record);
                }
            }
        } catch (batchErr) {
            // 批量失败或超时熔断：有界并发逐项降级，单项异常不拖垮同批
            console.warn("[SQLQueryCoalescer] batch query failed or timed out, degrading to individual queries:", batchErr);
            await this.degradeChunk(chunk);
        }
    }

    private async degradeChunk(chunk: string[]): Promise<void> {
        let index = 0;
        const workerCount = Math.min(this.fallbackConcurrency, chunk.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (index < chunk.length) {
                const currentIdx = index++;
                const id = chunk[currentIdx];
                const waiters = this.waiters.get(id);
                this.waiters.delete(id);
                if (!waiters || waiters.length === 0) continue;

                try {
                    const safeId = id.replace(/'/g, "''");
                    const singleStmt = `SELECT id, ial, content FROM blocks WHERE id = '${safeId}' AND type = 'd' LIMIT 1`;
                    const singleRows = await this.withTimeout(
                        this.sqlExecutor<{ id: string; ial?: string; content?: string }>(singleStmt),
                        this.timeoutMs,
                        `[SQLQueryCoalescer] individual query timed out for ${id}`,
                    );

                    let record: BlockIalRecord | null = null;
                    if (Array.isArray(singleRows) && singleRows.length > 0 && singleRows[0]?.id) {
                        const r = singleRows[0];
                        record = {
                            id: r.id,
                            ial: typeof r.ial === "string" ? r.ial : "",
                            content: typeof r.content === "string" ? r.content : "",
                        };
                    }

                    this.cache.set(id, { record, expireAt: Date.now() + this.cacheTTL });
                    for (const w of waiters) w.resolve(record);
                } catch (singleErr) {
                    for (const w of waiters) w.reject(singleErr);
                }
            }
        });

        await Promise.all(workers);
    }

    private withTimeout<T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    reject(new Error(errMsg));
                }
            }, ms);

            promise.then(
                (val) => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        resolve(val);
                    }
                },
                (err) => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        reject(err);
                    }
                },
            );
        });
    }
}

/** 全局单例 */
export const sqlCoalescer = new SQLQueryCoalescer();

/** 快捷方法：查询单个文档的 IAL */
export function queryBlockIal(id: string): Promise<string> {
    return sqlCoalescer.queryBlockIal(id);
}

/** 快捷方法：批量查询多个文档的 IAL 字典 */
export function queryBlocksIal(ids: readonly string[]): Promise<Map<string, string>> {
    return sqlCoalescer.queryBlocksIal(ids);
}
