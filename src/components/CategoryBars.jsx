import { memo, useState } from 'react';
import { fmtInt, fmtPct } from '../format.js';

/**
 * Requests by role as horizontal bars (magnitude → one hue). Clicking a
 * bar toggles that role in the filters, so the chart doubles as a control.
 */
export const CategoryBars = memo(function CategoryBars({ breakdown, selected, onToggle }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...breakdown.map((d) => d.count));
  const total = breakdown.reduce((s, d) => s + d.count, 0);

  return (
    <figure className="card">
      <figcaption className="card-head">
        <div>
          <h2>Requests by role</h2>
          <p className="card-sub">Click a bar to filter</p>
        </div>
      </figcaption>
      <ul className="bars">
        {breakdown.map((d) => {
          const active = selected.length === 0 || selected.includes(d.code);
          return (
            <li key={d.code}>
              <button
                type="button"
                className={`bar-row${active ? '' : ' is-dim'}`}
                aria-pressed={selected.includes(d.code)}
                aria-label={`${d.label}: ${fmtInt(d.count)} requests, ${fmtPct(total ? d.count / total : 0)}`}
                onClick={() => onToggle(d.code)}
                onPointerEnter={() => setHover(d.code)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(d.code)}
                onBlur={() => setHover(null)}
              >
                <span className="bar-label">{d.label}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(d.count / max) * 100}%` }} />
                </span>
                <span className="bar-value">
                  {hover === d.code ? fmtPct(total ? d.count / total : 0) : fmtInt(d.count)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </figure>
  );
});
