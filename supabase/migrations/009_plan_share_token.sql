-- Fase 3.1: shareable patient-facing plan link
-- Run in Supabase SQL editor after 008_search_unaccent.sql

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

UPDATE meal_plans
SET share_token = encode(gen_random_bytes(16), 'hex')
WHERE share_token IS NULL;

ALTER TABLE meal_plans
  ALTER COLUMN share_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
