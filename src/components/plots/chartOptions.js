// chartOptions - surface sampling and ECharts option builders.
// Shared by the visualization panel (Plot3D, Plot2DHeatmap, PlotCrossSection)
// and the report, so both draw the same plots from the same numbers.

import { calculateSurfaceValues } from '../../utils/calculations.js';
import { sanitizeValue } from '../../utils/dataSanitization.js';
import { parseNumber } from '../../utils/numberParsing.js';
import { colorscaleColors } from '../../constants/colorscales.js';

const FONT = 'Segoe UI, Roboto, sans-serif';

// Tick precision follows the magnitude of the range being shown. A wavefront
// in waves spans hundreds, while a sag in mm is often a few microns; one fixed
// precision either drops the small case to zero or prints seven meaningless
// decimals on the large one.
export const decimalsFor = (span) => span >= 100 ? 0
    : span >= 1 ? 2
    : span >= 0.01 ? 4
    : 7;

// Coordinates in mm, without trailing zeros.
const formatCoord = (v) => String(Number(Number(v).toFixed(4)));

const valuesAt = (surface, r, x, y) =>
    (surface.type === 'Irregular' || surface.type === 'Zernike')
        ? calculateSurfaceValues(r, surface, x, y)
        : calculateSurfaceValues(r, surface);

/**
 * Sample one metric on a square grid covering the clear aperture.
 * values[j * size + i] belongs to (coords[i], coords[j]); null outside the aperture.
 * @param {Object} surface - surface with type and parameters
 * @param {string} metric - key of calculateSurfaceValues' result (sag, slope, ...)
 * @param {number} size - points per side (odd, so the grid has a point at 0)
 * @param {number} unitScale - factor applied to every value (mm -> waves)
 */
export const sampleSurfaceGrid = (surface, metric, size, unitScale = 1) => {
    const minHeight = parseNumber(surface.parameters['Min Height']);
    const maxHeight = parseNumber(surface.parameters['Max Height']);
    const coords = [];
    for (let i = 0; i < size; i++) {
        coords.push(-maxHeight + (i * (2 * maxHeight)) / (size - 1));
    }

    const values = new Array(size * size).fill(null);
    let min = Infinity;
    let max = -Infinity;
    for (let j = 0; j < size; j++) {
        const y = coords[j];
        for (let i = 0; i < size; i++) {
            const x = coords[i];
            const r = Math.sqrt(x * x + y * y);
            if (r < minHeight || r > maxHeight) continue;
            const v = sanitizeValue(valuesAt(surface, r, x, y)[metric]) * unitScale;
            values[j * size + i] = v;
            if (v < min) min = v;
            if (v > max) max = v;
        }
    }
    return { size, coords, values, min, max, maxHeight };
};

/**
 * Sample one metric along a line through the center, from -maxHeight to
 * +maxHeight in `step` increments. Zernike and Irregular surfaces are cut
 * along their Scan Angle. y is null outside the aperture.
 */
export const sampleCrossSection = (surface, metric, unitScale = 1) => {
    const minHeight = parseNumber(surface.parameters['Min Height']);
    const maxHeight = parseNumber(surface.parameters['Max Height']);
    const rawStep = parseNumber(surface.parameters['Step']);
    const step = rawStep > 0 ? rawStep : (maxHeight / 50 || 1);
    const angle = parseNumber(surface.parameters['Scan Angle']) * Math.PI / 180;

    const x = [];
    for (let r = -maxHeight; r < maxHeight; r += step) x.push(r);
    if (x[x.length - 1] !== maxHeight) x.push(maxHeight);

    const y = x.map(r => {
        const absR = Math.abs(r);
        if (absR < minHeight || absR > maxHeight) return null;
        const values = valuesAt(surface, absR, r * Math.cos(angle), r * Math.sin(angle));
        return sanitizeValue(values[metric]) * unitScale;
    });
    return { x, y };
};

