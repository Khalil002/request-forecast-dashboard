import { describe, expect, it } from 'vitest';
import { MODELS, backtest, holt, linearRegression, linearTrend, movingAverage, seasonalTrend } from './forecast.js';

const line = Array.from({ length: 24 }, (_, i) => 100 + 5 * i);

describe('linearRegression', () => {
  it('recovers an exact line', () => {
    const fit = linearRegression([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(fit.slope).toBeCloseTo(2);
    expect(fit.intercept).toBeCloseTo(1);
    expect(fit.r2).toBeCloseTo(1);
    expect(fit.predict(10)).toBeCloseTo(21);
  });

  it('rejects fewer than two points', () => {
    expect(() => linearRegression([1], [1])).toThrow();
  });
});

describe('movingAverage', () => {
  it('produces one-step-ahead fitted values and a flat forecast', () => {
    const r = movingAverage([1, 2, 3, 4, 5], 2, { window: 2 });
    expect(r.fitted).toEqual([null, null, 1.5, 2.5, 3.5]);
    expect(r.forecast).toEqual([4.5, 4.5]);
  });

  it('widens the interval with the horizon', () => {
    const r = movingAverage([10, 14, 9, 15, 11, 13], 3);
    const width = r.upper.map((u, i) => u - r.lower[i]);
    expect(width[2]).toBeGreaterThan(width[0]);
  });
});

describe('linearTrend', () => {
  it('extrapolates a perfect line with a zero-width band', () => {
    const r = linearTrend(line, 3);
    expect(r.forecast[0]).toBeCloseTo(220);
    expect(r.forecast[2]).toBeCloseTo(230);
    expect(r.upper[0] - r.lower[0]).toBeCloseTo(0);
  });
});

describe('holt', () => {
  it('tracks a linear series', () => {
    const r = holt(line, 2, { alpha: 0.8, beta: 0.5 });
    expect(r.forecast[0]).toBeCloseTo(220, 0);
    expect(r.forecast[1]).toBeCloseTo(225, 0);
  });

  it('copes with a single point', () => {
    expect(holt([7], 2).forecast).toEqual([7, 7]);
  });
});

describe('seasonalTrend', () => {
  const season = [1.2, 1.1, 1, 0.9, 0.8, 0.9, 1, 1.1, 1.2, 1, 0.9, 0.9];
  const seasonal = Array.from({ length: 36 }, (_, i) => (200 + 4 * i) * season[i % 12]);

  it('learns the seasonal shape and beats a straight line out of sample', () => {
    const r = seasonalTrend(seasonal, 12);
    expect(r.seasonalIndex[0]).toBeGreaterThan(r.seasonalIndex[4]);
    const s = backtest(seasonal, seasonalTrend, { holdout: 6 });
    const l = backtest(seasonal, linearTrend, { holdout: 6 });
    expect(s.mape).toBeLessThan(0.02);
    expect(s.mape).toBeLessThan(l.mape);
  });

  it('falls back to a linear trend with under two cycles', () => {
    expect(seasonalTrend(line.slice(0, 12), 1).forecast[0]).toBeCloseTo(160);
  });
});

describe('backtest', () => {
  it('scores every registered model and never produces negative bounds', () => {
    const noisy = line.map((v, i) => v + (i % 3) * 4 - 4);
    for (const { fn } of Object.values(MODELS)) {
      const r = backtest(noisy, fn, { holdout: 4 });
      expect(r.mae).toBeGreaterThanOrEqual(0);
      expect(r.forecast).toHaveLength(4);
      fn(noisy, 6).lower.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    }
  });

  it('returns null when the series is too short', () => {
    expect(backtest([1, 2, 3], linearTrend, { holdout: 6 })).toBeNull();
  });
});
