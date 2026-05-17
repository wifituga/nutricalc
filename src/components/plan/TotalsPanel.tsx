'use client';

import { NUTRIENT_LABELS, PRIMARY_NUTRIENTS } from '@/lib/nutrition';
import type { NutrientTotals, FoodNutrients } from '@/lib/types';
import { getTargetLevel, type ResolvedTargets } from '@/lib/calculations/nutrientTargets';
import type { VCTBreakdown } from '@/lib/calculations/energyRequirement';
import AlertBadge from '@/components/ui/AlertBadge';

interface Props {
  totals: NutrientTotals;
  targets: ResolvedTargets;
  vct: VCTBreakdown | null;
}

function fmt(n: number) {
  return n.toLocaleString('es-PE', { maximumFractionDigits: 1 });
}

function targetText(t: NonNullable<ResolvedTargets[keyof ResolvedTargets]>) {
  if (t.target != null) return `meta ${fmt(t.target)} ${t.unit}`;
  const parts: string[] = [];
  if (t.min != null) parts.push(`≥${fmt(t.min)}`);
  if (t.max != null) parts.push(`≤${fmt(t.max)}`);
  return `${parts.join(' · ')} ${t.unit}`;
}

export default function TotalsPanel({ totals, targets, vct }: Props) {
  const primaryKeys = PRIMARY_NUTRIENTS;
  const otherKeys = (Object.keys(NUTRIENT_LABELS) as (keyof FoodNutrients)[])
    .filter((k) => !primaryKeys.includes(k));
  const hasTargets = Object.keys(targets).length > 0;

  return (
    <div
      className="rounded-lg border overflow-hidden sticky top-0"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--rule)' }}>
        <p className="font-display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Totales del día
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          {vct
            ? `VCT ${Math.round(vct.vct)} kcal/día · DRI IOM personalizado`
            : 'Complete los datos del paciente para targets personalizados'}
        </p>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--ink-soft)' }}>
          Nutrientes principales
        </p>
        {primaryKeys.map((key) => {
          const info = NUTRIENT_LABELS[key];
          const value = totals[key];
          const target = targets[key];
          const level = target ? getTargetLevel(value ?? null, target) : 'neutral';

          return (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 border-b"
              style={{ borderColor: 'var(--rule)' }}
            >
              <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{info.label}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-mono text-xs font-medium"
                  style={{
                    color: level === 'alert' ? 'var(--danger)'
                         : level === 'warn' ? 'var(--warn)'
                         : level === 'ok' ? 'var(--ok)'
                         : 'var(--ink)',
                  }}
                >
                  {value != null ? `${fmt(value)} ${info.unit}` : '—'}
                </span>
                {target && <AlertBadge level={level} />}
              </div>
            </div>
          );
        })}
      </div>

      <details className="px-4 pb-3">
        <summary className="text-xs cursor-pointer py-2" style={{ color: 'var(--ink-soft)' }}>
          Ver todos los nutrientes
        </summary>
        <div className="mt-1">
          {otherKeys.map((key) => {
            const info = NUTRIENT_LABELS[key];
            const value = totals[key];
            if (value == null) return null;
            const target = targets[key];
            const level = target ? getTargetLevel(value, target) : 'neutral';
            return (
              <div
                key={key}
                className="flex items-center justify-between py-1 border-b"
                style={{ borderColor: 'var(--rule)' }}
              >
                <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{info.label}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-xs"
                    style={{
                      color: level === 'alert' ? 'var(--danger)'
                           : level === 'warn' ? 'var(--warn)'
                           : level === 'ok' ? 'var(--ok)'
                           : 'var(--ink)',
                    }}
                  >
                    {fmt(value)} {info.unit}
                  </span>
                  {target && <AlertBadge level={level} />}
                </div>
              </div>
            );
          })}
        </div>
      </details>

      {hasTargets && (
        <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          <p className="text-xs uppercase tracking-wide mt-3 mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            Targets personalizados
          </p>
          {(Object.keys(targets) as (keyof FoodNutrients)[]).map((key) => {
            const t = targets[key];
            if (!t) return null;
            return (
              <div key={key} className="flex justify-between text-xs py-0.5" style={{ color: 'var(--ink-soft)' }}>
                <span>{t.label}{t.basis ? ` (${t.basis})` : ''}</span>
                <span className="font-mono">{targetText(t)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
