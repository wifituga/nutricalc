'use client';

import { useState } from 'react';
import {
  calculateMacroDistribution,
  type MacroMode,
} from '@/lib/calculations/macroDistribution';

interface Props {
  vctKcal: number;
  ageYears: number;
  weightKg: number;
}

const MODES: { value: MacroMode; label: string }[] = [
  { value: 'amdr_auto', label: 'AMDR sugerido' },
  { value: 'manual', label: 'Manual' },
  { value: 'from_protein_g_per_kg', label: 'Desde proteína g/kg' },
];

export default function MacroPanel({ vctKcal, ageYears, weightKg }: Props) {
  const [mode, setMode] = useState<MacroMode>('amdr_auto');
  const [manual, setManual] = useState({ cho: 55, prot: 20, fat: 25 });
  const [proteinFactor, setProteinFactor] = useState(1.0);

  const result = calculateMacroDistribution(vctKcal, mode, {
    ageYears,
    weightKg,
    proteinFactor,
    manualPct: manual,
  });

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
            <input
              type="number"
              step="0.1"
              value={proteinFactor}
              onChange={(e) => setProteinFactor(Number(e.target.value) || 0)}
              className="w-24 px-2 py-1 rounded border text-sm font-mono"
              style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
            />
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
          <div className="mt-2">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-xs" style={{ color: 'var(--warn)' }}>
                ⚠ {w}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
