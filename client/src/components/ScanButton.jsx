import { RefreshCw } from 'lucide-react';

export default function ScanButton({ scanning, onClick, label = 'Escanear' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={scanning}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
    >
      <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} aria-hidden="true" />
      {scanning ? 'Escaneando…' : label}
    </button>
  );
}
