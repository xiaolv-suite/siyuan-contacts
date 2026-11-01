<script lang="ts">
    /**
     * 思源笔记原生 SVG 图标渲染组件：
     * 复用宿主已注入的 SVG Symbol（如 #iconSearch, #iconSettings, #iconAccount 等），
     * 零第三方依赖、线宽与变色 100% 同步宿主，避免外挂违和感。
     */
    let {
        name,
        size = 14,
        class: className = "",
        style = "",
        title = "",
    }: {
        name: string;
        size?: number;
        class?: string;
        style?: string;
        title?: string;
    } = $props();

    const href = $derived(name.startsWith("#") ? name : `#${name}`);
</script>

<svg
    class="lvct-icon {className}"
    aria-hidden={title ? undefined : "true"}
    aria-label={title || undefined}
    style="width: {size}px; height: {size}px; min-width: {size}px; min-height: {size}px; {style}"
>
    <use xlink:href={href}></use>
</svg>

<style>
    .lvct-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        fill: currentColor;
        vertical-align: middle;
        flex-shrink: 0;
    }
</style>
