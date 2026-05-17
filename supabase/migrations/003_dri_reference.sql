-- Sprint 2 — Task 2.1: DRI reference table (IOM/NASEM)
-- Run in Supabase SQL editor after 002_patient_anthropometry.sql

CREATE TABLE IF NOT EXISTS dri_reference (
  id serial PRIMARY KEY,
  sex text NOT NULL CHECK (sex IN ('M', 'F')),
  age_min_months integer NOT NULL,
  age_max_months integer,
  physiological_state text NOT NULL
    CHECK (physiological_state IN ('standard', 'pregnancy', 'lactation')),
  nutrient_key text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('RDA', 'AI', 'UL', 'EAR')),
  value numeric NOT NULL,
  source text NOT NULL DEFAULT 'IOM_DRI'
);

-- Natural key — makes the seed idempotent (ON CONFLICT DO UPDATE)
CREATE UNIQUE INDEX IF NOT EXISTS dri_unique_idx
  ON dri_reference (sex, age_min_months, physiological_state, nutrient_key, value_type);

-- Lookup index — the app resolves DRIs on every plan view
CREATE INDEX IF NOT EXISTS dri_lookup_idx
  ON dri_reference (sex, physiological_state, age_min_months, age_max_months);

ALTER TABLE dri_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dri_select" ON dri_reference;
CREATE POLICY "dri_select" ON dri_reference
  FOR SELECT TO authenticated USING (true);
