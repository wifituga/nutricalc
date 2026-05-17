import { CLINICAL_OVERRIDES, type ComorbidityCode, type OverrideSpec } from './clinicalOverrides';
import { deriveExtraComorbidities, type PatientForDerivation } from './derivedComorbidities';
import type { DRIValue } from './driLookup';

export type MergedLimit = {
  min?: number;
  max?: number;
  target?: number;
  source?: string;        // comorbidity (or 'Base IOM' / 'merged' / 'manual') that set it
  baseValue?: number;     // original base before override
  conflict?: boolean;
  conflictDetails?: { sources: string[]; values: unknown[] };
};

export type MergedTargets = Record<string, MergedLimit>;

// Lowest value wins (most restrictive ceiling)
const MAX_KEYS = new Set([
  'sodio_mg', 'fosforo_mg', 'grasa_saturada_pct_vct', 'colesterol_mg', 'grasa_trans_g',
]);
// Highest value wins (most demanding floor)
const MIN_KEYS = new Set([
  'fibra_g', 'calcio_mg', 'vitamina_c_mg', 'vitamina_d_ug',
  'magnesio_mg', 'vitamina_b12_ug', 'fibra_soluble_g',
]);
const RANGE_KEYS = new Set([
  'carbohidratos_pct_vct', 'proteinas_pct_vct', 'grasa_pct_vct',
]);

// base DRI key → override-namespace key
const DRI_TO_OVERRIDE: Record<string, string> = {
  hierro_mg: 'hierro_mg',
  calcio_mg: 'calcio_mg',
  fosforo_mg: 'fosforo_mg',
  magnesio_mg: 'magnesio_mg',
  fibra_g: 'fibra_g',
  vit_c_mg: 'vitamina_c_mg',
  vit_d_ug: 'vitamina_d_ug',
  vit_b12_ug: 'vitamina_b12_ug',
};

type ProteinSpec = { code: string; min?: number; max?: number; default?: number };

export type PatientForMerge = PatientForDerivation & {
  protein_factor_override?: number | null;
};

export function mergeOverrides(
  baseDRIs: Record<string, DRIValue>,
  activeComorbidities: ComorbidityCode[],
  patient: PatientForMerge,
  referenceDate: Date = new Date(),
): MergedTargets {
  const all = [
    ...new Set([
      ...activeComorbidities,
      ...deriveExtraComorbidities(patient, referenceDate),
    ]),
  ];

  const merged: MergedTargets = {};

  // 1) Seed from base DRIs (override namespace)
  for (const [driKey, val] of Object.entries(baseDRIs)) {
    const key = DRI_TO_OVERRIDE[driKey];
    if (!key) continue;
    const base = val.rda ?? val.ai;
    merged[key] = {
      min: base,
      max: val.ul,
      source: 'Base IOM',
      baseValue: base,
    };
  }

  const proteinSpecs: ProteinSpec[] = [];
  const ranges: Record<string, { code: string; min?: number; max?: number }[]> = {};
  let ironMultiplier: number | null = null;
  let ironSource = '';

  // 2) Apply each comorbidity's overrides
  for (const code of all) {
    const def = CLINICAL_OVERRIDES.comorbidities[code];
    if (!def) continue;

    for (const [key, rawSpec] of Object.entries(def.overrides)) {
      if (key === 'imc_saludable_referencia' || key.endsWith('_note')) continue;

      if (key === 'hierro_mg_target_multiplier') {
        ironMultiplier = rawSpec as number;
        ironSource = code;
        continue;
      }

      const spec = rawSpec as OverrideSpec;

      if (key === 'proteinas_g_per_kg') {
        proteinSpecs.push({ code, min: spec.min, max: spec.max, default: spec.default });
        continue;
      }

      if (RANGE_KEYS.has(key)) {
        (ranges[key] ??= []).push({ code, min: spec.min, max: spec.max });
        continue;
      }

      const cur = (merged[key] ??= {});

      // potasio_mg is dual: max in renal, min in HTA
      if (spec.max != null && (MAX_KEYS.has(key) || key === 'potasio_mg')) {
        if (cur.max == null || spec.max < cur.max) {
          cur.max = spec.max;
          cur.source = code;
        }
      }
      if (spec.min != null && (MIN_KEYS.has(key) || key === 'potasio_mg')) {
        if (cur.min == null || spec.min > cur.min) {
          cur.min = spec.min;
          cur.source = code;
        }
      }
      if (cur.min != null && cur.max != null && cur.min > cur.max) {
        cur.conflict = true;
      }
    }
  }

  // 3) Resolve % ranges via intersection
  for (const [key, specs] of Object.entries(ranges)) {
    const mins = specs.map((s) => s.min).filter((v): v is number => v != null);
    const maxs = specs.map((s) => s.max).filter((v): v is number => v != null);
    const min = mins.length ? Math.max(...mins) : undefined;
    const max = maxs.length ? Math.min(...maxs) : undefined;
    const entry: MergedLimit = {
      min, max,
      source: specs.length === 1 ? specs[0].code : 'merged',
    };
    if (min != null && max != null && min > max) {
      entry.conflict = true;
      entry.conflictDetails = {
        sources: specs.map((s) => s.code),
        values: specs.map((s) => ({ min: s.min, max: s.max })),
      };
    }
    merged[key] = entry;
  }

  // 4) Protein g/kg — special, never silently merge incompatible ranges
  if (patient.protein_factor_override != null) {
    merged.proteinas_g_per_kg = {
      target: patient.protein_factor_override,
      source: 'manual',
    };
  } else if (proteinSpecs.length === 1) {
    const s = proteinSpecs[0];
    merged.proteinas_g_per_kg = {
      min: s.min, max: s.max,
      target: s.default ?? s.min,
      source: s.code,
    };
  } else if (proteinSpecs.length > 1) {
    const imin = Math.max(...proteinSpecs.map((s) => s.min ?? -Infinity));
    const imax = Math.min(...proteinSpecs.map((s) => s.max ?? Infinity));
    if (imin > imax) {
      merged.proteinas_g_per_kg = {
        conflict: true,
        source: proteinSpecs[0].code,
        target: proteinSpecs[0].default ?? proteinSpecs[0].min,
        min: proteinSpecs[0].min,
        max: proteinSpecs[0].max,
        conflictDetails: {
          sources: proteinSpecs.map((s) => s.code),
          values: proteinSpecs.map((s) => ({ min: s.min, max: s.max, default: s.default })),
        },
      };
    } else {
      const bestDefault = Math.max(...proteinSpecs.map((s) => s.default ?? s.min ?? imin));
      merged.proteinas_g_per_kg = {
        min: imin, max: imax,
        target: Math.min(Math.max(bestDefault, imin), imax),
        source: 'merged',
      };
    }
  }

  // 5) Iron — anemia multiplier with UL cap
  const baseIron = baseDRIs.hierro_mg;
  if (baseIron) {
    const baseRda = baseIron.rda ?? baseIron.ai;
    if (ironMultiplier != null && baseRda != null) {
      let target = baseRda * ironMultiplier;
      if (baseIron.ul != null) target = Math.min(target, baseIron.ul);
      merged.hierro_mg = {
        target,
        min: baseRda,
        max: baseIron.ul,
        source: ironSource,
        baseValue: baseRda,
      };
    } else {
      merged.hierro_mg = {
        min: baseRda,
        max: baseIron.ul,
        source: 'Base IOM',
        baseValue: baseRda,
      };
    }
  }

  return merged;
}
