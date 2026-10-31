import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import PluginTooltip from './PluginTooltip.jsx';
import LicenseBadge from './LicenseBadge.jsx';

export default function ChainStep({ step, number, isLast }) {
  const [index, setIndex] = useState(0);
  const { candidates } = step;
  const ids = candidates.map((c) => c.id).join('|');

  useEffect(() => setIndex(0), [ids]);

  const current = candidates[index % Math.max(candidates.length, 1)];

  return (
    <li className="relative flex gap-4 pb-6">
      {!isLast && <span aria-hidden="true" className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-zinc-800" />}
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 font-mono text-[13px] text-violet-300">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-[#111113] p-4">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          <span className="font-semibold">{step.label}</span>
          <span className="text-[13px] text-zinc-400">{step.why}</span>
        </div>
        {current ? (
          <div className="flex flex-1 basis-80 flex-wrap items-center justify-end gap-3">
            <div className="flex min-w-0 flex-col items-end">
              <PluginTooltip plugin={current}>
                <span tabIndex={0} className="cursor-default font-semibold underline decoration-zinc-600 decoration-dotted underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  {current.name}
                </span>
              </PluginTooltip>
              <span className="text-xs text-zinc-400">
                {current.vendor || 'Fabricante desconocido'} · {candidates.length - 1} alternativas
              </span>
            </div>
            <LicenseBadge license={current.license} />
            <label className="sr-only" htmlFor={`alt-${step.id}`}>Alternativas para {step.label}</label>
            <select
              id={`alt-${step.id}`}
              value={current.id}
              onChange={(e) => setIndex(candidates.findIndex((c) => c.id === e.target.value))}
              className="min-h-11 max-w-48 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[13px] text-zinc-100 focus:border-violet-500 focus:outline-none"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id} title={c.description}>
                  {c.name} ({c.license})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % candidates.length)}
              disabled={candidates.length < 2}
              title="Otra sugerencia"
              aria-label={`Otra sugerencia para ${step.label}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-[13px] text-zinc-300 hover:border-zinc-700 disabled:opacity-40"
            >
              <Shuffle size={16} aria-hidden="true" />
              <span className="font-mono text-xs">{(index % candidates.length) + 1}/{candidates.length}</span>
            </button>
          </div>
        ) : (
          <span className="rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-[13px] text-zinc-400">
            Sin plugin en tu biblioteca para este paso
          </span>
        )}
      </div>
    </li>
  );
}
