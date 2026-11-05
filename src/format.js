const int = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

export const fmtInt = (n) => (n == null ? '–' : int.format(Math.round(n)));
export const fmtCompact = (n) => (n == null ? '–' : compact.format(n));
export const fmtUsd = (n) => (n == null ? '–' : usd.format(n));
export const fmtPct = (n) => (n == null ? '–' : pct.format(n));
export const fmtMs = (ms) => (ms == null ? '–' : ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`);
