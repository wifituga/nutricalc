'use client';

import { NUTRIENT_LABELS, PRIMARY_NUTRIENTS } from '@/lib/nutrition';
import type { NutrientTotals, FoodNutrients } from '@/lib/types';
import {
  getTargetLevel, classifyPlanState, type ResolvedTargets,
} from '@/lib/calculations/nutrientTargets';
import type { VCTBreakdown } from '@/lib/calculations/energyRequirement';
import type { IronResult } from '@/lib/calculations/ironBioavailability';
import AlertBadge from '@/components/ui/AlertBadge';

interface Props {
  totals: NutrientTotals;
  targets: ResolvedTargets;
  vct: VCTBreakdown | null;
  iron?: IronResult | null;
}

function fmt(n: number) {
  return n.toLocaleString('es-PE', { maximumFractionDigits: 1 });
}

function targetText(t: NonNullable<ResolvedTargets[keyof ResolvedTargets]>) {
  if (t.target != null) return `meta ${fmt(t.target)} ${t.unit}`;
  const parts: string[] = [];
  if (t.min != null) parts.push(`min ${fmt(t.min)}`);
  if (t.max != null) parts.push(`max ${fmt(t.max)}`);
  return `${parts.join(' · ')} ${t.unit}`;
}

export default function TotalsPanel({ totals, targets, vct, iron }: Props) {
  const primaryKeys = PRIMARY_NUTRIENTS;
  const otherKeys = (Object.keys(NUTRIENT_LABELS) as (keyof FoodNutrients)[])
    .filter((k) => !primaryKeys.includes(k));
  const hasTargets = Object.keys(targets).length > 0;

  const energyKcal = totals.energia_kcal?.value ?? 0;
  const planState = vct ? classifyPlanState(energyKcal, vct.vct) : null;

  function renderRow(key: keyof FoodNutrients, small: boolean) {
    const info = NUTRIENT_LABELS[key];
    const t = totals[key];
    const value = t?.value ?? null;
    const nulls = t?.items_with_null ?? 0;
    const target = targets[key];
    const level = target ? getTargetLevel(value, target, key) : null;
    return (
      <div
        key={key}
        className="flex items-center justify-between py-1.5 border-b"
        style={{ borderColor: 'var(--rule)' }}
      >
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          {info.label}
          {nulls > 0 && (
            <span
              className="ml-1 text-[10px]"
              style={{ color: 'var(--warn)' }}
              title={`${nulls} alimento(s) sin dato de ${info.label}. El total real puede ser mayor.`}
            >
              ⓘ ({nulls})
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono ${small ? 'text-xs' : 'text-xs font-medium'}`}
            style={{ color: 'var(--ink)' }}
          >
            {value != null ? `${fmt(value)} ${info.unit}` : '—'}
          </span>
          {level && <AlertBadge level={level} />}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden sticky top-0"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--rule)' }}>
        <div className="flex justify-between items-baseline mb-1">
          <p className="font-display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Totales del día
          </p>
          {vct && (
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-soft)' }}>
              VCT {Math.round(vct.vct)} kcal
            </span>
          )}
        </div>
        {planState ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--paper)' }}>
                <div
                  className="h-full"
                  style={{ width: `${Math.min(planState.pct, 100)}%`, background: planState.color }}
                />
              </div>
              <span className="font-mono text-[11px] min-w-[84px] text-right" style={{ color: 'var(--ink)' }}>
                {Math.round(energyKcal)} / {Math.round(vct!.vct)}
              </span>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: planState.color }}>
              {planState.message} · {planState.pct.toFixed(0)}%
            </p>
          </>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Complete los datos del paciente para targets personalizados
          </p>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--ink-soft)' }}>
          Nutrientes principales
        </p>
        {primaryKeys.map((key) => renderRow(key, false))}
      </div>

      {iron && (
        <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          <p
            className="text-xs uppercase tracking-wide mt-3 mb-1.5"
            style={{ color: 'var(--ink-soft)' }}
            title="Hierro absorbible estimado — fórmula Monsen 1978 (hem 25%, no-hem según potenciadores)"
          >
            Hierro absorbible (Monsen)
          </p>
          <div className="flex justify-between text-xs py-0.5" style={{ color: 'var(--ink-soft)' }}>
            <span>Hierro total</span>
            <span className="font-mono">{fmt(iron.totalIron)} mg</span>
          </div>
          <div className="flex justify-between text-xs py-0.5" style={{ color: 'var(--ink-soft)' }}>
            <span>Absorbible estimado</span>
            <span className="font-mono" style={{ color: 'var(--ink)' }}>{fmt(iron.absorbable)} mg</span>
          </div>
          <div className="flex justify-between text-xs py-0.5" style={{ color: 'var(--ink-soft)' }}>
            <span>Factor no-hem</span>
            <span className="font-mono">×{iron.factor}</span>
          </div>
        </div>
      )}

      <details className="px-4 pb-3">
        <summary className="text-xs cursor-pointer py-2" style={{ color: 'var(--ink-soft)' }}>
          Ver todos los nutrientes
        </summary>
        <div className="mt-1">
          {otherKeys.map((key) => {
            if ((totals[key]?.value ?? 0) === 0 && (totals[key]?.items_with_null ?? 0) === 0) return null;
            return renderRow(key, true);
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
