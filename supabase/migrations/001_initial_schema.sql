-- NutriCalc initial schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clinics
CREATE TABLE clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Nutritionists (linked to Supabase auth.users)
CREATE TABLE nutritionists (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  professional_license text,
  clinic_id uuid REFERENCES clinics(id),
  role text CHECK (role IN ('admin', 'nutritionist')) DEFAULT 'nutritionist',
  created_at timestamptz DEFAULT now()
);

-- Nutrient profiles (system + clinic-custom)
CREATE TABLE nutrient_profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}',
  is_system boolean DEFAULT false,
  clinic_id uuid REFERENCES clinics(id),
  created_at timestamptz DEFAULT now()
);

-- Foods (TPCA 2023 + custom clinic foods)
CREATE TABLE foods (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  group_letter text NOT NULL,
  group_name text NOT NULL,
  name text NOT NULL,
  per_100g jsonb NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'TPCA_2023',
  is_preparation boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX foods_search_idx ON foods USING gin(to_tsvector('spanish', name));
CREATE INDEX foods_group_idx ON foods(group_letter);
CREATE INDEX foods_code_idx ON foods(code);

-- Patients
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  assigned_nutritionist_id uuid REFERENCES nutritionists(id),
  full_name text NOT NULL,
  document_id text,
  birth_date date,
  sex text CHECK (sex IN ('M', 'F', 'other')),
  height_cm numeric,
  weight_kg numeric,
  clinical_profile text NOT NULL DEFAULT 'adulto_sano',
  custom_limits jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX patients_clinic_idx ON patients(clinic_id);
CREATE INDEX patients_nutritionist_idx ON patients(assigned_nutritionist_id);

-- Meal plans
CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES nutritionists(id),
  plan_date date NOT NULL,
  name text NOT NULL,
  notes text,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX meal_plans_patient_idx ON meal_plans(patient_id);
CREATE INDEX meal_plans_date_idx ON meal_plans(plan_date);

-- Meal plan items
CREATE TABLE meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  food_id integer NOT NULL REFERENCES foods(id),
  meal text NOT NULL CHECK (meal IN ('desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena')),
  grams numeric NOT NULL CHECK (grams >= 0),
  position integer NOT NULL DEFAULT 0,
  notes text
);

CREATE INDEX meal_plan_items_plan_idx ON meal_plan_items(meal_plan_id);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutritionists ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;

-- Nutritionists: see own row and same clinic
CREATE POLICY "nutritionists_select" ON nutritionists
  FOR SELECT USING (
    id = auth.uid() OR
    clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

CREATE POLICY "nutritionists_update_own" ON nutritionists
  FOR UPDATE USING (id = auth.uid());

-- Clinics: see own clinic
CREATE POLICY "clinics_select" ON clinics
  FOR SELECT USING (
    id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

-- Nutrient profiles: system profiles and own clinic profiles
CREATE POLICY "profiles_select" ON nutrient_profiles
  FOR SELECT USING (
    is_system = true OR
    clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

CREATE POLICY "profiles_insert" ON nutrient_profiles
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

-- Foods: all authenticated users can read
CREATE POLICY "foods_select" ON foods
  FOR SELECT TO authenticated USING (active = true);

-- Patients: own clinic only
CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

CREATE POLICY "patients_delete" ON patients
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
  );

-- Meal plans: via patient clinic
CREATE POLICY "meal_plans_select" ON meal_plans
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
    )
  );

CREATE POLICY "meal_plans_insert" ON meal_plans
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM patients
      WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
    )
  );

CREATE POLICY "meal_plans_update" ON meal_plans
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
    )
  );

CREATE POLICY "meal_plans_delete" ON meal_plans
  FOR DELETE USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
    )
  );

-- Meal plan items: via meal plan
CREATE POLICY "items_select" ON meal_plan_items
  FOR SELECT USING (
    meal_plan_id IN (
      SELECT id FROM meal_plans
      WHERE patient_id IN (
        SELECT id FROM patients
        WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "items_insert" ON meal_plan_items
  FOR INSERT WITH CHECK (
    meal_plan_id IN (
      SELECT id FROM meal_plans
      WHERE patient_id IN (
        SELECT id FROM patients
        WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "items_update" ON meal_plan_items
  FOR UPDATE USING (
    meal_plan_id IN (
      SELECT id FROM meal_plans
      WHERE patient_id IN (
        SELECT id FROM patients
        WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "items_delete" ON meal_plan_items
  FOR DELETE USING (
    meal_plan_id IN (
      SELECT id FROM meal_plans
      WHERE patient_id IN (
        SELECT id FROM patients
        WHERE clinic_id IN (SELECT clinic_id FROM nutritionists WHERE id = auth.uid())
      )
    )
  );
