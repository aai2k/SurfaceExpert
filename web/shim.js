// web/shim.js - browser stand-in for the Electron `window.electronAPI` bridge.
//
// The renderer talks to the desktop backend through `window.electronAPI` (see
// src/preload.js). This file provides the same calls for the GitHub Pages
// build, so the unchanged renderer runs in a browser:
//
//   - folders, surfaces and settings persist in localStorage (storage.js);
//     on a first visit the sample surfaces are seeded into "My Surfaces";
//   - ZMX import reads a file the user picks; reports and fit results download;
//   - PDF export prints the report through the browser's print dialog;
//   - surface fitting runs the same JS fitter as the desktop, in a Web Worker.
//
// Bundled by tools/build-web.mjs and loaded as a plain script before the
// renderer, so window.electronAPI exists by the time the renderer boots.

import { sampleSurfaces } from '../src/constants/surfaceTypes.js';
import * as S from './storage.js';

/* global __APP_VERSION__, __BUILD_STAMP__ */

const DEFAULT_FOLDER = 'My Surfaces';

const ok = (extra) => Object.assign({ success: true }, extra || {});
const fail = (error) => ({ success: false, error: String(error) });
const errText = (e) => String((e && e.message) || e);
const noop = () => {};

// ── Folders and surfaces ─────────────────────────────────────────────────────

function ensureSeeded() {
    if (S.readData()) return;
    S.writeData({
        folders: [{
            name: DEFAULT_FOLDER,
            surfaces: sampleSurfaces.map(s => ({ ...s, parameters: { ...s.parameters } }))
        }]
    });
}

async function loadFolders() {
    try {
        ensureSeeded();
        const data = S.readData() || { folders: [] };
        if (data.folders.length === 0) {
            data.folders.push({ name: DEFAULT_FOLDER, surfaces: [] });
            S.writeData(data);
        }
        return ok({
            folders: data.folders.map(f => ({
                id: f.name,
                name: f.name,
                expanded: false,
                surfaces: f.surfaces
            }))
        });
    } catch (e) {
        return fail(errText(e));
    }
}

async function saveSurface(folderName, surface) {
    const res = S.mutate((data) => {
        let folder = S.findFolder(data, folderName);
        // The desktop creates the directory on save when it is missing.
        if (!folder) {
            folder = { name: folderName, surfaces: [] };
            data.folders.push(folder);
        }
        const key = S.fileKey(surface.name);
        const index = folder.surfaces.findIndex(s => S.fileKey(s.name) === key);
        if (index >= 0) folder.surfaces[index] = surface;
        else folder.surfaces.push(surface);
        return null;
    });
    if (res.success) storageNoticeOnce();
    return res;
}

async function deleteSurface(folderName, surfaceName) {
    return S.mutate((data) => {
        const folder = S.findFolder(data, folderName);
        if (!folder) return null;
        const key = S.fileKey(surfaceName);
        folder.surfaces = folder.surfaces.filter(s => S.fileKey(s.name) !== key);
        return null;
    });
}

async function createFolder(folderName) {
    return S.mutate((data) => {
        if (S.findFolder(data, folderName)) return 'Folder already exists';
        data.folders.push({ name: folderName, surfaces: [] });
        return null;
    });
}

async function renameFolder(oldName, newName) {
    return S.mutate((data) => {
        const folder = S.findFolder(data, oldName);
        if (!folder) return 'Folder does not exist';
        if (S.findFolder(data, newName)) return 'Target folder name already exists';
        folder.name = newName;
        return null;
    });
}

async function deleteFolder(folderName) {
    return S.mutate((data) => {
        if (!S.findFolder(data, folderName)) return 'Folder does not exist';
        data.folders = data.folders.filter(f => f.name !== folderName);
        return null;
    });
}

// ── Settings ─────────────────────────────────────────────────────────────────
// Same defaults as the desktop, except the language follows the browser.

function defaultSettings() {
    const lang = (navigator.language || '').toLowerCase();
    return {
        colorscale: 'Zygo',
        wavelength: 632.8,
        gridSize3D: 129,
        gridSize2D: 129,
        theme: 'Dark Gray (Default)',
        locale: lang.startsWith('ru') ? 'ru' : 'en'
    };
}

