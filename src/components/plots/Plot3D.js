// Plot3D - Creates 3D surface plot using ECharts GL

import { getGridColor } from '../../constants/colorPalettes.js';
import { renderChart } from '../../utils/charts.js';
import { sampleSurfaceGrid, surface3DOption, surfaceZAspect } from './chartOptions.js';

/**
 * Create 3D surface plot
 * @param {Object} plotRef - React ref to plot container
 * @param {Object} selectedSurface - Surface object with type and parameters
 * @param {string} activeTab - Current metric tab (sag, slope, asphericity, aberration)
 * @param {string} colorscale - colorscale name
 * @param {number} gridSize - Grid size (odd number to ensure point at 0)
 * @param {Object} c - Color palette object
 * @param {Object} t - Locale translations object
 */
export const create3DPlot = (plotRef, selectedSurface, activeTab, colorscale, gridSize = 61, c = null, t = null, zernikeUnit = 'mm', wavelength = 632.8) => {
    // Default colors if palette not provided
    const colors = c || {
        bg: '#2b2b2b',
        panel: '#353535',
        text: '#e0e0e0',
        textDim: '#a0a0a0'
    };
    const units = t?.summary?.units || { mm: 'mm', rad: 'rad' };

    // Zernike unit scaling: waves or mm
    const isZernike = selectedSurface.type === 'Zernike';
    const useWaves = isZernike && zernikeUnit === 'waves';
    const unitScale = useWaves ? 1 / (wavelength * 1e-6) : 1; // wavelength nm -> mm
    const unit = activeTab === 'slope' ? units.rad : (useWaves ? (units.waves || 'waves') : units.mm);

    const grid = sampleSurfaceGrid(selectedSurface, activeTab, gridSize, unitScale);
    const zAspect = surfaceZAspect(activeTab, isZernike, grid.max - grid.min, grid.maxHeight);

    renderChart(plotRef.current, '3d', surface3DOption({
        grid,
        unit,
        colorscale,
        colors,
        gridColor: getGridColor(colors),
        zAspect,
        t
    }));
};
