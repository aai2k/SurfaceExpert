// ============================================
// SurfacesPanel Component
// ============================================
// Left sidebar panel showing folder tree and surface list.
// Compact, VS Code-style explorer: 22px single-line rows, actions as icon
// buttons in the header instead of a button bar at the bottom.

import { Chevron } from '../Icons.js';

const { createElement: h, useState } = React;

// Width of the chevron column; surface rows indent past it and the folder icon
// so their text lines up under the folder name.
const SURFACE_INDENT = 32;

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

// ── Icons ─────────────────────────────────────────────────────────────────────

const FolderIcon = ({ open }) =>
    h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', style: { flexShrink: 0 } },
        h('path', {
            d: 'M2 5a1 1 0 011-1h3.414a1 1 0 01.707.293L8 5H13a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V5z',
            fill: '#dcb67a', opacity: open ? 0.9 : 0.7
        }));

const IconBtn = ({ title, onClick, disabled, color, c, children }) => {
    const [hov, setHov] = useState(false);
    return h('button', {
        title,
        'aria-label': title,
        disabled,
        onClick,
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
        style: {
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
            minWidth: 22, height: 22, border: 'none', borderRadius: 3, padding: '0 3px',
            backgroundColor: hov && !disabled ? c.hover : 'transparent',
            color: color || c.textDim,
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none', flexShrink: 0,
            fontSize: 11, fontFamily: FONT
        }
    }, children);
};

const svg16 = (...paths) =>
    h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none' }, ...paths);

