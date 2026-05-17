'use client';

import { getAlertLevel, NUTRIENT_LABELS, PRIMARY_NUTRIENTS } from '@/lib/nutrition';
import type { NutrientTotals, ProfileLimits, FoodNutrients } from '@/lib/types';
import AlertBadge from '@/components/ui/AlertBadge';

interface Props {
  totals: NutrientTotals;
  profileLimits: ProfileLimits;
  profileName: string;
}

export default function TotalsPanel({ totals, profileLimits, profileName }: Props) {
  const primaryKeys = PRIMARY_NUTRIENTS;
  const otherKeys = (Object.keys(NUTRIENT_LABELS) as (keyof FoodNutrients)[])
    .filter((k) => !primaryKeys.includes(k));

  return (
    <div
      className="rounded-lg border overflow-hidden sticky top-0"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--rule)' }}>
        <p className="font-display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Totales del día
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{profileName}</p>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--ink-soft)' }}>
          Nutrientes principales
        </p>
        {primaryKeys.map((key) => {
          const info = NUTRIENT_LABELS[key];
          const value = totals[key];
          const limit = profileLimits[key];
          const level = (value != null && limit) ? getAlertLevel(value, limit) : 'neutral';

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
                  {value != null
                    ? `${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} ${info.unit}`
                    : '—'}
                </span>
                {limit && <AlertBadge level={level} />}
              </div>
            </div>
          );
        })}
      </div>

      <details className="px-4 pb-3">
        <summary
          className="text-xs cursor-pointer py-2"
          style={{ color: 'var(--ink-soft)' }}
        >
          Ver todos los nutrientes
        </summary>
        <div className="mt-1">
          {otherKeys.map((key) => {
            const info = NUTRIENT_LABELS[key];
            const value = totals[key];
            if (value == null) return null;
            return (
              <div
                key={key}
                className="flex items-center justify-between py-1 border-b"
                style={{ borderColor: 'var(--rule)' }}
              >
                <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{info.label}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--ink)' }}>
                  {value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} {info.unit}
                </span>
              </div>
            );
          })}
        </div>
      </details>

      {/* Limits reference */}
      {Object.keys(profileLimits).length > 0 && (
        <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          <p className="text-xs uppercase tracking-wide mt-3 mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            Límites del perfil
          </p>
          {Object.entries(profileLimits).map(([key, limit]) => (
            <div key={key} className="flex justify-between text-xs py-0.5" style={{ color: 'var(--ink-soft)' }}>
              <span>{limit.label}</span>
              <span className="font-mono">
                {limit.min != null && `≥${limit.min}`}
                {limit.min != null && limit.max != null && ' · '}
                {limit.max != null && `≤${limit.max}`}
                {' '}{limit.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
