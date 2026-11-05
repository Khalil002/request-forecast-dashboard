/**
 * Mulberry32: a tiny, fast, seedable PRNG. Seeding makes the generated
 * dataset identical on every load, which keeps screenshots, tests and
 * forecasts reproducible.
 */
export function createRandom(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Integer in [min, max] inclusive. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** Standard normal via Box-Muller. */
    normal: () => {
      let u = 0;
      while (u === 0) u = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    },
    /** Pick an index given a cumulative weight table (binary search). */
    weighted: (cumulative) => {
      const r = next() * cumulative[cumulative.length - 1];
      let lo = 0;
      let hi = cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cumulative[mid] > r) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
  };
}

export function cumulativeWeights(weights) {
  const out = new Float64Array(weights.length);
  let sum = 0;
  weights.forEach((w, i) => {
    sum += w;
    out[i] = sum;
  });
  return out;
}
