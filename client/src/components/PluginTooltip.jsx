import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LicenseBadge from './LicenseBadge.jsx';

const DELAY_MS = 600;
const WIDTH = 320;

// Muestra la reseña del plugin tras dejar el cursor quieto encima (o al enfocarlo con el teclado).
export default function PluginTooltip({ plugin, children, className = '' }) {
  const [pos, setPos] = useState(null);
  const timer = useRef(null);
  const anchor = useRef(null);
  const id = useId();

  const hide = () => {
    clearTimeout(timer.current);
    setPos(null);
  };

  const schedule = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(rect.left, window.innerWidth - WIDTH - 16);
      const below = rect.bottom + 8;
      const openUp = below + 200 > window.innerHeight;
      setPos({ left: Math.max(16, left), top: openUp ? undefined : below, bottom: openUp ? window.innerHeight - rect.top + 8 : undefined });
    }, DELAY_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!pos) return undefined;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [pos]);

  return (
    <span
      ref={anchor}
      className={className}
      onMouseEnter={schedule}
      onMouseLeave={hide}
      onMouseDown={hide}
      onFocus={schedule}
      onBlur={hide}
      aria-describedby={pos ? id : undefined}
    >
      {children}
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: WIDTH }}
            className="pointer-events-none fixed z-50 flex flex-col gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-50">{plugin.name}</span>
              <LicenseBadge license={plugin.license} />
            </div>
            <p className="text-[13px] leading-relaxed text-zinc-300">{plugin.description}</p>
            <div className="flex flex-wrap gap-1.5 text-xs text-zinc-400">
              <span className="rounded-full bg-zinc-800 px-2 py-0.5">{plugin.category}</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5">{plugin.vendor || 'Fabricante desconocido'}</span>
            </div>
            {plugin.notes && <div className="border-t border-zinc-800 pt-2 text-xs text-violet-300">Tu nota: {plugin.notes}</div>}
          </div>,
          document.body,
        )}
    </span>
  );
}
