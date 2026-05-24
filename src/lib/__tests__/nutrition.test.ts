import { describe, it, expect } from 'vitest';
import { calculateTotals, nutritionalGrams } from '../nutrition';
import type { Food, MealPlanItem } from '../types';

const arroz: Food = {
  id: 3,
  code: 'A3',
  group_letter: 'A',
  group_name: 'Cereales y derivados',
  name: 'Arroz blanco corriente',
  per_100g: {
    energia_kcal: 358,
    proteinas_g: 7.7,
    grasa_g: 0.7,
    carbohidratos_disponibles_g: 77.6,
  } as Food['per_100g'],
  source: 'TPCA',
  is_preparation: false,
  active: true,
} as Food;

function makeItem(grams: number, cookingFactorId: string | null = null): MealPlanItem & { foods: Food } {
  return {
    id: 'i1',
    meal_plan_id: 'p1',
    food_id: 3,
    meal: 'almuerzo',
    grams,
    household_measure_id: null,
    household_measure_qty: null,
    cooking_factor_id: cookingFactorId,
    position: 0,
    notes: null,
    foods: arroz,
  } as unknown as MealPlanItem & { foods: Food };
}

describe('nutritionalGrams', () => {
  it('returns raw grams when no cooking factor', () => {
    expect(nutritionalGrams(makeItem(200))).toBe(200);
  });

  it('applies cooking factor when provided (cooked → raw)', () => {
    const factors = new Map([['f1', 0.51]]);
    expect(nutritionalGrams(makeItem(200, 'f1'), factors)).toBeCloseTo(102, 1);
  });

  it('ignores cooking_factor_id if factor not in map', () => {
    expect(nutritionalGrams(makeItem(200, 'f1'), new Map())).toBe(200);
  });
});

describe('calculateTotals with cooking factors', () => {
  const foodsMap = new Map<number, Food>([[3, arroz]]);

  it('without factor: 200g arroz crudo = 716 kcal', () => {
    const totals = calculateTotals([makeItem(200)], foodsMap);
    expect(totals.energia_kcal?.value).toBeCloseTo(716, 0);
  });

  it('with factor 0.51 (sancochado): 200g cocido = 102g crudo = ~365 kcal', () => {
    const factors = new Map([['f1', 0.51]]);
    const totals = calculateTotals([makeItem(200, 'f1')], foodsMap, factors);
    // 358 * 102 / 100 = 365.16
    expect(totals.energia_kcal?.value).toBeCloseTo(365.16, 1);
  });
});
