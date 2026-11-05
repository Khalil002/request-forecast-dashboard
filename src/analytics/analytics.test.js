import { describe, expect, it } from 'vitest';
import { filterRows, EMPTY_FILTERS } from './filter.js';
import { computeKpis, countBy, medianOfSmallInts, monthlyCounts } from './aggregate.js';
import { sortRows } from './sort.js';
import { STATUS } from '../data/schema.js';

// A tiny hand-made dataset so expectations are obvious.
const ds = {
  rows: 6,
  months: 3,
  clients: ['Acme', 'Beta Corp', 'Gamma'],
  columns: {
    month: Uint8Array.from([0, 0, 1, 1, 2, 2]),
    client: Uint16Array.from([0, 1, 2, 0, 1, 2]),
    region: Uint8Array.from([0, 1, 0, 1, 0, 1]),
    category: Uint8Array.from([0, 0, 1, 1, 2, 2]),
    status: Uint8Array.from([STATUS.FILLED, STATUS.FILLED, STATUS.CANCELLED, STATUS.OPEN, STATUS.FILLED, STATUS.INTERVIEWING]),
    priority: Uint8Array.from([0, 1, 2, 3, 0, 1]),
    budget: Float32Array.from([100, 200, 300, 400, 500, 600]),
    daysToFill: Uint16Array.from([10, 30, 0, 0, 20, 0]),
    candidates: Uint8Array.from([1, 2, 3, 4, 5, 6]),
  },
};

describe('filterRows', () => {
  it('returns every row with empty filters', () => {
    expect(Array.from(filterRows(ds, EMPTY_FILTERS))).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('combines dimensions with AND and codes with OR', () => {
    const f = { ...EMPTY_FILTERS, regions: [0], categories: [0, 2] };
    expect(Array.from(filterRows(ds, f))).toEqual([0, 4]);
  });

  it('applies an inclusive month range', () => {
    const f = { ...EMPTY_FILTERS, monthRange: [1, 2] };
    expect(Array.from(filterRows(ds, f))).toEqual([2, 3, 4, 5]);
  });

  it('matches client names case-insensitively', () => {
    const f = { ...EMPTY_FILTERS, clientQuery: 'ACM' };
    expect(Array.from(filterRows(ds, f))).toEqual([0, 3]);
  });
});

describe('aggregations', () => {
  const all = filterRows(ds);

  it('counts rows per month and per code', () => {
    expect(monthlyCounts(ds, all)).toEqual([2, 2, 2]);
    expect(countBy(ds.columns.category, all, 3)).toEqual([2, 2, 2]);
  });

  it('computes medians of small ints for odd and even lengths', () => {
    expect(medianOfSmallInts([5, 1, 3])).toBe(3);
    expect(medianOfSmallInts([4, 1, 3, 2])).toBe(2.5);
    expect(medianOfSmallInts([])).toBeNull();
  });

  it('computes KPIs', () => {
    const k = computeKpis(ds, all);
    expect(k.total).toBe(6);
    expect(k.open).toBe(2);
    expect(k.fillRate).toBeCloseTo(3 / 4);
    expect(k.medianDaysToFill).toBe(20);
    expect(k.avgBudget).toBe(350);
  });

  it('handles an empty selection', () => {
    const k = computeKpis(ds, new Uint32Array(0));
    expect(k).toMatchObject({ total: 0, fillRate: null, medianDaysToFill: null, avgBudget: null });
  });
});

describe('sortRows', () => {
  const all = filterRows(ds);

  it('sorts numerically with a stable tiebreak', () => {
    expect(Array.from(sortRows(ds, all, { key: 'budget', dir: 'desc' }))).toEqual([5, 4, 3, 2, 1, 0]);
    expect(Array.from(sortRows(ds, all, { key: 'region', dir: 'asc' }))).toEqual([0, 2, 4, 1, 3, 5]);
  });

  it('sorts clients alphabetically by name', () => {
    expect(Array.from(sortRows(ds, all, { key: 'client', dir: 'asc' }))).toEqual([0, 3, 1, 4, 2, 5]);
  });

  it('does not mutate the input', () => {
    const input = Uint32Array.from([2, 0, 1]);
    sortRows(ds, input, { key: 'budget', dir: 'asc' });
    expect(Array.from(input)).toEqual([2, 0, 1]);
  });
});
