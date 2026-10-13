// ============================================
// PropertiesPanel Component
// ============================================
// Right sidebar panel showing surface properties and controls.
// Compact property grid styled like the explorer: collapsible sections,
// one 24px row per parameter with the label on the left and the value on the right.

import { surfaceTypes, universalParameters, zernikeNames, zernikeGroups } from '../../constants/surfaceTypes.js';
import { formatValue, degreesToDMS } from '../../utils/formatters.js';
import { calculateSurfaceMetrics } from '../../utils/calculations.js';
import { PropertySection } from '../ui/PropertySection.js';
import { PropertyRow } from '../ui/PropertyRow.js';
import { DebouncedInput } from '../ui/DebouncedInput.js';
import { SurfaceActionButtons, ActionButton } from '../ui/SurfaceActionButtons.js';

const { createElement: h } = React;

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const PANEL_WIDTH = 280;
const LABEL_WIDTH = 96;

// Scan and coordinate parameters of non-rotationally symmetric surfaces
const SCAN_PARAMS = ['Scan Angle', 'X Coordinate', 'Y Coordinate'];
const ZERNIKE_TERMS = Array.from({ length: 37 }, (_, i) => `Z${i + 1}`);

// Collapsed sections are remembered per browser profile
const COLLAPSED_KEY = 'surfaceexpert-properties-collapsed';

