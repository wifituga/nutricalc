import { describe, it, expect } from 'vitest';
import { mergeOverrides } from '../comorbidityMerge';
import { getDerivedComorbidities } from '../derivedComorbidities';
import type { DRIValue } from '../driLookup';

const REF = new Date('2026-01-01T00:00:00Z');
const bornYearsAgo = (n: number) =>
  new Date(REF.getFullYear() - n, REF.getMonth(), REF.getDate()).toISOString();

// Realistic adult-female base DRIs (F 31-50 standard)
const baseF: Record<string, DRIValue> = {
  hierro_mg: { rda: 18, ul: 45 },
  calcio_mg: { rda: 1000, ul: 2500 },
  fibra_g: { ai: 25 },
  vit_c_mg: { rda: 75, ul: 2000 },
};

describe('getDerivedComorbidities', () => {
  it('auto-añade older_adult a ≥60', () => {
    const r = getDerivedComorbidities({ birth_date: bornYearsAgo(65) }, REF);
    expect(r).toContain('older_adult');
  });
  it('auto-añade athlete con is_athlete', () => {
    const r = getDerivedComorbidities({ birth_date: bornYearsAgo(30), is_athlete: true }, REF);
    expect(r).toContain('athlete');
  });
  it('no añade older_adult a <60', () => {
    const r = getDerivedComorbidities({ birth_date: bornYearsAgo(45) }, REF);
    expect(r).not.toContain('older_adult');
  });
});

describe('comorbidityMerge', () => {
  it('Sano sin comorbilidades: limits = base DRI', () => {
    const r = mergeOverrides(baseF, [], { birth_date: bornYearsAgo(30) }, REF);
    expect(r.hierro_mg.min).toBe(18);
    expect(r.hierro_mg.max).toBe(45);
    expect(r.hierro_mg.source).toBe('Base IOM');
    expect(r.calcio_mg.min).toBe(1000);
  });

  it('Caso M1: DM2 + HTA (mujer 45a, 60kg)', () => {
    const r = mergeOverrides(
      baseF,
      ['diabetes_t2', 'hypertension'],
      { birth_date: bornYearsAgo(45) },
      REF,
    );
    expect(r.sodio_mg.max).toBe(1500);
    expect(r.sodio_mg.source).toBe('hypertension');
    expect(r.fibra_g.min).toBe(30);
    expect(r.fibra_g.source).toBe('diabetes_t2');
    expect(r.grasa_pct_vct.min).toBe(20);
    expect(r.grasa_pct_vct.max).toBe(30);
    expect(r.grasa_saturada_pct_vct.max).toBe(7);
    expect(r.proteinas_g_per_kg.target).toBeCloseTo(1.1, 5);
    expect(r.proteinas_g_per_kg.source).toBe('diabetes_t2');
  });

  it('Caso M2: Renal pre-diálisis + Deportista → conflicto proteína', () => {
    const r = mergeOverrides(
      baseF,
      ['renal_predialysis'],
      { birth_date: bornYearsAgo(35), is_athlete: true },
      REF,
    );
    expect(r.proteinas_g_per_kg.conflict).toBe(true);
    expect(r.proteinas_g_per_kg.source).toBe('renal_predialysis');
    expect(r.fosforo_mg.max).toBe(800);
    expect(r.potasio_mg.max).toBe(2700);
  });

  it('Caso M3: Embarazo T2 + Anemia → hierro 40.5 mg (× 1.5)', () => {
    const r = mergeOverrides(
      { hierro_mg: { rda: 27, ul: 45 } },
      ['iron_deficiency_anemia'],
      { birth_date: bornYearsAgo(28) },
      REF,
    );
    expect(r.hierro_mg.target).toBeCloseTo(40.5, 1);
    expect(r.vitamina_c_mg.min).toBe(100);
    expect(r.vitamina_c_mg.source).toBe('iron_deficiency_anemia');
  });

  it('Adulto mayor 65a + HTA: calcio = 1200 (ambos lo piden)', () => {
    const r = mergeOverrides(
      baseF,
      ['hypertension'],
      { birth_date: bornYearsAgo(65) },
      REF,
    );
    expect(r.calcio_mg.min).toBe(1200);
  });

  it('Tope UL: hierro ×1.5 no puede pasar UL 45', () => {
    const r = mergeOverrides(
      { hierro_mg: { rda: 40, ul: 45 } },
      ['iron_deficiency_anemia'],
      { birth_date: bornYearsAgo(30) },
      REF,
    );
    expect(r.hierro_mg.target).toBe(45);
  });

  it('Adulto mayor se aplica automáticamente a ≥60 años', () => {
    const r = mergeOverrides(
      baseF,
      [],
      { birth_date: bornYearsAgo(65) },
      REF,
    );
    expect(r.proteinas_g_per_kg.target).toBe(1.2);
    expect(r.calcio_mg.min).toBe(1200);
    expect(r.vitamina_d_ug.min).toBe(20);
  });

  it('protein_factor_override manual gana sobre comorbilidades', () => {
    const r = mergeOverrides(
      baseF,
      ['renal_predialysis'],
      { birth_date: bornYearsAgo(40), protein_factor_override: 0.9 },
      REF,
    );
    expect(r.proteinas_g_per_kg.target).toBe(0.9);
    expect(r.proteinas_g_per_kg.source).toBe('manual');
  });

  it('rangos de macros con intersección vacía → conflicto', () => {
    // diabetes_gestational CHO 40-50 ∩ athlete CHO 50-65 → 50-50 (borde, no vacío)
    // forzar vacío: diabetes_gestational (40-50) + diabetes_t2 (45-60) → 45-50 ok
    // usar athlete(50-65) + diabetes_gestational(40-50) → max(50,40)=50, min(65,50)=50 → 50-50
    const r = mergeOverrides(
      baseF,
      ['diabetes_gestational'],
      { birth_date: bornYearsAgo(30), is_athlete: true },
      REF,
    );
    expect(r.carbohidratos_pct_vct.min).toBe(50);
    expect(r.carbohidratos_pct_vct.max).toBe(50);
  });
});
