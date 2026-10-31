const STYLES = {
  Free: 'bg-emerald-950 text-emerald-400',
  Paid: 'bg-amber-950 text-amber-400',
  Unknown: 'bg-zinc-800 text-zinc-300',
};

export default function LicenseBadge({ license }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[license] ?? STYLES.Unknown}`}>
      {license}
    </span>
  );
}
