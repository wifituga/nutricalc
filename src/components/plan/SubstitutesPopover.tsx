'use client';

import { useEffect, useState } from 'react';
import { Shuffle, X } from 'lucide-react';

type Substitute = {
  id: number;
  code: string;
  name: string;
  kcal: number;
  delta_pct: number;
};

interface Props {
  foodId: number;
  foodName: string;
  onSelect: (subId: number) => void;
  onClose: () => void;
}

export default function SubstitutesPopover({ foodId, foodName, onSelect, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Substitute[]>([]);
  const [sourceKcal, setSourceKcal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/foods/${foodId}/substitutes`)
      .then((r) => (r.ok ? r.json() : { substitutes: [] }))
      .then((d) => {
        if (cancelled) return;
        setSubs(d.substitutes ?? []);
        setSourceKcal(d.source?.kcal ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [foodId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg overflow-hidden bg-white"
        style={{ boxShadow: 'var(--shadow-card-hover)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-start justify-between gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
        >
          <div className="min-w-0">
            <h3
              className="font-display text-sm font-medium flex items-center gap-1.5"
              style={{ color: 'var(--ink)' }}
            >
              <Shuffle size={14} /> Sustitutos isocalóricos
            </h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-soft)' }}>
              {foodName}
              {sourceKcal != null && (
                <span className="font-mono ml-1">· {sourceKcal} kcal/100g</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 p-1 rounded hover:bg-[color:var(--paper)]"
            style={{ color: 'var(--ink-soft)' }}
          >
            <X size={16} />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto scroll-fade">
          {loading ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
              Buscando…
            </p>
          ) : subs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
              No se encontraron sustitutos del mismo grupo con kcal similar (±15%).
            </p>
          ) : (
            <ul>
              {subs.map((s, idx) => (
                <li
                  key={s.id}
                  className={`${idx === 0 ? '' : 'border-t'}`}
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <button
                    onClick={() => onSelect(s.id)}
                    className="w-full px-4 py-2.5 text-left row-hover flex items-baseline gap-2"
                  >
                    <span
                      className="font-mono text-xs shrink-0"
                      style={{ color: 'var(--accent)', minWidth: '2.5rem' }}
                    >
                      {s.code}
                    </span>
                    <span
                      className="text-sm truncate flex-1"
                      style={{ color: 'var(--ink)' }}
                    >
                      {s.name}
                    </span>
                    <span
                      className="text-xs font-mono shrink-0"
                      style={{ color: 'var(--ink-soft)' }}
                    >
                      {s.kcal} kcal
                      <span
                        className="ml-1"
                        style={{ color: s.delta_pct === 0 ? 'var(--ink-soft)' : s.delta_pct > 0 ? 'var(--warn)' : 'var(--ok)' }}
                      >
                        ({s.delta_pct >= 0 ? '+' : ''}{s.delta_pct}%)
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
