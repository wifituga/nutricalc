'use client';

import { AlertTriangle } from 'lucide-react';
import type { MacroBreakdown, MacroMode } from '@/lib/calculations/macroDistribution';

interface Props {
  vctKcal: number;
  weightKg: number;
  mode: MacroMode;
  setMode: (m: MacroMode) => void;
  manual: { cho: number; prot: number; fat: number };
  setManual: (m: { cho: number; prot: number; fat: number }) => void;
  proteinFactor: number;
  setProteinFactor: (f: number) => void;
  result: MacroBreakdown;
}

const MODES: { value: MacroMode; label: string }[] = [
  { value: 'amdr_auto', label: 'AMDR sugerido' },
  { value: 'manual', label: 'Manual' },
  { value: 'from_protein_g_per_kg', label: 'Desde proteína g/kg' },
];

export default function MacroPanel({
  vctKcal,
  weightKg,
  mode,
  setMode,
  manual,
  setManual,
  proteinFactor,
  setProteinFactor,
  result,
}: Props) {

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--rule)' }}>
        <p className="font-display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Distribución de macros
        </p>
      </div>

      <div className="px-4 py-3">
        <div className="flex gap-1 mb-3 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: mode === m.value ? 'var(--accent)' : 'transparent',
                color: mode === m.value ? 'var(--paper)' : 'var(--ink-soft)',
                border: `1px solid ${mode === m.value ? 'var(--accent)' : 'var(--rule)'}`,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'from_protein_g_per_kg' && (
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>
              Factor proteico (g/kg) · peso {weightKg.toFixed(1)} kg
            </label>
            <div className="flex flex-wrap gap-1 mb-1">
              {[0.8, 1.0, 1.2, 1.5].map((f) => {
                const active = Math.abs(proteinFactor - f) < 0.01;
                return (
                  <button
                    key={f}
                    onClick={() => setProteinFactor(f)}
                    className="px-2 py-1 rounded text-xs font-mono"
                    style={{
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--paper)' : 'var(--ink-soft)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--rule)'}`,
                    }}
                    title={`${(f * weightKg).toFixed(1)} g proteína/día`}
                  >
                    {f.toFixed(1)}
                  </button>
                );
              })}
              <input
                type="number"
                step="0.1"
                min="0"
                value={proteinFactor}
                onChange={(e) => setProteinFactor(Number(e.target.value) || 0)}
                className="w-16 px-2 py-1 rounded border text-xs font-mono"
                style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
              />
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--ink-soft)' }}>
              = {(proteinFactor * weightKg).toFixed(1)} g proteína/día
            </p>
          </div>
        )}

        {(['cho', 'prot', 'fat'] as const).map((k) => {
          const row = result[k];
          const label = k === 'cho' ? 'Carbohidratos' : k === 'prot' ? 'Proteínas' : 'Grasa';
          return (
            <div
              key={k}
              className="flex items-center justify-between py-1.5 border-b text-sm"
              style={{ borderColor: 'var(--rule)' }}
            >
              <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
              <span className="flex items-center gap-2">
                {mode === 'manual' ? (
                  <input
                    type="number"
                    value={manual[k]}
                    onChange={(e) =>
                      setManual({ ...manual, [k]: Number(e.target.value) || 0 })
                    }
                    className="w-12 px-1 py-0.5 rounded border text-xs font-mono text-right"
                    style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
                  />
                ) : (
                  <span className="font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>
                    {row.pct}%
                  </span>
                )}
                <span className="font-mono text-xs w-28 text-right" style={{ color: 'var(--ink)' }}>
                  {row.grams} g · {row.kcal} kcal
                </span>
              </span>
            </div>
          );
        })}

        <div
          className="flex justify-between text-xs pt-2 mt-1"
          style={{ color: 'var(--ink-soft)' }}
        >
          <span>Meta VCT</span>
          <span className="font-mono">{Math.round(vctKcal)} kcal</span>
        </div>

        {result.warnings.length > 0 && (
          <div
            className="mt-3 px-3 py-2 border rounded-md text-xs flex items-start gap-2"
            style={{ background: '#fdf6e3', borderColor: 'var(--warn)', color: '#7a5a00' }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
