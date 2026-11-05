import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VirtualTable } from './VirtualTable.jsx';
import { generateDataset } from '../data/generate.js';
import { filterRows } from '../analytics/filter.js';

const dataset = generateDataset({ rows: 10_000, seed: 5 });
const rows = filterRows(dataset);

describe('VirtualTable', () => {
  it('renders only the visible window of a large list', () => {
    render(<VirtualTable dataset={dataset} rows={rows} sort={{ key: 'id', dir: 'asc' }} onSort={() => {}} height={360} />);
    const bodyRows = screen.getAllByRole('row').slice(1); // minus header
    // 360px / 36px = 10 visible + 8 overscan below.
    expect(bodyRows.length).toBeLessThanOrEqual(20);
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '10001');
    expect(screen.getByText('REQ-000001')).toBeInTheDocument();
  });

  it('moves the window when scrolled', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    render(<VirtualTable dataset={dataset} rows={rows} sort={null} onSort={() => {}} height={360} />);
    const body = screen.getByLabelText('Scrollable rows');
    body.scrollTop = 36 * 5000;
    fireEvent.scroll(body);
    expect(await screen.findByText('REQ-005001')).toBeInTheDocument();
    expect(screen.queryByText('REQ-000001')).not.toBeInTheDocument();
  });

  it('exposes sort state and reports header clicks', () => {
    const onSort = vi.fn();
    render(<VirtualTable dataset={dataset} rows={rows} sort={{ key: 'budget', dir: 'desc' }} onSort={onSort} />);
    const header = screen.getByRole('columnheader', { name: /budget/i });
    expect(header).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(screen.getByRole('button', { name: /client/i }));
    expect(onSort).toHaveBeenCalledWith('client');
  });

  it('shows an empty state', () => {
    render(<VirtualTable dataset={dataset} rows={new Uint32Array(0)} sort={null} onSort={() => {}} />);
    expect(screen.getByText(/no requests match/i)).toBeInTheDocument();
  });
});
