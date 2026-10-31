import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import PluginRow from '../components/PluginRow.jsx';
import StatsBar from '../components/StatsBar.jsx';
import ScanButton from '../components/ScanButton.jsx';

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function LibraryView({ plugins, meta, scanning, onScan, onUpdate, onGoToSettings }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [license, setLicense] = useState('all');
  const [showMissing, setShowMissing] = useState(false);

  const present = useMemo(() => plugins.filter((p) => showMissing || !p.missing), [plugins, showMissing]);
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return present.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (license === 'all' || p.license === license) &&
        (!q || normalize(`${p.name} ${p.vendor}`).includes(q)),
    );
  }, [present, query, category, license]);

  const uncategorized = present.filter((p) => p.category === 'Uncategorized').length;
  const unknown = present.filter((p) => p.license === 'Unknown').length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
          <p className="text-sm text-zinc-400">
            {present.length} plugins · {uncategorized} sin clasificar · {unknown} con licencia desconocida
          </p>
        </div>
        <ScanButton scanning={scanning} onClick={onScan} />
      </header>

      {plugins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-400">
          Aún no hay plugins. Revisa tus carpetas en{' '}
          <button type="button" onClick={onGoToSettings} className="text-violet-400 underline underline-offset-2 hover:text-violet-300">Ajustes</button>{' '}
          y pulsa Escanear.
        </div>
      ) : (
        <>
          <StatsBar plugins={present} categories={meta.categories} selected={category} onSelect={setCategory} />

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 min-w-0 flex-1 basis-72 items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 focus-within:border-violet-500">
              <Search size={16} className="text-zinc-400" aria-hidden="true" />
              <span className="sr-only">Buscar</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o fabricante…"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-zinc-400">
              Licencia
              <select value={license} onChange={(e) => setLicense(e.target.value)} className="min-h-11 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-50 focus:border-violet-500 focus:outline-none">
                <option value="all">Todas</option>
                {meta.licenses.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-[13px] text-zinc-400">
              <input type="checkbox" checked={showMissing} onChange={(e) => setShowMissing(e.target.checked)} className="h-4 w-4 accent-violet-500" />
              Mostrar no encontrados
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#111113]">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                  {['Plugin', 'Formatos', 'Categoría', 'Licencia', 'Tamaño', 'Fecha', 'Notas'].map((h) => (
                    <th key={h} scope="col" className="border-b border-zinc-800 px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => <PluginRow key={p.id} plugin={p} meta={meta} onUpdate={onUpdate} />)}
              </tbody>
            </table>
            {visible.length === 0 && <p className="p-8 text-center text-sm text-zinc-400">Ningún plugin coincide con los filtros.</p>}
          </div>
        </>
      )}
    </div>
  );
}
