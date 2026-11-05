import { memo, useCallback, useRef, useState } from 'react';
import { CATEGORIES, PRIORITIES, REGIONS, STATUSES, monthLabel } from '../data/schema.js';
import { fmtUsd } from '../format.js';

export const ROW_HEIGHT = 36;
const OVERSCAN = 8;

const STATUS_CLASS = ['status-open', 'status-interviewing', 'status-filled', 'status-cancelled'];

/** Column definitions: how to read a cell out of the typed-array columns. */
export const COLUMN_DEFS = [
  { key: 'id', label: 'ID', width: '0.7fr', cell: (ds, i) => `REQ-${String(i + 1).padStart(6, '0')}` },
  { key: 'month', label: 'Month', width: '0.8fr', cell: (ds, i) => monthLabel(ds.columns.month[i]) },
  { key: 'client', label: 'Client', width: '1.4fr', cell: (ds, i) => ds.clients[ds.columns.client[i]] },
  { key: 'region', label: 'Region', width: '1.3fr', cell: (ds, i) => REGIONS[ds.columns.region[i]] },
  { key: 'category', label: 'Role', width: '0.9fr', cell: (ds, i) => CATEGORIES[ds.columns.category[i]] },
  { key: 'priority', label: 'Priority', width: '0.7fr', cell: (ds, i) => PRIORITIES[ds.columns.priority[i]] },
  {
    key: 'status',
    label: 'Status',
    width: '1fr',
    cell: (ds, i) => {
      const s = ds.columns.status[i];
      return <span className={`status ${STATUS_CLASS[s]}`}><span className="status-dot" aria-hidden="true" />{STATUSES[s]}</span>;
    },
  },
  { key: 'budget', label: 'Budget', width: '0.8fr', numeric: true, cell: (ds, i) => fmtUsd(ds.columns.budget[i]) },
  { key: 'daysToFill', label: 'Days to fill', width: '0.8fr', numeric: true, cell: (ds, i) => ds.columns.daysToFill[i] || '–' },
  { key: 'candidates', label: 'Candidates', width: '0.8fr', numeric: true, cell: (ds, i) => ds.columns.candidates[i] },
];

const GRID = COLUMN_DEFS.map((c) => `minmax(0, ${c.width})`).join(' ');

/**
 * Windowed table: only the rows in (and just around) the viewport are in
 * the DOM, so 150k rows cost the same to render as 20. Row positions come
 * from a single translateY on the visible slice.
 */
export const VirtualTable = memo(function VirtualTable({ dataset, rows, sort, onSort, height = 440 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const frame = useRef(0);

  const onScroll = useCallback((e) => {
    const top = e.currentTarget.scrollTop;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setScrollTop(top));
  }, []);

  const count = rows.length;
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(count, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN);
  const visible = [];
  for (let k = start; k < end; k++) visible.push(k);

  return (
    <div className="vtable" role="table" aria-rowcount={count + 1} aria-label="Requests">
      <div className="vtable-head" role="rowgroup">
        <div className="vtable-row" role="row" style={{ gridTemplateColumns: GRID }}>
          {COLUMN_DEFS.map((c) => {
            const active = sort?.key === c.key;
            return (
              <div
                key={c.key}
                role="columnheader"
                aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={c.numeric ? 'num' : undefined}
              >
                <button type="button" className="sort-button" onClick={() => onSort(c.key)}>
                  {c.label}
                  <span className="sort-icon" aria-hidden="true">{active ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="vtable-body" role="rowgroup" style={{ height }} onScroll={onScroll} tabIndex={0} aria-label="Scrollable rows">
        {count === 0 ? (
          <div className="vtable-empty">No requests match these filters.</div>
        ) : (
          <div style={{ height: count * ROW_HEIGHT, position: 'relative' }}>
            <div style={{ transform: `translateY(${start * ROW_HEIGHT}px)` }}>
              {visible.map((k) => {
                const i = rows[k];
                return (
                  <div key={i} className="vtable-row" role="row" aria-rowindex={k + 2} style={{ gridTemplateColumns: GRID, height: ROW_HEIGHT }}>
                    {COLUMN_DEFS.map((c) => (
                      <div key={c.key} role="cell" className={c.numeric ? 'num' : undefined}>{c.cell(dataset, i)}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
