import { describe, it, expect } from 'vitest';
import { resolveGrams } from '@/lib/nutrition';
import type { HouseholdMeasure } from '@/lib/types';

const measures = new Map<number, HouseholdMeasure>([
  [1, { id: 1, food_id: 10, measure_name: 'Taza', grams: 327.4, edible_pct: 100 }],
]);

describe('resolveGrams', () => {
  it('usa grams crudos cuando no hay medida casera', () => {
    expect(resolveGrams({ grams: 150, household_measure_id: null, household_measure_qty: null })).toBe(150);
  });

  it('convierte medida × cantidad', () => {
    expect(
      resolveGrams({ grams: 0, household_measure_id: 1, household_measure_qty: 2 }, measures),
    ).toBeCloseTo(654.8, 1);
  });

  it('cantidad por defecto = 1', () => {
    expect(
      resolveGrams({ grams: 0, household_measure_id: 1, household_measure_qty: null }, measures),
    ).toBeCloseTo(327.4, 1);
  });

  it('cae a grams si la medida no está en el mapa', () => {
    expect(
      resolveGrams({ grams: 99, household_measure_id: 5, household_measure_qty: 1 }, measures),
    ).toBe(99);
  });
});
