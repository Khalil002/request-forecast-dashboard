import { describe, expect, it, vi } from 'vitest';
import { createStore } from './createStore.js';
import { initialState, reducer } from './reducer.js';
import * as A from './actions.js';
import { createSelector } from './memoize.js';
import { selectFilteredRows, selectForecast, selectKpis, selectMonthlySeries } from './selectors.js';
import { generateDataset } from '../data/generate.js';

describe('createStore', () => {
  it('notifies subscribers only when state changes', () => {
    const store = createStore(reducer, initialState);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.dispatch({ type: 'unknown' });
    expect(listener).not.toHaveBeenCalled();
    store.dispatch(A.setModel('holt'));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.dispatch(A.setModel('linear'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('rejects actions without a type', () => {
    expect(() => createStore(reducer, initialState).dispatch({})).toThrow();
  });
});

describe('reducer', () => {
  it('toggles filter codes on and off, keeping them sorted', () => {
    let s = reducer(initialState, A.toggleFilter('regions', 3));
    s = reducer(s, A.toggleFilter('regions', 1));
    expect(s.filters.regions).toEqual([1, 3]);
    s = reducer(s, A.toggleFilter('regions', 3));
    expect(s.filters.regions).toEqual([1]);
  });

  it('normalises month ranges and ignores no-op updates', () => {
    const s = reducer(initialState, A.setMonthRange(10, 2));
    expect(s.filters.monthRange).toEqual([2, 10]);
    expect(reducer(s, A.setMonthRange(2, 10))).toBe(s);
  });

  it('flips sort direction on the same key', () => {
    let s = reducer(initialState, A.setSort('budget'));
    expect(s.sort).toEqual({ key: 'budget', dir: 'desc' });
    s = reducer(s, A.setSort('budget'));
    expect(s.sort.dir).toBe('asc');
  });

  it('clamps the forecast horizon', () => {
    expect(reducer(initialState, A.setHorizon(40)).forecast.horizon).toBe(12);
    expect(reducer(initialState, A.setHorizon(0)).forecast.horizon).toBe(1);
  });

  it('resets filters back to the shared empty object', () => {
    const s = reducer(reducer(initialState, A.toggleFilter('statuses', 2)), A.resetFilters());
    expect(s.filters).toBe(initialState.filters);
  });
});

describe('memoized selectors', () => {
  it('createSelector recomputes only on new input references', () => {
    const compute = vi.fn((a) => a.length);
    const sel = createSelector([(x) => x.list], compute);
    const list = [1, 2];
    sel({ list });
    sel({ list });
    expect(compute).toHaveBeenCalledTimes(1);
    sel({ list: [...list] });
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('derive consistent views from the dataset', () => {
    const dataset = generateDataset({ rows: 5_000, seed: 9 });
    const view = { ...initialState, dataset };
    const rows = selectFilteredRows(view);
    expect(rows.length).toBe(5_000);
    expect(selectFilteredRows({ ...view })).toBe(rows);
    expect(selectKpis(view).total).toBe(5_000);

    const series = selectMonthlySeries(view);
    expect(series.reduce((a, b) => a + b, 0)).toBe(5_000);

    // A month range narrows KPIs but not the forecasting history.
    const narrowed = reducer(view, A.setMonthRange(0, 5));
    expect(selectKpis(narrowed).total).toBeLessThan(5_000);
    expect(selectMonthlySeries(narrowed)).toEqual(series);

    const fc = selectForecast(view);
    expect(fc.forecast).toHaveLength(initialState.forecast.horizon);
  });
});

describe('forecast history memoization', () => {
  it('does not recompute the forecast when only the month range changes', async () => {
    const sel = await import('./selectors.js');
    const dataset = generateDataset({ rows: 2_000, seed: 2 });
    const view = { ...initialState, dataset };
    const first = sel.selectForecast(view);
    const zoomed = reducer(view, A.setMonthRange(3, 9));
    expect(sel.selectForecast(zoomed)).toBe(first);
  });
});
