import { describe, it, expect } from 'vitest';
import { calculateMacroDistribution } from '../macroDistribution';

describe('calculateMacroDistribution', () => {
  it('modo AMDR adulto: 55/20/25 por defecto', () => {
    const r = calculateMacroDistribution(2000, 'amdr_auto', { ageYears: 30 });
    expect(r.cho.pct).toBe(55);
    expect(r.prot.pct).toBe(20);
    expect(r.fat.pct).toBe(25);
    // 55% de 2000 = 1100 kcal / 4 = 275 g
    expect(r.cho.grams).toBeCloseTo(275, 1);
    expect(r.cho.kcal).toBe(1100);
    // 25% de 2000 = 500 kcal / 9 = 55.6 g
    expect(r.fat.grams).toBeCloseTo(55.6, 1);
    expect(r.warnings).toHaveLength(0);
  });

  it('modo manual: respeta % y advierte si fuera de AMDR', () => {
    const r = calculateMacroDistribution(2000, 'manual', {
      ageYears: 30,
      manualPct: { cho: 30, prot: 30, fat: 40 },
    });
    expect(r.cho.pct).toBe(30);
    expect(r.warnings.some((w) => w.includes('Carbohidratos'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('Grasa'))).toBe(true);
  });

  it('modo manual: advierte si no suma 100%', () => {
    const r = calculateMacroDistribution(2000, 'manual', {
      ageYears: 30,
      manualPct: { cho: 50, prot: 20, fat: 20 },
    });
    expect(r.warnings.some((w) => w.includes('suman'))).toBe(true);
  });

  it('modo desde proteína: 1.0 g/kg × 60 kg = 60 g = 240 kcal', () => {
    const r = calculateMacroDistribution(2000, 'from_protein_g_per_kg', {
      ageYears: 30,
      proteinFactor: 1.0,
      weightKg: 60,
    });
    expect(r.prot.grams).toBeCloseTo(60, 1);
    expect(r.prot.kcal).toBe(240);
    expect(r.prot.pct).toBeCloseTo(12, 1);
    // resto se reparte: fat 25% por defecto, cho el resto
    expect(r.fat.pct).toBe(25);
    const total = r.cho.kcal + r.prot.kcal + r.fat.kcal;
    expect(total).toBeCloseTo(2000, 0);
  });

  it('niño 1-3a usa AMDR distinto (grasa 30-40%)', () => {
    const r = calculateMacroDistribution(1200, 'amdr_auto', { ageYears: 2 });
    expect(r.fat.pct).toBe(35);
    expect(r.warnings).toHaveLength(0);
  });
});
