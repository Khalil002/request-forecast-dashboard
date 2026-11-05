/**
 * Client-side forecasting models for a monthly series.
 *
 * Every model has the same shape so the UI and the backtest can treat them
 * interchangeably:
 *   model(series, horizon, params) -> {
 *     fitted:   (number | null)[]  // in-sample estimate, same length as series
 *     forecast: number[]           // `horizon` future points
 *     lower:    number[]           // ~95% interval, per future point
 *     upper:    number[]
 *   }
 */

const Z95 = 1.96;

function mean(xs) {
  let s = 0;
  for (const x of xs) s += x;
  return xs.length ? s / xs.length : NaN;
}

/** Sample standard deviation of residuals, skipping nulls. */
function residualStd(series, fitted, dof = 1) {
  let ss = 0;
  let n = 0;
  for (let i = 0; i < series.length; i++) {
    if (fitted[i] == null) continue;
    const e = series[i] - fitted[i];
    ss += e * e;
    n++;
  }
  return n > dof ? Math.sqrt(ss / (n - dof)) : 0;
}

function band(forecast, widthAt) {
  return {
    lower: forecast.map((f, h) => Math.max(0, f - widthAt(h + 1))),
    upper: forecast.map((f, h) => f + widthAt(h + 1)),
  };
}

/** Ordinary least squares fit of y = intercept + slope * x. */
export function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) throw new Error('linearRegression needs at least two points');
  const xBar = mean(xs);
  const yBar = mean(ys);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xBar;
    const dy = ys[i] - yBar;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yBar - slope * xBar;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2, xBar, sxx, n, predict: (x) => intercept + slope * x };
}

/**
 * Trailing simple moving average. The forecast is flat at the last window
 * mean; the interval widens with sqrt(h) like a random walk.
 */
export function movingAverage(series, horizon, { window = 3 } = {}) {
  const w = Math.max(1, Math.min(window, series.length));
  const fitted = series.map(() => null);
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
    if (i >= w) sum -= series[i - w];
    // One-step-ahead: the average of the w points *before* i.
    if (i + 1 < series.length && i >= w - 1) fitted[i + 1] = sum / w;
  }
  const last = mean(series.slice(-w));
  const forecast = Array.from({ length: horizon }, () => last);
  const sd = residualStd(series, fitted);
  return { fitted, forecast, ...band(forecast, (h) => Z95 * sd * Math.sqrt(h)) };
}

/** Straight-line trend with a proper OLS prediction interval. */
export function linearTrend(series, horizon) {
  const xs = series.map((_, i) => i);
  const fit = linearRegression(xs, series);
  const fitted = xs.map(fit.predict);
  const n = series.length;
  const forecast = Array.from({ length: horizon }, (_, h) => fit.predict(n + h));
  const sd = residualStd(series, fitted, 2);
  const widthAt = (h) => {
    const x = n - 1 + h;
    return Z95 * sd * Math.sqrt(1 + 1 / n + ((x - fit.xBar) ** 2) / fit.sxx);
  };
  return { fitted, forecast, ...band(forecast, widthAt), slope: fit.slope, r2: fit.r2 };
}

/**
 * Holt's linear exponential smoothing (level + trend).
 * alpha weights recent observations for the level, beta for the trend.
 */
export function holt(series, horizon, { alpha = 0.5, beta = 0.2 } = {}) {
  const fitted = series.map(() => null);
  if (series.length < 2) {
    const v = series[0] ?? 0;
    const forecast = Array.from({ length: horizon }, () => v);
    return { fitted, forecast, lower: forecast, upper: forecast };
  }
  let level = series[0];
  let trend = series[1] - series[0];
  for (let i = 1; i < series.length; i++) {
    fitted[i] = level + trend;
    const prevLevel = level;
    level = alpha * series[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const forecast = Array.from({ length: horizon }, (_, h) => level + (h + 1) * trend);
  const sd = residualStd(series, fitted);
  return { fitted, forecast, ...band(forecast, (h) => Z95 * sd * Math.sqrt(1 + (h - 1) * alpha * alpha)) };
}

/**
 * Linear trend × multiplicative seasonal index (period 12).
 * 1. Fit a line, 2. average actual/trend per season to get indices,
 * 3. refit the line on the de-seasonalised series, 4. re-apply indices.
 * Needs two full cycles; otherwise it falls back to a plain trend.
 */
export function seasonalTrend(series, horizon, { period = 12 } = {}) {
  if (series.length < period * 2) return linearTrend(series, horizon);
  const xs = series.map((_, i) => i);
  const first = linearRegression(xs, series);

  const sums = new Array(period).fill(0);
  const counts = new Array(period).fill(0);
  series.forEach((y, i) => {
    const t = first.predict(i);
    if (t > 0) {
      sums[i % period] += y / t;
      counts[i % period]++;
    }
  });
  let index = sums.map((s, k) => (counts[k] ? s / counts[k] : 1));
  const norm = mean(index);
  index = index.map((v) => v / norm); // indices average to exactly 1

  const deseason = series.map((y, i) => y / index[i % period]);
  const fit = linearRegression(xs, deseason);
  const fitted = xs.map((x) => fit.predict(x) * index[x % period]);
  const n = series.length;
  const forecast = Array.from({ length: horizon }, (_, h) => fit.predict(n + h) * index[(n + h) % period]);
  // Residual df: 2 line params + (period - 1) free seasonal indices.
  const sd = residualStd(series, fitted, 2 + period - 1);
  return {
    fitted,
    forecast,
    ...band(forecast, (h) => Z95 * sd * index[(n + h - 1) % period] * Math.sqrt(1 + h / n)),
    seasonalIndex: index,
  };
}

export const MODELS = {
  seasonal: { label: 'Trend + seasonality', fn: seasonalTrend },
  holt: { label: 'Holt smoothing', fn: holt },
  linear: { label: 'Linear trend', fn: linearTrend },
  movingAverage: { label: 'Moving average', fn: movingAverage },
};

/**
 * Hold out the last `holdout` points, fit on the rest, and score the
 * out-of-sample forecast. Lower is better for both metrics.
 */
export function backtest(series, modelFn, { holdout = 6, params } = {}) {
  if (series.length <= holdout + 2) return null;
  const train = series.slice(0, -holdout);
  const actual = series.slice(-holdout);
  const { forecast } = modelFn(train, holdout, params);
  let abs = 0;
  let pct = 0;
  let pctN = 0;
  actual.forEach((a, i) => {
    const e = Math.abs(a - forecast[i]);
    abs += e;
    if (a !== 0) {
      pct += e / Math.abs(a);
      pctN++;
    }
  });
  return { mae: abs / holdout, mape: pctN ? pct / pctN : null, forecast, actual };
}
