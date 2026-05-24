import { describe, it, expect } from 'vitest';
import {
  MEAL_DISTRIBUTION_DEFAULT,
  buildMealTargets,
  distributionSum,
} from '../mealDistribution';
import type { MacroBreakdown } from '../macroDistribution';

const macros: MacroBreakdown = {
  cho: { pct: 55, grams: 275, kcal: 1100 },
  prot: { pct: 20, grams: 100, kcal: 400 },
  fat: { pct: 25, grams: 55.6, kcal: 500 },
  warnings: [],
};

describe('mealDistribution', () => {
  it('default distribution sums to 100', () => {
    expect(distributionSum(MEAL_DISTRIBUTION_DEFAULT)).toBe(100);
  });

  it('builds targets with default 25/10/30/10/25 over 2000 kcal', () => {
    const t = buildMealTargets(2000, macros, MEAL_DISTRIBUTION_DEFAULT);
    expect(t).toHaveLength(5);
    expect(t[0].slot).toBe('desayuno');
    expect(t[0].kcal).toBe(500);
    expect(t[2].slot).toBe('almuerzo');
    expect(t[2].kcal).toBe(600);
    expect(t[2].prot_g).toBeCloseTo(30, 1);
  });

  it('handles non-100 distribution', () => {
    const d = { ...MEAL_DISTRIBUTION_DEFAULT, almuerzo: 40 };
    expect(distributionSum(d)).toBe(110);
    const t = buildMealTargets(2000, macros, d);
    expect(t[2].kcal).toBe(800);
  });
});
