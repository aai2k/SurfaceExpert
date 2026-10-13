// SurfaceActionButtons - Action buttons for surface transformations
// Displays compact buttons in the properties panel's Actions section based on surface type

const { createElement: h } = React;

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

/**
 * Compact 24px button that grows to fill its row in a wrapping flex container.
 * Primary buttons use the accent color, the others the panel background.
 */
export const ActionButton = ({ onClick, title, primary, disabled, children, c }) =>
    h('button', {
        onClick,
        title,
        disabled,
        style: {
            flex: '1 1 auto',
            height: 24,
            padding: '0 8px',
            backgroundColor: disabled ? c.textDim : primary ? c.accent : c.bg,
            color: primary || disabled ? 'white' : c.text,
            border: `1px solid ${disabled ? c.textDim : primary ? c.accent : c.border}`,
            borderRadius: 3,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontFamily: FONT,
            whiteSpace: 'nowrap',
            opacity: disabled ? 0.8 : 1
        }
    }, children);

/**
 * Surface Action Buttons Component
 * @param {Object} props
 * @param {Object} props.surface - Current surface object
 * @param {Function} props.onInvert - Callback for invert action
 * @param {Function} props.onNormalizeUnZ - Callback for normalize UnZ action
 * @param {Function} props.onConvertToUnZ - Callback for Poly → UnZ conversion
 * @param {Function} props.onConvertToPoly - Callback for UnZ → Poly conversion
 * @param {Object} props.c - Color scheme object
 */
export const SurfaceActionButtons = ({ surface, onInvert, onNormalizeUnZ, onConvertToUnZ, onConvertToPoly, onFlipX, onFlipY, onFlipZ, onRotate90CCW, onRotate90CW, onCopyCoefficients, c, t }) => {
    const isZernike = surface.type === 'Zernike';
    const button = (onClick, label, title) => h(ActionButton, { onClick, title, c }, label);

    return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
        // Invert button - shown for all surfaces
        button(onInvert, t.properties.invert, t.properties.tooltips.invert),

        // Normalize to H button - shown only for Opal Un Z
        surface.type === 'Opal Un Z' && button(onNormalizeUnZ, t.properties.normalize, t.properties.tooltips.normalize),

        // Convert to UnZ button - shown only for Poly
        surface.type === 'Poly' && button(onConvertToUnZ, t.properties.convertToUnZ, t.properties.tooltips.convertToUnZ),

        // Flip, rotate and copy buttons - shown only for Zernike
        isZernike && button(onFlipX, t.properties.flipX, t.properties.tooltips.flipX),
        isZernike && button(onFlipY, t.properties.flipY, t.properties.tooltips.flipY),
        isZernike && button(onFlipZ, t.properties.flipZ, t.properties.tooltips.flipZ),
        isZernike && button(onRotate90CCW, t.properties.rotate90CCW, t.properties.tooltips.rotate90CCW),
        isZernike && button(onRotate90CW, t.properties.rotate90CW, t.properties.tooltips.rotate90CW),
        isZernike && button(onCopyCoefficients, t.properties.copyCoefficients, t.properties.tooltips.copyCoefficients),

        // Convert to Poly button - shown only for Opal Un Z
        surface.type === 'Opal Un Z' && button(onConvertToPoly, t.properties.convertToPoly, t.properties.tooltips.convertToPoly)
    );
};
