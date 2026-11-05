import { useEffect, useState } from 'react';
import { StoreProvider, useDispatch, useStore } from './store/StoreContext.jsx';
import { createStore } from './store/createStore.js';
import { initialState, reducer } from './store/reducer.js';
import { datasetFailed, datasetLoaded } from './store/actions.js';
import { loadDataset } from './data/loadDataset.js';
import { Dashboard } from './components/Dashboard.jsx';

export const DATASET_ROWS = 150_000;

function Shell({ rows }) {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const theme = useStore((s) => s.theme);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    loadDataset({ rows })
      .then(({ dataset, ms, source }) => !cancelled && dispatch(datasetLoaded(dataset, { ms, source })))
      .catch((err) => !cancelled && dispatch(datasetFailed(err)));
    return () => {
      cancelled = true;
    };
  }, [dispatch, rows]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  if (status === 'error') return <p className="state-message" role="alert">Could not build the dataset: {error}</p>;
  if (status === 'loading') {
    return (
      <p className="state-message" aria-busy="true">
        Generating {rows.toLocaleString('en-US')} requests in a Web Worker…
      </p>
    );
  }
  return <Dashboard />;
}

export default function App({ rows = DATASET_ROWS }) {
  const [store] = useState(() => createStore(reducer, initialState));
  return (
    <StoreProvider store={store}>
      <main className="app">
        <Shell rows={rows} />
      </main>
    </StoreProvider>
  );
}
