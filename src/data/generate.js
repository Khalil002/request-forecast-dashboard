import { createRandom, cumulativeWeights } from './random.js';
import { CATEGORIES, MONTH_COUNT, PRIORITIES, REGIONS, STATUS, calendarMonth } from './schema.js';

const CLIENT_PREFIX = ['Nova', 'Blue', 'Apex', 'Lumen', 'Atlas', 'Vertex', 'Orbit', 'Cedar', 'Pixel', 'Harbor', 'Summit', 'Quanta', 'Echo', 'Iron', 'Silver', 'Maple', 'Delta', 'Polar', 'Zenith', 'Coral'];
const CLIENT_SUFFIX = ['Labs', 'Systems', 'Health', 'Logistics', 'Capital', 'Retail', 'Media', 'Energy', 'Robotics', 'Foods', 'Analytics', 'Studios', 'Mobility', 'Telecom', 'Bank', 'Games', 'Travel', 'Insurance', 'Cloud', 'Works'];

/** Seasonal multiplier per calendar month: January ramp-up, summer and December dips. */
const SEASONALITY = [1.18, 1.1, 1.06, 1.02, 1.0, 0.93, 0.86, 0.82, 1.08, 1.06, 1.0, 0.78];

const REGION_WEIGHTS = [30, 12, 22, 12, 8, 16];
const CATEGORY_WEIGHTS = [24, 22, 14, 10, 9, 8, 7, 6];
const PRIORITY_WEIGHTS = [20, 45, 25, 10];
/** Base daily budget per category, USD. */
const CATEGORY_BUDGET = [5200, 5800, 7400, 5600, 6400, 4200, 4800, 6900];
const REGION_BUDGET = [1.25, 0.7, 1.05, 0.65, 0.8, 0.85];

export function clientNames() {
  const names = [];
  for (const p of CLIENT_PREFIX) for (const s of CLIENT_SUFFIX) names.push(`${p} ${s}`);
  return names;
}

/** Expected request volume per month: linear growth × seasonality. */
export function monthlyWeights(months = MONTH_COUNT) {
  const w = new Float64Array(months);
  for (let m = 0; m < months; m++) w[m] = (1 + m * 0.025) * SEASONALITY[calendarMonth(m)];
  return w;
}

/**
 * Generate a columnar dataset of staffing requests.
 * Each column is a typed array of length `rows`; dimension columns hold
 * codes into the tables in schema.js. Rows are ordered by month.
 */
export function generateDataset({ rows = 150_000, seed = 42, months = MONTH_COUNT } = {}) {
  const rnd = createRandom(seed);
  const clients = clientNames();

  const month = new Uint8Array(rows);
  const client = new Uint16Array(rows);
  const region = new Uint8Array(rows);
  const category = new Uint8Array(rows);
  const status = new Uint8Array(rows);
  const priority = new Uint8Array(rows);
  const budget = new Float32Array(rows);
  const daysToFill = new Uint16Array(rows);
  const candidates = new Uint8Array(rows);

  // Month-level noise is drawn once so the monthly series is smooth-but-noisy,
  // rather than averaging away to a perfect curve at 150k rows.
  const weights = monthlyWeights(months).map((w) => w * (1 + rnd.normal() * 0.04));
  const monthCum = cumulativeWeights(weights);
  const regionCum = cumulativeWeights(REGION_WEIGHTS);
  const categoryCum = cumulativeWeights(CATEGORY_WEIGHTS);
  const priorityCum = cumulativeWeights(PRIORITY_WEIGHTS);
  // Client popularity follows a long tail (a few big accounts).
  const clientCum = cumulativeWeights(clients.map((_, i) => 1 / (1 + i * 0.05)));

  for (let i = 0; i < rows; i++) {
    month[i] = rnd.weighted(monthCum);
  }
  month.sort();

  for (let i = 0; i < rows; i++) {
    const m = month[i];
    const age = months - 1 - m; // 0 = most recent month
    const r = rnd.weighted(regionCum);
    const c = rnd.weighted(categoryCum);
    const p = rnd.weighted(priorityCum);
    region[i] = r;
    category[i] = c;
    priority[i] = p;
    client[i] = rnd.weighted(clientCum);

    // Recent requests are more likely to still be open.
    const openChance = age === 0 ? 0.55 : age === 1 ? 0.3 : age === 2 ? 0.12 : 0.02;
    const u = rnd.next();
    let s;
    if (u < openChance * 0.55) s = STATUS.OPEN;
    else if (u < openChance) s = STATUS.INTERVIEWING;
    else s = rnd.next() < 0.13 - p * 0.015 ? STATUS.CANCELLED : STATUS.FILLED;
    status[i] = s;

    budget[i] = Math.round(CATEGORY_BUDGET[c] * REGION_BUDGET[r] * (1 + p * 0.08) * (0.75 + rnd.next() * 0.5));

    if (s === STATUS.FILLED) {
      // Urgent roles fill faster; skewed (log-normal-ish) distribution.
      const base = 34 - p * 5 + (c === 2 ? 8 : 0);
      daysToFill[i] = Math.max(3, Math.round(base * Math.exp(rnd.normal() * 0.35)));
    }
    candidates[i] = Math.min(255, Math.max(0, Math.round(8 + rnd.normal() * 4 + (s === STATUS.FILLED ? 4 : 0))));
  }

  return {
    rows,
    months,
    clients,
    columns: { month, client, region, category, status, priority, budget, daysToFill, candidates },
  };
}

export { REGIONS, CATEGORIES, PRIORITIES };
