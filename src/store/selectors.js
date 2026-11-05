import { createSelector } from './memoize.js';
import { filterRows } from '../analytics/filter.js';
import { computeKpis, countBy, monthlyCounts } from '../analytics/aggregate.js';
import { sortRows } from '../analytics/sort.js';
import { MODELS, backtest } from '../analytics/forecast.js';
import { CATEGORIES } from '../data/schema.js';

/*
 * Selectors take a "view" object: { dataset, filters, sort, forecast }.
 * The UI passes a *deferred* copy of filters (useDeferredValue), so typing
 * stays responsive while the 150k-row pass catches up.
 */
const dataset = (v) => v.dataset;
const filters = (v) => v.filters;
const sort = (v) => v.sort;
const model = (v) => v.forecast.model;
const horizon = (v) => v.forecast.horizon;

/** Last measured filter pass, for the performance readout. */
export const perf = { filterMs: 0, sortMs: 0 };

export const selectFilteredRows = createSelector([dataset, filters], (ds, f) => {
  const t = performance.now();
  const rows = filterRows(ds, f);
  perf.filterMs = performance.now() - t;
  return rows;
});

const filteredRows = (v) => selectFilteredRows(v);

export const selectSortedRows = createSelector([dataset, filteredRows, sort], (ds, rows, s) => {
  const t = performance.now();
  const out = sortRows(ds, rows, s);
  perf.sortMs = performance.now() - t;
  return out;
});

export const selectKpis = createSelector([dataset, filteredRows], computeKpis);

/**
 * Monthly series for charting/forecasting. The forecast uses the full
 * history of the *other* filters: a month range only zooms the chart,
 * otherwise narrowing the window would starve the model of data.
 */
const historyRows = createSelector(
  [dataset, (v) => v.filters.regions, (v) => v.filters.categories, (v) => v.filters.statuses, (v) => v.filters.priorities, (v) => v.filters.clientQuery],
  // Inputs are the individual filter fields, so dragging the month range
  // never invalidates this (or the forecast built on it).
  (ds, regions, categories, statuses, priorities, clientQuery) =>
    filterRows(ds, { regions, categories, statuses, priorities, clientQuery, monthRange: null }),
);

export const selectMonthlySeries = createSelector([dataset, historyRows], monthlyCounts);

export const selectCategoryBreakdown = createSelector([dataset, filteredRows], (ds, rows) =>
  countBy(ds.columns.category, rows, CATEGORIES.length)
    .map((count, code) => ({ code, label: CATEGORIES[code], count }))
    .sort((a, b) => b.count - a.count),
);

const monthlySeries = (v) => selectMonthlySeries(v);

export const selectForecast = createSelector([monthlySeries, model, horizon], (series, m, h) => {
  const spec = MODELS[m] ?? MODELS.seasonal;
  return { model: m, label: spec.label, ...spec.fn(series, h) };
});

export const selectBacktests = createSelector([monthlySeries], (series) =>
  Object.entries(MODELS).map(([key, { label, fn }]) => ({ key, label, ...backtest(series, fn, { holdout: 6 }) })),
);
