// web/fitter-worker.js - runs the desktop's JS surface fitter off the page thread.
// Bundled by tools/build-web.mjs together with src/surfaceFitterJs.js.

const { fitSurface } = require('../src/surfaceFitterJs.js');

self.onmessage = (event) => {
    const { id, surfaceData, settings } = event.data;
    let result;
    try {
        result = fitSurface(surfaceData, settings);
    } catch (error) {
        result = { success: false, error: String((error && error.message) || error) };
    }
    self.postMessage({ id, result });
};
