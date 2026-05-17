import { describe, it, expect } from 'vitest';
import { calculateVCT, calculateTMB_adult, calculateGET_child, NAF } from '../energyRequirement';
import { imcSaludable, pesoSaludable, selectWeightForCalculation } from '../healthyWeight';
import { ageInMonths, ageInYears } from '../age';

// Fixed reference date so tests don't drift with real time
const REF = new Date('2026-01-01T00:00:00Z');
const yearsBack = (n: number) => new Date(REF.getFullYear() - n, REF.getMonth(), REF.getDate());
const monthsBack = (n: number) => {
  const d = new Date(REF);
  d.setMonth(d.getMonth() - n);
  return d;
};

// ── age.ts ──────────────────────────────────────────────────────────────────

describe('ageInMonths', () => {
  it('returns 0 for someone born today', () => {
    expect(ageInMonths(REF, REF)).toBe(0);
  });

  it('birthday 25 years ago → 300 months', () => {
    expect(ageInMonths(yearsBack(25), REF)).toBe(300);
  });

  it('not yet birthday in current month → month not counted', () => {
    const birth = new Date('2020-01-15');
    const ref   = new Date('2023-04-14');
    expect(ageInMonths(birth, ref)).toBe(38);
  });

  it('birthday today in current month → month counted', () => {
    const birth = new Date('2020-01-15');
    const ref   = new Date('2023-04-15');
    expect(ageInMonths(birth, ref)).toBe(39);
  });
});

describe('ageInYears', () => {
  it('exact birthday → counts full year', () => {
    expect(ageInYears(yearsBack(25), REF)).toBe(25);
  });

  it('one day before birthday → year not counted', () => {
    const birth = new Date('2000-01-02');
    const ref   = new Date('2025-01-01');
    expect(ageInYears(birth, ref)).toBe(24);
  });
});

// ── healthyWeight.ts ─────────────────────────────────────────────────────────

describe('imcSaludable', () => {
  it('returns 22 for adults under 60', () => {
    expect(imcSaludable(25)).toBe(22);
    expect(imcSaludable(59)).toBe(22);
  });

  it('returns 25.5 for adults 60+', () => {
    expect(imcSaludable(60)).toBe(25.5);
    expect(imcSaludable(75)).toBe(25.5);
  });
});

describe('pesoSaludable', () => {
  it('1.85m adulto < 60 → 22 × 1.85² = 75.295', () => {
    expect(pesoSaludable(1.85, 25)).toBeCloseTo(75.295, 3);
  });
});

describe('selectWeightForCalculation', () => {
  it('M 25a 1.85m 92kg → usa peso saludable', () => {
    const r = selectWeightForCalculation(92, 1.85, 25);
    expect(r.source).toBe('healthy');
    expect(r.weight).toBeCloseTo(75.295, 2);
  });

  it('M 25a 1.85m 68kg → usa peso actual', () => {
    const r = selectWeightForCalculation(68, 1.85, 25);
    expect(r.source).toBe('actual');
    expect(r.weight).toBeCloseTo(68, 5);
  });

  it('≥60a 1.70m 75kg → IMC 25.95 > 25.5 → usa peso saludable', () => {
    const r = selectWeightForCalculation(75, 1.70, 65);
    expect(r.source).toBe('healthy');
    expect(r.weight).toBeCloseTo(25.5 * 1.7 * 1.7, 3);
  });

  it('embarazada pregest 60 actual 65, 1.65m → pregest IMC 22.04 > 22 → peso saludable', () => {
    // pregest BMI = 60 / 1.65² = 22.04 > 22 → healthy weight
    const r = selectWeightForCalculation(65, 1.65, 28, 60);
    expect(r.source).toBe('healthy');
  });

  it('embarazada pregest 55 actual 65, 1.65m → pregest IMC 20.2 < 22 → pregestacional', () => {
    const r = selectWeightForCalculation(65, 1.65, 28, 55);
    expect(r.source).toBe('pregestational');
    expect(r.weight).toBeCloseTo(55, 5);
  });
});

// ── energyRequirement.ts — mandatory cases from CONTEXT.md §10 ───────────────

describe('NAF constants', () => {
  it('urbana ligero = 1.55', () => expect(NAF.urbana.ligero).toBe(1.55));
  it('rural no_ligero = 1.95', () => expect(NAF.rural.no_ligero).toBe(1.95));
});

