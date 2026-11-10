<script lang="ts">
    import type { SocialRadarAssessment } from "../../domain/social-radar.ts";
    import { getRadarGridRings } from "../../domain/social-radar.ts";
    import { translateText } from "../../domain/translation";

    let {
        assessment,
        i18n,
    }: {
        assessment: SocialRadarAssessment;
        i18n?: Readonly<Record<string, string>>;
    } = $props();

    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    const gridRings = getRadarGridRings();
</script>

<div class="lvct-social-radar fn__flex" role="region" aria-label="六维社交资本雷达图">
    <div class="lvct-social-radar__svg-wrap">
        <svg viewBox="0 0 130 130" class="lvct-social-radar__svg" aria-hidden="true">
            <!-- 背景参考多边形刻度网格 -->
            {#each gridRings as ring, i (i)}
                <polygon
                    points={ring}
                    class="lvct-social-radar__grid-ring"
                    class:lvct-social-radar__grid-ring--outer={i === gridRings.length - 1}
                />
            {/each}

            <!-- 6 个轴的轴线 -->
            {#each assessment.axesCoordinates as axis (axis.key)}
                <line
                    x1="65"
                    y1="65"
                    x2={axis.x}
                    y2={axis.y}
                    class="lvct-social-radar__axis-line"
                />
            {/each}

            <!-- 数据多边形填充与描边 -->
            <polygon
                points={assessment.polygonPoints}
                class="lvct-social-radar__polygon"
            />

            <!-- 顶点数据点 -->
            {#each assessment.axesCoordinates as axis (axis.key)}
                <circle
                    cx={axis.x}
                    cy={axis.y}
                    r="2.5"
                    class="lvct-social-radar__vertex"
                >
                    <title>{axis.name}：{axis.score} 分</title>
                </circle>
            {/each}
        </svg>
    </div>

    <div class="lvct-social-radar__info">
        <div class="lvct-social-radar__header fn__flex">
            <span class="lvct-chip lvct-chip--tag lvct-social-radar__tier-chip">
                <b>{assessment.tierLabel}</b>
            </span>
            <span class="lvct-social-radar__score">
                {text("socialRadarOverallScore", "社交资产 {n} 分", { n: assessment.overallScore })}
            </span>
        </div>

        <!-- 6 维微型标签 -->
        <div class="lvct-social-radar__metrics-grid">
            {#each assessment.axesCoordinates as axis (axis.key)}
                <div class="lvct-social-radar__metric-item" title={`${axis.name}：${axis.score} 分`}>
                    <span class="lvct-social-radar__metric-name">{axis.name}</span>
                    <span class="lvct-social-radar__metric-val">{axis.score}</span>
                </div>
            {/each}
        </div>

        {#if assessment.highlights.length > 0}
            <div class="lvct-social-radar__highlights fn__flex">
                {#each assessment.highlights as hl (hl)}
                    <span class="ft__smaller ft__on-surface lvct-social-radar__hl-tag">✨ {hl}</span>
                {/each}
            </div>
        {/if}
    </div>
</div>
