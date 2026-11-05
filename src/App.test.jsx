import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

// jsdom has no Worker, so loadDataset falls back to the main thread.
describe('App', () => {
  it('loads data, filters through the store and lazy-loads the forecast panel', async () => {
    const user = userEvent.setup();
    render(<App rows={3_000} />);

    const kpis = await screen.findByRole('region', { name: 'Key figures' });
    expect(within(kpis).getByText('3,000')).toBeInTheDocument();

    // Lazy chunk resolves and shows the backtest table.
    expect(await screen.findByRole('heading', { name: 'Forecast model' })).toBeInTheDocument();
    expect(screen.getByText('Most accurate')).toBeInTheDocument();

    // Clicking a role bar dispatches a filter and narrows the KPIs.
    await user.click(screen.getByRole('button', { name: /^Frontend:/ }));
    const total = Number(within(kpis).getAllByText(/^[\d,]+$/)[0].textContent.replace(/,/g, ''));
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(3_000);
    expect(screen.getByRole('button', { name: /^Frontend:/ })).toHaveAttribute('aria-pressed', 'true');

    // Switching model updates the chart subtitle.
    await user.click(screen.getByRole('radio', { name: 'Holt smoothing' }));
    expect(screen.getByText(/Holt smoothing · 6-month horizon/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(within(kpis).getByText('3,000')).toBeInTheDocument();
  });
});
