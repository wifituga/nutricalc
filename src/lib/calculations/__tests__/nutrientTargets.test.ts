import { describe, it, expect } from 'vitest';
import { getTargetLevel, getAlertConfig, classifyPlanState } from '../nutrientTargets';

describe('getTargetLevel — 5 niveles (FIX_BEFORE_REGINA A.1)', () => {
  it('low: por debajo del 80% del target', () => {
    expect(getTargetLevel(40, { target: 100 }, 'proteinas_g')).toBe('low');
  });

  it('ok: dentro de ±20% del target', () => {
    expect(getTargetLevel(105, { target: 100 }, 'proteinas_g')).toBe('ok');
  });

  it('high_natural: sobre 120% del target pero bajo el UL', () => {
    expect(getTargetLevel(130, { target: 100, max: 200 }, 'hierro_mg')).toBe('high_natural');
  });

  it('near_ul: entre UL y UL × 1.5 para no-estrictos', () => {
    expect(getTargetLevel(210, { target: 100, max: 200 }, 'hierro_mg')).toBe('near_ul');
  });

  it('exceeded: sobre UL × 1.5 para no-estrictos', () => {
    expect(getTargetLevel(350, { target: 100, max: 200 }, 'hierro_mg')).toBe('exceeded');
  });

  it('UL estricto: sodio excedido apenas pasa el UL', () => {
    expect(getTargetLevel(2400, { target: 1500, max: 2300 }, 'sodio_mg')).toBe('exceeded');
  });

  it('UL estricto: sodio near_ul al 90% del UL', () => {
    expect(getTargetLevel(2100, { target: 1500, max: 2300 }, 'sodio_mg')).toBe('near_ul');
  });

  // SPEC INCONSISTENCY (flagged for Regina): la spec espera 'near_ul' con
  // comentario "45 < 71 ≤ 67.5", pero 71 > 45×1.5 = 67.5, por lo que el
  // algoritmo de la propia spec devuelve 'exceeded'. Se respeta el algoritmo.
  // Decisión clínica pendiente: ¿hierro 71 mg (sangre de pollo, UL 45) debe
  // alarmar como 'exceeded' o tolerarse como aporte natural alto?
  it('hierro sangre de pollo (caso Manuel): algoritmo → exceeded', () => {
    expect(getTargetLevel(71, { target: 8, max: 45 }, 'hierro_mg')).toBe('exceeded');
  });

  it('sin target → ok (no podemos evaluar)', () => {
    expect(getTargetLevel(50, undefined, 'hierro_mg')).toBe('ok');
  });

  it('sin techo (solo target) y valor alto → ok (no se puede detectar exceso)', () => {
    expect(getTargetLevel(500, { target: 100 }, 'proteinas_g')).toBe('ok');
  });
});

describe('getAlertConfig', () => {
  it('mapea los 5 niveles a label/color/message', () => {
    expect(getAlertConfig('low').label).toBe('Bajo');
    expect(getAlertConfig('ok').color).toBe('var(--ok)');
    expect(getAlertConfig('high_natural').color).toBe('var(--ok)');
    expect(getAlertConfig('near_ul').color).toBe('var(--warn)');
    expect(getAlertConfig('exceeded').color).toBe('var(--danger)');
  });
});

describe('classifyPlanState (B.4)', () => {
  it('clasifica por % del VCT', () => {
    expect(classifyPlanState(200, 2000).state).toBe('empty');
    expect(classifyPlanState(1000, 2000).state).toBe('building');
    expect(classifyPlanState(1600, 2000).state).toBe('undernourished');
    expect(classifyPlanState(2000, 2000).state).toBe('adequate');
    expect(classifyPlanState(2400, 2000).state).toBe('overfed');
    expect(classifyPlanState(3000, 2000).state).toBe('excessive');
  });
});
