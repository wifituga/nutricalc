-- Sprint 3 — Task 3.8: Snapshot of resolved targets at plan creation time
-- Run in Supabase SQL editor after 004_comorbidities.sql

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS patient_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS calculated_tmb numeric,
  ADD COLUMN IF NOT EXISTS calculated_get numeric,
  ADD COLUMN IF NOT EXISTS calculated_encdt numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculated_vct numeric,
  ADD COLUMN IF NOT EXISTS target_macros jsonb,
  ADD COLUMN IF NOT EXISTS target_micros jsonb,
  ADD COLUMN IF NOT EXISTS override_sources jsonb;
