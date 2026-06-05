'use client';

import { NUTRIENT_LABELS, PRIMARY_NUTRIENTS } from '@/lib/nutrition';
import type { NutrientTotals, FoodNutrients } from '@/lib/types';
import {
  getTargetLevel, classifyPlanState, type ResolvedTargets, type AlertLevel,
} from '@/lib/calculations/nutrientTargets';
import type { VCTBreakdown } from '@/lib/calculations/energyRequirement';
import type { IronResult } from '@/lib/calculations/ironBioavailability';
import { Level, type LevelKey } from '@/components/ui/primitives';
import { fmtNum } from '@/lib/patientDisplay';

interface Props {
  totals: NutrientTotals;
  targets: ResolvedTargets;
  vct: VCTBreakdown | null;
  iron?: IronResult | null;
}

function fmt(n: number) {
  return fmtNum(n, n % 1 === 0 ? 0 : 1);
}

const ALERT_TO_LEVEL: Record<AlertLevel, LevelKey> = {
  low: 'low',
  ok: 'ok',
  high_natural: 'ok',
  near_ul: 'high',
  exceeded: 'exc',
};

export default function TotalsPanel({ totals, targets, vct, iron }: Props) {
  const primaryKeys = PRIMARY_NUTRIENTS;
  const otherKeys = (Object.keys(NUTRIENT_LABELS) as (keyof FoodNutrients)[]).filter((k) => !primaryKeys.includes(k));
  const hasTargets = Object.keys(targets).length > 0;

  const energyKcal = totals.energia_kcal?.value ?? 0;
  const planState = vct ? classifyPlanState(energyKcal, vct.vct) : null;
  const bioPct = iron && iron.totalIron > 0 ? (iron.absorbable / iron.totalIron) * 100 : null;

  function renderRow(key: keyof FoodNutrients, small: boolean) {
    const info = NUTRIENT_LABELS[key];
    const t = totals[key];
    const value = t?.value ?? null;
    const nulls = t?.items_with_null ?? 0;
    const target = targets[key];
    const alert = target ? getTargetLevel(value, target, key) : null;
    const level: LevelKey | null = value == null ? 'null' : alert ? ALERT_TO_LEVEL[alert] : null;
    return (
      <div key={key} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--rule)' }}>
        <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{info.label}</span>
        <div className="flex items-center gap-2">
          <span className={`mono ${small ? 'text-[11.5px]' : 'text-[12px] font-semibold'}`} style={{ color: nulls > 0 ? 'var(--c-low)' : 'var(--ink)' }}>
            {value == null ? <span style={{ color: 'var(--c-null)' }}>—</span> : <>{nulls > 0 && '≥ '}{fmt(value)} {info.unit}</>}
          </span>
          {level && <Level level={level} compact />}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)', boxShadow: 'var(--shadow-card)' }}>
      {/* ---- CUMPLO: energía vs VCT ---- */}
      <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--rule)' }}>
        <div className="flex justify-between items-baseline mb-2">
          <p className="font-display font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>Energía del día</p>
          {vct && <span className="mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>VCT {fmtNum(Math.round(vct.vct))} kcal</span>}
        </div>
        {planState ? (
          <>
            <div className="relative h-7 rounded-[5px] overflow-hidden border" style={{ background: 'var(--surface-sunk)', borderColor: 'var(--rule)' }}>
              <div className="absolute inset-y-0" style={{ left: '0', width: '90%', background: 'rgba(176,52,28,.08)' }} />
              <div className="absolute inset-y-0" style={{ left: '90%', width: '20%', background: 'rgba(45,106,62,.16)' }} />
              <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(planState.pct, 100)}%`, background: planState.color, opacity: 0.85 }} />
              <div className="absolute inset-0 flex items-center justify-center mono text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                {fmtNum(Math.round(energyKcal))} / {fmtNum(Math.round(vct!.vct))} kcal
              </div>
            </div>
            <p className="text-[11.5px] mt-1.5 font-medium" style={{ color: planState.color }}>
              {planState.message} · {planState.pct.toFixed(0)}%
            </p>
          </>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>Completa los datos del paciente para targets personalizados.</p>
        )}
      </div>

      {/* ---- VIGILO: nutrientes con semáforo ---- */}
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold uppercase mb-2" style={{ letterSpacing: '.08em', color: 'var(--ink-faint)' }}>Nutrientes a vigilar</p>
        {primaryKeys.map((key) => renderRow(key, false))}
      </div>

      {/* ---- Hierro absorbible (Monsen) ---- */}
      {iron && (
        <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          <p className="text-[11px] font-semibold uppercase mt-3 mb-1.5" style={{ letterSpacing: '.08em', color: 'var(--ink-faint)' }} title="Hierro absorbible estimado — fórmula Monsen 1978 (hem 25%, no-hem según potenciadores)">
            Hierro absorbible · Monsen
          </p>
          <IronRow k="Hierro total" v={`${fmt(iron.totalIron)} mg`} />
          <IronRow k="Absorbible estimado" v={`${fmt(iron.absorbable)} mg`} strong />
          <IronRow k="Biodisponibilidad" v={bioPct != null ? `${bioPct.toFixed(0)} %` : '—'} />
          <IronRow k="Factor no-hem" v={`×${iron.factor}`} />
        </div>
      )}

      {/* ---- Resto de nutrientes ---- */}
      <details className="px-4 pb-3">
        <summary className="text-[12px] cursor-pointer py-2 font-medium" style={{ color: 'var(--accent)' }}>Ver todos los nutrientes</summary>
        <div className="mt-1">
          {otherKeys.map((key) => {
            if ((totals[key]?.value ?? 0) === 0 && (totals[key]?.items_with_null ?? 0) === 0) return null;
            return renderRow(key, true);
          })}
        </div>
      </details>

      {/* ---- Targets personalizados ---- */}
      {hasTargets && (
        <details className="px-4 pb-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          <summary className="text-[12px] cursor-pointer py-2 font-medium" style={{ color: 'var(--ink-soft)' }}>Targets personalizados del paciente</summary>
          <div className="mt-1">
            {(Object.keys(targets) as (keyof FoodNutrients)[]).map((key) => {
              const t = targets[key];
              if (!t) return null;
              return (
                <div key={key} className="flex justify-between text-[11.5px] py-0.5" style={{ color: 'var(--ink-soft)' }}>
                  <span>{t.label}{t.basis ? ` (${t.basis})` : ''}</span>
                  <span className="mono">{targetText(t)}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

function IronRow({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between text-[12px] py-0.5" style={{ color: 'var(--ink-soft)' }}>
      <span>{k}</span>
      <span className="mono" style={{ color: strong ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: strong ? 600 : 400 }}>{v}</span>
    </div>
  );
}

function targetText(t: NonNullable<ResolvedTargets[keyof ResolvedTargets]>) {
  if (t.target != null) return `meta ${fmt(t.target)} ${t.unit}`;
  const parts: string[] = [];
  if (t.min != null) parts.push(`min ${fmt(t.min)}`);
  if (t.max != null) parts.push(`max ${fmt(t.max)}`);
  return `${parts.join(' · ')} ${t.unit}`;
}
