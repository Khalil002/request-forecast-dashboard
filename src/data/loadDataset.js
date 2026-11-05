import { generateDataset } from './generate.js';

/**
 * Load the dataset in a Web Worker when available, falling back to the main
 * thread (tests, very old browsers). Resolves to { dataset, ms, source }.
 */
export function loadDataset({ rows = 150_000, seed = 42 } = {}) {
  if (typeof Worker === 'undefined') {
    const start = performance.now();
    const dataset = generateDataset({ rows, seed });
    return Promise.resolve({ dataset, ms: performance.now() - start, source: 'main thread' });
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./dataset.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      resolve({ ...e.data, source: 'web worker' });
      worker.terminate();
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ rows, seed });
  });
}
