/**
 * 局部社交网络拓扑雷达纯函数计算（Mini Relation Radar Topology）：
 * 计算以当前人物为核心的 1-2 度微型人脉星系辐射布局坐标与连线。
 * 纯函数，零外部依赖（严格遵守 domain/ 架构约束）。
 */

export interface RadarNodePosition {
    index: number;
    x: number;
    y: number;
    angle: number;
}

/**
 * 环形星系轨道坐标计算：
 * 将 N 个相关人均匀分布在以中心人物为原点的轨道环上。
 */
export function computeRadarPositions(
    count: number,
    width = 360,
    height = 220,
    radius = 75,
): RadarNodePosition[] {
    const safeCount = Math.max(0, Math.min(count, 12));
    if (safeCount === 0) return [];

    const centerX = Math.round(width / 2);
    const centerY = Math.round(height / 2);
    const result: RadarNodePosition[] = [];

    for (let i = 0; i < safeCount; i++) {
        const angle = safeCount === 1
            ? -Math.PI / 2
            : (2 * Math.PI * i) / safeCount - Math.PI / 2;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        result.push({ index: i, x, y, angle });
    }

    return result;
}
