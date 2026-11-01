import type cytoscape from "cytoscape";

export interface SvgExportOptions {
    bg?: string;
    padding?: number;
    title?: string;
}

export interface PngExportOptions {
    bg?: string;
    scale?: number;
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "'": return "&apos;";
            case '"': return "&quot;";
            default: return c;
        }
    });
}

/**
 * 将当前 Cytoscape 图谱实例导出为清晰矢量 SVG 格式字符串
 */
export function exportCytoscapeSvg(cy: cytoscape.Core, options: SvgExportOptions = {}): string {
    const nodes = cy.nodes();
    const edges = cy.edges();
    if (nodes.length === 0) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><text x="200" y="150" text-anchor="middle" fill="#888">图谱无节点</text></svg>';
    }

    const bb = cy.elements().boundingBox();
    const padding = options.padding ?? 40;
    const minX = Math.floor(bb.x1 - padding);
    const minY = Math.floor(bb.y1 - padding);
    const width = Math.max(100, Math.ceil(bb.w + padding * 2));
    const height = Math.max(100, Math.ceil(bb.h + padding * 2));

    const bgRect = options.bg ? `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${escapeXml(options.bg)}" />` : "";

    // 绘制边
    const edgeSvgLines: string[] = [];
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const src = edge.source();
        const tgt = edge.target();
        if (!src.length || !tgt.length) continue;
        const p1 = src.position();
        const p2 = tgt.position();
        const kind = edge.data("kind") || "related";
        const isDashed = kind === "member" || kind === "co_occurrence" || kind === "introducer";
        const strokeColor = edge.data("themeEdge") || "#94a3b8";
        const strokeWidth = kind === "member" ? "1.5" : "2";
        const dashArray = kind === "member" ? 'stroke-dasharray="4,4"' : kind === "co_occurrence" ? 'stroke-dasharray="3,3"' : isDashed ? 'stroke-dasharray="5,3"' : "";
        const markerEnd = kind === "introducer" ? 'marker-end="url(#arrow)"' : "";

        edgeSvgLines.push(
            `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${escapeXml(strokeColor)}" stroke-width="${strokeWidth}" ${dashArray} ${markerEnd} />`
        );
    }

    // 绘制节点
    const nodeSvgLines: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pos = node.position();
        const label = node.data("label") || "";
        const color = node.data("color") || "#ea580c";
        const kind = node.data("kind") || "person";
        const degree = Number(node.data("degree")) || 0;
        const radius = Math.max(12, Math.min(26, 14 + degree * 2));

        if (kind === "org") {
            const side = radius * 2;
            const x = (pos.x - radius).toFixed(1);
            const y = (pos.y - radius).toFixed(1);
            nodeSvgLines.push(
                `<rect x="${x}" y="${y}" width="${side}" height="${side}" rx="4" fill="${escapeXml(color)}" stroke="#ffffff" stroke-width="2" />`
            );
        } else {
            nodeSvgLines.push(
                `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${radius}" fill="${escapeXml(color)}" stroke="#ffffff" stroke-width="2" />`
            );
        }

        if (label) {
            const textY = (pos.y + radius + 14).toFixed(1);
            nodeSvgLines.push(
                `<text x="${pos.x.toFixed(1)}" y="${textY}" text-anchor="middle" font-size="12" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" fill="#1e293b">${escapeXml(label)}</text>`
            );
        }
    }

    return [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">`,
        `  <defs>`,
        `    <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
        `      <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />`,
        `    </marker>`,
        `  </defs>`,
        bgRect ? `  ${bgRect}` : "",
        `  <g class="edges">${edgeSvgLines.join("")}</g>`,
        `  <g class="nodes">${nodeSvgLines.join("")}</g>`,
        `</svg>`,
    ].filter(Boolean).join("\n");
}

/**
 * 将当前 Cytoscape 图谱实例导出为高分辨率 PNG Data URL
 */
export function exportCytoscapePng(cy: cytoscape.Core, options: PngExportOptions = {}): string {
    return cy.png({
        full: true,
        scale: options.scale ?? 2,
        bg: options.bg,
    });
}
