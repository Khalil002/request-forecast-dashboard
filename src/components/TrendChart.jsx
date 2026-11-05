import { memo, useMemo, useState } from 'react';
import { linear, niceTicks } from './scale.js';
import { useElementWidth } from './useElementWidth.js';
import { monthLabel } from '../data/schema.js';
import { fmtInt } from '../format.js';

const HEIGHT = 300;
const M = { top: 16, right: 16, bottom: 28, left: 52 };

function path(points) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
}

/**
 * Monthly requests with the forecast continued on the right: actual is a
 * solid line, the forecast dashed in the same hue (same entity), the 95%
 * interval a light band. Crosshair tooltip on hover / arrow keys.
 */
export const TrendChart = memo(function TrendChart({ series, forecast, monthRange }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const [showFit, setShowFit] = useState(false);

  const n = series.length;
  const h = forecast.forecast.length;
  const total = n + h;

  const geom = useMemo(() => {
    const innerW = width - M.left - M.right;
    const x = linear([0, total - 1], [M.left, M.left + innerW]);
    const max = Math.max(...series, ...forecast.upper);
    const ticks = niceTicks(max * 1.05, 5);
    const y = linear([0, ticks[ticks.length - 1]], [HEIGHT - M.bottom, M.top]);
    const actual = path(series.map((v, i) => [x(i), y(v)]));
    // Forecast starts at the last actual point so the lines connect.
    const fc = path([[x(n - 1), y(series[n - 1])], ...forecast.forecast.map((v, k) => [x(n + k), y(v)])]);
    const upper = [[x(n - 1), y(series[n - 1])], ...forecast.upper.map((v, k) => [x(n + k), y(v)])];
    const lower = [...forecast.lower.map((v, k) => [x(n + k), y(v)])].reverse();
    const bandPath = `${path([...upper, ...lower])}Z`;
    const fit = path(forecast.fitted.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean));
    // Pick the densest month step whose labels (~52px) don't collide.
    const step = [3, 6, 12].find((k) => (innerW / total) * k >= 52) ?? 12;
    const xTicks = Array.from({ length: total }, (_, i) => i).filter((i) => i % step === 0);
    return { x, y, ticks, actual, fc, bandPath, fit, xTicks, innerW };
  }, [width, series, forecast, n, total]);

  const { x, y } = geom;

  const pick = (clientX, rect) => {
    const px = clientX - rect.left;
    const i = Math.round(((px - M.left) / geom.innerW) * (total - 1));
    return Math.max(0, Math.min(total - 1, i));
  };

  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setHover((cur) => Math.max(0, Math.min(total - 1, (cur ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const tip = hover == null ? null : hover < n
    ? { title: monthLabel(hover, { long: true }), rows: [['Actual', fmtInt(series[hover])], ...(showFit && forecast.fitted[hover] != null ? [['Model fit', fmtInt(forecast.fitted[hover])]] : [])] }
    : {
        title: `${monthLabel(hover, { long: true })} · forecast`,
        rows: [['Forecast', fmtInt(forecast.forecast[hover - n])], ['95% interval', `${fmtInt(forecast.lower[hover - n])} – ${fmtInt(forecast.upper[hover - n])}`]],
      };
  const tipValue = hover == null ? null : hover < n ? series[hover] : forecast.forecast[hover - n];

  return (
    <figure className="card chart-card">
      <figcaption className="card-head">
        <div>
          <h2>Monthly requests and forecast</h2>
          <p className="card-sub">{forecast.label} · {h}-month horizon</p>
        </div>
        <label className="check check-inline">
          <input type="checkbox" checked={showFit} onChange={(e) => setShowFit(e.target.checked)} /> Show model fit
        </label>
      </figcaption>
      <ul className="legend" aria-label="Legend">
        <li><span className="swatch swatch-line" /> Actual</li>
        <li><span className="swatch swatch-dash" /> Forecast</li>
        <li><span className="swatch swatch-band" /> 95% interval</li>
        {showFit && <li><span className="swatch swatch-fit" /> Model fit</li>}
      </ul>
      <div className="chart-wrap" ref={ref}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Line chart of monthly requests over ${n} months with a ${h}-month forecast. Use left and right arrow keys to read values.`}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          onPointerMove={(e) => setHover(pick(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setHover(null)}
        >
          {monthRange && (
            <rect
              className="range-shade"
              x={x(monthRange[0]) - 4}
              y={M.top}
              width={Math.max(8, x(monthRange[1]) - x(monthRange[0]) + 8)}
              height={HEIGHT - M.top - M.bottom}
            />
          )}
          <rect className="forecast-zone" x={x(n - 1)} y={M.top} width={x(total - 1) - x(n - 1) + M.right / 2} height={HEIGHT - M.top - M.bottom} />
          {geom.ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
              <text className="tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{t >= 1000 ? `${t / 1000}k` : t}</text>
            </g>
          ))}
          <line className="baseline" x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} />
          {geom.xTicks.map((i) => (
            <text key={i} className="tick" x={x(i)} y={HEIGHT - 8} textAnchor="middle">{monthLabel(i)}</text>
          ))}
          <path className="band" d={geom.bandPath} />
          {showFit && <path className="fit-line" d={geom.fit} />}
          <path className="series-line" d={geom.actual} />
          <path className="forecast-line" d={geom.fc} />
          {hover != null && (
            <g pointerEvents="none">
              <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={M.top} y2={HEIGHT - M.bottom} />
              <circle className="hover-dot" cx={x(hover)} cy={y(tipValue)} r="5" />
            </g>
          )}
        </svg>
        {tip && (
          <div className="tooltip" role="status" style={{ left: x(hover) > width / 2 ? Math.max(0, x(hover) - 192) : x(hover) + 12, top: M.top }}>
            <div className="tooltip-title">{tip.title}</div>
            {tip.rows.map(([k, v]) => (
              <div className="tooltip-row" key={k}><span>{k}</span><strong>{v}</strong></div>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
});
