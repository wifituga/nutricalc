import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePatientTargets } from './patientTargets';
import { NAF } from './energyRequirement';
import { imcSaludable, pesoSaludable } from './healthyWeight';
import { ageInYears } from './age';
import { deriveExtraComorbidities } from './derivedComorbidities';
import type { Patient } from '@/lib/types';

function round(n: number, d = 2): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function formulaText(sex: 'M' | 'F', ageY: number): string {
  if (ageY < 18) return 'GET directo (no usa TMB)';
  if (sex === 'M') {
    if (ageY < 30) return 'TMB = 15.057 × peso + 692.2';
    if (ageY < 60) return 'TMB = 11.472 × peso + 873.1';
    return 'TMB = 11.711 × peso + 587.7';
  }
  if (ageY < 30) return 'TMB = 14.818 × peso + 486.6';
  if (ageY < 60) return 'TMB = 8.126 × peso + 845.6';
  return 'TMB = 9.082 × peso + 658.5';
}

export type CalculationTrace = {
  patient_id: string;
  trace: Record<string, { label: string; data: Record<string, unknown> }>;
  sources: Record<string, string>;
} | { error: string };

export async function buildCalculationTrace(
  supabase: SupabaseClient,
  patient: Patient,
): Promise<CalculationTrace> {
  const { vct, merged, comorbidities } = await resolvePatientTargets(supabase, patient);
  if (!vct || !patient.birth_date || !patient.sex) {
    return { error: 'Datos antropométricos incompletos para calcular el desglose' };
  }

  const ageY = ageInYears(new Date(patient.birth_date));
  const heightM = (patient.height_cm ?? 0) / 100;
  const imcActual = heightM > 0 ? (patient.weight_kg ?? 0) / (heightM * heightM) : 0;
  const imcSal = imcSaludable(ageY);
  const pesoSal = pesoSaludable(heightM, ageY);
  const naf = patient.residence_area && patient.lifestyle
    ? NAF[patient.residence_area][patient.lifestyle]
    : null;
  const extras = deriveExtraComorbidities(patient);
  const conflicts = Object.entries(merged).filter(([, m]) => m.conflict).map(([k]) => k);

  return {
    patient_id: patient.id,
    trace: {
      step1_weight: {
        label: 'Selección de peso',
        data: {
          peso_actual: patient.weight_kg,
          peso_pregestacional: patient.weight_pregest_kg ?? '—',
          talla_cm: patient.height_cm,
          edad_anios: ageY,
          imc_actual: round(imcActual, 2),
          imc_saludable_referencia: imcSal,
          peso_saludable: round(pesoSal, 2),
          comparacion: imcActual > imcSal
            ? `${round(imcActual, 2)} > ${imcSal} → usar peso saludable`
            : `${round(imcActual, 2)} ≤ ${imcSal} → usar peso actual`,
          peso_usado: round(vct.weightUsed, 2),
          fuente_peso: vct.weightSource,
        },
      },
      step2_tmb: {
        label: 'Tasa Metabólica Basal (FAO/OMS 2004)',
        data: {
          sexo: patient.sex,
          grupo_edad: ageY < 30 ? '18-29' : ageY < 60 ? '30-59' : '≥60',
          formula: formulaText(patient.sex, ageY),
          peso_usado: round(vct.weightUsed, 2),
          tmb: round(vct.tmb, 2),
        },
      },
      step3_naf: {
        label: 'Nivel de Actividad Física',
        data: {
          area_residencia: patient.residence_area,
          estilo_vida: patient.lifestyle,
          naf,
        },
      },
      step4_get: {
        label: 'Gasto Energético Total',
        data: {
          formula: ageY >= 18 ? 'GET = TMB × NAF' : 'GET = fórmula directa (niños)',
          tmb: round(vct.tmb, 2),
          naf,
          get: round(vct.get, 2),
        },
      },
      step5_addition: {
        label: 'Adición fisiológica y crecimiento',
        data: {
          estado_fisiologico: patient.physiological_state,
          adicion_kcal: vct.adicion,
          encdt_kcal: vct.encdt,
        },
      },
      step6_vct: {
        label: 'Valor Calórico Total',
        data: {
          formula: 'VCT = GET + ENCDT + adición',
          get: round(vct.get, 2),
          encdt: vct.encdt,
          adicion: vct.adicion,
          vct: round(vct.vct, 2),
        },
      },
      step7_comorbidities: {
        label: 'Comorbilidades y overrides aplicados',
        data: {
          explicitas: patient.comorbidities ?? [],
          auto_derivadas: extras,
          todas: comorbidities,
          conflictos: conflicts,
        },
      },
    },
    sources: {
      energia: 'FAO/WHO/UNU Expert Consultation 2004 · CENAN/INS Perú',
      dris: 'IOM/NASEM Dietary Reference Intakes',
      overrides: 'KDOQI 2020, ADA 2024, AHA 2021, DASH, WHO 2017',
    },
  };
}
