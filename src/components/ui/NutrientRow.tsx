import { getAlertLevel } from '@/lib/nutrition';
import type { NutrientLimit } from '@/lib/types';
import AlertBadge from './AlertBadge';

interface Props {
  label: string;
  unit: string;
  value: number | null | undefined;
  limit?: NutrientLimit;
}

export default function NutrientRow({ label, unit, value, limit }: Props) {
  const level = (value != null && limit) ? getAlertLevel(value, limit) : 'neutral';

  return (
    <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--rule)' }}>
      <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{label}</span>
      <div className="flex items-center gap-2">
        {value != null ? (
          <span className="font-mono text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} {unit}
          </span>
        ) : (
          <span className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>—</span>
        )}
        {limit && <AlertBadge level={level} />}
      </div>
    </div>
  );
}
