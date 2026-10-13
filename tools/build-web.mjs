// tools/build-web.mjs - builds the browser version of SurfaceExpert into web/dist/.
//
//   1. Bundle the renderer (src/renderer-modular.js and every module it imports)
//      into one script, so a deploy is served as a single, cache-busted file.
//   2. Bundle the browser electronAPI shim (web/shim.js) and the fitter worker
//      (web/fitter-worker.js + src/surfaceFitterJs.js + ml-levenberg-marquardt).
//   3. Copy the classic global scripts, the stylesheet, React, ECharts and the favicon.
//   4. Rewrite index.html: production React from vendor/, the shim before the
//      renderer, and a CSP that also admits MathJax for printed reports.
//
// Output: web/dist/ - a static site, deployed to GitHub Pages by
// .github/workflows/pages.yml.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const web = path.join(root, 'web');
const out = path.join(web, 'dist');
const require = createRequire(import.meta.url);

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });

const common = {
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: true,
    legalComments: 'none',
    logLevel: 'warning'
};

await esbuild.build({ ...common, entryPoints: [path.join(src, 'renderer-modular.js')], outfile: path.join(out, 'renderer.js') });
await esbuild.build({
    ...common,
    entryPoints: [path.join(web, 'shim.js')],
    outfile: path.join(out, 'web-shim.js'),
    define: { __APP_VERSION__: JSON.stringify(version), __BUILD_STAMP__: JSON.stringify(stamp) }
});
await esbuild.build({ ...common, entryPoints: [path.join(web, 'fitter-worker.js')], outfile: path.join(out, 'fitter-worker.js') });

for (const file of ['styles.css', 'calculationsWrapper.js', 'zmxParser.js']) {
    fs.copyFileSync(path.join(src, file), path.join(out, file));
}

const reactDir = path.dirname(require.resolve('react/package.json'));
const reactDomDir = path.dirname(require.resolve('react-dom/package.json'));
fs.copyFileSync(path.join(reactDir, 'umd', 'react.production.min.js'), path.join(out, 'vendor', 'react.production.min.js'));
fs.copyFileSync(path.join(reactDomDir, 'umd', 'react-dom.production.min.js'), path.join(out, 'vendor', 'react-dom.production.min.js'));
const echartsDir = path.dirname(require.resolve('echarts/package.json'));
const echartsGlDir = path.dirname(require.resolve('echarts-gl/package.json'));
fs.copyFileSync(path.join(echartsDir, 'dist', 'echarts.min.js'), path.join(out, 'vendor', 'echarts.min.js'));
fs.copyFileSync(path.join(echartsGlDir, 'dist', 'echarts-gl.min.js'), path.join(out, 'vendor', 'echarts-gl.min.js'));

fs.copyFileSync(path.join(root, 'icons', 'IconInvertedNoBGGlow.ico'), path.join(out, 'favicon.ico'));

// The renderer shows the logo from '../icons/', next to src/ on the desktop.
// The site is flat, so the icon goes into icons/ and the bundle is rebased.
fs.mkdirSync(path.join(out, 'icons'));
fs.copyFileSync(path.join(root, 'icons', 'IconInvertedNoBGGlow.png'), path.join(out, 'icons', 'IconInvertedNoBGGlow.png'));
const rendererPath = path.join(out, 'renderer.js');
fs.writeFileSync(rendererPath, fs.readFileSync(rendererPath, 'utf8').split('../icons/').join('icons/'), 'utf8');

// ── index.html ───────────────────────────────────────────────────────────────

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');

const replaceOnce = (from, to) => {
    if (!html.includes(from)) {
        console.error(`[build-web] index.html no longer contains: ${from}`);
        process.exit(1);
    }
    html = html.replace(from, to);
};

const v = `?v=${stamp}`;

replaceOnce('../node_modules/react/umd/react.development.js', 'vendor/react.production.min.js');
replaceOnce('../node_modules/react-dom/umd/react-dom.development.js', 'vendor/react-dom.production.min.js');
replaceOnce('../node_modules/echarts/dist/echarts.min.js', 'vendor/echarts.min.js');
replaceOnce('../node_modules/echarts-gl/dist/echarts-gl.min.js', 'vendor/echarts-gl.min.js');
replaceOnce('href="styles.css"', `href="styles.css${v}"`);
replaceOnce('<script src="calculationsWrapper.js"></script>',
    `<script src="web-shim.js${v}"></script>\n    <script src="calculationsWrapper.js${v}"></script>`);
replaceOnce('<script src="zmxParser.js"></script>', `<script src="zmxParser.js${v}"></script>`);
replaceOnce('<script type="module" src="renderer-modular.js"></script>', `<script type="module" src="renderer.js${v}"></script>`);
replaceOnce('</title>', '</title>\n    <link rel="icon" href="favicon.ico">');

// HTML and PDF reports typeset formulas with MathJax from cdnjs. A printed
// report is rendered in a frame that inherits this page's policy, so the
// browser build admits cdnjs.
replaceOnce("'unsafe-eval'; img-src", "'unsafe-eval' https://cdnjs.cloudflare.com; img-src");

fs.writeFileSync(path.join(out, 'index.html'), html, 'utf8');

console.log(`[build-web] SurfaceExpert ${version} -> ${path.relative(root, out)}/`);