describe('calculateTMB_adult', () => {
  it('M 25a 75.295kg → 1825.92', () => {
    expect(calculateTMB_adult('M', 25, 75.295)).toBeCloseTo(1825.92, 1);
  });
  it('F 20a 61.36kg → 1395.77', () => {
    expect(calculateTMB_adult('F', 20, 61.3558)).toBeCloseTo(1395.77, 1);
  });
});

describe('calculateVCT', () => {
  // Caso 1 — F 3 años 16 kg (CONTEXT.md §10)
  it('Caso 1: niña 3a 16kg — GET directo + ENCDT', () => {
    const v = calculateVCT({
      sex: 'F', birthDate: yearsBack(3),
      heightCm: 95, weightKg: 16,
      residenceArea: 'urbana', lifestyle: 'ligero',
      physiologicalState: 'standard',
      referenceDate: REF,
    });
    expect(v.get).toBeCloseTo(1191.98, 1);
    expect(v.encdt).toBe(11);
    expect(v.adicion).toBe(0);
    expect(v.vct).toBeCloseTo(1202.98, 1);
    expect(v.tmb).toBe(0);
    expect(v.naf).toBeNull();
  });

  // Caso 4 — M 25a 1.85m 92kg urbano ligero (CONTEXT.md §10)
  it('Caso 4: adulto M 25a 92kg overweight — usa peso saludable', () => {
    const v = calculateVCT({
      sex: 'M', birthDate: yearsBack(25),
      heightCm: 185, weightKg: 92,
      residenceArea: 'urbana', lifestyle: 'ligero',
      physiologicalState: 'standard',
      referenceDate: REF,
    });
    expect(v.weightSource).toBe('healthy');
    expect(v.weightUsed).toBeCloseTo(75.295, 2);
    expect(v.tmb).toBeCloseTo(1825.92, 1);
    expect(v.naf).toBe(1.55);
    expect(v.get).toBeCloseTo(2830.17, 1);
    expect(v.encdt).toBe(0);
    expect(v.vct).toBeCloseTo(2830.17, 1);
  });

  // Caso 8 — F 20a 1.67m pregest 70 actual 80, rural ligero, embarazo T3 (CONTEXT.md §10)
  it('Caso 8: embarazo T3, usa peso pregestacional saludable', () => {
    const v = calculateVCT({
      sex: 'F', birthDate: yearsBack(20),
      heightCm: 167, weightKg: 80, weightPregestKg: 70,
      residenceArea: 'rural', lifestyle: 'ligero',
      physiologicalState: 'pregnancy_t3',
      referenceDate: REF,
    });
    expect(v.weightSource).toBe('healthy');
    expect(v.weightUsed).toBeCloseTo(61.36, 1);
    expect(v.tmb).toBeCloseTo(1395.77, 1);
    expect(v.naf).toBe(1.65);
    expect(v.get).toBeCloseTo(2303.02, 1);
    expect(v.adicion).toBe(475);
    expect(v.vct).toBeCloseTo(2778.02, 1);
  });

  it('aplica adición correcta por cada estado fisiológico', () => {
    const base = (state: string) => calculateVCT({
      sex: 'F', birthDate: yearsBack(25),
      heightCm: 163, weightKg: 58,
      residenceArea: 'urbana', lifestyle: 'ligero',
      physiologicalState: state as never,
      referenceDate: REF,
    });
    const std = base('standard');
    expect(base('pregnancy_t1').vct - std.vct).toBeCloseTo(85, 5);
    expect(base('pregnancy_t2').vct - std.vct).toBeCloseTo(285, 5);
    expect(base('pregnancy_t3').vct - std.vct).toBeCloseTo(475, 5);
    expect(base('lactation_0_6m').vct - std.vct).toBeCloseTo(500, 5);
    expect(base('lactation_6_12m').vct - std.vct).toBeCloseTo(400, 5);
  });

  it('adolescente 13a no_ligero → GET × 1.15', () => {
    const ligero = calculateVCT({
      sex: 'M', birthDate: yearsBack(13),
      heightCm: 155, weightKg: 45,
      residenceArea: 'urbana', lifestyle: 'ligero',
      physiologicalState: 'standard', referenceDate: REF,
    });
    const noLigero = calculateVCT({
      sex: 'M', birthDate: yearsBack(13),
      heightCm: 155, weightKg: 45,
      residenceArea: 'urbana', lifestyle: 'no_ligero',
      physiologicalState: 'standard', referenceDate: REF,
    });
    // no_ligero GET should be ligero GET / 0.85 * 1.15 ratio
    expect(noLigero.get / ligero.get).toBeCloseTo(1.15 / 0.85, 3);
  });
});
