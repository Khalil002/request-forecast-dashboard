/**
 * Dimension tables. Rows store small integer codes into these arrays
 * (dictionary encoding), so 150k rows fit in a few MB of typed arrays.
 */
export const REGIONS = ['North America', 'Latin America', 'Western Europe', 'Eastern Europe', 'Middle East & Africa', 'Asia Pacific'];
export const CATEGORIES = ['Frontend', 'Backend', 'Data & ML', 'Mobile', 'DevOps', 'QA', 'Design', 'Product'];
export const STATUSES = ['Open', 'Interviewing', 'Filled', 'Cancelled'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const STATUS = { OPEN: 0, INTERVIEWING: 1, FILLED: 2, CANCELLED: 3 };

/** First month in the dataset (0-based month index, like Date). */
export const START_YEAR = 2023;
export const START_MONTH = 10; // November
export const MONTH_COUNT = 36;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Calendar month (0-11) for a dataset month offset. */
export function calendarMonth(offset) {
  return (START_MONTH + offset) % 12;
}

export function monthLabel(offset, { long = false } = {}) {
  const total = START_MONTH + offset;
  const year = START_YEAR + Math.floor(total / 12);
  const name = MONTH_NAMES[((total % 12) + 12) % 12];
  return long ? `${name} ${year}` : `${name} ’${String(year).slice(2)}`;
}

/** Names of the typed-array columns that make up a dataset. */
export const COLUMNS = ['month', 'client', 'region', 'category', 'status', 'priority', 'budget', 'daysToFill', 'candidates'];
