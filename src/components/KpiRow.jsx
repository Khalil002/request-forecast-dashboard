import { fmtCompact, fmtInt, fmtPct, fmtUsd } from '../format.js';
import { monthLabel } from '../data/schema.js';

export function KpiRow({ kpis, forecast, series }) {
  const lastActual = series[series.length - 1];
  const next = forecast.forecast[0];
  const delta = lastActual ? (next - lastActual) / lastActual : null;
  const tiles = [
    { label: 'Requests', value: fmtInt(kpis.total), note: `${fmtInt(kpis.open)} still open` },
    { label: 'Fill rate', value: fmtPct(kpis.fillRate), note: 'filled ÷ closed' },
    { label: 'Median time to fill', value: kpis.medianDaysToFill == null ? '–' : `${kpis.medianDaysToFill} days`, note: 'filled requests' },
    { label: 'Avg. budget', value: fmtUsd(kpis.avgBudget), note: 'per request' },
    {
      label: `Forecast, ${monthLabel(series.length, { long: true })}`,
      value: fmtCompact(next),
      note: delta == null ? '' : `${delta >= 0 ? '▲' : '▼'} ${fmtPct(Math.abs(delta))} vs last month`,
    },
  ];
  return (
    <section className="kpi-row" aria-label="Key figures">
      {tiles.map((t) => (
        <div className="tile" key={t.label}>
          <div className="tile-label">{t.label}</div>
          <div className="tile-value">{t.value}</div>
          <div className="tile-note">{t.note}</div>
        </div>
      ))}
    </section>
  );
}
