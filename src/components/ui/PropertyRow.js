// Read-only label/value row of the properties panel (calculated metrics)

const { createElement: h } = React;

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const PropertyRow = ({ label, value, c }) => (
    h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, height: 20, fontSize: 12, fontFamily: FONT }
    },
        h('span', { title: label, style: { flex: 1, minWidth: 0, color: c.textDim, ...ellipsis } }, label),
        h('span', {
            title: value,
            style: { flexShrink: 0, maxWidth: '60%', color: c.text, fontVariantNumeric: 'tabular-nums', ...ellipsis }
        }, value)
    )
);

export { PropertyRow };