// Value range for a color scale; never empty, so a flat surface still maps.
const colorRange = (min, max) => {
    if (!(min <= max)) return { low: 0, high: 1 };
    if (min === max) {
        const epsilon = Math.abs(min) * 0.01 || 0.01;
        return { low: min - epsilon, high: max + epsilon };
    }
    return { low: min, high: max };
};

const saveAsImage = (colors, title) => ({
    show: true,
    right: 8,
    top: 4,
    iconStyle: { borderColor: colors.textDim },
    // No pixelRatio above the screen's: zrender would then redraw only 2D
    // elements and drop the GL scene of a 3D plot.
    feature: { saveAsImage: { title, backgroundColor: colors.panel || colors.bg } }
});

/**
 * 3D surface (ECharts GL). The surface is drawn baseline-zeroed: a large piston
 * (e.g. Z1=1 -> ~1580 mm base sag) next to a variation of microns would lose the
 * variation to float precision in WebGL. Axis and color bar labels add the
 * offset back, so they show true values.
 */
export const surface3DOption = ({ grid, unit, colorscale, colors, gridColor, zAspect, interactive = true, t = null }) => {
    const { size, coords, values, maxHeight } = grid;
    const { low, high } = colorRange(grid.min, grid.max);
    const span = high - low;
    const decimals = decimalsFor(span);
    const label = (v) => (v + low).toFixed(decimals);

    const data = new Array(size * size);
    for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
            const v = values[j * size + i];
            data[j * size + i] = [coords[i], coords[j], v === null ? '-' : v - low];
        }
    }

    // The flattened views leave only a sliver of vertical space, so the tick
    // count scales with the visible height.
    const zTicks = zAspect <= 0.2 ? 1 : zAspect <= 0.4 ? 2 : 5;

    const axis = (name) => ({
        type: 'value',
        name,
        nameTextStyle: { color: colors.text, fontFamily: FONT },
        axisLine: { lineStyle: { color: colors.textDim } },
        axisLabel: { textStyle: { color: colors.text, fontFamily: FONT, fontSize: 11 } },
        splitLine: { lineStyle: { color: gridColor } }
    });

    return {
        backgroundColor: 'transparent',
        tooltip: interactive ? {
            formatter: (p) => `x: ${formatCoord(p.value[0])}<br>y: ${formatCoord(p.value[1])}<br>`
                + `${(p.value[2] + low).toFixed(7)} ${unit}`
        } : undefined,
        toolbox: interactive ? saveAsImage(colors, t?.visualization?.saveImage || 'Save image') : undefined,
        visualMap: {
            type: 'continuous',
            dimension: 2,
            seriesIndex: 0,
            min: 0,
            max: span,
            inRange: { color: colorscaleColors(colorscale) },
            calculable: false,
            right: 16,
            top: 'middle',
            itemWidth: 12,
            itemHeight: 200,
            text: [`${label(span)} ${unit}`, label(0)],
            textGap: 6,
            textStyle: { color: colors.text, fontFamily: FONT, fontSize: 11 }
        },
        xAxis3D: { ...axis('x'), min: -maxHeight, max: maxHeight, axisLabel: { ...axis('x').axisLabel, formatter: formatCoord } },
        yAxis3D: { ...axis('y'), min: -maxHeight, max: maxHeight, axisLabel: { ...axis('y').axisLabel, formatter: formatCoord } },
        // Ticks at exact fractions of the range, so the top one is the maximum
        // rather than a rounded value crowding it.
        // The bottom tick sits on the box corner where the x and y labels end,
        // so it stays unlabeled; the color bar shows the minimum.
        zAxis3D: { ...axis('z'), nameGap: 35, min: 0, max: span, interval: span / zTicks, axisLabel: { ...axis('z').axisLabel, formatter: (v) => (v === 0 ? '' : label(v)) } },
        grid3D: {
            boxWidth: 100,
            boxDepth: 100,
            boxHeight: 100 * zAspect,
            right: 90,
            axisPointer: { show: false },
            // Left-drag rotates at twice the ECharts GL default speed
            // (a drag across the plot's height turns it about 180 degrees).
            viewControl: { alpha: 30, beta: 40, distance: 220, animation: false, rotateSensitivity: 2 },
            light: { main: { intensity: 1.0, alpha: 40, beta: 30 }, ambient: { intensity: 0.5 } },
            postEffect: { enable: false },
            temporalSuperSampling: { enable: false }
        },
        series: [{
            type: 'surface',
            data,
            dataShape: [size, size],
            shading: 'lambert',
            wireframe: { show: false },
            silent: !interactive
        }]
    };
};