async function loadSettings() {
    return ok({ settings: Object.assign(defaultSettings(), S.readSettings() || {}) });
}

async function saveSettings(settings) {
    try {
        S.writeSettings(settings);
        return ok();
    } catch (e) {
        return fail(errText(e));
    }
}

// ── Storage notice ───────────────────────────────────────────────────────────
// Saving looks exactly like saving in the desktop app, so after the first save
// the visitor is told where the work actually lives. A browser that refuses
// storage loses the work on reload; that warning returns every session.

const NOTICE_SEEN_KEY = 'surfaceexpert.web.noticeSeen';
let noticeShownThisSession = false;

const NOTICE_TEXT = {
    en: {
        savedTitle: 'Saved in this browser',
        savedBody: 'Your surfaces are kept in this browser only. They do not sync to other '
            + 'devices, and clearing site data removes them. The desktop version stores '
            + 'them as files you own.',
        lostTitle: 'This work will not be saved',
        lostBody: 'Your browser is blocking local storage, so anything you create here is '
            + 'lost when you reload or close the tab. Private-browsing modes are the usual cause.',
        close: 'Got it'
    },
    ru: {
        savedTitle: 'Сохранено в этом браузере',
        savedBody: 'Ваши поверхности хранятся только в этом браузере. Они не синхронизируются '
            + 'с другими устройствами и удаляются при очистке данных сайта. Настольная версия '
            + 'хранит их в файлах на диске.',
        lostTitle: 'Работа не будет сохранена',
        lostBody: 'Браузер блокирует локальное хранилище, поэтому всё созданное здесь пропадёт '
            + 'после перезагрузки или закрытия вкладки. Обычно причина в режиме инкогнито.',
        close: 'Понятно'
    }
};

function storageNoticeOnce() {
    try {
        if (noticeShownThisSession) return;
        const persistent = S.persistent();
        if (persistent && window.localStorage.getItem(NOTICE_SEEN_KEY) === '1') return;
        noticeShownThisSession = true;
        if (persistent) window.localStorage.setItem(NOTICE_SEEN_KEY, '1');

        const locale = (S.readSettings() || defaultSettings()).locale;
        const text = NOTICE_TEXT[locale] || NOTICE_TEXT.en;

        const box = document.createElement('div');
        box.setAttribute('role', 'status');
        box.style.cssText = [
            'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483000',
            'max-width:340px', 'padding:12px 14px',
            'background:#1f2430', 'color:#e8eaf0',
            'border:1px solid rgba(255,255,255,.14)', 'border-radius:8px',
            'box-shadow:0 6px 24px rgba(0,0,0,.35)',
            'font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
        ].join(';');

        const heading = document.createElement('div');
        heading.textContent = persistent ? text.savedTitle : text.lostTitle;
        heading.style.cssText = 'font-weight:600;margin-bottom:4px';

        const body = document.createElement('div');
        body.textContent = persistent ? text.savedBody : text.lostBody;
        body.style.cssText = 'opacity:.85';

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = text.close;
        close.style.cssText = 'margin-top:10px;padding:4px 10px;cursor:pointer;background:transparent;'
            + 'color:#9db4ff;border:1px solid rgba(157,180,255,.4);border-radius:5px;font:inherit';

        const dismiss = () => { try { box.remove(); } catch (_) {} };
        close.addEventListener('click', dismiss);
        box.append(heading, body, close);
        document.body.appendChild(box);
        if (persistent) setTimeout(dismiss, 15000);
    } catch (_) { /* a notice must never break the application */ }
}

// ── ZMX import ───────────────────────────────────────────────────────────────

async function openZMXDialog() {
    const res = await S.pickTextFile('.zmx,.ZMX');
    if (res.canceled) return { canceled: true };
    if (res.error) return { canceled: true, error: res.error };
    return { canceled: false, content: res.text, filePath: res.fileName };
}

// ── Surface fitting ──────────────────────────────────────────────────────────
// The fitter is CPU-bound, so it runs in a worker to keep the page responsive.
// Requests are answered in order, each tagged with its id.

