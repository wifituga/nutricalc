import { calculateVCT, type PhysiologicalState } from './calculations/energyRequirement';
import { ageInYears } from './calculations/age';
import { COMORBIDITY_LABELS } from './calculations/clinicalOverrides';
import type { BadgeVariant } from '@/components/ui/primitives';

/** Cifra con separador de miles = espacio fino (1 620). Decimal con punto. */
export function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  const fixed = n.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec ? `${grouped}.${dec}` : grouped;
}

type PatientAnthro = {
  birth_date: string | null;
  sex: 'M' | 'F' | null;
  height_cm: number | null;
  weight_kg: number | null;
  weight_pregest_kg?: number | null;
  residence_area: 'urbana' | 'rural' | null;
  lifestyle: 'ligero' | 'no_ligero' | null;
  physiological_state?: string | null;
};

/** Mismos campos que exige resolvePatientTargets para tener VCT. */
export function isAnthropometryComplete(p: PatientAnthro): boolean {
  return Boolean(
    p.birth_date && p.sex && p.height_cm && p.weight_kg && p.residence_area && p.lifestyle,
  );
}

/** VCT puro (sin tocar BD). Devuelve null si faltan datos o falla. */
export function quickVCT(p: PatientAnthro): number | null {
  if (!isAnthropometryComplete(p)) return null;
  try {
    const vct = calculateVCT({
      sex: p.sex as 'M' | 'F',
      birthDate: new Date(p.birth_date as string),
      heightCm: Number(p.height_cm),
      weightKg: Number(p.weight_kg),
      weightPregestKg: p.weight_pregest_kg ? Number(p.weight_pregest_kg) : undefined,
      residenceArea: p.residence_area as 'urbana' | 'rural',
      lifestyle: p.lifestyle as 'ligero' | 'no_ligero',
      physiologicalState: (p.physiological_state ?? 'standard') as PhysiologicalState,
    });
    return Math.round(vct.vct);
  } catch {
    return null;
  }
}

export function ageOf(birth_date: string | null): number | null {
  if (!birth_date) return null;
  return ageInYears(new Date(birth_date));
}

const PHYSIO_BADGE: Record<string, string> = {
  pregnancy_t1: 'Embarazo · 1.º trim',
  pregnancy_t2: 'Embarazo · 2.º trim',
  pregnancy_t3: 'Embarazo · 3.º trim',
  lactation_0_6m: 'Lactancia · 0–6m',
  lactation_6_12m: 'Lactancia · 6–12m',
};

export type DisplayBadge = { label: string; variant: BadgeVariant; dot?: boolean };

/**
 * Badges clínicos de un paciente para listas/headers.
 * Marca (brand) = impacto fisiológico (embarazo, adulto mayor). Neutral = comorbilidades.
 */
export function patientBadges(p: {
  birth_date: string | null;
  comorbidities?: string[] | null;
  is_athlete?: boolean | null;
  physiological_state?: string | null;
}): DisplayBadge[] {
  const badges: DisplayBadge[] = [];
  const state = p.physiological_state ?? 'standard';
  if (PHYSIO_BADGE[state]) badges.push({ label: PHYSIO_BADGE[state], variant: 'brand', dot: true });

  for (const c of p.comorbidities ?? []) {
    badges.push({ label: COMORBIDITY_LABELS[c] ?? c, variant: 'neutral' });
  }

  const age = ageOf(p.birth_date);
  if (age != null && age >= 60) badges.push({ label: 'Adulto mayor', variant: 'brand', dot: true });
  if (p.is_athlete) badges.push({ label: 'Deportista', variant: 'brand', dot: true });
  return badges;
}
