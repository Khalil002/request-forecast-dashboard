/**
 * Filters are plain data so they can live in the store and be compared by
 * reference in memoized selectors:
 *   { regions: number[], categories: number[], statuses: number[],
 *     priorities: number[], monthRange: [from, to], clientQuery: string }
 * An empty code list means "no constraint" for that dimension.
 */
export const EMPTY_FILTERS = Object.freeze({
  regions: [],
  categories: [],
  statuses: [],
  priorities: [],
  monthRange: null,
  clientQuery: '',
});

/** Turn a list of allowed codes into an O(1) lookup table (null = allow all). */
function lookup(codes, size) {
  if (!codes || codes.length === 0) return null;
  const table = new Uint8Array(size);
  for (const c of codes) table[c] = 1;
  return table;
}

/**
 * Return a Uint32Array of row indices matching the filters.
 * Single pass over the columns with precomputed lookup tables, so cost is
 * O(rows) with no per-row allocation.
 */
export function filterRows(dataset, filters = EMPTY_FILTERS) {
  const { rows, columns, clients } = dataset;
  const { month, region, category, status, priority, client } = columns;

  const regionOk = lookup(filters.regions, 256);
  const categoryOk = lookup(filters.categories, 256);
  const statusOk = lookup(filters.statuses, 256);
  const priorityOk = lookup(filters.priorities, 256);

  let clientOk = null;
  const q = filters.clientQuery?.trim().toLowerCase();
  if (q) {
    // Match against the ~400 distinct names once, not 150k rows.
    clientOk = new Uint8Array(clients.length);
    clients.forEach((name, i) => {
      if (name.toLowerCase().includes(q)) clientOk[i] = 1;
    });
  }

  const [from, to] = filters.monthRange ?? [0, Infinity];
  const out = new Uint32Array(rows);
  let n = 0;
  for (let i = 0; i < rows; i++) {
    const m = month[i];
    if (m < from || m > to) continue;
    if (regionOk && !regionOk[region[i]]) continue;
    if (categoryOk && !categoryOk[category[i]]) continue;
    if (statusOk && !statusOk[status[i]]) continue;
    if (priorityOk && !priorityOk[priority[i]]) continue;
    if (clientOk && !clientOk[client[i]]) continue;
    out[n++] = i;
  }
  // subarray shares the buffer: no copy.
  return out.subarray(0, n);
}
