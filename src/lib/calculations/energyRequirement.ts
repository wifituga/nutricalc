import { ageInMonths, ageInYears } from './age';
import { selectWeightForCalculation } from './healthyWeight';

export const NAF: Record<'urbana' | 'rural', Record<'ligero' | 'no_ligero', number>> = {
  urbana: { ligero: 1.55, no_ligero: 1.85 },
  rural:  { ligero: 1.65, no_ligero: 1.95 },
};

// Energía para Crecimiento kcal/año — 1-17a (CENAN/INS Perú)
export const ENCDT_BY_AGE: Record<number, Record<'M' | 'F', number>> = {
  1:  { M: 13, F: 13 }, 2:  { M: 12, F: 13 }, 3:  { M: 12, F: 11 },
  4:  { M: 11, F: 10 }, 5:  { M: 11, F: 10 }, 6:  { M: 12, F: 13 },
  7:  { M: 14, F: 17 }, 8:  { M: 16, F: 20 }, 9:  { M: 19, F: 23 },
  10: { M: 22, F: 25 }, 11: { M: 25, F: 25 }, 12: { M: 29, F: 26 },
  13: { M: 33, F: 24 }, 14: { M: 33, F: 19 }, 15: { M: 31, F: 13 },
  16: { M: 24, F: 5  }, 17: { M: 14, F: 0  },
};

// Energía para Crecimiento kcal/mes — 0-11m (CENAN/INS Perú)
export const ENCDT_BY_MONTH: Record<number, Record<'M' | 'F', number>> = {
  0:  { M: 211, F: 178 }, 1:  { M: 183, F: 161 }, 2:  { M: 139, F: 134 },
  3:  { M: 53,  F: 68  }, 4:  { M: 45,  F: 57  }, 5:  { M: 36,  F: 47  },
  6:  { M: 17,  F: 20  }, 7:  { M: 16,  F: 17  }, 8:  { M: 14,  F: 15  },
  9:  { M: 21,  F: 18  }, 10: { M: 21,  F: 15  }, 11: { M: 22,  F: 14  },
};

export const PHYSIOLOGICAL_ADDITION: Record<string, number> = {
  standard:         0,
  pregnancy_t1:    85,
  pregnancy_t2:   285,
  pregnancy_t3:   475,
  lactation_0_6m: 500,
  lactation_6_12m: 400,
};

export type PhysiologicalState =
  | 'standard'
  | 'pregnancy_t1' | 'pregnancy_t2' | 'pregnancy_t3'
  | 'lactation_0_6m' | 'lactation_6_12m';

export type VCTInput = {
  sex: 'M' | 'F';
  birthDate: Date;
  heightCm: number;
  weightKg: number;
  weightPregestKg?: number;
  residenceArea: 'urbana' | 'rural';
  lifestyle: 'ligero' | 'no_ligero';
  physiologicalState: PhysiologicalState;
  referenceDate?: Date;
};

export type VCTBreakdown = {
  ageYears: number;
  weightUsed: number;
  weightSource: 'actual' | 'healthy' | 'pregestational';
  tmb: number;
  naf: number | null;
  get: number;
  encdt: number;
  adicion: number;
  vct: number;
};

export function calculateTMB_adult(sex: 'M' | 'F', ageYears: number, weightKg: number): number {
  if (sex === 'M') {
    if (ageYears < 30) return 15.057 * weightKg + 692.2;
    if (ageYears < 60) return 11.472 * weightKg + 873.1;
    return 11.711 * weightKg + 587.7;
  } else {
    if (ageYears < 30) return 14.818 * weightKg + 486.6;
    if (ageYears < 60) return 8.126  * weightKg + 845.6;
    return 9.082 * weightKg + 658.5;
  }
}

// GET fórmula directa para niños 1-17a. lifestyle aplica solo para 12-17a.
export function calculateGET_child(
  sex: 'M' | 'F',
  ageYears: number,
  weightKg: number,
  lifestyle?: string,
): number {
  const base = sex === 'M'
    ? 310.2 + 63.3 * weightKg - 0.263 * weightKg ** 2
    : 263.4 + 65.3 * weightKg - 0.454 * weightKg ** 2;

  if (ageYears >= 12) {
    if (lifestyle === 'no_ligero') return base * 1.15;
    return base * 0.85; // 'ligero' → ligera
  }
  return base;
}

export function calculateVCT(input: VCTInput): VCTBreakdown {
  const {
    sex, birthDate, heightCm, weightKg, weightPregestKg,
    residenceArea, lifestyle, physiologicalState,
    referenceDate = new Date(),
  } = input;

  const years = ageInYears(birthDate, referenceDate);
  const months = ageInMonths(birthDate, referenceDate);
  const heightM = heightCm / 100;
  const adicion = PHYSIOLOGICAL_ADDITION[physiologicalState] ?? 0;
  const nafValue = NAF[residenceArea][lifestyle];

  // Infants 0–11 months
  if (years === 0) {
    const m = months % 12;
    const getVal = m <= 5
      ? -152 + 92.8 * weightKg
      : -99.4 + 88.6 * weightKg;
    const encdt = ENCDT_BY_MONTH[m]?.[sex] ?? 0;
    return {
      ageYears: years, weightUsed: weightKg, weightSource: 'actual',
      tmb: 0, naf: null,
      get: getVal, encdt, adicion, vct: getVal + encdt + adicion,
    };
  }

  // Children 1–17 years — direct GET formula, peso saludable NOT applied (guía lo acota a tmb_adultos)
  if (years < 18) {
    const getVal = calculateGET_child(sex, years, weightKg, lifestyle);
    const encdt = ENCDT_BY_AGE[years]?.[sex] ?? 0;
    return {
      ageYears: years, weightUsed: weightKg, weightSource: 'actual',
      tmb: 0, naf: years >= 12 ? nafValue : null,
      get: getVal, encdt, adicion, vct: getVal + encdt + adicion,
    };
  }

  // Adults ≥18 years — TMB × NAF
  const w = selectWeightForCalculation(weightKg, heightM, years, weightPregestKg);
  const tmb = calculateTMB_adult(sex, years, w.weight);
  const getVal = tmb * nafValue;

  return {
    ageYears: years, weightUsed: w.weight, weightSource: w.source,
    tmb, naf: nafValue,
    get: getVal, encdt: 0, adicion, vct: getVal + adicion,
  };
}
