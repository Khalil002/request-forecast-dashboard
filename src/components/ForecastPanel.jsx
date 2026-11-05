import { useDispatch, useStore } from '../store/StoreContext.jsx';
import { setHorizon, setModel } from '../store/actions.js';
import { MODELS } from '../analytics/forecast.js';
import { fmtInt, fmtPct } from '../format.js';
import { monthLabel } from '../data/schema.js';

/**
 * Model controls + backtest comparison. Loaded with React.lazy, so this
 * code (and the table it renders) is a separate chunk fetched on demand.
 */
export default function ForecastPanel({ forecast, backtests, historyLength }) {
  const { model, horizon } = useStore((s) => s.forecast);
  const dispatch = useDispatch();
  const scored = backtests.filter((b) => b.mape != null);
  const best = scored.reduce((a, b) => (a && a.mape <= b.mape ? a : b), null);

  return (
    <section className="card forecast-panel" aria-labelledby="forecast-heading">
      <div className="card-head">
        <div>
          <h2 id="forecast-heading">Forecast model</h2>
          <p className="card-sub">Backtest: fit on all but the last 6 months, then score the 6 held-out months</p>
        </div>
      </div>

      <div className="forecast-controls">
        <div className="segmented" role="radiogroup" aria-label="Model">
          {Object.entries(MODELS).map(([key, { label }]) => (
            <label key={key} className={model === key ? 'is-selected' : undefined}>
              <input type="radio" name="model" value={key} checked={model === key} onChange={() => dispatch(setModel(key))} />
              {label}
            </label>
          ))}
        </div>
        <label className="control">
          <span className="control-label">Horizon</span>
          <input type="range" min="1" max="12" value={horizon} onChange={(e) => dispatch(setHorizon(Number(e.target.value)))} aria-valuetext={`${horizon} months`} />
          <span className="control-value">{horizon} mo</span>
        </label>
      </div>

      <div className="two-col">
        <table className="data-table">
          <caption className="sr-only">Backtest error by model</caption>
          <thead>
            <tr><th scope="col">Model</th><th scope="col" className="num">MAE</th><th scope="col" className="num">MAPE</th></tr>
          </thead>
          <tbody>
            {backtests.map((b) => (
              <tr key={b.key} className={b.key === model ? 'is-current' : undefined}>
                <th scope="row">
                  {b.label}
                  {best?.key === b.key && <span className="badge">Most accurate</span>}
                </th>
                <td className="num">{b.mae == null ? '–' : fmtInt(b.mae)}</td>
                <td className="num">{fmtPct(b.mape)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="data-table">
          <caption className="sr-only">Forecast values</caption>
          <thead>
            <tr><th scope="col">Month</th><th scope="col" className="num">Forecast</th><th scope="col" className="num">95% interval</th></tr>
          </thead>
          <tbody>
            {forecast.forecast.map((v, k) => (
              <tr key={k}>
                <th scope="row">{monthLabel(historyLength + k, { long: true })}</th>
                <td className="num">{fmtInt(v)}</td>
                <td className="num">{fmtInt(forecast.lower[k])} – {fmtInt(forecast.upper[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
