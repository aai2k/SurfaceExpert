// Icon components for UI
const { createElement: h } = React;

export const PlusIcon = () => (
    h('svg', { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
        h('line', { x1: "12", y1: "5", x2: "12", y2: "19" }),
        h('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
    )
);

export const MinusIcon = () => (
    h('svg', { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
        h('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
    )
);

// Disclosure chevron for tree rows and collapsible sections
export const Chevron = ({ open }) => (
    h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', style: { flexShrink: 0 } },
        h('path', {
            d: open ? 'M4 6l4 4 4-4' : 'M6 4l4 4-4 4',
            stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round'
        })
    )
);