const loadCollapsed = () => {
    try {
        return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {};
    } catch (e) {
        return {};
    }
};

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const inputStyle = (c) => ({
    flex: 1,
    minWidth: 0,
    height: 22,
    padding: '0 6px',
    backgroundColor: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`,
    borderRadius: 2,
    fontSize: 12,
    fontFamily: FONT,
    textAlign: 'right'
});

const FieldRow = ({ label, children, c }) =>
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, height: 24 } },
        h('label', {
            title: label,
            style: { width: LABEL_WIDTH, flexShrink: 0, fontSize: 12, color: c.textDim, fontFamily: FONT, ...ellipsis }
        }, label),
        children
    );

const Divider = ({ c }) => h('div', { style: { height: 1, backgroundColor: c.border, margin: '4px 0', opacity: 0.6 } });

// Toggle for a group of Zernike terms: filled when all are on, dashed when some are
const GroupChip = ({ label, state, title, onClick, c }) =>
    h('button', {
        onClick,
        title,
        'aria-pressed': state === 'mixed' ? 'mixed' : String(state === 'on'),
        style: {
            height: 20,
            padding: '0 7px',
            borderRadius: 10,
            border: `1px ${state === 'mixed' ? 'dashed' : 'solid'} ${state === 'off' ? c.border : c.accent}`,
            backgroundColor: state === 'on' ? c.accent + '33' : 'transparent',
            color: state === 'off' ? c.textDim : c.text,
            fontSize: 11,
            fontFamily: FONT,
            cursor: 'pointer'
        }
    }, label);

export const PropertiesPanel = ({
    selectedSurface,
    updateSurfaceName,
    updateSurfaceType,
    updateParameter,
    updateParameters,
    onConvert,
    onFastConvertToPoly,
    fastConvertProgress,
    wavelength,
    propertiesPanelRef,
    scrollPositionRef,
    handlePropertiesPanelScroll,
    handleEnterKeyNavigation,
    handleExportHTMLReport,
    handleExportPDFReport,
    handleInvertSurface,
    handleNormalizeUnZ,
    handleConvertToUnZ,
    handleConvertToPoly,
    handleFlipX,
    handleFlipY,
    handleFlipZ,
    handleRotate90CCW,
    handleRotate90CW,
    handleCopyCoefficients,
    c,
    t
}) => {
    // Local state for surface name to avoid interrupting typing
    const [localName, setLocalName] = React.useState(selectedSurface?.name || '');
    const [collapsed, setCollapsed] = React.useState(loadCollapsed);

    // Update local name when selected surface changes
    React.useEffect(() => {
        if (selectedSurface) {
            setLocalName(selectedSurface.name);
        }
    }, [selectedSurface?.id]);

    const toggleSection = (key) => {
        const next = { ...collapsed, [key]: !collapsed[key] };
        setCollapsed(next);
        try {
            localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
        } catch (e) {
            // Storage unavailable: the state just isn't remembered
        }
    };

    const section = (key, title, children, aside) =>
        h(PropertySection, { title, collapsed: !!collapsed[key], onToggle: () => toggleSection(key), aside, c }, children);

    if (!selectedSurface) {
        return h('div', {
            style: {
                width: PANEL_WIDTH,
                flexShrink: 0,
                backgroundColor: c.panel,
                borderLeft: `1px solid ${c.border}`,
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.textDim,
                fontSize: '13px'
            }
        }, t.properties.noSurfaceSelected);
    }

    const type = selectedSurface.type;
    const params = selectedSurface.parameters;
    const isZernike = type === 'Zernike';
    const rotationallySymmetric = type !== 'Zernike' && type !== 'Irregular';

    // Calculate metrics for display using shared utility function
    const rawMetrics = calculateSurfaceMetrics(selectedSurface, wavelength);
    const units = t.summary.units;
    const metricRows = rotationallySymmetric ? [
        [t.properties.paraxialFNum, formatValue(rawMetrics.paraxialFNum)],
        [t.properties.workingFNum, formatValue(rawMetrics.workingFNum)],
        [t.properties.maxSag, `${formatValue(rawMetrics.maxSag)} ${units.mm}`],
        [t.properties.maxSlope, `${formatValue(rawMetrics.maxSlope)} ${units.rad}`],
        [t.properties.maxAngle, `${formatValue(rawMetrics.maxAngle)} ${units.deg}`],
        [`${t.properties.maxAngle} (DMS)`, degreesToDMS(rawMetrics.maxAngle)],
        [t.properties.maxAsphericity, `${formatValue(rawMetrics.maxAsphericity)} ${units.mm}`],
        [t.properties.maxAsphericityZ, `${formatValue(rawMetrics.maxAsphericityZ)} ${units.mm}`],
        [t.properties.maxAsphGradient, `${formatValue(rawMetrics.maxAsphGradient)} ${units.perMm}`],
        [t.properties.bestFitSphere, `${formatValue(rawMetrics.bestFitSphere)} ${units.mm}`]
    ] : [
        [t.properties.maxSag, `${formatValue(rawMetrics.maxSag)} ${units.mm}`],
        // RMS and P-V error for Zernike and Irregular surfaces
        ...(rawMetrics.rmsError !== null ? [
            [`${t.properties.rmsError} (${units.mm})`, `${formatValue(rawMetrics.rmsError.mm)} ${units.mm}`],
            [`${t.properties.rmsError} (${units.waves})`, `${formatValue(rawMetrics.rmsError.waves)} λ`]
        ] : []),
        ...(rawMetrics.pvError !== null ? [
            [`${t.properties.pvError} (${units.mm})`, `${formatValue(rawMetrics.pvError.mm)} ${units.mm}`],
            [`${t.properties.pvError} (${units.waves})`, `${formatValue(rawMetrics.pvError.waves)} λ`]
        ] : [])
    ];

    const paramField = (param, label) =>
        h(FieldRow, { key: param, label, c },
            h(DebouncedInput, {
                'data-param': param,
                value: params[param] || '0',
                onChange: (value) => updateParameter(param, value),
                onEnterKey: () => handleEnterKeyNavigation(param),
                debounceMs: 300,
                style: inputStyle(c)
            })
        );

    const universalFields = universalParameters[type]
        .filter(param => params[param] !== undefined)
        .map(param => paramField(param, t.parameters[param] || param));

    // Scan & coordinates for non-rotationally symmetric surfaces
    const scanFields = rotationallySymmetric ? [] : SCAN_PARAMS
        .filter(param => params[param] !== undefined)
        .map(param => paramField(param, t.parameters[param] || param));

    // Remaining surface-specific parameters; Zernike Z1–Z37 get their own section
    const specificFields = surfaceTypes[type]
        .filter(param => !SCAN_PARAMS.includes(param) && !(isZernike && /^Z\d+$/.test(param)))
        .map(param => paramField(param, t.parameters[param] || param));

    // Zernike terms: per-term and per-group enable/disable
    const isEnabled = (term) => params[`${term}_enabled`] !== 'false';
    const setTermsEnabled = (terms, on) =>
        updateParameters(Object.fromEntries(terms.map(term => [`${term}_enabled`, on ? 'true' : 'false'])));
    const enabledCount = ZERNIKE_TERMS.filter(isEnabled).length;
    const groupState = (terms) => {
        const on = terms.filter(isEnabled).length;
        return on === terms.length ? 'on' : on === 0 ? 'off' : 'mixed';
    };

    const zernikeSection = isZernike && section('zernike', t.properties.zernikeCoefficients, [
        // Check/uncheck all terms
        h('div', { key: 'all', style: { display: 'flex', alignItems: 'center', gap: 6, height: 24 } },
            h('input', {
                type: 'checkbox',
                id: 'zernike-all-terms',
                checked: enabledCount === ZERNIKE_TERMS.length,
                ref: (el) => { if (el) el.indeterminate = enabledCount > 0 && enabledCount < ZERNIKE_TERMS.length; },
                onChange: () => setTermsEnabled(ZERNIKE_TERMS, enabledCount < ZERNIKE_TERMS.length),
                style: { margin: 0, cursor: 'pointer', flexShrink: 0, accentColor: c.accent }
            }),
            h('label', {
                htmlFor: 'zernike-all-terms',
                style: { fontSize: 12, color: c.text, fontFamily: FONT, cursor: 'pointer', userSelect: 'none' }
            }, t.properties.zernikeAllTerms)
        ),

        // One toggle per aberration type
        h('div', { key: 'groups', style: { display: 'flex', flexWrap: 'wrap', gap: 4, margin: '2px 0 6px' } },
            zernikeGroups.map(({ key, terms }) => {
                const state = groupState(terms);
                const tip = state === 'on' ? t.properties.zernikeGroupDisable : t.properties.zernikeGroupEnable;
                return h(GroupChip, {
                    key,
                    label: t.properties.zernikeGroups[key],
                    state,
                    title: tip.replace('{terms}', terms.join(', ')),
                    onClick: () => setTermsEnabled(terms, state !== 'on'),
                    c
                });
            })
        ),

        ...ZERNIKE_TERMS.map(term => {
            const on = isEnabled(term);
            const toggle = () => updateParameter(`${term}_enabled`, on ? 'false' : 'true');
            return h('div', {
                key: term,
                style: { display: 'flex', alignItems: 'center', gap: 6, height: 22, opacity: on ? 1 : 0.45 }
            },
                h('input', {
                    type: 'checkbox',
                    checked: on,
                    onChange: toggle,
                    style: { margin: 0, cursor: 'pointer', flexShrink: 0, accentColor: c.accent }
                }),
                h('label', {
                    onClick: toggle,
                    title: `${term} — ${zernikeNames[term]}`,
                    style: {
                        flex: 1, minWidth: 0, display: 'flex', gap: 6, fontSize: 11, fontFamily: FONT,
                        cursor: 'pointer', userSelect: 'none'
                    }
                },
                    h('span', { style: { width: 24, flexShrink: 0, color: c.text } }, term),
                    h('span', { style: { color: c.textDim, minWidth: 0, ...ellipsis } }, zernikeNames[term])
                ),
                h(DebouncedInput, {
                    'data-param': term,
                    value: params[term] || '0',
                    onChange: (value) => updateParameter(term, value),
                    onEnterKey: () => handleEnterKeyNavigation(term),
                    debounceMs: 300,
                    disabled: !on,
                    style: {
                        ...inputStyle(c),
                        flex: '0 0 112px',
                        height: 20,
                        backgroundColor: on ? c.bg : c.panel,
                        color: on ? c.text : c.textDim
                    }
                })
            );
        })
    ], `${enabledCount}/${ZERNIKE_TERMS.length}`);

    return h('div', {
        className: 'properties-panel',
        style: {
            width: PANEL_WIDTH,
            flexShrink: 0,
            backgroundColor: c.panel,
            borderLeft: `1px solid ${c.border}`,
            display: 'flex',
            flexDirection: 'column'
        }
    },
        // Header, matching the explorer's
        h('div', {
            style: {
                display: 'flex', alignItems: 'center',
                height: 35, padding: '0 12px', flexShrink: 0,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: c.textDim, fontFamily: FONT
            }
        }, t.properties.title),

        h('div', {
            ref: propertiesPanelRef,
            onScroll: handlePropertiesPanelScroll,
            style: { flex: 1, overflowY: 'auto', overflowX: 'hidden', borderBottom: `1px solid ${c.border}` }
        },
            section('basic', t.properties.basic, [
                h(FieldRow, { key: 'name', label: t.properties.name, c },
                    h('input', {
                        type: 'text',
                        value: localName,
                        onChange: (e) => setLocalName(e.target.value),
                        onBlur: (e) => {
                            if (e.target.value !== selectedSurface.name) {
                                updateSurfaceName(e.target.value);
                            }
                        },
                        onKeyDown: (e) => {
                            if (e.key === 'Enter') {
                                e.target.blur();
                            }
                        },
                        style: { ...inputStyle(c), textAlign: 'left' }
                    })
                ),
                h(FieldRow, { key: 'type', label: t.properties.type, c },
                    h('select', {
                        value: type,
                        onChange: (e) => updateSurfaceType(e.target.value),
                        style: { ...inputStyle(c), textAlign: 'left', padding: '0 22px 0 4px', cursor: 'pointer' }
                    },
                        Object.keys(surfaceTypes).map(surfaceType =>
                            h('option', { key: surfaceType, value: surfaceType }, t.surfaceTypes[surfaceType] || surfaceType)
                        )
                    )
                )
            ]),

            section('parameters', t.properties.parameters, [
                ...universalFields,
                scanFields.length > 0 && h(Divider, { key: 'scan-divider', c }),
                ...scanFields,
                specificFields.length > 0 && h(Divider, { key: 'specific-divider', c }),
                ...specificFields
            ]),

            zernikeSection,

            section('metrics', t.properties.calculatedMetrics,
                metricRows.map(([label, value]) => h(PropertyRow, { key: label, label, value, c }))
            ),

            section('actions', t.properties.actions, [
                h(SurfaceActionButtons, {
                    key: 'transform',
                    surface: selectedSurface,
                    onInvert: handleInvertSurface,
                    onNormalizeUnZ: handleNormalizeUnZ,
                    onConvertToUnZ: handleConvertToUnZ,
                    onConvertToPoly: handleConvertToPoly,
                    onFlipX: handleFlipX,
                    onFlipY: handleFlipY,
                    onFlipZ: handleFlipZ,
                    onRotate90CCW: handleRotate90CCW,
                    onRotate90CW: handleRotate90CW,
                    onCopyCoefficients: handleCopyCoefficients,
                    c,
                    t
                }),
                h('div', { key: 'quick', style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 } },
                    h(ActionButton, { onClick: onFastConvertToPoly, disabled: fastConvertProgress !== null, primary: true, c },
                        fastConvertProgress ? `Converting... ${fastConvertProgress}` : (t.buttons.fastConvertToPoly || 'Fast Convert to Poly')),
                    h(ActionButton, { onClick: onConvert, primary: true, c }, t.buttons.convert),
                    h(ActionButton, { onClick: handleExportHTMLReport, primary: true, c }, t.properties.exportHTML),
                    h(ActionButton, { onClick: handleExportPDFReport, primary: true, c }, t.properties.exportPDF)
                )
            ])
        )
    );
};
