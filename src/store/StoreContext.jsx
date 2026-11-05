import { createContext, useContext, useSyncExternalStore } from 'react';

const StoreContext = createContext(null);

export function StoreProvider({ store, children }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useStoreInstance() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

/**
 * Subscribe to a slice of state. useSyncExternalStore keeps React's
 * concurrent rendering tear-free; components re-render only when their
 * selected slice changes by reference.
 */
export function useStore(selector = (s) => s) {
  const store = useStoreInstance();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function useDispatch() {
  return useStoreInstance().dispatch;
}
