import type { SupabaseClient } from '@supabase/supabase-js';
import type { PhysiologicalState } from './energyRequirement';

export type DRIState = 'standard' | 'pregnancy' | 'lactation';

export type DRIValue = { rda?: number; ai?: number; ul?: number };

export type DriRecord = {
  sex: 'M' | 'F';
  age_min_months: number;
  age_max_months: number | null;
  physiological_state: DRIState;
  nutrient_key: string;
  value_type: 'RDA' | 'AI' | 'UL' | 'EAR';
  value: number;
};

export function mapPhysiologicalToDRI(state: PhysiologicalState | string): DRIState {
  if (state.startsWith('pregnancy')) return 'pregnancy';
  if (state.startsWith('lactation')) return 'lactation';
  return 'standard';
}

/**
 * Pure resolver — given the full DRI record set, returns the DRI value map
 * for one person. Pregnancy/lactation records are always sex 'F'.
 */
export function resolveDRIs(
  records: DriRecord[],
  sex: 'M' | 'F',
  ageMonths: number,
  state: DRIState,
): Record<string, DRIValue> {
  const lookupSex: 'M' | 'F' = state === 'standard' ? sex : 'F';

  const matches = records.filter((r) =>
    r.sex === lookupSex &&
    r.physiological_state === state &&
    ageMonths >= r.age_min_months &&
    (r.age_max_months == null || ageMonths <= r.age_max_months),
  );

  const out: Record<string, DRIValue> = {};
  for (const r of matches) {
    const entry = (out[r.nutrient_key] ??= {});
    if (r.value_type === 'RDA') entry.rda = r.value;
    else if (r.value_type === 'AI') entry.ai = r.value;
    else if (r.value_type === 'UL') entry.ul = r.value;
  }
  return out;
}

/**
 * Fetches the DRI rows relevant to this person and resolves them.
 * Filters by sex + state in SQL; resolves the age band in JS.
 */
export async function getBaseDRIs(
  supabase: SupabaseClient,
  sex: 'M' | 'F',
  ageMonths: number,
  state: DRIState,
): Promise<Record<string, DRIValue>> {
  const lookupSex: 'M' | 'F' = state === 'standard' ? sex : 'F';

  const { data, error } = await supabase
    .from('dri_reference')
    .select('sex,age_min_months,age_max_months,physiological_state,nutrient_key,value_type,value')
    .eq('sex', lookupSex)
    .eq('physiological_state', state);

  if (error) throw new Error(`DRI lookup failed: ${error.message}`);

  return resolveDRIs((data ?? []) as DriRecord[], sex, ageMonths, state);
}
