import type { SupabaseClient } from '@supabase/supabase-js';
import { ageInMonths } from './age';
import { calculateVCT, type PhysiologicalState, type VCTBreakdown } from './energyRequirement';
import { getBaseDRIs, mapPhysiologicalToDRI } from './driLookup';
import { buildTargets, applyMergedOverrides, type ResolvedTargets } from './nutrientTargets';
import { mergeOverrides, type MergedTargets } from './comorbidityMerge';
import { getDerivedComorbidities } from './derivedComorbidities';
import type { ComorbidityCode } from './clinicalOverrides';

type PatientLike = {
  birth_date: string | null;
  sex: 'M' | 'F' | null;
  height_cm: number | null;
  weight_kg: number | null;
  weight_pregest_kg?: number | null;
  residence_area: 'urbana' | 'rural' | null;
  lifestyle: 'ligero' | 'no_ligero' | null;
  physiological_state?: string | null;
  comorbidities?: string[] | null;
  is_athlete?: boolean | null;
  protein_factor_override?: number | null;
};

export type PatientTargets = {
  targets: ResolvedTargets;
  vct: VCTBreakdown | null;
  merged: MergedTargets;
  comorbidities: ComorbidityCode[];
};

export async function resolvePatientTargets(
  supabase: SupabaseClient,
  patient: PatientLike,
): Promise<PatientTargets> {
  const complete =
    patient.birth_date && patient.sex && patient.height_cm &&
    patient.weight_kg && patient.residence_area && patient.lifestyle;

  if (!complete) {
    return { targets: {}, vct: null, merged: {}, comorbidities: [] };
  }

  const state = (patient.physiological_state ?? 'standard') as PhysiologicalState;

  let vct: VCTBreakdown;
  try {
    vct = calculateVCT({
      sex: patient.sex as 'M' | 'F',
      birthDate: new Date(patient.birth_date as string),
      heightCm: Number(patient.height_cm),
      weightKg: Number(patient.weight_kg),
      weightPregestKg: patient.weight_pregest_kg ? Number(patient.weight_pregest_kg) : undefined,
      residenceArea: patient.residence_area as 'urbana' | 'rural',
      lifestyle: patient.lifestyle as 'ligero' | 'no_ligero',
      physiologicalState: state,
    });
  } catch {
    return { targets: {}, vct: null, merged: {}, comorbidities: [] };
  }

  const ageMonths = ageInMonths(new Date(patient.birth_date as string));
  const driState = mapPhysiologicalToDRI(state);
  const dris = await getBaseDRIs(supabase, patient.sex as 'M' | 'F', ageMonths, driState);

  const explicit = (patient.comorbidities ?? []) as ComorbidityCode[];
  const merged = mergeOverrides(dris, explicit, {
    birth_date: patient.birth_date,
    is_athlete: patient.is_athlete ?? false,
    comorbidities: explicit,
    protein_factor_override: patient.protein_factor_override ?? null,
  });

  const base = buildTargets(dris, vct.vct);
  const targets = applyMergedOverrides(base, merged, vct.weightUsed);
  const comorbidities = getDerivedComorbidities({
    birth_date: patient.birth_date,
    is_athlete: patient.is_athlete ?? false,
    comorbidities: explicit,
  });

  return { targets, vct, merged, comorbidities };
}
