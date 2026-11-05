import * as A from './actions.js';
import { EMPTY_FILTERS } from '../analytics/filter.js';

export const initialState = {
  status: 'loading', // 'loading' | 'ready' | 'error'
  error: null,
  dataset: null, // never mutated after load, so reference equality is safe
  meta: null, // { ms, source }
  filters: EMPTY_FILTERS,
  sort: { key: 'id', dir: 'desc' },
  forecast: { model: 'seasonal', horizon: 6 },
  theme: 'system', // 'system' | 'light' | 'dark'
};

const FILTER_DIMENSIONS = new Set(['regions', 'categories', 'statuses', 'priorities']);

export function reducer(state = initialState, action) {
  switch (action.type) {
    case A.DATASET_LOADED:
      return { ...state, status: 'ready', dataset: action.dataset, meta: action.meta, error: null };
    case A.DATASET_FAILED:
      return { ...state, status: 'error', error: action.error };

    case A.TOGGLE_FILTER: {
      if (!FILTER_DIMENSIONS.has(action.dimension)) return state;
      const current = state.filters[action.dimension];
      const next = current.includes(action.code)
        ? current.filter((c) => c !== action.code)
        : [...current, action.code].sort((a, b) => a - b);
      return { ...state, filters: { ...state.filters, [action.dimension]: next } };
    }
    case A.SET_MONTH_RANGE: {
      const [a, b] = action.range;
      const range = a <= b ? [a, b] : [b, a];
      const prev = state.filters.monthRange;
      if (prev && prev[0] === range[0] && prev[1] === range[1]) return state;
      return { ...state, filters: { ...state.filters, monthRange: range } };
    }
    case A.SET_CLIENT_QUERY:
      if (state.filters.clientQuery === action.query) return state;
      return { ...state, filters: { ...state.filters, clientQuery: action.query } };
    case A.RESET_FILTERS:
      return state.filters === EMPTY_FILTERS ? state : { ...state, filters: EMPTY_FILTERS };

    case A.SET_SORT: {
      const same = state.sort.key === action.key;
      const dir = same ? (state.sort.dir === 'asc' ? 'desc' : 'asc') : 'desc';
      return { ...state, sort: { key: action.key, dir } };
    }
    case A.SET_MODEL:
      return { ...state, forecast: { ...state.forecast, model: action.model } };
    case A.SET_HORIZON: {
      const horizon = Math.max(1, Math.min(12, Math.round(action.horizon)));
      return { ...state, forecast: { ...state.forecast, horizon } };
    }
    case A.SET_THEME:
      return { ...state, theme: action.theme };
    default:
      return state;
  }
}
