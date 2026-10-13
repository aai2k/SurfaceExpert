// Plot2DHeatmap - Creates 2D heatmap using ECharts

import { getGridColor } from '../../constants/colorPalettes.js';
import { renderChart } from '../../utils/charts.js';
import { sampleSurfaceGrid, heatmapOption, heatmapLayout } from './chartOptions.js';

/**
 * Create 2D heatmap
 * @param {Object} plotRef - React ref to plot container
 * @param {Object} selectedSurface - Surface object with type and parameters
 * @param {string} activeTab - Current metric tab (sag, slope, asphericity, aberration)
 * @param {string} colorscale - colorscale name
 * @param {Object} c - Color scheme object
 * @param {number} gridSize - Grid size (odd number to ensure point at 0)
 * @param {Object} t - Locale translations object
 */
export const create2DHeatmap = (plotRef, selectedSurface, activeTab, colorscale, c, gridSize = 101, t = null, zernikeUnit = 'mm', wavelength = 632.8) => {
    const units = t?.summary?.units || { mm: 'mm', rad: 'rad' };

    const isZernike = selectedSurface.type === 'Zernike';
    const useWaves = isZernike && zernikeUnit === 'waves';
    const unitScale = useWaves ? 1 / (wavelength * 1e-6) : 1; // wavelength nm -> mm
    const unit = activeTab === 'slope' ? units.rad : (useWaves ? (units.waves || 'waves') : units.mm);

    const metricLabel = t?.visualization?.tabs?.[activeTab]
        || activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

    const grid = sampleSurfaceGrid(selectedSurface, activeTab, gridSize, unitScale);

    renderChart(plotRef.current, '2d', heatmapOption({
        grid,
        unit,
        colorscale,
        colors: c,
        gridColor: getGridColor(c),
        title: `${metricLabel} ${t?.visualization?.heatmap || 'Heatmap'}`,
        metricLabel,
        t
    }), heatmapLayout);
};