const stroke = (d) =>
    h('path', { d, stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' });

// ── Rows ──────────────────────────────────────────────────────────────────────

const FolderRow = ({ folder, isSelected, onClick, onContextMenu, c }) => {
    const [hov, setHov] = useState(false);
    return h('div', {
        onClick,
        onContextMenu,
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
        title: folder.name,
        style: {
            display: 'flex', alignItems: 'center', gap: 4,
            height: 22, paddingLeft: 4, paddingRight: 8,
            backgroundColor: isSelected ? c.accent + '22' : hov ? c.hover : 'transparent',
            cursor: 'pointer', userSelect: 'none'
        }
    },
        h('span', { style: { color: c.textDim, display: 'flex', flexShrink: 0 } },
            h(Chevron, { open: folder.expanded })),
        h(FolderIcon, { open: folder.expanded }),
        h('span', {
            style: {
                flex: 1, minWidth: 0, fontSize: 13, color: c.text, fontFamily: FONT,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }
        }, folder.name),
        h('span', { style: { fontSize: 11, color: c.textDim, flexShrink: 0, fontFamily: FONT } },
            folder.surfaces.length)
    );
};

const SurfaceRow = ({ surface, typeLabel, isSelected, isMultiSelected, onClick, onContextMenu, c }) => {
    const [hov, setHov] = useState(false);
    const bg = isMultiSelected ? c.accent + '40'
        : isSelected ? c.accent + '25'
        : hov ? c.hover
        : 'transparent';
    return h('div', {
        onClick,
        onContextMenu,
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
        title: `${surface.name} (${typeLabel})`,
        style: {
            display: 'flex', alignItems: 'center', gap: 6,
            height: 22, paddingLeft: SURFACE_INDENT - 2, paddingRight: 8,
            backgroundColor: bg,
            borderLeft: `2px solid ${isSelected || isMultiSelected ? c.accent : 'transparent'}`,
            cursor: 'pointer', userSelect: 'none'
        }
    },
        h('span', {
            style: { width: 8, height: 8, borderRadius: 2, backgroundColor: surface.color, flexShrink: 0 }
        }),
        h('span', {
            style: {
                flex: 1, minWidth: 0, fontSize: 13, color: c.text, fontFamily: FONT,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }
        }, surface.name),
        h('span', {
            style: {
                fontSize: 11, color: c.textDim, fontFamily: FONT, flexShrink: 1, minWidth: 0,
                maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }
        }, typeLabel)
    );
};

// ── Panel ─────────────────────────────────────────────────────────────────────

export const SurfacesPanel = ({
    folders,
    selectedFolder,
    selectedSurface,
    selectedSurfaces,
    handleSurfaceClick,
    setSelectedFolder,
    toggleFolderExpanded,
    collapseAllFolders,
    addSurface,
    removeSelectedSurfaces,
    setContextMenu,
    setInputDialog,
    addFolder,
    c,
    t
}) => {
    const openNewFolderDialog = (e) => {
        e.stopPropagation();
        setInputDialog({
            title: t.dialogs.folder.newFolder,
            defaultValue: t.surfaces.newFolder,
            validate: (name) => {
                if (!name || !name.trim()) {
                    return t.dialogs.folder.folderNameEmpty;
                }
                if (folders.some(f => f.name.toLowerCase() === name.trim().toLowerCase())) {
                    return t.dialogs.folder.folderExists;
                }
                return '';
            },
            onConfirm: (name) => {
                if (name && name.trim()) {
                    addFolder(name.trim());
                }
                setInputDialog(null);
            },
            onCancel: () => setInputDialog(null)
        });
    };

    return h('div', {
        style: {
            width: '220px',
            backgroundColor: c.panel,
            borderRight: `1px solid ${c.border}`,
            display: 'flex',
            flexDirection: 'column'
        }
    },
        // Header
        h('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: 2,
                height: 35, padding: '0 6px 0 12px', flexShrink: 0,
                borderBottom: `1px solid ${c.border}`
            }
        },
            h('span', {
                style: {
                    flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: c.textDim, fontFamily: FONT,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }
            }, t.surfaces.title),
            selectedSurfaces.length > 0 && h(IconBtn, {
                title: `${t.surfaces.delete} (${selectedSurfaces.length})`,
                onClick: removeSelectedSurfaces,
                color: '#e94560',
                c
            },
                svg16(stroke('M4 5h8M6 5V3h4v2M6 7v5M10 7v5M5 5l1 8h4l1-8')),
                selectedSurfaces.length),
            h(IconBtn, {
                title: t.surfaces.newSurface,
                onClick: addSurface,
                disabled: !selectedFolder,
                c
            },
                svg16(stroke('M4 2h5.5L13 5.5V14H4V2z'), stroke('M8 8v4M6 10h4'))),
            h(IconBtn, { title: t.surfaces.newFolder, onClick: openNewFolderDialog, c },
                svg16(
                    stroke('M2 5a1 1 0 011-1h3.414l.793.793A1 1 0 007.914 5H13a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V5z'),
                    stroke('M8 7v4M6 9h4'))),
            h(IconBtn, { title: t.surfaces.collapseAll, onClick: collapseAllFolders, c },
                svg16(stroke('M2 4h6M2 8h8M2 12h4'), stroke('M12 6l-3 3 3 3')))
        ),
        // Tree
        h('div', { style: { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0 8px' } },
            folders.map(folder =>
                h('div', { key: folder.id },
                    h(FolderRow, {
                        folder,
                        isSelected: selectedFolder?.id === folder.id,
                        onClick: () => {
                            setSelectedFolder(folder);
                            toggleFolderExpanded(folder.id);
                        },
                        onContextMenu: (e) => {
                            e.preventDefault();
                            setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                type: 'folder',
                                target: folder
                            });
                        },
                        c
                    }),
                    folder.expanded && folder.surfaces.map(surface =>
                        h(SurfaceRow, {
                            key: surface.id,
                            surface,
                            typeLabel: t.surfaceTypes[surface.type] || surface.type,
                            isSelected: selectedSurface?.id === surface.id,
                            isMultiSelected: selectedSurfaces.includes(surface.id),
                            onClick: (e) => handleSurfaceClick(e, surface, folder),
                            onContextMenu: (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    type: 'surface',
                                    target: surface,
                                    folder: folder
                                });
                            },
                            c
                        })
                    )
                )
            )
        )
    );
};
