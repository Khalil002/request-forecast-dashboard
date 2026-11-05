import { generateDataset } from './generate.js';

// Generating 150k rows takes long enough to drop frames, so it runs off the
// main thread. Column buffers are *transferred* (zero-copy) back to the UI.
self.onmessage = (event) => {
  const { rows, seed } = event.data;
  const start = performance.now();
  const dataset = generateDataset({ rows, seed });
  const ms = performance.now() - start;
  const buffers = Object.values(dataset.columns).map((col) => col.buffer);
  self.postMessage({ dataset, ms }, buffers);
};
