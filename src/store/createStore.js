/**
 * A minimal Flux/Redux-style store: one state tree, changed only by
 * dispatching plain action objects through a pure reducer, with
 * subscribers notified after every change.
 */
export function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();
  let dispatching = false;

  return {
    getState: () => state,
    dispatch(action) {
      if (!action || typeof action.type !== 'string') throw new Error('Actions must have a string `type`');
      if (dispatching) throw new Error('Reducers may not dispatch actions');
      dispatching = true;
      let next;
      try {
        next = reducer(state, action);
      } finally {
        dispatching = false;
      }
      if (next !== state) {
        state = next;
        listeners.forEach((l) => l());
      }
      return action;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
