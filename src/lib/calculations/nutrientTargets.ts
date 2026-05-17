import { NUTRIENT_LABELS } from '@/lib/nutrition';
import type { AlertLevel, FoodNutrients } from '@/lib/types';
import type { DRIValue } from './driLookup';
import type { MergedTargets } from './comorbidityMerge';

// Override-namespace keys that map 1:1 onto TPCA/food nutrient keys
const OVERRIDE_TO_FOOD: (keyof FoodNutrients)[] = [
  'sodio_mg', 'potasio_mg', 'fosforo_mg', 'calcio_mg',
  'fibra_g', 'hierro_mg', 'vitamina_c_mg',
];

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
  source?: string;     // comorbidity that imposed the limit (detail view)
  baseValue?: number;  // original base value before override
  conflict?: boolean;  // incompatible ranges — needs clinical decision
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

/**
 * Overlays merged comorbidity limits onto base DRI targets.
 * - Minerals/vitamins that map 1:1 to food keys get min/max/target + source.
 * - Protein g/kg is converted to grams using the calculation weight.
 */
export function applyMergedOverrides(
  base: ResolvedTargets,
  merged: MergedTargets,
  weightKg: number | null,
): ResolvedTargets {
  const out: ResolvedTargets = { ...base };

  for (const key of OVERRIDE_TO_FOOD) {
    const m = merged[key];
    if (!m) continue;
    const info = NUTRIENT_LABELS[key];
    if (!info) continue;
    const prev = out[key];
    out[key] = {
      label: info.label,
      unit: info.unit,
      min: m.min ?? prev?.min,
      max: m.max ?? prev?.max,
      target: m.target,
      basis: prev?.basis,
      source: m.source,
      baseValue: m.baseValue ?? prev?.min,
      conflict: m.conflict,
    };
  }

  const prot = merged.proteinas_g_per_kg;
  if (prot && weightKg) {
    const info = NUTRIENT_LABELS.proteinas_g;
    out.proteinas_g = {
      label: info.label,
      unit: info.unit,
      min: prot.min != null ? Math.round(prot.min * weightKg) : out.proteinas_g?.min,
      max: prot.max != null ? Math.round(prot.max * weightKg) : undefined,
      target: prot.target != null ? Math.round(prot.target * weightKg) : undefined,
      source: prot.source,
      conflict: prot.conflict,
    };
  }

  return out;
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
