// PlotCrossSection - Creates cross-section line plot using ECharts
// Plots metric values along a radial line from -maxHeight to +maxHeight

import { getGridColor } from '../../constants/colorPalettes.js';
import { renderChart } from '../../utils/charts.js';
import { sampleCrossSection, crossSectionOption, crossSectionLayout } from './chartOptions.js';

/**
 * Create cross-section line plot
 * @param {Object} plotRef - React ref to plot container
 * @param {Object} selectedSurface - Surface object with type and parameters
 * @param {string} activeTab - Current metric tab (sag, slope, asphericity, asphericityZ, aberration)
 * @param {Object} c - Color palette object
 * @param {Object} t - Locale translations object
 */
export const createCrossSection = (plotRef, selectedSurface, activeTab, c = null, t = null, zernikeUnit = 'mm', wavelength = 632.8) => {
    // Default colors if palette not provided
    const colors = c || {
        bg: '#2b2b2b',
        panel: '#353535',
        text: '#e0e0e0',
        textDim: '#a0a0a0',
        accent: '#4a90e2'
    };
    const units = t?.summary?.units || { mm: 'mm', rad: 'rad' };

    const isZernike = selectedSurface.type === 'Zernike';
    const useWaves = isZernike && zernikeUnit === 'waves';
    const unitScale = useWaves ? 1 / (wavelength * 1e-6) : 1; // wavelength nm -> mm
    const unit = activeTab === 'slope' ? units.rad : (useWaves ? (units.waves || 'waves') : units.mm);

    const metricLabel = t?.visualization?.tabs?.[activeTab]
        || activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

    const section = sampleCrossSection(selectedSurface, activeTab, unitScale);

    // Sag on non-Zernike surfaces keeps a 1:1 scale with the radial distance,
    // which is physically meaningful. A Zernike sag is microns over a mm-scale
    // aperture; at 1:1 its irregularities would be invisible.
    const equalAspect = activeTab === 'sag' && !isZernike;
    const option = crossSectionOption({
        section,
        unit,
        metricLabel,
        colors,
        gridColor: getGridColor(colors),
        lineColor: colors.accent,
        equalAspect,
        t
    });

    renderChart(plotRef.current, 'cross', option, equalAspect ? crossSectionLayout(section, option) : null);
};
