import { useEffect, useState } from 'react';
import { Folder, Plus, Trash2, TriangleAlert } from 'lucide-react';
import ScanButton from '../components/ScanButton.jsx';
import { getSettings, putFolders } from '../api.js';

function Stat({ label, value, tone = 'text-zinc-50' }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-[#111113] px-4 py-3.5">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-xl font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export default function SettingsView({ scanning, lastScan, onScan }) {
  const [folders, setFolders] = useState([]);
  const [defaults, setDefaults] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setFolders(s.folders);
        setDefaults(s.defaultFolders);
      })
      .catch((err) => setError(err.message));
  }, []);

  const change = (next) => {
    setFolders(next);
    setSaved(false);
    setError(null);
  };

  const add = (e) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    if (!folders.includes(value)) change([...folders, value]);
    setDraft('');
  };

  const saveAndScan = async () => {
    try {
      const res = await putFolders(folders);
      setFolders(res.folders);
      setSaved(true);
      await onScan();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-zinc-400">Carpetas donde la app busca archivos .vst3, .dll y .vst (incluidas las subcarpetas).</p>
      </header>

      <section aria-label="Carpetas de escaneo" className="flex flex-col rounded-xl border border-zinc-800 bg-[#111113]">
        {folders.length === 0 && <p className="border-b border-zinc-900 px-4 py-4 text-sm text-zinc-400">No hay carpetas. Añade una o restaura las rutas por defecto.</p>}
        {folders.map((folder) => (
          <div key={folder} className="flex items-center gap-3 border-b border-zinc-900 px-4 py-3">
            <Folder size={18} className="shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-all font-mono text-[13px]">{folder}</span>
            <button
              type="button"
              onClick={() => change(folders.filter((f) => f !== folder))}
              aria-label={`Quitar ${folder}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-red-300"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        <form onSubmit={add} className="flex flex-wrap items-end gap-2 px-4 py-3">
          <label className="flex min-w-0 flex-1 basis-80 flex-col gap-1.5 text-xs text-zinc-400">
            Añadir carpeta
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="D:\Plugins\VST3"
              className="min-h-11 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 font-mono text-[13px] text-zinc-50 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
            />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium hover:border-zinc-600">
            <Plus size={16} aria-hidden="true" />
            Añadir
          </button>
        </form>
      </section>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <ScanButton scanning={scanning} onClick={saveAndScan} label="Guardar y escanear" />
        <button type="button" onClick={() => change(defaults)} className="min-h-11 rounded-lg border border-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-900">
          Restaurar rutas por defecto
        </button>
        {!saved && <span className="text-[13px] text-amber-300">Cambios sin guardar</span>}
      </div>

      {lastScan && (
        <section aria-label="Resultado del último escaneo" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-300">Último escaneo</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Plugins" value={lastScan.total} />
            <Stat label="Nuevos" value={`+${lastScan.added}`} tone="text-emerald-400" />
            <Stat label="Actualizados" value={lastScan.updated} />
            <Stat label="No encontrados" value={lastScan.missing} tone={lastScan.missing ? 'text-amber-400' : 'text-zinc-50'} />
          </div>
          {lastScan.errors.map((e) => (
            <div key={e.path} className="flex items-start gap-2.5 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-[13px] text-red-300">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                No se pudo leer: <span className="break-all font-mono">{e.path}</span> — {e.message}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
