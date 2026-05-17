// Branded numeric types to prevent unit confusion in clinical calculations
export type Mg = number & { __brand: 'mg' };
export type G = number & { __brand: 'g' };
export type Kcal = number & { __brand: 'kcal' };
export type Ug = number & { __brand: 'ug' };
export type Kj = number & { __brand: 'kj' };

export type MealSlot = 'desayuno' | 'media_manana' | 'almuerzo' | 'media_tarde' | 'cena';
export type ClinicalProfile =
  | 'adulto_sano'
  | 'renal_predialisis'
  | 'renal_dialisis'
  | 'diabetes'
  | 'hipertension'
  | 'custom';

export type AlertLevel = 'ok' | 'warn' | 'alert' | 'neutral';
export type NutrientLimit = { max?: number; min?: number; label: string; unit: string };
export type ProfileLimits = Record<string, NutrientLimit>;

// Nutritional data per 100 g edible portion (TPCA convention)
export interface FoodNutrients {
  energia_kcal: number | null;
  energia_kj: number | null;
  agua_g: number | null;
  proteinas_g: number | null;
  grasa_g: number | null;
  carbohidratos_totales_g: number | null;
  carbohidratos_disponibles_g: number | null;
  fibra_g: number | null;
  cenizas_g: number | null;
  calcio_mg: number | null;
  fosforo_mg: number | null;
  zinc_mg: number | null;
  hierro_mg: number | null;
  sodio_mg: number | null;
  potasio_mg: number | null;
  beta_caroteno_ug: number | null;
  vitamina_a_ug: number | null;
  tiamina_mg: number | null;
  riboflavina_mg: number | null;
  niacina_mg: number | null;
  vitamina_c_mg: number | null;
  acido_folico_ug: number | null;
}

export interface Food {
  id: number;
  code: string;
  group_letter: string;
  group_name: string;
  name: string;
  per_100g: FoodNutrients;
  source: string;
  is_preparation: boolean;
  active: boolean;
}

export interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Nutritionist {
  id: string;
  email: string;
  full_name: string;
  professional_license: string | null;
  clinic_id: string;
  role: 'admin' | 'nutritionist';
  created_at: string;
}

export type PhysiologicalState =
  | 'standard'
  | 'pregnancy_t1' | 'pregnancy_t2' | 'pregnancy_t3'
  | 'lactation_0_6m' | 'lactation_6_12m';

export interface Patient {
  id: string;
  clinic_id: string;
  assigned_nutritionist_id: string | null;
  full_name: string;
  document_id: string | null;
  birth_date: string | null;
  sex: 'M' | 'F' | null;
  height_cm: number | null;
  weight_kg: number | null;
  weight_pregest_kg: number | null;
  physiological_state: PhysiologicalState;
  residence_area: 'urbana' | 'rural' | null;
  lifestyle: 'ligero' | 'no_ligero' | null;
  is_athlete: boolean;
  protein_factor_override: number | null;
  comorbidities: string[];
  custom_limits: ProfileLimits | null;
  macro_distribution_override: Record<string, number> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  patient_id: string;
  created_by_id: string;
  plan_date: string;
  name: string;
  notes: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  food_id: number;
  meal: MealSlot;
  grams: number;
  position: number;
  notes: string | null;
  food?: Food;
}

export interface NutrientProfile {
  id: string;
  name: string;
  limits: ProfileLimits;
  is_system: boolean;
  clinic_id: string | null;
  created_at: string;
}

export type NutrientTotals = Partial<FoodNutrients>;
