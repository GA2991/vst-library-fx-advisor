import { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import LibraryView from './views/LibraryView.jsx';
import ChainsView from './views/ChainsView.jsx';
import SettingsView from './views/SettingsView.jsx';
import { getMeta, getPlugins, patchPlugin, scan } from './api.js';

export default function App() {
  const [view, setView] = useState('library');
  const [library, setLibrary] = useState({ plugins: [], lastScanAt: null });
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [meta, setMeta] = useState({ categories: [], licenses: [] });
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLibrary(await getPlugins());
      setLibraryVersion((v) => v + 1);
      setError(null);
    } catch (err) {
      setError(`No se pudo conectar con el servidor: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    refresh();
    getMeta().then(setMeta).catch((err) => setError(`No se pudo conectar con el servidor: ${err.message}`));
  }, [refresh]);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      setLastScan(await scan());
      await refresh();
    } catch (err) {
      setError(err.status === 409 ? 'Ya hay un escaneo en curso.' : `El escaneo falló: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }, [refresh]);

  // Actualización optimista: se pinta al momento y se revierte si el servidor falla.
  const updatePlugin = useCallback(async (id, patch) => {
    let previous;
    setLibrary((lib) => ({
      ...lib,
      plugins: lib.plugins.map((p) => {
        if (p.id !== id) return p;
        previous = p;
        const next = { ...p, overrides: { ...p.overrides } };
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) {
            delete next.overrides[k];
            next[k] = k === 'notes' ? '' : p.detected?.[k] ?? p[k];
          } else {
            next.overrides[k] = v;
            next[k] = v;
          }
        }
        return next;
      }),
    }));
    try {
      const saved = await patchPlugin(id, patch);
      setLibrary((lib) => ({ ...lib, plugins: lib.plugins.map((p) => (p.id === id ? saved : p)) }));
      setLibraryVersion((v) => v + 1);
    } catch (err) {
      if (previous) setLibrary((lib) => ({ ...lib, plugins: lib.plugins.map((p) => (p.id === id ? previous : p)) }));
      setError(`No se pudo guardar el cambio: ${err.message}`);
    }
  }, []);

  const visibleCount = library.plugins.filter((p) => !p.missing).length;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar view={view} onChange={setView} lastScanAt={library.lastScanAt} pluginCount={visibleCount} />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {error && (
          <div role="alert" className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="shrink-0 text-red-200 underline underline-offset-2">Cerrar</button>
          </div>
        )}
        {view === 'library' && (
          <LibraryView plugins={library.plugins} meta={meta} scanning={scanning} onScan={runScan} onUpdate={updatePlugin} onGoToSettings={() => setView('settings')} />
        )}
        {view === 'chains' && <ChainsView libraryVersion={libraryVersion} onGoToLibrary={() => setView('library')} />}
        {view === 'settings' && <SettingsView scanning={scanning} lastScan={lastScan} onScan={runScan} />}
      </main>
    </div>
  );
}
