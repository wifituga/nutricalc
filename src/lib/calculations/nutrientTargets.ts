import { NUTRIENT_LABELS } from '@/lib/nutrition';
import type { AlertLevel, FoodNutrients } from '@/lib/types';
import type { DRIValue } from './driLookup';

// DRI nutrient_key → TPCA/food nutrient key (FoodNutrients).
// sodio_mg / potasio_mg have no IOM DRI here — they come from comorbidity
// overrides (Sprint 3), so they intentionally have no base target.
const DRI_TO_FOOD: Record<string, keyof FoodNutrients> = {
  proteinas_g:      'proteinas_g',
  grasa_total_g:    'grasa_g',
  carbohidratos_g:  'carbohidratos_disponibles_g',
  fibra_g:          'fibra_g',
  calcio_mg:        'calcio_mg',
  fosforo_mg:       'fosforo_mg',
  zinc_mg:          'zinc_mg',
  hierro_mg:        'hierro_mg',
  vit_a_ug:         'vitamina_a_ug',
  tiamina_mg:       'tiamina_mg',
  riboflavina_mg:   'riboflavina_mg',
  niacina_mg:       'niacina_mg',
  vit_c_mg:         'vitamina_c_mg',
  folato_ug:        'acido_folico_ug',
};

export type ResolvedTarget = {
  label: string;
  unit: string;
  min?: number;     // RDA/AI — minimum to reach
  max?: number;     // UL — do not exceed
  target?: number;  // energy — aim for this (VCT)
  basis?: 'RDA' | 'AI' | 'UL' | 'VCT';
};

export type ResolvedTargets = Partial<Record<keyof FoodNutrients, ResolvedTarget>>;

export function buildTargets(
  dris: Record<string, DRIValue>,
  vct: number | null,
): ResolvedTargets {
  const targets: ResolvedTargets = {};

  if (vct != null) {
    targets.energia_kcal = {
      label: NUTRIENT_LABELS.energia_kcal.label,
      unit: NUTRIENT_LABELS.energia_kcal.unit,
      target: Math.round(vct),
      basis: 'VCT',
    };
  }

  for (const [driKey, val] of Object.entries(dris)) {
    const foodKey = DRI_TO_FOOD[driKey];
    if (!foodKey) continue;
    const info = NUTRIENT_LABELS[foodKey];
    if (!info) continue;

    const min = val.rda ?? val.ai;
    if (min == null && val.ul == null) continue;

    targets[foodKey] = {
      label: info.label,
      unit: info.unit,
      min,
      max: val.ul,
      basis: val.rda != null ? 'RDA' : val.ai != null ? 'AI' : 'UL',
    };
  }

  return targets;
}

export function getTargetLevel(
  value: number | null | undefined,
  t: ResolvedTarget,
): AlertLevel {
  if (value == null) return 'neutral';

  // Exceeding the UL is always the most severe signal
  if (t.max != null && value > t.max) return 'alert';

  if (t.target != null) {
    const r = value / t.target;
    if (r < 0.6 || r > 1.4) return 'alert';
    if (r < 0.85 || r > 1.15) return 'warn';
    return 'ok';
  }

  if (t.min != null) {
    const r = value / t.min;
    if (r < 0.6) return 'alert';
    if (r < 0.85) return 'warn';
    if (t.max != null && value > 0.85 * t.max) return 'warn';
    return 'ok';
  }

  if (t.max != null) {
    if (value > 0.85 * t.max) return 'warn';
    return 'ok';
  }

  return 'neutral';
}
