// ECharts plumbing shared by the plot views and the report.
// `echarts` (with the ECharts GL extension registered) is a global loaded by
// index.html, like React.

// The chart currently shown in the visualization panel. The panel unmounts its
// plot container when the Summary or Data view is open, so a chart is tied to
// the element it was created in and disposed once a different one takes over.
let live = null;

// Disposal waits for painting to settle: zrender finishes a long paint on later
// animation frames and fails if the chart is disposed in between.
const disposeLater = (chart, observer) => {
    try { observer.disconnect(); } catch (_) { /* already gone */ }
    setTimeout(() => {
        try { chart.dispose(); } catch (_) { /* already gone */ }
    }, 1000);
};

export const disposeLiveChart = () => {
    if (!live) return;
    disposeLater(live.chart, live.observer);
    live = null;
};

const showError = (el, error) => {
    el.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #ff6b6b;
            font-family: monospace;
            padding: 20px;
            text-align: center;
        ">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                Unable to Render Plot
            </div>
            <div style="font-size: 12px; color: #ccc; max-width: 400px;">
                The surface parameters produce extreme values that cannot be visualized.
                Please adjust the parameters to more reasonable values.
            </div>
            <div style="font-size: 11px; color: #888; margin-top: 15px; font-family: monospace;">
                Error: ${(error && error.message) || 'rendering failed'}
            </div>
        </div>
    `;
};

// Option with the size-dependent parts from `layout` merged in, one level deep
// (grid, axes, visualMap are single objects in every option built here).
const withLayout = (option, layout, width, height) => {
    if (!layout) return option;
    const parts = layout(width, height);
    const merged = { ...option };
    for (const key of Object.keys(parts)) {
        merged[key] = (merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key]))
            ? { ...merged[key], ...parts[key] }
            : parts[key];
    }
    return merged;
};

/**
 * Render an option into the visualization panel's plot container.
 * @param {HTMLElement} el - plot container
 * @param {string} kind - chart family ('3d', '2d', 'cross')
 * @param {Object} option - ECharts option
 * @param {Function} [layout] - (width, height) => option parts that depend on
 *   the container size (square plot area, equal axis scales); reapplied on resize
 */
export const renderChart = (el, kind, option, layout = null) => {
    if (!el) return;
    try {
        if (!live || live.el !== el || live.chart.isDisposed()) {
            disposeLiveChart();
            el.innerHTML = '';
            const chart = echarts.init(el);
            const observer = new ResizeObserver(() => {
                if (!live || live.chart !== chart || chart.isDisposed()) return;
                chart.resize();
                if (live.layout) chart.setOption(live.layout(el.clientWidth, el.clientHeight));
            });
            observer.observe(el);
            live = { el, chart, observer, layout };
        }
        live.layout = layout;
        // A GL scene left over from a 3D plot is cleared before a flat plot;
        // merged away instead, its teardown made the next flat plot far slower.
        if (live.kind && live.kind !== kind) live.chart.clear();
        live.kind = kind;
        live.chart.setOption(withLayout(option, layout, el.clientWidth, el.clientHeight), { notMerge: true });
    } catch (error) {
        console.error('Chart rendering error:', error);
        // Disposed now rather than later: disposal empties the container,
        // which would take the error message with it.
        if (live) {
            try { live.observer.disconnect(); live.chart.dispose(); } catch (_) { /* already gone */ }
            live = null;
        }
        showError(el, error);
    }
};

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

/**
 * Render an option offscreen and return it as a PNG data URL (null on failure).
 * Used by the report, which embeds plots as images.
 */
export const chartToImage = async (option, width, height, layout = null) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:-10000px;top:0;width:${width}px;height:${height}px`;
    document.body.appendChild(el);

    let chart = null;
    try {
        // Rendered at 2x so the export below can composite the GL layer: asked
        // for more pixels than the chart has, zrender redraws only 2D elements.
        chart = echarts.init(el, null, { width, height, devicePixelRatio: 2 });
        const finished = new Promise(resolve => chart.on('finished', resolve));
        chart.setOption({ ...withLayout(option, layout, width, height), animation: false });
        await Promise.race([finished, new Promise(resolve => setTimeout(resolve, 5000))]);
        // ECharts GL draws its scene on the frames after the 2D layers report
        // finished; a capture any earlier has the color bar but no surface.
        for (let i = 0; i < 3; i++) await nextFrame();
        return chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
    } catch (error) {
        console.error('Error exporting chart to image:', error);
        return null;
    } finally {
        setTimeout(() => {
            try { if (chart) chart.dispose(); } catch (_) { /* already gone */ }
            el.remove();
        }, 1000);
    }
};
