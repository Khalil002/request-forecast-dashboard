export const DATASET_LOADED = 'dataset/loaded';
export const DATASET_FAILED = 'dataset/failed';
export const TOGGLE_FILTER = 'filters/toggle';
export const SET_MONTH_RANGE = 'filters/monthRange';
export const SET_CLIENT_QUERY = 'filters/clientQuery';
export const RESET_FILTERS = 'filters/reset';
export const SET_SORT = 'table/sort';
export const SET_MODEL = 'forecast/model';
export const SET_HORIZON = 'forecast/horizon';
export const SET_THEME = 'ui/theme';

export const datasetLoaded = (dataset, meta) => ({ type: DATASET_LOADED, dataset, meta });
export const datasetFailed = (error) => ({ type: DATASET_FAILED, error: String(error?.message ?? error) });
/** dimension: 'regions' | 'categories' | 'statuses' | 'priorities' */
export const toggleFilter = (dimension, code) => ({ type: TOGGLE_FILTER, dimension, code });
export const setMonthRange = (from, to) => ({ type: SET_MONTH_RANGE, range: [from, to] });
export const setClientQuery = (query) => ({ type: SET_CLIENT_QUERY, query });
export const resetFilters = () => ({ type: RESET_FILTERS });
export const setSort = (key) => ({ type: SET_SORT, key });
export const setModel = (model) => ({ type: SET_MODEL, model });
export const setHorizon = (horizon) => ({ type: SET_HORIZON, horizon });
export const setTheme = (theme) => ({ type: SET_THEME, theme });