// Rounded tick interval giving about `count` intervals over `span`.
const niceInterval = (span, count) => {
    const raw = span / count;
    if (!(raw > 0)) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / magnitude;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
};

const hexToRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/**
 * Paint the grid into a canvas, one block of `scale` x `scale` pixels per
 * cell, colored like the visualMap. Drawn as a single image, a 257 x 257 map
 * costs one drawImage instead of 66k rectangles. The blocks keep cells crisp
 * when the image is scaled to the plot area, as a heatmap shows them.
 */
const paintHeatmap = (grid, low, high, colorscale) => {
    const { size, values } = grid;
    const palette = colorscaleColors(colorscale, 256).map(hexToRgb);
    const scale = Math.max(1, Math.ceil(1024 / size));
    const cells = document.createElement('canvas');
    cells.width = size;
    cells.height = size;
    const ctx = cells.getContext('2d');
    const image = ctx.createImageData(size, size);
    const span = high - low || 1;
    for (let j = 0; j < size; j++) {
        // Canvas rows run top-down; grid rows run from -y up to +y.
        const row = (size - 1 - j) * size;
        for (let i = 0; i < size; i++) {
            const v = values[j * size + i];
            if (v === null) continue;
            const k = Math.min(255, Math.max(0, Math.round(((v - low) / span) * 255)));
            const p = (row + i) * 4;
            image.data[p] = palette[k][0];
            image.data[p + 1] = palette[k][1];
            image.data[p + 2] = palette[k][2];
            image.data[p + 3] = 255;
        }
    }
    ctx.putImageData(image, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const big = canvas.getContext('2d');
    big.imageSmoothingEnabled = false;
    big.drawImage(cells, 0, 0, canvas.width, canvas.height);
    return canvas;
};

/**
 * 2D heatmap. The map is one image placed in data coordinates; an invisible
 * scatter of the cells (ECharts' large mode, a single path) carries the hover
 * tooltip. heatmapLayout keeps the plot area square.
 */
export const heatmapOption = ({ grid, unit, colorscale, colors, gridColor, title, metricLabel, interactive = true, t = null }) => {
    const { size, coords, values, maxHeight } = grid;
    const { low, high } = colorRange(grid.min, grid.max);
    const decimals = decimalsFor(high - low);
    const mm = t?.summary?.units?.mm || 'mm';

    // Each cell is centered on its grid point, so the map reaches half a cell
    // past the aperture on every side.
    const half = size > 1 ? maxHeight / (size - 1) : maxHeight || 1;
    const edge = maxHeight + half;
    // Ticks at multiples of a round interval, through 0. Left to itself, an
    // axis with a fixed minimum counts its ticks from that minimum instead.
    const interval = niceInterval(2 * maxHeight, 8);
    const ticks = [];
    for (let k = -Math.floor(maxHeight / interval + 1e-9); k * interval <= maxHeight + 1e-9; k++) {
        ticks.push(Number((k * interval).toFixed(10)));
    }

    const image = paintHeatmap(grid, low, high, colorscale);

    const cells = [];
    for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
            const v = values[j * size + i];
            if (v !== null) cells.push([coords[i], coords[j], v]);
        }
    }

    const axis = (name) => ({
        type: 'value',
        name,
        nameLocation: 'middle',
        nameGap: 32,
        min: -edge,
        max: edge,
        nameTextStyle: { color: colors.text, fontFamily: FONT },
        axisLine: { onZero: false, lineStyle: { color: colors.textDim } },
        axisTick: { customValues: ticks, lineStyle: { color: colors.textDim } },
        axisLabel: { customValues: ticks, color: colors.text, fontFamily: FONT, fontSize: 11, formatter: formatCoord },
        splitLine: { lineStyle: { color: gridColor } }
    });

    return {
        backgroundColor: colors.panel,
        title: {
            text: title,
            left: 'center',
            top: 10,
            textStyle: { color: colors.text, fontFamily: FONT, fontSize: 14, fontWeight: 'normal' }
        },
        tooltip: interactive ? {
            formatter: (p) => `X: ${p.value[0].toFixed(4)} ${mm}<br>Y: ${p.value[1].toFixed(4)} ${mm}<br>`
                + `${metricLabel}: ${p.value[2].toFixed(7)} ${unit}`
        } : undefined,
        toolbox: interactive ? saveAsImage(colors, t?.visualization?.saveImage || 'Save image') : undefined,
        dataZoom: interactive ? [{ type: 'inside', xAxisIndex: 0, yAxisIndex: 0, filterMode: 'none' }] : undefined,
        grid: { show: true, backgroundColor: colors.bg, borderWidth: 0 },
        xAxis: axis(t?.visualization?.xMm || 'X (mm)'),
        yAxis: axis(t?.visualization?.yMm || 'Y (mm)'),
        visualMap: {
            type: 'continuous',
            min: low,
            max: high,
            // Drives the color bar only; the map is painted in paintHeatmap.
            seriesIndex: 1,
            dimension: 2,
            inRange: { color: colorscaleColors(colorscale) },
            calculable: false,
            hoverLink: false,
            itemWidth: 12,
            text: [`${high.toFixed(decimals)} ${unit}`, low.toFixed(decimals)],
            textGap: 6,
            textStyle: { color: colors.text, fontFamily: FONT, fontSize: 11 }
        },
        series: [
            {
                type: 'custom',
                silent: true,
                clip: true,
                data: [0],
                renderItem: (params, api) => {
                    const [x0, y0] = api.coord([-edge, edge]);
                    const [x1, y1] = api.coord([edge, -edge]);
                    return { type: 'image', style: { image, x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
                }
            },
            {
                type: 'scatter',
                data: cells,
                large: true,
                largeThreshold: 0,
                symbol: 'rect',
                symbolSize: 8,
                itemStyle: { opacity: 0 },
                emphasis: { disabled: true },
                silent: !interactive
            }
        ]
    };
};

// Square plot area centered in the space left by the title, axis names and color bar.
export const heatmapLayout = (width, height) => {
    const margin = { left: 75, right: 120, top: 45, bottom: 55 };
    const availW = Math.max(width - margin.left - margin.right, 50);
    const availH = Math.max(height - margin.top - margin.bottom, 50);
    const side = Math.min(availW, availH);
    const left = margin.left + (availW - side) / 2;
    const top = margin.top + (availH - side) / 2;
    return {
        grid: { left, top, width: side, height: side },
        visualMap: { left: left + side + 24, top: top + side * 0.15, itemHeight: side * 0.7 }
    };
};

/**
 * Cross-section line plot. With `equalAspect`, crossSectionLayout gives both
 * axes the same scale (mm per pixel), so a sag profile shows its true shape.
 */
export const crossSectionOption = ({ section, unit, metricLabel, colors, gridColor, lineColor, equalAspect = false, interactive = true, t = null }) => {
    const { x, y } = section;
    const finite = y.filter(v => v !== null && Number.isFinite(v));
    const span = finite.length ? Math.max(...finite) - Math.min(...finite) : 0;
    const decimals = decimalsFor(span);
    const mm = t?.summary?.units?.mm || 'mm';

    const axis = (name, nameGap) => ({
        type: 'value',
        name,
        nameLocation: 'middle',
        nameGap,
        nameTextStyle: { color: colors.text, fontFamily: FONT },
        axisLine: { onZero: false, lineStyle: { color: colors.textDim } },
        axisTick: { lineStyle: { color: colors.textDim } },
        axisLabel: { color: colors.text, fontFamily: FONT, fontSize: 11, showMinLabel: !equalAspect, showMaxLabel: !equalAspect },
        splitLine: { lineStyle: { color: gridColor } }
    });

    return {
        backgroundColor: colors.panel,
        grid: { left: 40 + 7 * (decimals + 4), right: 30, top: 40, bottom: 60, show: true, backgroundColor: colors.bg, borderWidth: 0 },
        tooltip: interactive ? {
            trigger: 'axis',
            formatter: (params) => {
                const p = params[0];
                if (!p || p.value[1] === '-' || p.value[1] === null) return '';
                return `${formatCoord(p.value[0])} ${mm}<br>${metricLabel}: ${Number(p.value[1]).toFixed(7)} ${unit}`;
            }
        } : undefined,
        toolbox: interactive ? {
            ...saveAsImage(colors, t?.visualization?.saveImage || 'Save image'),
            feature: {
                dataZoom: { title: { zoom: t?.visualization?.zoom || 'Zoom', back: t?.visualization?.zoomReset || 'Reset zoom' } },
                saveAsImage: saveAsImage(colors, t?.visualization?.saveImage || 'Save image').feature.saveAsImage
            }
        } : undefined,
        xAxis: { ...axis(t?.visualization?.radialCoordinate || 'Radial Coordinate (mm)', 32), min: x[0], max: x[x.length - 1] },
        yAxis: { ...axis(`${metricLabel} (${unit})`, 25 + 7 * (decimals + 3)), scale: true, axisLabel: { ...axis('', 0).axisLabel, formatter: (v) => v.toFixed(decimals) } },
        series: [{
            type: 'line',
            data: x.map((xi, k) => [xi, y[k] === null ? '-' : y[k]]),
            showSymbol: false,
            connectNulls: false,
            lineStyle: { color: lineColor, width: 2 },
            itemStyle: { color: lineColor },
            animation: false
        }]
    };
};

export const crossSectionLayout = (section, option) => (width, height) => {
    const g = option.grid;
    const plotW = Math.max(width - g.left - g.right, 10);
    const plotH = Math.max(height - g.top - g.bottom, 10);
    const { x, y } = section;
    const finite = y.filter(v => v !== null && Number.isFinite(v));
    if (!finite.length) return {};
    const xMin = x[0], xMax = x[x.length - 1];
    const yMin = Math.min(...finite), yMax = Math.max(...finite);
    const perPixel = Math.max((xMax - xMin) / plotW, (yMax - yMin) / plotH) || 1;
    const xc = (xMin + xMax) / 2;
    const yc = (yMin + yMax) / 2;
    // Label precision follows the axis range shown, which here can be far
    // wider than the data's own range.
    const decimals = decimalsFor(perPixel * plotH);
    return {
        xAxis: { min: xc - perPixel * plotW / 2, max: xc + perPixel * plotW / 2 },
        yAxis: {
            min: yc - perPixel * plotH / 2,
            max: yc + perPixel * plotH / 2,
            scale: false,
            axisLabel: { ...option.yAxis.axisLabel, formatter: (v) => v.toFixed(decimals) }
        }
    };
};

/**
 * Height of the 3D box relative to its width:
 * - non-sag metrics: a cube
 * - Zernike sag: a fixed thin slab (0.15), the interferometer-style view; the
 *   true ratio (microns of Z over mm of XY) would draw a flat plate
 * - other sag: the physical ratio, clamped to [0.05, 1]
 */
export const surfaceZAspect = (metric, isZernike, span, maxHeight) => {
    if (metric !== 'sag') return 1;
    if (isZernike) return 0.15;
    const ratio = span / (2 * maxHeight || 1);
    if (!isFinite(ratio) || ratio < 1e-6) return 0.15;
    return Math.min(Math.max(ratio, 0.05), 1);
};
