-- Sprint 1 — Task 1.1: Add anthropometry + clinical dimensions to patients table
-- Run in Supabase SQL editor after 001_initial_schema.sql

-- Anthropometry
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_pregest_kg numeric;

-- Dimension 1: Physiological state
ALTER TABLE patients ADD COLUMN IF NOT EXISTS physiological_state text
  NOT NULL DEFAULT 'standard'
  CHECK (physiological_state IN (
    'standard',
    'pregnancy_t1', 'pregnancy_t2', 'pregnancy_t3',
    'lactation_0_6m', 'lactation_6_12m'
  ));

-- Dimension 2: Physical activity
ALTER TABLE patients ADD COLUMN IF NOT EXISTS residence_area text
  CHECK (residence_area IN ('urbana', 'rural'));

ALTER TABLE patients ADD COLUMN IF NOT EXISTS lifestyle text
  CHECK (lifestyle IN ('ligero', 'no_ligero'));

ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_athlete boolean DEFAULT false;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS protein_factor_override numeric;

-- Dimension 3: Clinical profile (replaces single clinical_profile string over time)
-- clinical_profile kept for backward compat; comorbidities array is the new approach
ALTER TABLE patients ADD COLUMN IF NOT EXISTS comorbidities text[] DEFAULT '{}';

ALTER TABLE patients ADD COLUMN IF NOT EXISTS macro_distribution_override jsonb;
