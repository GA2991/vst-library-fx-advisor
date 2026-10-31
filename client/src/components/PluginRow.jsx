import { useEffect, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import PluginTooltip from './PluginTooltip.jsx';

const SELECT = 'min-h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[13px] text-zinc-100 focus:border-violet-500 focus:outline-none';

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function ResetButton({ label, onClick }) {
  return (
    <span className="flex items-center gap-1">
      <span title="Editado por ti" className="h-1.5 w-1.5 rounded-full bg-violet-400" />
      <button type="button" onClick={onClick} title={`Restablecer ${label}`} aria-label={`Restablecer ${label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-violet-400 hover:bg-zinc-800">
        <RotateCcw size={14} aria-hidden="true" />
      </button>
    </span>
  );
}

export default function PluginRow({ plugin, meta, onUpdate }) {
  const [notes, setNotes] = useState(plugin.notes);
  const [description, setDescription] = useState(plugin.description);
  const [vendor, setVendor] = useState(plugin.vendor);
  const [open, setOpen] = useState(false);
  const o = plugin.overrides ?? {};

  useEffect(() => setNotes(plugin.notes), [plugin.notes]);
  useEffect(() => setDescription(plugin.description), [plugin.description]);
  useEffect(() => setVendor(plugin.vendor), [plugin.vendor]);

  const cell = 'border-b border-zinc-900 px-4 py-2.5 align-middle';

  return (
    <>
      <tr className={plugin.missing ? 'opacity-50' : ''}>
        <td className={cell}>
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`Detalles de ${plugin.name}`}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <div className="flex min-w-0 flex-col">
              <PluginTooltip plugin={plugin}>
                <span tabIndex={0} className="cursor-default font-medium underline decoration-zinc-600 decoration-dotted underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  {plugin.name}
                </span>
              </PluginTooltip>
              <span className="text-xs text-zinc-400">
                {plugin.vendor || 'Fabricante desconocido'}
                {plugin.missing && ' · no encontrado'}
              </span>
            </div>
          </div>
        </td>
        <td className={cell}>
          <div className="flex gap-1">
            {plugin.formats.map((f) => (
              <span key={f} className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">{f}</span>
            ))}
          </div>
        </td>
        <td className={cell}>
          <div className="flex items-center gap-1">
            <select aria-label={`Categoría de ${plugin.name}`} className={SELECT} value={plugin.category} onChange={(e) => onUpdate(plugin.id, { category: e.target.value })}>
              {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {o.category && <ResetButton label="categoría" onClick={() => onUpdate(plugin.id, { category: null })} />}
          </div>
        </td>
        <td className={cell}>
          <div className="flex items-center gap-1">
            <select aria-label={`Licencia de ${plugin.name}`} className={SELECT} value={plugin.license} onChange={(e) => onUpdate(plugin.id, { license: e.target.value })}>
              {meta.licenses.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {o.license && <ResetButton label="licencia" onClick={() => onUpdate(plugin.id, { license: null })} />}
          </div>
        </td>
        <td className={`${cell} whitespace-nowrap font-mono text-xs text-zinc-400`}>{formatSize(plugin.size)}</td>
        <td className={`${cell} whitespace-nowrap text-xs text-zinc-400`}>{new Date(plugin.mtime).toLocaleDateString('es')}</td>
        <td className={cell}>
          <input
            aria-label={`Notas de ${plugin.name}`}
            value={notes}
            placeholder="Añadir nota…"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== plugin.notes && onUpdate(plugin.id, { notes })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-h-9 w-full min-w-40 rounded-lg border border-transparent bg-transparent px-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-800 focus:border-violet-500 focus:bg-zinc-900 focus:outline-none"
          />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="border-b border-zinc-900 bg-zinc-900/40 px-4 py-4">
            <div className="flex max-w-3xl flex-col gap-2 pl-8">
              <label htmlFor={`vendor-${plugin.id}`} className="text-xs font-medium text-zinc-400">
                Fabricante {o.vendor ? '(editado por ti)' : ''}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={`vendor-${plugin.id}`}
                  value={vendor}
                  placeholder="Fabricante desconocido"
                  onChange={(e) => setVendor(e.target.value)}
                  onBlur={() => vendor !== plugin.vendor && onUpdate(plugin.id, { vendor: vendor.trim() })}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className="min-h-9 w-72 max-w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                />
                {o.vendor !== undefined && (
                  <button type="button" onClick={() => onUpdate(plugin.id, { vendor: null })} className="min-h-9 rounded-lg border border-zinc-800 px-3 text-[13px] text-zinc-300 hover:bg-zinc-800">
                    Restablecer fabricante
                  </button>
                )}
              </div>
              <label htmlFor={`desc-${plugin.id}`} className="text-xs font-medium text-zinc-400">
                Reseña {o.description ? '(editada por ti)' : ''}
              </label>
              <textarea
                id={`desc-${plugin.id}`}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] leading-relaxed text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={description === plugin.description}
                  onClick={() => onUpdate(plugin.id, { description })}
                  className="min-h-9 rounded-lg bg-violet-600 px-3 text-[13px] font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  Guardar reseña
                </button>
                {o.description && (
                  <button type="button" onClick={() => onUpdate(plugin.id, { description: null })} className="min-h-9 rounded-lg border border-zinc-800 px-3 text-[13px] text-zinc-300 hover:bg-zinc-800">
                    Restablecer reseña original
                  </button>
                )}
              </div>
              <ul className="mt-1 flex flex-col gap-0.5 font-mono text-[11px] text-zinc-500">
                {plugin.files.map((f) => <li key={f.path}>{f.path}</li>)}
              </ul>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
