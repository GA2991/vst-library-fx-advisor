export default function StatsBar({ plugins, categories, selected, onSelect }) {
  const counts = Object.fromEntries(categories.map((c) => [c, 0]));
  for (const p of plugins) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const chips = [['all', 'Todas', plugins.length], ...categories.map((c) => [c, c, counts[c]])];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
      {chips.map(([value, label, count]) => {
        const active = selected === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(value)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
              active ? 'border-violet-600 bg-violet-600 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {label}
            <span className="font-mono text-xs opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
