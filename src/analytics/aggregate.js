import { STATUS } from '../data/schema.js';

/** Count of rows per month (dense array of length `months`). */
export function monthlyCounts(dataset, indices) {
  const out = new Array(dataset.months).fill(0);
  const { month } = dataset.columns;
  for (let k = 0; k < indices.length; k++) out[month[indices[k]]]++;
  return out;
}

/** Count rows per code for a dimension column. */
export function countBy(column, indices, size) {
  const out = new Array(size).fill(0);
  for (let k = 0; k < indices.length; k++) out[column[indices[k]]]++;
  return out;
}

/**
 * Median of small non-negative integers via a counting histogram:
 * O(n + range) instead of O(n log n) sorting.
 */
export function medianOfSmallInts(values) {
  if (values.length === 0) return null;
  let max = 0;
  for (const v of values) if (v > max) max = v;
  const hist = new Uint32Array(max + 1);
  for (const v of values) hist[v]++;
  const lowRank = Math.floor((values.length - 1) / 2);
  const highRank = Math.ceil((values.length - 1) / 2);
  let seen = 0;
  let low = null;
  for (let v = 0; v <= max; v++) {
    seen += hist[v];
    if (low === null && seen > lowRank) low = v;
    if (seen > highRank) return (low + v) / 2;
  }
  return low;
}

/** Headline numbers for the KPI row. */
export function computeKpis(dataset, indices) {
  const { status, budget, daysToFill } = dataset.columns;
  let filled = 0;
  let cancelled = 0;
  let open = 0;
  let budgetSum = 0;
  const fillDays = [];
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    const s = status[i];
    budgetSum += budget[i];
    if (s === STATUS.FILLED) {
      filled++;
      fillDays.push(daysToFill[i]);
    } else if (s === STATUS.CANCELLED) cancelled++;
    else open++;
  }
  const closed = filled + cancelled;
  return {
    total: indices.length,
    open,
    fillRate: closed ? filled / closed : null,
    medianDaysToFill: medianOfSmallInts(fillDays),
    avgBudget: indices.length ? budgetSum / indices.length : null,
  };
}
