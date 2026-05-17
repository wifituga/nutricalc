-- Sprint 5 — Task 5.1: Household measures (TAFERA 2016, high-confidence only)
-- Run in Supabase SQL editor after 006_physiological_state.sql

CREATE TABLE IF NOT EXISTS household_measures (
  id serial PRIMARY KEY,
  food_id integer NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  measure_name text NOT NULL,
  grams numeric NOT NULL CHECK (grams > 0),
  tafera_code text,
  match_confidence text CHECK (match_confidence IN ('high', 'medium', 'manual')),
  edible_pct numeric,
  notes text,
  source text NOT NULL DEFAULT 'TAFERA_2016',
  active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS household_measures_food_idx
  ON household_measures(food_id) WHERE active = true;

-- Idempotent seed key
CREATE UNIQUE INDEX IF NOT EXISTS household_measures_unique_idx
  ON household_measures(food_id, measure_name, tafera_code);

ALTER TABLE meal_plan_items
  ADD COLUMN IF NOT EXISTS household_measure_id integer REFERENCES household_measures(id),
  ADD COLUMN IF NOT EXISTS household_measure_qty numeric;

ALTER TABLE household_measures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "household_measures_select" ON household_measures;
CREATE POLICY "household_measures_select" ON household_measures
  FOR SELECT TO authenticated USING (active = true);
