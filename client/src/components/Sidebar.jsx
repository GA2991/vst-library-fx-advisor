import { Activity, Library, Settings, Workflow } from 'lucide-react';

const ITEMS = [
  { id: 'library', label: 'Biblioteca', Icon: Library },
  { id: 'chains', label: 'Cadenas', Icon: Workflow },
  { id: 'settings', label: 'Ajustes', Icon: Settings },
];

function formatScan(lastScanAt) {
  if (!lastScanAt) return 'Aún no has escaneado';
  return new Date(lastScanAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Sidebar({ view, onChange, lastScanAt, pluginCount }) {
  return (
    <nav aria-label="Principal" className="flex shrink-0 flex-col gap-1 border-zinc-800 bg-[#0c0c0e] p-4 md:w-60 md:border-r md:py-6">
      <div className="flex items-center gap-2.5 px-2 pb-4 md:pb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Activity size={18} className="text-white" aria-hidden="true" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">VST Library</span>
          <span className="text-xs text-zinc-400">FX Chain Advisor</span>
        </div>
      </div>
      <div className="flex gap-1 md:flex-col">
        {ITEMS.map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                active ? 'bg-zinc-900 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
              }`}
            >
              <Icon size={18} className={active ? 'text-violet-400' : ''} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-auto hidden flex-col gap-1 border-t border-zinc-800 px-3 pt-4 text-xs text-zinc-400 md:flex">
        <span>Último escaneo</span>
        <span className="text-zinc-300">
          {formatScan(lastScanAt)}
          {lastScanAt ? ` · ${pluginCount} plugins` : ''}
        </span>
      </div>
    </nav>
  );
}
