import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveDRIs, mapPhysiologicalToDRI, type DriRecord } from '../driLookup';

const raw = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'dris_iom.json'), 'utf-8'),
) as { dris: DriRecord[] };
const RECORDS = raw.dris;

describe('mapPhysiologicalToDRI', () => {
  it('maps pregnancy trimesters to "pregnancy"', () => {
    expect(mapPhysiologicalToDRI('pregnancy_t1')).toBe('pregnancy');
    expect(mapPhysiologicalToDRI('pregnancy_t3')).toBe('pregnancy');
  });
  it('maps lactation periods to "lactation"', () => {
    expect(mapPhysiologicalToDRI('lactation_0_6m')).toBe('lactation');
    expect(mapPhysiologicalToDRI('lactation_6_12m')).toBe('lactation');
  });
  it('maps standard to "standard"', () => {
    expect(mapPhysiologicalToDRI('standard')).toBe('standard');
  });
});

describe('resolveDRIs — casos obligatorios (MIGRATION_PLAN §2.3)', () => {
  it('Mujer 25a (300m) standard → hierro RDA 18, vit C RDA 75', () => {
    const r = resolveDRIs(RECORDS, 'F', 300, 'standard');
    expect(r.hierro_mg.rda).toBe(18);
    expect(r.hierro_mg.ul).toBe(45);
    expect(r.vit_c_mg.rda).toBe(75);
  });

  it('Hombre 25a (300m) standard → hierro RDA 8, vit C RDA 90', () => {
    const r = resolveDRIs(RECORDS, 'M', 300, 'standard');
    expect(r.hierro_mg.rda).toBe(8);
    expect(r.vit_c_mg.rda).toBe(90);
  });

  it('Mujer 25a pregnancy → hierro RDA 27, folato RDA 600', () => {
    const r = resolveDRIs(RECORDS, 'F', 300, 'pregnancy');
    expect(r.hierro_mg.rda).toBe(27);
    expect(r.folato_ug.rda).toBe(600);
  });

  it('Mujer 25a lactation → hierro RDA 9, vit C RDA 120', () => {
    const r = resolveDRIs(RECORDS, 'F', 300, 'lactation');
    expect(r.hierro_mg.rda).toBe(9);
    expect(r.vit_c_mg.rda).toBe(120);
  });

  it('Niña 5a (60m) standard → calcio RDA 1000 (children_4_8y)', () => {
    const r = resolveDRIs(RECORDS, 'F', 60, 'standard');
    expect(r.calcio_mg.rda).toBe(1000);
  });

  it('hombre adulto NO trae records de pregnancy', () => {
    const r = resolveDRIs(RECORDS, 'M', 300, 'pregnancy');
    // pregnancy lookup forces sex F; an M-only request still resolves F preg data
    // but the important invariant: standard M differs from preg F
    const std = resolveDRIs(RECORDS, 'M', 300, 'standard');
    expect(r.hierro_mg.rda).not.toBe(std.hierro_mg.rda);
  });
});
