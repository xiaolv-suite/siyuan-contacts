<script lang="ts">
    import type { ActivityHeatmapData, HeatmapDay } from "../../domain/activity-heatmap.ts";
    import { translateText } from "../../domain/translation";

    let {
        data,
        i18n,
        onSelectDate,
    }: {
        data: ActivityHeatmapData;
        i18n?: Readonly<Record<string, string>>;
        onSelectDate?: (dateKey: string) => void;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    function dayTooltip(day: HeatmapDay): string {
        if (day.isFuture) return `${day.dateKey}（未来日期）`;
        if (day.count === 0) return `${day.dateKey}：无互动记录`;
        const names = day.personNames && day.personNames.length > 0
            ? `（${day.personNames.join("、")}${day.peopleCount > day.personNames.length ? ` 等 ${day.peopleCount} 人` : ""}）`
            : "";
        return `${day.dateKey}：${day.count} 次互动${names}`;
    }

    const WEEKDAY_LABELS = ["一", "", "三", "", "五", "", "日"];
</script>

<div class="lvct-heatmap" role="region" aria-label="年度人脉交往活跃热力图">
    <div class="lvct-heatmap__summary fn__flex">
        <span class="lvct-heatmap__stat-item">
            {text("heatmapActiveDays", "年度活跃")} <b>{data.activeDays}</b> {text("heatmapDaysUnit", "天")}
        </span>
        <span class="lvct-heatmap__divider">·</span>
        <span class="lvct-heatmap__stat-item">
            {text("heatmapTotalEvents", "累计记录")} <b>{data.totalEvents}</b> {text("heatmapTimesUnit", "次")}
        </span>
        <span class="lvct-heatmap__divider">·</span>
        <span class="lvct-heatmap__stat-item">
            {text("heatmapCurrentStreak", "当前连续")} <b>{data.currentStreak}</b> {text("heatmapDaysUnit", "天")}
        </span>
        {#if data.longestStreak > 0}
            <span class="lvct-heatmap__divider">·</span>
            <span class="lvct-heatmap__stat-item">
                {text("heatmapLongestStreak", "最长连续")} <b>{data.longestStreak}</b> {text("heatmapDaysUnit", "天")}
            </span>
        {/if}
    </div>

    <div class="lvct-heatmap__scroll-container">
        <!-- 月份刻度栏 -->
        <div class="lvct-heatmap__months">
            <div class="lvct-heatmap__weekday-spacer"></div>
            <div class="lvct-heatmap__months-track">
                {#each data.months as m}
                    <span
                        class="lvct-heatmap__month-label"
                        style={`grid-column-start: ${m.weekIndex + 1}`}
                    >
                        {m.label}
                    </span>
                {/each}
            </div>
        </div>

        <!-- 星期指示与热力矩阵 -->
        <div class="lvct-heatmap__body">
            <div class="lvct-heatmap__weekdays" aria-hidden="true">
                {#each WEEKDAY_LABELS as label, i (i)}
                    <span class="lvct-heatmap__weekday">{label}</span>
                {/each}
            </div>

            <div class="lvct-heatmap__grid" role="grid" aria-label="52周每日互动打卡">
                {#each data.weeks as week, wIndex (wIndex)}
                    <div class="lvct-heatmap__col" role="row">
                        {#each week as day (day.dateKey)}
                            <button
                                type="button"
                                class="lvct-heatmap__cell lvct-heatmap__cell--lvl-{day.level}"
                                class:lvct-heatmap__cell--future={day.isFuture}
                                title={dayTooltip(day)}
                                aria-label={dayTooltip(day)}
                                disabled={day.isFuture || day.count === 0}
                                onclick={() => onSelectDate?.(day.dateKey)}
                            ></button>
                        {/each}
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- 底部图例 -->
    <div class="lvct-heatmap__footer fn__flex">
        <span class="ft__smaller ft__on-surface">{data.startDate} ~ {data.endDate}</span>
        <div class="lvct-heatmap__legend fn__flex">
            <span class="ft__smaller ft__on-surface">{text("heatmapLess", "较少")}</span>
            <span class="lvct-heatmap__cell lvct-heatmap__cell--lvl-0 lvct-heatmap__legend-cell"></span>
            <span class="lvct-heatmap__cell lvct-heatmap__cell--lvl-1 lvct-heatmap__legend-cell"></span>
            <span class="lvct-heatmap__cell lvct-heatmap__cell--lvl-2 lvct-heatmap__legend-cell"></span>
            <span class="lvct-heatmap__cell lvct-heatmap__cell--lvl-3 lvct-heatmap__legend-cell"></span>
            <span class="lvct-heatmap__cell lvct-heatmap__cell--lvl-4 lvct-heatmap__legend-cell"></span>
            <span class="ft__smaller ft__on-surface">{text("heatmapMore", "频繁")}</span>
        </div>
    </div>
</div>
