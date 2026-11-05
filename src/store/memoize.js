/**
 * createSelector(inputs, compute): recompute only when one of the input
 * selectors returns a different reference (like Reselect, cache size 1).
 */
export function createSelector(inputs, compute) {
  let lastArgs = null;
  let lastResult;
  const selector = (...params) => {
    const args = inputs.map((fn) => fn(...params));
    if (lastArgs && args.length === lastArgs.length && args.every((a, i) => Object.is(a, lastArgs[i]))) {
      return lastResult;
    }
    selector.recomputations++;
    lastArgs = args;
    lastResult = compute(...args);
    return lastResult;
  };
  selector.recomputations = 0;
  return selector;
}
