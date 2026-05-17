import type { FoodNutrients, MealPlanItem, Food, AlertLevel, NutrientLimit, NutrientTotals, NutrientTotal, HouseholdMeasure } from './types';

/**
 * Effective grams of an item: when a household measure is selected,
 * grams = measure.grams × qty; otherwise the raw grams field.
 */
export function resolveGrams(
  item: Pick<MealPlanItem, 'grams' | 'household_measure_id' | 'household_measure_qty'>,
  measures?: Map<number, HouseholdMeasure>,
): number {
  if (item.household_measure_id && measures) {
    const m = measures.get(item.household_measure_id);
    if (m) return m.grams * (item.household_measure_qty ?? 1);
  }
  return item.grams;
}

export function calculateTotals(items: MealPlanItem[], foods: Map<number, Food>): NutrientTotals {
  const keys = Object.keys(NUTRIENT_LABELS) as (keyof FoodNutrients)[];
  const totals: Partial<Record<keyof FoodNutrients, NutrientTotal>> = {};

  for (const key of keys) {
    let value = 0;
    let withData = 0;
    let withNull = 0;
    for (const item of items) {
      const food = foods.get(item.food_id);
      if (!food) continue;
      const v = food.per_100g[key];
      if (v == null) {
        withNull++;
      } else {
        value += v * (item.grams / 100);
        withData++;
      }
    }
    totals[key] = {
      value: Math.round(value * 100) / 100,
      items_with_data: withData,
      items_with_null: withNull,
    };
  }

  return totals as NutrientTotals;
}

export function getAlertLevel(value: number, limit: NutrientLimit): AlertLevel {
  if (limit.max != null) {
    const ratio = value / limit.max;
    if (ratio > 1.0) return 'alert';
    if (ratio > 0.85) return 'warn';
    return 'ok';
  }
  if (limit.min != null) {
    const ratio = value / limit.min;
    if (ratio < 0.6) return 'alert';
    if (ratio < 0.85) return 'warn';
    return 'ok';
  }
  return 'neutral';
}

export const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  media_manana: 'Media mañana',
  almuerzo: 'Almuerzo',
  media_tarde: 'Media tarde',
  cena: 'Cena',
};

export const MEAL_SLOTS = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena'] as const;

export const NUTRIENT_LABELS: Record<keyof FoodNutrients, { label: string; unit: string }> = {
  energia_kcal: { label: 'Energía', unit: 'kcal' },
  energia_kj: { label: 'Energía', unit: 'kJ' },
  agua_g: { label: 'Agua', unit: 'g' },
  proteinas_g: { label: 'Proteínas', unit: 'g' },
  grasa_g: { label: 'Grasa total', unit: 'g' },
  carbohidratos_totales_g: { label: 'Carbohidratos totales', unit: 'g' },
  carbohidratos_disponibles_g: { label: 'Carbohidratos disponibles', unit: 'g' },
  fibra_g: { label: 'Fibra', unit: 'g' },
  cenizas_g: { label: 'Cenizas', unit: 'g' },
  calcio_mg: { label: 'Calcio', unit: 'mg' },
  fosforo_mg: { label: 'Fósforo', unit: 'mg' },
  zinc_mg: { label: 'Zinc', unit: 'mg' },
  hierro_mg: { label: 'Hierro', unit: 'mg' },
  sodio_mg: { label: 'Sodio', unit: 'mg' },
  potasio_mg: { label: 'Potasio', unit: 'mg' },
  beta_caroteno_ug: { label: 'Beta-caroteno', unit: 'μg' },
  vitamina_a_ug: { label: 'Vitamina A', unit: 'μg ER' },
  tiamina_mg: { label: 'Tiamina (B1)', unit: 'mg' },
  riboflavina_mg: { label: 'Riboflavina (B2)', unit: 'mg' },
  niacina_mg: { label: 'Niacina (B3)', unit: 'mg' },
  vitamina_c_mg: { label: 'Vitamina C', unit: 'mg' },
  acido_folico_ug: { label: 'Ácido fólico', unit: 'μg' },
};

// Primary nutrients shown prominently in UI
export const PRIMARY_NUTRIENTS: (keyof FoodNutrients)[] = [
  'energia_kcal',
  'proteinas_g',
  'grasa_g',
  'carbohidratos_disponibles_g',
  'fibra_g',
  'sodio_mg',
  'potasio_mg',
  'fosforo_mg',
];
