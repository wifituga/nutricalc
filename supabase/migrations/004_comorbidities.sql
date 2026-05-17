-- Sprint 3 — Task 3.1: Multiple comorbidities replace single clinical_profile
-- Run in Supabase SQL editor after 003_dri_reference.sql

BEGIN;

-- Columns already exist from migration 002 (idempotent guard)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS comorbidities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_athlete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS protein_factor_override numeric,
  ADD COLUMN IF NOT EXISTS custom_limits jsonb;

CREATE INDEX IF NOT EXISTS patients_comorbidities_idx
  ON patients USING gin(comorbidities);

-- Migrate legacy single-profile data into the comorbidities array
UPDATE patients SET comorbidities = CASE
  WHEN clinical_profile = 'adulto_sano'       THEN '{}'
  WHEN clinical_profile = 'renal_predialisis' THEN ARRAY['renal_predialysis']
  WHEN clinical_profile = 'renal_dialisis'    THEN ARRAY['renal_hemodialysis']
  WHEN clinical_profile = 'diabetes'          THEN ARRAY['diabetes_t2']
  WHEN clinical_profile = 'hipertension'      THEN ARRAY['hypertension']
  WHEN clinical_profile = 'custom'            THEN ARRAY['custom']
  ELSE '{}'
END
WHERE clinical_profile IS NOT NULL
  AND (comorbidities IS NULL OR comorbidities = '{}');

ALTER TABLE patients DROP COLUMN IF EXISTS clinical_profile;

COMMIT;
