-- FIX_BEFORE_REGINA A.3: sex obligatorio
-- Run in Supabase SQL editor after 009_plan_share_token.sql
-- (renumbered from spec's 009 because 009_plan_share_token.sql already exists)

DO $$
DECLARE null_count int;
BEGIN
  SELECT count(*) INTO null_count FROM patients WHERE sex IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'No se puede aplicar NOT NULL: % paciente(s) con sex null. Corregir primero.', null_count;
  END IF;
END $$;

ALTER TABLE patients ALTER COLUMN sex SET NOT NULL;
