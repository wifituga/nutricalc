-- Fase 1.1: accent-insensitive food search
-- Run in Supabase SQL editor after 007_household_measures.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.unaccent_immutable(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$;

DROP INDEX IF EXISTS foods_search_idx;

CREATE INDEX foods_search_idx ON foods
USING gin(to_tsvector('spanish', unaccent_immutable(name)));

CREATE OR REPLACE FUNCTION search_foods(
  search_query text,
  group_filter text DEFAULT NULL,
  result_limit int DEFAULT 20
)
RETURNS SETOF foods
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF search_query IS NULL OR length(trim(search_query)) = 0 THEN
    RETURN QUERY
      SELECT * FROM foods
      WHERE active = true
        AND (group_filter IS NULL OR group_letter = group_filter)
      ORDER BY group_letter, length(code), code
      LIMIT result_limit;
  ELSE
    RETURN QUERY
      SELECT f.* FROM foods f
      WHERE f.active = true
        AND (group_filter IS NULL OR f.group_letter = group_filter)
        AND to_tsvector('spanish', unaccent_immutable(f.name))
            @@ plainto_tsquery('spanish', unaccent_immutable(search_query))
      ORDER BY ts_rank(
        to_tsvector('spanish', unaccent_immutable(f.name)),
        plainto_tsquery('spanish', unaccent_immutable(search_query))
      ) DESC, length(f.code), f.code
      LIMIT result_limit;
  END IF;
END;
$$;

COMMIT;
