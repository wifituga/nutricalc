import { ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import type { MergedTargets } from '@/lib/calculations/comorbidityMerge';
import { COMORBIDITY_LABELS } from '@/lib/calculations/clinicalOverrides';

const KEY_LABELS: Record<string, string> = {
  sodio_mg:               'Sodio (mg)',
  potasio_mg:             'Potasio (mg)',
  fosforo_mg:             'Fósforo (mg)',
  calcio_mg:              'Calcio (mg)',
  magnesio_mg:            'Magnesio (mg)',
  fibra_g:                'Fibra (g)',
  fibra_soluble_g:        'Fibra soluble (g)',
  hierro_mg:              'Hierro (mg)',
  vitamina_c_mg:          'Vitamina C (mg)',
  vitamina_d_ug:          'Vitamina D (µg)',
  vitamina_b12_ug:        'Vitamina B12 (µg)',
  colesterol_mg:          'Colesterol (mg)',
  grasa_trans_g:          'Grasa trans (g)',
  carbohidratos_pct_vct:  'Carbohidratos (% VCT)',
  proteinas_pct_vct:      'Proteínas (% VCT)',
  grasa_pct_vct:          'Grasa (% VCT)',
  grasa_saturada_pct_vct: 'Grasa saturada (% VCT)',
  proteinas_g_per_kg:     'Proteína (g/kg)',
};

function rangeText(m: MergedTargets[string]): string {
  if (m.target != null) return `${m.target}`;
  const parts: string[] = [];
  if (m.min != null) parts.push(`min ${m.min}`);
  if (m.max != null) parts.push(`max ${m.max}`);
  return parts.join(' · ') || '—';
}

export default function RequirementsDetail({
  merged,
  comorbidities,
}: {
  merged: MergedTargets;
  comorbidities: string[];
}) {
  const keys = Object.keys(merged).filter((k) => merged[k] && (
    merged[k].min != null || merged[k].max != null || merged[k].target != null || merged[k].conflict
  ));
  if (keys.length === 0) return null;

  const hasConflict = keys.some((k) => merged[k].conflict);

  return (
    <details
      className="rounded-lg border mb-6 group"
      style={{ borderColor: 'var(--rule)', background: 'white', boxShadow: 'var(--shadow-card)' }}
    >
      <summary
        className="px-5 py-3 cursor-pointer text-sm font-medium list-none flex items-center gap-2"
        style={{ color: 'var(--ink)' }}
      >
        <span
          className="inline-block transition-transform group-open:rotate-90"
          style={{ color: 'var(--ink-soft)' }}
        >
          ›
        </span>
        Detalle de targets por comorbilidad
        {comorbidities.length > 0 && (
          <span className="text-xs font-normal" style={{ color: 'var(--ink-soft)' }}>
            ({comorbidities.map((c) => COMORBIDITY_LABELS[c] ?? c).join(', ')})
          </span>
        )}
        {hasConflict && (
          <span
            className="inline-flex items-center gap-1 ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--danger)', color: 'var(--paper)' }}
          >
            <AlertTriangle size={11} /> Conflicto
          </span>
        )}
      </summary>
      <div className="px-5 pb-4">
        <ul className="divide-y" style={{ borderColor: 'var(--rule)' }}>
          {keys.map((k) => {
            const m = merged[k];
            const moved =
              m.baseValue != null && m.min != null && m.min !== m.baseValue
                ? m.min > m.baseValue ? 'up' : 'down'
                : null;
            return (
              <li
                key={k}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span style={{ color: 'var(--ink)' }}>{KEY_LABELS[k] ?? k}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm" style={{ color: 'var(--ink)' }}>
                    {rangeText(m)}
                  </span>
                  {m.conflict && (
                    <span
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--danger)', color: 'var(--paper)' }}
                    >
                      Conflicto
                    </span>
                  )}
                  {m.source && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
                      style={{
                        borderColor: 'var(--rule)',
                        background: 'var(--paper-warm)',
                        color: 'var(--ink-soft)',
                      }}
                      title={
                        moved && m.baseValue != null
                          ? `${moved === 'up' ? 'subió' : 'bajó'} desde ${m.baseValue}`
                          : undefined
                      }
                    >
                      {moved === 'up' && <ArrowUp size={10} />}
                      {moved === 'down' && <ArrowDown size={10} />}
                      {COMORBIDITY_LABELS[m.source] ?? m.source}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {hasConflict && (
          <p className="text-xs mt-3" style={{ color: 'var(--danger)' }}>
            Hay conflictos entre comorbilidades. Requiere decisión clínica manual
            (no se auto-mergea proteína g/kg con rangos incompatibles).
          </p>
        )}
      </div>
    </details>
  );
}
