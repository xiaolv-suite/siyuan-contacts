<script lang="ts">
    import type { ContactSummary } from "../../domain/person";
    import { computeRadarPositions } from "../../domain/radar-topology.ts";
    import { Sparkles } from "@lucide/svelte";

    let {
        current,
        related = [],
        onNavigate,
    }: {
        current: ContactSummary;
        related: readonly ContactSummary[];
        onNavigate: (person: ContactSummary) => void;
    } = $props();

    let hoveredIndex = $state<number | null>(null);

    const width = 360;
    const height = 220;
    const centerX = 180;
    const centerY = 110;
    const radius = 75;

    const positions = $derived(computeRadarPositions(related.length, width, height, radius));
    const nodes = $derived.by(() => {
        return positions.map((pos) => {
            const person = related[pos.index];
            return {
                ...pos,
                person,
            };
        });
    });
</script>

<div class="lvct-radar-container" role="region" aria-label={`以 ${current.name} 为核心的微型关系雷达`}>
    <svg viewBox={`0 0 ${width} ${height}`} class="lvct-radar-svg">
        <defs>
            <radialGradient id="lvct-radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="var(--lv-brand, #ea580c)" stop-opacity="0.12" />
                <stop offset="100%" stop-color="var(--lv-brand, #ea580c)" stop-opacity="0" />
            </radialGradient>
        </defs>

        <!-- 背景轨道光晕与同心圆 -->
        <circle cx={centerX} cy={centerY} r={radius + 20} fill="url(#lvct-radar-glow)" />
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="var(--lvct-border-subtle)" stroke-dasharray="3,3" stroke-width="1.2" />
        <circle cx={centerX} cy={centerY} r={radius / 2} fill="none" stroke="var(--lvct-border-subtle)" stroke-dasharray="2,2" stroke-width="0.8" opacity="0.6" />

        <!-- 连线 -->
        {#each nodes as node (node.person.itemId)}
            {@const isHovered = hoveredIndex === node.index}
            <line
                x1={centerX}
                y1={centerY}
                x2={node.x}
                y2={node.y}
                stroke={isHovered ? "var(--lv-brand, #ea580c)" : "var(--lvct-border-subtle)"}
                stroke-width={isHovered ? "2" : "1.2"}
                stroke-opacity={isHovered ? "0.9" : "0.6"}
            />
        {/each}

        <!-- 周围节点 -->
        {#each nodes as node (node.person.itemId)}
            {@const isHovered = hoveredIndex === node.index}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <g
                class="lvct-radar-node"
                role="button"
                tabindex="0"
                style="cursor: pointer;"
                onmouseenter={() => (hoveredIndex = node.index)}
                onmouseleave={() => (hoveredIndex = null)}
                onclick={() => onNavigate(node.person)}
                onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigate(node.person); } }}
            >
                <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? "17" : "15"}
                    fill="var(--lvct-bg-elevated)"
                    stroke={isHovered ? "var(--lv-brand, #ea580c)" : "var(--lvct-border-subtle)"}
                    stroke-width={isHovered ? "2.5" : "1.5"}
                />
                <text
                    x={node.x}
                    y={node.y + 4}
                    text-anchor="middle"
                    fill="var(--lvct-text-1)"
                    font-size="11"
                    font-weight="600"
                    pointer-events="none"
                >
                    {node.person.name.slice(0, 1)}
                </text>
                <text
                    x={node.x}
                    y={node.y > centerY ? node.y + 19 : node.y - 18}
                    text-anchor="middle"
                    fill={isHovered ? "var(--lv-brand, #ea580c)" : "var(--lvct-text-2)"}
                    font-size="10"
                    font-weight={isHovered ? "600" : "400"}
                    pointer-events="none"
                >
                    {node.person.name}
                </text>
            </g>
        {/each}

        <!-- 中心人物节点 -->
        <g class="lvct-radar-center">
            <circle
                cx={centerX}
                cy={centerY}
                r="22"
                fill="var(--lv-brand, #ea580c)"
                stroke="var(--b3-theme-surface, #ffffff)"
                stroke-width="2"
            />
            <text
                x={centerX}
                y={centerY + 5}
                text-anchor="middle"
                fill="#ffffff"
                font-size="13"
                font-weight="700"
                pointer-events="none"
            >
                {current.name.slice(0, 1)}
            </text>
            <text
                x={centerX}
                y={centerY + 34}
                text-anchor="middle"
                fill="var(--lvct-text-1)"
                font-size="11"
                font-weight="600"
                pointer-events="none"
            >
                {current.name} (核心)
            </text>
        </g>
    </svg>

    <div class="ft__smaller ft__on-surface" style="text-align: center; margin-top: -6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
        <Sparkles size={12} strokeWidth={1.6} style="color: var(--lv-brand, #ea580c);" />
        <span>提示：点击雷达网络中的任一节点，可平滑穿透至该好友详情档案</span>
    </div>
</div>

<style>
    .lvct-radar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--lvct-bg-elevated);
        border: 1px solid var(--lvct-border-subtle);
        border-radius: var(--lvct-r-card, 16px);
        box-shadow: 0 1px 4px rgba(28, 24, 21, 0.03);
        padding: 6px 12px;
        margin-bottom: 12px;
    }
    .lvct-radar-svg {
        width: 100%;
        max-width: 380px;
        height: auto;
        overflow: visible;
        user-select: none;
    }
    .lvct-radar-node {
        transition: transform var(--lvct-dur-fast) var(--lvct-ease);
    }
</style>
