// web/storage.js - persistence and file I/O for the browser build.
//
// The desktop build keeps each surface as a JSON file under
// SurfaceExpertData/surfaces/<folder>/<name>.json and reaches the filesystem
// over Electron IPC. A browser has neither, so:
//
//   - folders, surfaces and settings live in localStorage. A surface is keyed
//     by its folder and its sanitized name, exactly as the desktop keys it by
//     directory and filename, so saving a surface under an existing name
//     replaces it there too;
//   - import opens a transient <input type="file">; export builds a Blob and
//     clicks a download link. Nothing leaves the machine.
//
// Every operation reads the store, changes it and writes it back, rather than
// working from a copy held in memory, so a second tab only loses a write when
// both tabs change the store at the same moment.
//
// When localStorage is unavailable (blocked storage, some private-browsing
// modes) the store falls back to memory: the session works, it just does not
// survive a reload. `persistent()` reports which one is live.

const DATA_KEY = 'surfaceexpert.web.data.v1';
const SETTINGS_KEY = 'surfaceexpert.web.settings.v1';

// Same rule the desktop applies when it turns a surface name into a filename.
export const fileKey = (name) => String(name).replace(/[<>:"/\\|?*]/g, '_');

function probe() {
    try {
        const k = '__surfaceexpert_probe__';
        window.localStorage.setItem(k, '1');
        window.localStorage.removeItem(k);
        return true;
    } catch (_) {
        return false;
    }
}

const usingLocalStorage = probe();
const memory = new Map();

function readRaw(key) {
    if (!usingLocalStorage) return memory.has(key) ? memory.get(key) : null;
    return window.localStorage.getItem(key);
}

// Throws on failure (QuotaExceededError); callers turn that into an error result.
function writeRaw(key, value) {
    if (!usingLocalStorage) { memory.set(key, value); return; }
    window.localStorage.setItem(key, value);
}

export const persistent = () => usingLocalStorage;

// ── Folders and surfaces ─────────────────────────────────────────────────────
// Stored as { folders: [{ name, surfaces: [surface, ...] }] }: an array keeps
// folder and surface order stable, which object keys would not for names that
// look like numbers.

// null on a first visit, so the caller can seed it.
export function readData() {
    const raw = readRaw(DATA_KEY);
    if (raw == null) return null;
    try {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.folders)) return data;
    } catch (_) { /* unreadable: treated as empty below */ }
    return { folders: [] };
}

export function writeData(data) {
    writeRaw(DATA_KEY, JSON.stringify(data));
}

// Runs `change` on the current store and writes it back. `change` returns an
// error string to abort without writing. Resolves to an IPC-style result.
export function mutate(change) {
    try {
        const data = readData() || { folders: [] };
        const error = change(data);
        if (error) return { success: false, error };
        writeData(data);
        return { success: true };
    } catch (e) {
        return { success: false, error: String((e && e.message) || e) };
    }
}

export const findFolder = (data, name) => data.folders.find(f => f.name === name);

// ── Settings ─────────────────────────────────────────────────────────────────

export function readSettings() {
    try {
        const raw = readRaw(SETTINGS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

export function writeSettings(settings) {
    writeRaw(SETTINGS_KEY, JSON.stringify(settings));
}

// ── File import / export ─────────────────────────────────────────────────────

// Matches the desktop ZMX reader: UTF-16 by BOM, otherwise UTF-8, falling back
// to latin1 (ANSI) when the bytes are not valid UTF-8.
function decodeText(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return new TextDecoder('utf-16le').decode(bytes.subarray(2));
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    }
    try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
    } catch (_) {
        return new TextDecoder('latin1').decode(bytes);
    }
}

// Resolves { text, fileName } | { canceled: true } | { error }.
export function pickTextFile(accept) {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (accept) input.accept = accept;
        input.style.display = 'none';

        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('focus', onFocus, true);
            try { input.remove(); } catch (_) {}
            resolve(value);
        };

        // Older browsers fire no event when the dialog is dismissed. Regaining
        // focus with nothing selected is the fallback signal; the delay lets a
        // real selection deliver its `change` event first.
        const onFocus = () => {
            setTimeout(() => {
                if (!input.files || input.files.length === 0) finish({ canceled: true });
            }, 500);
        };

        input.addEventListener('cancel', () => finish({ canceled: true }));
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) { finish({ canceled: true }); return; }
            file.arrayBuffer()
                .then(buf => finish({ text: decodeText(buf), fileName: file.name }))
                .catch(e => finish({ error: String((e && e.message) || e) }));
        });

        document.body.appendChild(input);
        window.addEventListener('focus', onFocus, true);
        input.click();
    });
}

export function downloadText(text, fileName, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        try { a.remove(); URL.revokeObjectURL(url); } catch (_) {}
    }, 0);
}
