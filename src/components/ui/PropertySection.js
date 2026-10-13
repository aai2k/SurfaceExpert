// Collapsible section of the properties panel, styled like the explorer:
// a 22px uppercase header with a chevron and an optional summary on the right.

import { Chevron } from '../Icons.js';

const { createElement: h, useState } = React;

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

const PropertySection = ({ title, collapsed, onToggle, aside, children, c }) => {
    const [hov, setHov] = useState(false);
    return h('div', { style: { borderTop: `1px solid ${c.border}` } },
        h('div', {
            onClick: onToggle,
            onMouseEnter: () => setHov(true),
            onMouseLeave: () => setHov(false),
            'aria-expanded': !collapsed,
            style: {
                display: 'flex', alignItems: 'center', gap: 2,
                height: 22, padding: '0 10px 0 4px',
                backgroundColor: hov ? c.hover : 'transparent',
                color: c.textDim, cursor: 'pointer', userSelect: 'none'
            }
        },
            h(Chevron, { open: !collapsed }),
            h('span', {
                style: {
                    flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', fontFamily: FONT,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }
            }, title),
            aside && h('span', { style: { fontSize: 11, fontFamily: FONT, flexShrink: 0 } }, aside)
        ),
        !collapsed && h('div', { style: { padding: '2px 8px 6px 10px' } }, children)
    );
};

export { PropertySection };
