import { ageInYears } from './age';
import type { ComorbidityCode } from './clinicalOverrides';

export type PatientForDerivation = {
  birth_date?: string | Date | null;
  birthDate?: string | Date | null;
  is_athlete?: boolean | null;
  comorbidities?: string[] | null;
};

function birth(patient: PatientForDerivation): Date | null {
  const raw = patient.birth_date ?? patient.birthDate;
  if (!raw) return null;
  return raw instanceof Date ? raw : new Date(raw);
}

/** Comorbidities that are auto-derived, never checkboxes. */
export function deriveExtraComorbidities(
  patient: PatientForDerivation,
  referenceDate: Date = new Date(),
): ComorbidityCode[] {
  const extra: ComorbidityCode[] = [];
  const b = birth(patient);
  if (b && ageInYears(b, referenceDate) >= 60) extra.push('older_adult');
  if (patient.is_athlete) extra.push('athlete');
  return extra;
}

/** Explicit comorbidities + auto-derived, de-duplicated. */
export function getDerivedComorbidities(
  patient: PatientForDerivation,
  referenceDate: Date = new Date(),
): ComorbidityCode[] {
  const base = (patient.comorbidities ?? []) as ComorbidityCode[];
  return [...new Set([...base, ...deriveExtraComorbidities(patient, referenceDate)])];
}
