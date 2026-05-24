-- Migration 012: factores de conversión cocido → crudo (TAFERA 2016, sección II)
-- Permite calcular peso crudo equivalente cuando el nutricionista registra
-- el peso del alimento ya cocido. Fórmula: peso_crudo = peso_cocido × factor

create table if not exists food_cooking_factors (
  id              uuid primary key default gen_random_uuid(),
  food_id         integer references foods(id) on delete cascade,
  food_name_raw   text not null,
  group_name      text not null,
  cooking_method  text not null,
  factor          numeric(4,2) not null check (factor > 0),
  from_1985       boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),

  constraint uniq_food_method unique (food_id, cooking_method)
);

create index if not exists idx_fcf_food on food_cooking_factors (food_id);
create index if not exists idx_fcf_name_raw on food_cooking_factors (lower(food_name_raw));

-- Linkage column on meal_plan_items: when set, signals that the registered grams
-- are COOKED weight and the factor must be applied to compute nutrient totals.
alter table meal_plan_items
  add column if not exists cooking_factor_id uuid references food_cooking_factors(id) on delete set null;

-- Public read (no RLS needed — reference data, same as foods/dri_reference)
alter table food_cooking_factors enable row level security;
create policy "fcf_public_read" on food_cooking_factors for select using (true);
