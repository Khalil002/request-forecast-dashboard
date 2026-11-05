/**
 * Sort row indices by a column without touching the columns themselves.
 * Ties fall back to the row index so the order is stable and deterministic.
 * String columns (client) compare by the looked-up name.
 */
export function sortRows(dataset, indices, sort) {
  if (!sort) return indices;
  const { key, dir } = sort;
  const sign = dir === 'desc' ? -1 : 1;
  const out = Uint32Array.from(indices);

  if (key === 'id') {
    return dir === 'desc' ? out.reverse() : out;
  }
  if (key === 'client') {
    const { clients } = dataset;
    // Rank each client name once, then sort numerically by rank.
    const order = clients.map((_, i) => i).sort((a, b) => clients[a].localeCompare(clients[b]));
    const rank = new Uint16Array(clients.length);
    order.forEach((c, r) => {
      rank[c] = r;
    });
    const col = dataset.columns.client;
    return out.sort((a, b) => sign * (rank[col[a]] - rank[col[b]]) || a - b);
  }
  const col = dataset.columns[key];
  if (!col) throw new Error(`Unknown sort key: ${key}`);
  return out.sort((a, b) => sign * (col[a] - col[b]) || a - b);
}