let worker = null;
let nextRequestId = 1;
const pending = new Map();

function getWorker() {
    if (worker) return worker;
    worker = new Worker(`fitter-worker.js?v=${__BUILD_STAMP__}`);
    worker.onmessage = (event) => {
        const { id, result } = event.data;
        const resolve = pending.get(id);
        if (resolve) {
            pending.delete(id);
            resolve(result);
        }
    };
    worker.onerror = (event) => {
        const error = event.message || 'Fitter worker failed';
        for (const resolve of pending.values()) resolve(fail(error));
        pending.clear();
        try { worker.terminate(); } catch (_) {}
        worker = null;
    };
    return worker;
}

function runConversion(surfaceData, settings) {
    return new Promise((resolve) => {
        try {
            const id = nextRequestId++;
            pending.set(id, resolve);
            getWorker().postMessage({ id, surfaceData, settings });
        } catch (e) {
            resolve(fail(errText(e)));
        }
    });
}

async function saveConversionResults(folderName, surfaceName, results) {
    try {
        const content = [
            '=== FIT REPORT ===',
            results.fitReportContent,
            '',
            '=== FIT METRICS ===',
            results.metricsContent,
            '',
            '=== FIT DEVIATIONS ===',
            results.deviations
        ].join('\n');
        S.downloadText(content, `${S.fileKey(surfaceName)}_FitResults.txt`);
        return ok();
    } catch (e) {
        return fail(errText(e));
    }
}

// ── Reports ──────────────────────────────────────────────────────────────────

async function saveHTMLReport(htmlContent, suggestedName) {
    try {
        const fileName = `${suggestedName}_Report.html`;
        S.downloadText(htmlContent, fileName, 'text/html;charset=utf-8');
        return ok({ filePath: fileName });
    } catch (e) {
        return fail(errText(e));
    }
}

// The desktop renders the PDF in a hidden window. Here the report goes into a
// hidden frame and the browser's print dialog does the rest ("Save as PDF").
// The report typesets its formulas with MathJax, so printing waits for it.
function generatePDFReport(htmlContent) {
    return new Promise((resolve) => {
        let frame;
        try {
            frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
            document.body.appendChild(frame);
        } catch (e) {
            resolve(fail(errText(e)));
            return;
        }

        let printed = false;
        const cleanup = () => setTimeout(() => { try { frame.remove(); } catch (_) {} }, 1000);
        const print = () => {
            if (printed) return;
            printed = true;
            try {
                const win = frame.contentWindow;
                win.addEventListener('afterprint', cleanup);
                win.focus();
                win.print();
                resolve(ok());
            } catch (e) {
                cleanup();
                resolve(fail(errText(e)));
            }
        };

        frame.onload = () => {
            const mathJax = frame.contentWindow && frame.contentWindow.MathJax;
            if (mathJax && mathJax.Hub && mathJax.Hub.Queue) {
                mathJax.Hub.Queue(() => setTimeout(print, 100));
                setTimeout(print, 8000); // never wait on MathJax forever
            } else {
                setTimeout(print, 500);
            }
        };
        frame.srcdoc = htmlContent;
    });
}

// ── External links ───────────────────────────────────────────────────────────

function openExternal(url) {
    try {
        if (String(url).startsWith('mailto:')) window.location.href = url;
        else window.open(url, '_blank', 'noopener');
    } catch (_) { /* ignore */ }
}

// ── The bridge ───────────────────────────────────────────────────────────────

window.electronAPI = {
    isWeb: true,
    getAppVersion: () => Promise.resolve(__APP_VERSION__),

    // menu and window chrome: the browser has no native frame or menu
    onMenuAction: noop,
    onWindowMaximized: noop,
    onWindowUnmaximized: noop,
    windowControl: noop,
    toggleDevTools: noop,
    openExternal,

    openZMXDialog,
    runConversion,
    saveConversionResults,

    loadFolders,
    saveSurface,
    deleteSurface,
    createFolder,
    renameFolder,
    deleteFolder,

    saveHTMLReport,
    generatePDFReport,

    loadSettings,
    saveSettings
};
