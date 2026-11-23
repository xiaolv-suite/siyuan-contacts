/**
 * 启动与关键路径性能耗时埋点 (performance.mark / measure)
 */

export function safePerfMark(name: string): void {
    try {
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            performance.mark(name);
        }
    } catch {}
}

export function safePerfMeasure(name: string, startMark: string, endMark: string): PerformanceMeasure | undefined {
    try {
        if (typeof performance !== "undefined" && typeof performance.measure === "function") {
            return performance.measure(name, startMark, endMark);
        }
    } catch {}
    return undefined;
}

export function getPerfMeasureDuration(name: string): number | undefined {
    try {
        if (typeof performance !== "undefined" && typeof performance.getEntriesByName === "function") {
            const entries = performance.getEntriesByName(name, "measure");
            if (entries.length > 0) {
                return entries[entries.length - 1].duration;
            }
        }
    } catch {}
    return undefined;
}
