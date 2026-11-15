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

    const cleanName = $derived(name.startsWith("#") ? name.slice(1) : name);
    const href = $derived(`#${cleanName}`);

    // 对思源本体缺失（如 iconHome）或非 24x24 线性风格（如 iconGraph 900x900 实心块）的图标，直接渲染 24x24 litheness 线性矢量路径
    const lithePaths: Record<string, string> = {
        iconHome: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8 M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
        iconGraph: "M6 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M18 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M8.7 7.8l6.6-1.6 M8.7 10.2l6.6 5.6",
    };
    const inlinePath = $derived(lithePaths[cleanName]);
</script>

{#if inlinePath}
<svg
    class="lvct-icon lvct-icon--line {className}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden={title ? undefined : "true"}
    aria-label={title || undefined}
    style="width: {size}px; height: {size}px; min-width: {size}px; min-height: {size}px; fill: none !important; stroke: currentColor !important; {style}"
>
    <path d={inlinePath} fill="none"></path>
</svg>
{:else}
<svg
    class="lvct-icon {className}"
    aria-hidden={title ? undefined : "true"}
    aria-label={title || undefined}
    style="width: {size}px; height: {size}px; min-width: {size}px; min-height: {size}px; {style}"
>
    <use xlink:href={href}></use>
</svg>
{/if}

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
