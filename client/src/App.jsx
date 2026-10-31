import { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import { getMeta, getPlugins } from './api.js';

export default function App() {
  const [view, setView] = useState('library');
  const [library, setLibrary] = useState({ plugins: [], lastScanAt: null });
  const [meta, setMeta] = useState({ categories: [], licenses: [] });
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLibrary(await getPlugins());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    getMeta().then(setMeta).catch((err) => setError(err.message));
  }, [refresh]);

  const visibleCount = library.plugins.filter((p) => !p.missing).length;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar view={view} onChange={setView} lastScanAt={library.lastScanAt} pluginCount={visibleCount} />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            No se pudo conectar con el servidor: {error}
          </div>
        )}
        {view === 'library' && <p className="text-zinc-400">Biblioteca ({meta.categories.length} categorías)</p>}
        {view === 'chains' && <p className="text-zinc-400">Cadenas</p>}
        {view === 'settings' && <p className="text-zinc-400">Ajustes</p>}
      </main>
    </div>
  );
}
