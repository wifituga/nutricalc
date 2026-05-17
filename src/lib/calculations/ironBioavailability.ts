import type { Food } from '@/lib/types';

// Meats & fish (TPCA groups E and F) carry heme iron
const HEME_GROUPS = new Set(['E', 'F']);

export type IronItem = { food: Pick<Food, 'group_letter' | 'per_100g'>; grams: number };

export type IronResult = {
  totalIron: number;     // mg
  heme: number;          // mg heme iron in the meal
  nonHeme: number;       // mg non-heme iron
  factor: number;        // non-heme absorption factor (Monsen)
  absorbable: number;    // mg absorbed (heme ×0.25 + nonHeme ×factor)
};

function splitHeme(food: IronItem['food']): { heme: number; nonHeme: number } {
  const total = food.per_100g.hierro_mg ?? 0;
  if (HEME_GROUPS.has(food.group_letter)) {
    return { heme: total * 0.40, nonHeme: total * 0.60 };
  }
  return { heme: 0, nonHeme: total };
}

/**
 * Absorbable iron per meal — Monsen 1978.
 * Non-heme absorption factor depends on enhancers (vitamin C, meat) in the meal.
 * Heme iron is absorbed at a fixed 25%.
 */
export function calculateAbsorbableIron(items: IronItem[]): IronResult {
  let heme = 0;
  let nonHeme = 0;
  let vitC = 0;
  let meatGrams = 0;

  for (const item of items) {
    const factor = item.grams / 100;
    const split = splitHeme(item.food);
    heme += split.heme * factor;
    nonHeme += split.nonHeme * factor;
    vitC += (item.food.per_100g.vitamina_c_mg ?? 0) * factor;
    if (HEME_GROUPS.has(item.food.group_letter)) meatGrams += item.grams;
  }

  let factor: number;
  if (vitC >= 75 || meatGrams >= 75) factor = 0.08;
  else if (vitC >= 25 || meatGrams >= 30) factor = 0.05;
  else factor = 0.03;

  return {
    totalIron: heme + nonHeme,
    heme,
    nonHeme,
    factor,
    absorbable: heme * 0.25 + nonHeme * factor,
  };
}

/**
 * Whether to surface absorbable iron: women 12-50, pregnant, lactating,
 * children, or patients with iron-deficiency anemia.
 */
export function shouldShowAbsorbableIron(opts: {
  sex: 'M' | 'F' | null;
  ageYears: number | null;
  physiologicalState?: string | null;
  comorbidities?: string[] | null;
}): boolean {
  const { sex, ageYears, physiologicalState, comorbidities } = opts;
  if (comorbidities?.includes('iron_deficiency_anemia')) return true;
  if (physiologicalState && physiologicalState !== 'standard') return true;
  if (ageYears != null && ageYears < 18) return true;
  if (sex === 'F' && ageYears != null && ageYears >= 12 && ageYears <= 50) return true;
  return false;
}
