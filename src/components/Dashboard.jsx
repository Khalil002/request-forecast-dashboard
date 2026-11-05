import { Suspense, lazy, useDeferredValue, useMemo } from 'react';
import { useDispatch, useStore } from '../store/StoreContext.jsx';
import { setSort, setTheme, toggleFilter } from '../store/actions.js';
import {
  perf,
  selectBacktests,
  selectCategoryBreakdown,
  selectFilteredRows,
  selectForecast,
  selectKpis,
  selectMonthlySeries,
  selectSortedRows,
} from '../store/selectors.js';
import { FilterBar } from './FilterBar.jsx';
import { KpiRow } from './KpiRow.jsx';
import { TrendChart } from './TrendChart.jsx';
import { CategoryBars } from './CategoryBars.jsx';
import { VirtualTable } from './VirtualTable.jsx';
import { fmtInt, fmtMs } from '../format.js';

// Code splitting: the model panel is its own chunk.
const ForecastPanel = lazy(() => import('./ForecastPanel.jsx'));

const THEMES = ['system', 'light', 'dark'];

export function Dashboard() {
  const dispatch = useDispatch();
  const dataset = useStore((s) => s.dataset);
  const meta = useStore((s) => s.meta);
  const filters = useStore((s) => s.filters);
  const sort = useStore((s) => s.sort);
  const forecastSettings = useStore((s) => s.forecast);
  const theme = useStore((s) => s.theme);

  // Heavy derived data reads a deferred copy of the inputs: React renders the
  // controls immediately and recomputes the 150k-row views in the background.
  const deferredFilters = useDeferredValue(filters);
  const deferredSort = useDeferredValue(sort);
  const stale = deferredFilters !== filters || deferredSort !== sort;
  const view = useMemo(
    () => ({ dataset, filters: deferredFilters, sort: deferredSort, forecast: forecastSettings }),
    [dataset, deferredFilters, deferredSort, forecastSettings],
  );

  const filtered = selectFilteredRows(view);
  const sorted = selectSortedRows(view);
  const kpis = selectKpis(view);
  const series = selectMonthlySeries(view);
  const breakdown = selectCategoryBreakdown(view);
  const forecast = selectForecast(view);
  const backtests = selectBacktests(view);

  return (
    <div className={`dashboard${stale ? ' is-stale' : ''}`}>
      <header className="app-header">
        <div>
          <h1>Request Forecast</h1>
          <p className="subtitle">Monthly staffing requests across {fmtInt(dataset.clients.length)} client accounts</p>
        </div>
        <div className="header-side">
          <dl className="perf" aria-label="Performance">
            <div><dt>Rows</dt><dd>{fmtInt(dataset.rows)}</dd></div>
            <div><dt>Generated</dt><dd>{fmtMs(meta?.ms)} · {meta?.source}</dd></div>
            <div><dt>Filter pass</dt><dd>{fmtMs(perf.filterMs)}</dd></div>
            <div><dt>Sort</dt><dd>{fmtMs(perf.sortMs)}</dd></div>
          </dl>
          <label className="control">
            <span className="control-label">Theme</span>
            <select value={theme} onChange={(e) => dispatch(setTheme(e.target.value))}>
              {THEMES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </select>
          </label>
        </div>
      </header>

      <FilterBar />
      <KpiRow kpis={kpis} forecast={forecast} series={series} />

      <div className="grid-main">
        <TrendChart series={series} forecast={forecast} monthRange={deferredFilters.monthRange} />
        <CategoryBars breakdown={breakdown} selected={filters.categories} onToggle={(code) => dispatch(toggleFilter('categories', code))} />
      </div>

      <Suspense fallback={<div className="card skeleton" aria-busy="true">Loading forecast model…</div>}>
        <ForecastPanel forecast={forecast} backtests={backtests} historyLength={series.length} />
      </Suspense>

      <section className="card" aria-labelledby="table-heading">
        <div className="card-head">
          <div>
            <h2 id="table-heading">Requests</h2>
            <p className="card-sub">{fmtInt(filtered.length)} of {fmtInt(dataset.rows)} rows · virtualized, click a header to sort</p>
          </div>
        </div>
        <VirtualTable dataset={dataset} rows={sorted} sort={deferredSort} onSort={(key) => dispatch(setSort(key))} />
      </section>
    </div>
  );
}
