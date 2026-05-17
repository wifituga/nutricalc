-- Sprint 4 — Task 4.1: Physiological state + macro distribution
-- Columns already created in migration 002; this is the idempotent guard
-- so the migration sequence stays complete and reproducible.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS physiological_state text NOT NULL DEFAULT 'standard'
    CHECK (physiological_state IN ('standard',
            'pregnancy_t1', 'pregnancy_t2', 'pregnancy_t3',
            'lactation_0_6m', 'lactation_6_12m')),
  ADD COLUMN IF NOT EXISTS weight_pregest_kg numeric,
  ADD COLUMN IF NOT EXISTS macro_distribution_override jsonb;
