import { describe, it, expect } from 'vitest';
import {
  calculateAbsorbableIron,
  shouldShowAbsorbableIron,
  type IronItem,
} from '../ironBioavailability';

const food = (group: string, hierro: number, vitC = 0): IronItem['food'] => ({
  group_letter: group,
  per_100g: { hierro_mg: hierro, vitamina_c_mg: vitC } as IronItem['food']['per_100g'],
});

describe('calculateAbsorbableIron', () => {
  it('comida vegetariana con poca vit C → factor 0.03', () => {
    const r = calculateAbsorbableIron([
      { food: food('C', 3, 5), grams: 100 }, // legumbre, vit C baja
    ]);
    expect(r.factor).toBe(0.03);
    expect(r.heme).toBe(0);
    expect(r.absorbable).toBeCloseTo(3 * 0.03, 5);
  });

  it('comida con ≥75g carne → factor 0.08', () => {
    const r = calculateAbsorbableIron([
      { food: food('E', 2.5), grams: 120 }, // carne
    ]);
    expect(r.factor).toBe(0.08);
  });

  it('hierro hem de carne se absorbe al 25%', () => {
    const r = calculateAbsorbableIron([
      { food: food('E', 3), grams: 100 }, // 3 mg Fe carne → 1.2 hem / 1.8 no-hem
    ]);
    expect(r.heme).toBeCloseTo(1.2, 5);
    expect(r.nonHeme).toBeCloseTo(1.8, 5);
    // factor 0.08 (meatGrams 100 ≥ 75)
    expect(r.absorbable).toBeCloseTo(1.2 * 0.25 + 1.8 * 0.08, 5);
  });

  it('vit C ≥25 sube factor a 0.05', () => {
    const r = calculateAbsorbableIron([
      { food: food('C', 4, 0), grams: 100 },
      { food: food('B', 0, 40), grams: 100 }, // fruta con vit C
    ]);
    expect(r.factor).toBe(0.05);
  });
});

describe('shouldShowAbsorbableIron', () => {
  it('mujer 25a → sí', () => {
    expect(shouldShowAbsorbableIron({ sex: 'F', ageYears: 25 })).toBe(true);
  });
  it('hombre 30a sano → no', () => {
    expect(shouldShowAbsorbableIron({ sex: 'M', ageYears: 30 })).toBe(false);
  });
  it('niño → sí', () => {
    expect(shouldShowAbsorbableIron({ sex: 'M', ageYears: 8 })).toBe(true);
  });
  it('anemia → sí aunque hombre adulto', () => {
    expect(shouldShowAbsorbableIron({
      sex: 'M', ageYears: 40, comorbidities: ['iron_deficiency_anemia'],
    })).toBe(true);
  });
  it('embarazo → sí', () => {
    expect(shouldShowAbsorbableIron({
      sex: 'F', ageYears: 32, physiologicalState: 'pregnancy_t2',
    })).toBe(true);
  });
});
