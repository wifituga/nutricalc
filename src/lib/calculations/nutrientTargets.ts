import { NUTRIENT_LABELS } from '@/lib/nutrition';
import type { FoodNutrients } from '@/lib/types';
import type { DRIValue } from './driLookup';
import type { MergedTargets } from './comorbidityMerge';

export type AlertLevel = 'low' | 'ok' | 'high_natural' | 'near_ul' | 'exceeded';

export type AlertConfig = {
  level: AlertLevel;
  label: string;
  color: string;
  message: string;
};

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

// REVIEW_WITH_REGINA: estos multiplicadores son convención general
// (0.8/1.2/1.5). Ajustar si la práctica clínica peruana sugiere otros.
const THRESHOLDS = {
  low_factor: 0.8,
  high_factor: 1.2,
  ul_factor: 1.5,
} as const;

const STRICT_UL_NUTRIENTS = new Set([
  'sodio_mg',
  'grasa_saturada_pct_vct',
  'grasa_trans_g',
  'colesterol_mg',
]);

type LevelTarget = { target?: number; min?: number; max?: number };

export function getTargetLevel(
  value: number | null | undefined,
  target: LevelTarget | undefined,
  nutrientKey: string,
): AlertLevel {
  if (value == null || target == null) return 'ok';

  const lowThreshold = target.target != null
    ? target.target * THRESHOLDS.low_factor
    : target.min;

  if (lowThreshold != null && value < lowThreshold) return 'low';

  if (target.max == null) return 'ok';

  const ul = target.max;

  if (STRICT_UL_NUTRIENTS.has(nutrientKey)) {
    if (value > ul) return 'exceeded';
    if (value > ul * 0.9) return 'near_ul';
    return 'ok';
  }

  if (value > ul * THRESHOLDS.ul_factor) return 'exceeded';
  if (value > ul) return 'near_ul';
  if (target.target != null && value > target.target * THRESHOLDS.high_factor) {
    return 'high_natural';
  }
  return 'ok';
}

export function getAlertConfig(level: AlertLevel): AlertConfig {
  switch (level) {
    case 'low':
      return { level, label: 'Bajo', color: 'var(--warn)',
        message: 'Bajo aporte — considerar agregar fuentes de este nutriente.' };
    case 'ok':
      return { level, label: 'OK', color: 'var(--ok)', message: 'Adecuado' };
    case 'high_natural':
      return { level, label: 'Alto', color: 'var(--ok)',
        message: 'Adecuado · alto aporte natural. Puede ser deseable según el caso clínico.' };
    case 'near_ul':
      return { level, label: 'Alerta', color: 'var(--warn)',
        message: 'Cercano al límite superior. Revisar si este aporte es habitual.' };
    case 'exceeded':
      return { level, label: 'Excedido', color: 'var(--danger)',
        message: 'Excedido · revisar alimentos del plan.' };
  }
}

export type PlanState =
  | 'empty' | 'building' | 'undernourished' | 'adequate' | 'overfed' | 'excessive';

export function classifyPlanState(currentKcal: number, vctTarget: number): {
  state: PlanState; pct: number; message: string; color: string;
} {
  const pct = vctTarget > 0 ? (currentKcal / vctTarget) * 100 : 0;

  // REVIEW_WITH_REGINA: corte 70% para "subalimentación" es práctica común.
  // Algunas guías usan 80%. Ajustar si Regina lo prefiere.
  if (pct < 30) return { state: 'empty', pct, message: 'Plan vacío o muy incompleto', color: 'var(--ink-soft)' };
  if (pct < 70) return { state: 'building', pct, message: 'Plan en construcción · faltan comidas', color: 'var(--warn)' };
  if (pct < 90) return { state: 'undernourished', pct, message: 'Bajo el VCT objetivo', color: 'var(--warn)' };
  if (pct <= 110) return { state: 'adequate', pct, message: 'Adecuado', color: 'var(--ok)' };
  if (pct <= 130) return { state: 'overfed', pct, message: 'Sobre el VCT objetivo', color: 'var(--warn)' };
  return { state: 'excessive', pct, message: 'Exceso significativo', color: 'var(--danger)' };
}
