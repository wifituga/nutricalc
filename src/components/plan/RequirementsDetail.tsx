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
  if (m.min != null) parts.push(`≥${m.min}`);
  if (m.max != null) parts.push(`≤${m.max}`);
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

  return (
    <details
      className="rounded-lg border mb-6"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
    >
      <summary
        className="px-5 py-3 cursor-pointer text-sm font-medium"
        style={{ color: 'var(--ink)' }}
      >
        Ver detalle por comorbilidad
        {comorbidities.length > 0 && (
          <span className="ml-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            ({comorbidities.map((c) => COMORBIDITY_LABELS[c] ?? c).join(', ')})
          </span>
        )}
      </summary>
      <div className="px-5 pb-4">
        {keys.map((k) => {
          const m = merged[k];
          const moved =
            m.baseValue != null && m.min != null && m.min !== m.baseValue
              ? m.min > m.baseValue ? '↑' : '↓'
              : '';
          return (
            <div
              key={k}
              className="flex items-center justify-between py-1.5 border-b text-sm"
              style={{ borderColor: 'var(--rule)' }}
            >
              <span style={{ color: 'var(--ink-soft)' }}>{KEY_LABELS[k] ?? k}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono" style={{ color: 'var(--ink)' }}>
                  {rangeText(m)}
                </span>
                {m.conflict && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--danger)', color: 'var(--paper)' }}
                  >
                    CONFLICTO
                  </span>
                )}
                {m.source && (
                  <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                    [{COMORBIDITY_LABELS[m.source] ?? m.source}
                    {moved && m.baseValue != null ? ` ${moved} desde ${m.baseValue}` : ''}]
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {keys.some((k) => merged[k].conflict) && (
          <p className="text-xs mt-3" style={{ color: 'var(--danger)' }}>
            Hay conflictos entre comorbilidades. Requiere decisión clínica manual
            (no se auto-mergea proteína g/kg con rangos incompatibles).
          </p>
        )}
      </div>
    </details>
  );
}
