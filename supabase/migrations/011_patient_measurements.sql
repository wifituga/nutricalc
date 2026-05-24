-- Migration 011: histórico antropométrico
-- Tabla para registrar mediciones puntuales del paciente a lo largo del tiempo.
-- Cada fila es un snapshot de peso/talla/etc., con la fecha en que se tomó.

create table if not exists patient_measurements (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  measured_at     date not null default current_date,
  height_cm       numeric(5,1),
  weight_kg       numeric(5,2),
  waist_cm        numeric(5,1),
  hip_cm          numeric(5,1),
  body_fat_pct    numeric(4,1),
  notes           text,
  created_by_id   uuid references nutritionists(id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint at_least_one_metric check (
    height_cm is not null or weight_kg is not null or
    waist_cm is not null or hip_cm is not null or body_fat_pct is not null
  )
);

create index if not exists idx_pm_patient_date
  on patient_measurements (patient_id, measured_at desc);

alter table patient_measurements enable row level security;

-- Same RLS as patients: nutritionists see only measurements of patients in their clinic
create policy "pm_select_own_clinic"
  on patient_measurements for select
  using (
    patient_id in (
      select id from patients
      where clinic_id in (
        select clinic_id from nutritionists where id = auth.uid()
      )
    )
  );

create policy "pm_insert_own_clinic"
  on patient_measurements for insert
  with check (
    patient_id in (
      select id from patients
      where clinic_id in (
        select clinic_id from nutritionists where id = auth.uid()
      )
    )
  );

create policy "pm_update_own_clinic"
  on patient_measurements for update
  using (
    patient_id in (
      select id from patients
      where clinic_id in (
        select clinic_id from nutritionists where id = auth.uid()
      )
    )
  );

create policy "pm_delete_own_clinic"
  on patient_measurements for delete
  using (
    patient_id in (
      select id from patients
      where clinic_id in (
        select clinic_id from nutritionists where id = auth.uid()
      )
    )
  );
