import { useEffect, useState } from 'react';
import { CircleAlert, Drum, Guitar, MicVocal, SlidersHorizontal, Users, Waves, Workflow } from 'lucide-react';
import ChainStep from '../components/ChainStep.jsx';
import { getChain, listChains } from '../api.js';

const ICONS = { 'mic-vocal': MicVocal, users: Users, guitar: Guitar, drum: Drum, waves: Waves, 'sliders-horizontal': SlidersHorizontal };

export default function ChainsView({ libraryVersion, onGoToLibrary }) {
  const [chains, setChains] = useState([]);
  const [selected, setSelected] = useState('lead-vocal');
  const [freeOnly, setFreeOnly] = useState(false);
  const [chain, setChain] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listChains().then(setChains).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getChain(selected, freeOnly)
      .then((c) => !cancelled && (setChain(c), setError(null)))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [selected, freeOnly, libraryVersion]);

  const segment = (active) =>
    `min-h-10 rounded-md px-3.5 text-[13px] font-semibold transition-colors ${active ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cadenas de efectos</h1>
          <p className="text-sm text-zinc-400">Elige una situación y te propongo la cadena con plugins que ya tienes.</p>
        </div>
        <div role="group" aria-label="Tipo de recomendación" className="inline-flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          <button type="button" aria-pressed={!freeOnly} onClick={() => setFreeOnly(false)} className={segment(!freeOnly)}>Recomendación general</button>
          <button type="button" aria-pressed={freeOnly} onClick={() => setFreeOnly(true)} className={segment(freeOnly)}>Solo plugins Free</button>
        </div>
      </header>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {chains.map((c) => {
          const Icon = ICONS[c.icon] ?? Workflow;
          const active = c.id === selected;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(c.id)}
              className={`flex min-h-[72px] items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                active ? 'border-violet-600 bg-violet-950/40' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${active ? 'text-violet-400' : 'text-zinc-400'}`} aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-xs text-zinc-400">{c.stepCount} pasos · {c.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {freeOnly && chain?.unknownCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-[13px] text-amber-200">
          <CircleAlert size={16} aria-hidden="true" />
          <span>
            {chain.unknownCount} plugins con licencia desconocida no se incluyen.{' '}
            <button type="button" onClick={onGoToLibrary} className="underline underline-offset-2 hover:text-amber-100">Revísalos en Biblioteca</button>
          </span>
        </div>
      )}

      {chain && (
        <ol aria-label={`Pasos de ${chain.name}`} className="flex flex-col">
          {chain.steps.map((step, i) => (
            <ChainStep key={`${chain.id}-${step.id}`} step={step} number={i + 1} isLast={i === chain.steps.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
}
