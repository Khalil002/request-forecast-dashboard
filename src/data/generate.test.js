import { describe, expect, it } from 'vitest';
import { createRandom } from './random.js';
import { generateDataset, monthlyWeights } from './generate.js';
import { CATEGORIES, MONTH_COUNT, REGIONS, STATUS, STATUSES, monthLabel } from './schema.js';

describe('createRandom', () => {
  it('is deterministic for a seed', () => {
    const a = createRandom(7);
    const b = createRandom(7);
    const seqA = Array.from({ length: 5 }, a.next);
    const seqB = Array.from({ length: 5 }, b.next);
    expect(seqA).toEqual(seqB);
    seqA.forEach((v) => expect(v).toBeGreaterThanOrEqual(0) && expect(v).toBeLessThan(1));
  });

  it('weighted() respects a cumulative table', () => {
    const rnd = createRandom(1);
    const counts = [0, 0];
    for (let i = 0; i < 10_000; i++) counts[rnd.weighted([1, 4])]++;
    expect(counts[1] / counts[0]).toBeGreaterThan(2.5);
  });
});

describe('generateDataset', () => {
  const ds = generateDataset({ rows: 20_000, seed: 3 });

  it('produces typed columns of the requested length', () => {
    expect(ds.rows).toBe(20_000);
    for (const col of Object.values(ds.columns)) expect(col.length).toBe(20_000);
    expect(ds.columns.budget).toBeInstanceOf(Float32Array);
  });

  it('keeps codes inside their dimension tables', () => {
    const { region, category, status, month } = ds.columns;
    expect(Math.max(...region)).toBeLessThan(REGIONS.length);
    expect(Math.max(...category)).toBeLessThan(CATEGORIES.length);
    expect(Math.max(...status)).toBeLessThan(STATUSES.length);
    expect(Math.max(...month)).toBeLessThan(MONTH_COUNT);
  });

  it('is sorted by month and only filled rows have days-to-fill', () => {
    const { month, status, daysToFill } = ds.columns;
    for (let i = 1; i < ds.rows; i++) expect(month[i]).toBeGreaterThanOrEqual(month[i - 1]);
    for (let i = 0; i < ds.rows; i++) {
      if (status[i] !== STATUS.FILLED) expect(daysToFill[i]).toBe(0);
      else expect(daysToFill[i]).toBeGreaterThan(0);
    }
  });

  it('is reproducible', () => {
    const again = generateDataset({ rows: 20_000, seed: 3 });
    expect(again.columns.budget).toEqual(ds.columns.budget);
  });

  it('has an upward trend in monthly weights', () => {
    const w = monthlyWeights();
    expect(w[w.length - 2]).toBeGreaterThan(w[1]);
  });
});

describe('monthLabel', () => {
  it('starts at November 2023', () => {
    expect(monthLabel(0, { long: true })).toBe('Nov 2023');
    expect(monthLabel(2, { long: true })).toBe('Jan 2024');
  });
});
