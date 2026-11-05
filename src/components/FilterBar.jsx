import { useEffect, useState } from 'react';
import { useDispatch, useStore } from '../store/StoreContext.jsx';
import { resetFilters, setClientQuery, setMonthRange, toggleFilter } from '../store/actions.js';
import { CATEGORIES, MONTH_COUNT, PRIORITIES, REGIONS, STATUSES, monthLabel } from '../data/schema.js';
import { EMPTY_FILTERS } from '../analytics/filter.js';
import { MultiSelect } from './MultiSelect.jsx';

const MONTHS = Array.from({ length: MONTH_COUNT }, (_, i) => i);

export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const dispatch = useDispatch();
  const [from, to] = filters.monthRange ?? [0, MONTH_COUNT - 1];

  // Local echo for the text box; the store update is debounced lightly.
  const [query, setQuery] = useState(filters.clientQuery);
  useEffect(() => setQuery(filters.clientQuery), [filters.clientQuery]);
  useEffect(() => {
    const t = setTimeout(() => dispatch(setClientQuery(query)), 120);
    return () => clearTimeout(t);
  }, [query, dispatch]);

  const dims = [
    ['Region', 'regions', REGIONS],
    ['Role', 'categories', CATEGORIES],
    ['Status', 'statuses', STATUSES],
    ['Priority', 'priorities', PRIORITIES],
  ];

  return (
    <section className="filter-bar" aria-label="Filters">
      {dims.map(([label, key, options]) => (
        <MultiSelect key={key} label={label} options={options} selected={filters[key]} onToggle={(code) => dispatch(toggleFilter(key, code))} />
      ))}
      <label className="control">
        <span className="control-label">From</span>
        <select value={from} onChange={(e) => dispatch(setMonthRange(Number(e.target.value), to))}>
          {MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m, { long: true })}</option>)}
        </select>
      </label>
      <label className="control">
        <span className="control-label">To</span>
        <select value={to} onChange={(e) => dispatch(setMonthRange(from, Number(e.target.value)))}>
          {MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m, { long: true })}</option>)}
        </select>
      </label>
      <label className="control control-search">
        <span className="control-label">Client</span>
        <input type="search" placeholder="Search clients" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <button type="button" className="button-ghost" disabled={filters === EMPTY_FILTERS} onClick={() => dispatch(resetFilters())}>
        Reset
      </button>
    </section>
  );
}
