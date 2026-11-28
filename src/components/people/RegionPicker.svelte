<script lang="ts">
    import {
        CHINA_REGIONS,
        getCitiesByProvinceCode,
        getDistrictsByCityCode,
        normalizeContactLocation,
        parseChinaRegionFromText,
        type ContactLocation,
        type ContactLocationKind,
    } from "../../domain/china-regions";

    let {
        kind = "resident",
        label = kind === "resident" ? "常住地" : "籍贯",
        value,
        disabled = false,
        onChange,
    }: {
        kind?: ContactLocationKind;
        label?: string;
        value?: ContactLocation;
        disabled?: boolean;
        onChange: (next: ContactLocation | undefined) => void;
    } = $props();

    const resolvedInitial = $derived.by((): ContactLocation | undefined => {
        if (!value) return undefined;
        if (value.provinceCode || value.cityCode || value.districtCode) {
            return normalizeContactLocation(value, kind);
        }
        if (value.rawText) {
            return parseChinaRegionFromText(value.rawText, kind) ?? { kind, rawText: value.rawText };
        }
        return undefined;
    });

    const selectedProvinceCode = $derived(resolvedInitial?.provinceCode ?? "");
    const selectedCityCode = $derived(resolvedInitial?.cityCode ?? "");
    const selectedDistrictCode = $derived(resolvedInitial?.districtCode ?? "");
    const legacyRawText = $derived(value?.rawText?.trim() ?? "");

    const cityOptions = $derived(getCitiesByProvinceCode(selectedProvinceCode));
    const districtOptions = $derived(getDistrictsByCityCode(selectedProvinceCode, selectedCityCode));

    function emitSelection(provinceCode: string, cityCode: string, districtCode: string, keepRawText?: string) {
        if (!provinceCode && !cityCode && !districtCode && !keepRawText) {
            onChange(undefined);
            return;
        }
        const prov = CHINA_REGIONS.find((p) => p.code === provinceCode);
        const city = prov?.cities.find((c) => c.code === cityCode);
        const dist = city?.districts.find((d) => d.code === districtCode);
        onChange({
            kind,
            ...(prov ? { provinceCode: prov.code, provinceName: prov.name } : {}),
            ...(city ? { cityCode: city.code, cityName: city.name } : {}),
            ...(dist ? { districtCode: dist.code, districtName: dist.name } : {}),
            ...(keepRawText ? { rawText: keepRawText } : {}),
        });
    }

    function handleProvinceChange(nextProvCode: string) {
        if (!nextProvCode) {
            emitSelection("", "", "", undefined);
            return;
        }
        const cities = getCitiesByProvinceCode(nextProvCode);
        // 直辖市/特区只有单一城市节点时自动带出市级
        const autoCityCode = cities.length === 1 ? cities[0].code : "";
        emitSelection(nextProvCode, autoCityCode, "", undefined);
    }

    function handleCityChange(nextCityCode: string) {
        emitSelection(selectedProvinceCode, nextCityCode, "", undefined);
    }

    function handleDistrictChange(nextDistCode: string) {
        emitSelection(selectedProvinceCode, selectedCityCode, nextDistCode, undefined);
    }

    function handleClear() {
        onChange(undefined);
    }
</script>

<div class="lvct-region-picker" data-kind={kind}>
    {#if label}
        <div class="lvct-region-picker__head">
            <span class="lvct-region-picker__label">{label}</span>
            {#if selectedProvinceCode || selectedCityCode || legacyRawText}
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small lvct-region-picker__clear"
                    {disabled}
                    onclick={handleClear}
                >清空</button>
            {/if}
        </div>
    {/if}
    <div class="lvct-region-picker__selects">
        <select
            class="b3-select lvct-region-picker__select"
            aria-label={`${label} - 省/直辖市`}
            value={selectedProvinceCode}
            {disabled}
            onchange={(e) => handleProvinceChange(e.currentTarget.value)}
        >
            <option value="">选择省/直辖市…</option>
            {#each CHINA_REGIONS as prov (prov.code)}
                <option value={prov.code}>{prov.name}</option>
            {/each}
        </select>

        <select
            class="b3-select lvct-region-picker__select"
            aria-label={`${label} - 城市`}
            value={selectedCityCode}
            disabled={disabled || !selectedProvinceCode}
            onchange={(e) => handleCityChange(e.currentTarget.value)}
        >
            <option value="">{selectedProvinceCode ? "选择城市…" : "请先选省"}</option>
            {#each cityOptions as city (city.code)}
                <option value={city.code}>{city.name}</option>
            {/each}
        </select>

        <select
            class="b3-select lvct-region-picker__select"
            aria-label={`${label} - 区/县`}
            value={selectedDistrictCode}
            disabled={disabled || !selectedCityCode || districtOptions.length === 0}
            onchange={(e) => handleDistrictChange(e.currentTarget.value)}
        >
            <option value="">{districtOptions.length > 0 ? "区/县（可选）" : "不限区县"}</option>
            {#each districtOptions as dist (dist.code)}
                <option value={dist.code}>{dist.name}</option>
            {/each}
        </select>
    </div>
    {#if legacyRawText}
        <div class="lvct-region-picker__legacy" title="兼容旧自由文本值无损回显">
            <span class="ft__smaller ft__on-surface">原自由文本：{legacyRawText}</span>
        </div>
    {/if}
</div>

<style>
    .lvct-region-picker {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }
    .lvct-region-picker__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    .lvct-region-picker__label {
        font-size: 12.5px;
        font-weight: 500;
        color: var(--lvct-text-2, var(--b3-theme-on-surface));
    }
    .lvct-region-picker__clear {
        font-size: 11px;
        padding: 1px 6px;
    }
    .lvct-region-picker__selects {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
    }
    .lvct-region-picker__select {
        width: 100%;
        min-width: 0;
    }
    .lvct-region-picker__legacy {
        padding: 2px 6px;
        border-radius: var(--lvct-r-sm, 6px);
        background: var(--lvct-bg-surface, var(--b3-theme-surface));
        border: 1px dashed var(--lvct-border-subtle, var(--b3-border-color));
        overflow-wrap: anywhere;
    }
    @media (max-width: 520px) {
        .lvct-region-picker__selects {
            grid-template-columns: 1fr;
        }
        .lvct-region-picker__select {
            font-size: 16px;
            min-height: 38px;
        }
    }
</style>
