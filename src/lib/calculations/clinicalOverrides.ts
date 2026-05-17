import overrides from '@data/clinical_overrides.json';

export type ComorbidityCode =
  | 'renal_predialysis' | 'renal_hemodialysis'
  | 'diabetes_t1' | 'diabetes_t2' | 'diabetes_gestational'
  | 'hypertension' | 'iron_deficiency_anemia' | 'dyslipidemia'
  | 'custom'
  | 'older_adult' | 'athlete';

export type OverrideSpec = {
  min?: number;
  max?: number;
  default?: number;
  label?: string;
  note?: string;
};

export type ComorbidityDef = {
  label: string;
  source: string;
  auto_apply_when?: string;
  overrides: Record<string, OverrideSpec | number>;
};

export type ClinicalOverridesData = {
  meta: Record<string, string>;
  comorbidities: Record<string, ComorbidityDef>;
  merge_rules: unknown;
};

export const CLINICAL_OVERRIDES = overrides as unknown as ClinicalOverridesData;

export const COMORBIDITY_LABELS: Record<string, string> = {
  renal_predialysis:      'Renal pre-diálisis',
  renal_hemodialysis:     'Renal hemodiálisis',
  diabetes_t1:            'Diabetes tipo 1',
  diabetes_t2:            'Diabetes tipo 2',
  diabetes_gestational:   'Diabetes gestacional',
  hypertension:           'Hipertensión',
  iron_deficiency_anemia: 'Anemia ferropénica',
  dyslipidemia:           'Dislipidemia',
  custom:                 'Personalizado',
  older_adult:            'Adulto mayor (auto)',
  athlete:                'Deportista (auto)',
};

// Comorbidities the nutritionist explicitly checks (older_adult/athlete are derived)
export const SELECTABLE_COMORBIDITIES: { code: ComorbidityCode; label: string }[] = [
  { code: 'renal_predialysis',      label: 'Renal pre-diálisis (ERC 3-5 sin diálisis)' },
  { code: 'renal_hemodialysis',     label: 'Renal en hemodiálisis' },
  { code: 'diabetes_t1',            label: 'Diabetes tipo 1' },
  { code: 'diabetes_t2',            label: 'Diabetes tipo 2' },
  { code: 'diabetes_gestational',   label: 'Diabetes gestacional' },
  { code: 'hypertension',           label: 'Hipertensión arterial' },
  { code: 'iron_deficiency_anemia', label: 'Anemia ferropénica' },
  { code: 'dyslipidemia',           label: 'Dislipidemia / Hipercolesterolemia' },
  { code: 'custom',                 label: 'Personalizado (overrides manuales)' },
];
