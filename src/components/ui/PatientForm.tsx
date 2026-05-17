'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Patient, PhysiologicalState } from '@/lib/types';

const PHYSIO_OPTIONS: { value: PhysiologicalState; label: string }[] = [
  { value: 'standard',         label: 'Estándar' },
  { value: 'pregnancy_t1',     label: 'Embarazo — 1.er trimestre' },
  { value: 'pregnancy_t2',     label: 'Embarazo — 2.º trimestre' },
  { value: 'pregnancy_t3',     label: 'Embarazo — 3.er trimestre' },
  { value: 'lactation_0_6m',   label: 'Lactancia (0-6 meses)' },
  { value: 'lactation_6_12m',  label: 'Lactancia (6-12 meses)' },
];

interface Props {
  patient?: Patient;
}

export default function PatientForm({ patient }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [physState, setPhysState] = useState<PhysiologicalState>(
    patient?.physiological_state ?? 'standard',
  );

  const isPregnancy = physState.startsWith('pregnancy');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const form = e.currentTarget;
    const fd = new FormData(form);

    const body: Record<string, unknown> = {
      full_name:             fd.get('full_name'),
      document_id:           fd.get('document_id') || null,
      birth_date:            fd.get('birth_date') || null,
      sex:                   fd.get('sex') || null,
      height_cm:             fd.get('height_cm') ? Number(fd.get('height_cm')) : null,
      weight_kg:             fd.get('weight_kg') ? Number(fd.get('weight_kg')) : null,
      weight_pregest_kg:     fd.get('weight_pregest_kg') ? Number(fd.get('weight_pregest_kg')) : null,
      physiological_state:   physState,
      residence_area:        fd.get('residence_area') || null,
      lifestyle:             fd.get('lifestyle') || null,
      is_athlete:            fd.get('is_athlete') === 'on',
      clinical_profile:      fd.get('clinical_profile'),
      notes:                 fd.get('notes') || null,
    };

    const url    = patient ? `/api/patients/${patient.id}` : '/api/patients';
    const method = patient ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Error al guardar');
      setSaving(false);
      return;
    }

    const data = await res.json();
    router.push(`/patients/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Identificación ── */}
      <Section title="Identificación">
        <Field label="Nombre completo *" name="full_name" required defaultValue={patient?.full_name} />
        <Field label="DNI" name="document_id" defaultValue={patient?.document_id ?? ''} />
        <Field label="Fecha de nacimiento" name="birth_date" type="date" defaultValue={patient?.birth_date ?? ''} />

        <Select
          label="Sexo"
          name="sex"
          defaultValue={patient?.sex ?? ''}
          options={[
            { value: '', label: '— No especificado —' },
            { value: 'M', label: 'Masculino' },
            { value: 'F', label: 'Femenino' },
          ]}
        />
      </Section>

      {/* ── Antropometría ── */}
      <Section title="Antropometría">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Talla (cm)" name="height_cm" type="number" step="0.1"
            defaultValue={patient?.height_cm?.toString() ?? ''} />
          <Field label="Peso actual (kg)" name="weight_kg" type="number" step="0.1"
            defaultValue={patient?.weight_kg?.toString() ?? ''} />
        </div>

        <Select
          label="Estado fisiológico"
          name="physiological_state"
          value={physState}
          onChange={(v) => setPhysState(v as PhysiologicalState)}
          options={PHYSIO_OPTIONS}
        />

        {isPregnancy && (
          <Field label="Peso pregestacional (kg)" name="weight_pregest_kg" type="number" step="0.1"
            defaultValue={patient?.weight_pregest_kg?.toString() ?? ''}
          />
        )}
      </Section>

      {/* ── Actividad física ── */}
      <Section title="Actividad física">
        <Select
          label="Área de residencia"
          name="residence_area"
          defaultValue={patient?.residence_area ?? ''}
          options={[
            { value: '', label: '— No especificado —' },
            { value: 'urbana', label: 'Urbana' },
            { value: 'rural', label: 'Rural' },
          ]}
        />
        <Select
          label="Nivel de actividad"
          name="lifestyle"
          defaultValue={patient?.lifestyle ?? ''}
          options={[
            { value: '', label: '— No especificado —' },
            { value: 'ligero', label: 'Ligero (sedentario / trabajo de oficina)' },
            { value: 'no_ligero', label: 'No ligero (trabajo físico / activo)' },
          ]}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--ink)' }}>
          <input
            type="checkbox"
            name="is_athlete"
            defaultChecked={patient?.is_athlete ?? false}
            className="rounded"
          />
          Deportista / actividad física intensa
        </label>
      </Section>

      {/* ── Perfil clínico ── */}
      <Section title="Perfil clínico">
        <Select
          label="Perfil base"
          name="clinical_profile"
          defaultValue={patient?.clinical_profile ?? 'adulto_sano'}
          options={[
            { value: 'adulto_sano',       label: 'Adulto sano' },
            { value: 'renal_predialisis', label: 'Renal pre-diálisis' },
            { value: 'renal_dialisis',    label: 'Renal en diálisis' },
            { value: 'diabetes',          label: 'Diabetes' },
            { value: 'hipertension',      label: 'Hipertensión' },
            { value: 'custom',            label: 'Personalizado' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Notas clínicas
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={patient?.notes ?? ''}
            className="w-full px-3 py-2 rounded border text-sm resize-none"
            style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
          />
        </div>
      </Section>

      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--accent)', color: 'var(--paper)' }}
      >
        {saving ? 'Guardando...' : patient ? 'Guardar cambios' : 'Crear paciente'}
      </button>
    </form>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset
      className="rounded-lg border p-4 space-y-3"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
    >
      <legend className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--ink-soft)' }}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label, name, type = 'text', required, defaultValue, step,
}: {
  label: string; name: string; type?: string;
  required?: boolean; defaultValue?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>{label}</label>
      <input
        name={name} type={type} required={required} defaultValue={defaultValue} step={step}
        className="w-full px-3 py-2 rounded border text-sm focus:outline-none"
        style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
      />
    </div>
  );
}

function Select({
  label, name, defaultValue, value, onChange, options,
}: {
  label: string; name: string;
  defaultValue?: string; value?: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const controlled = value !== undefined;
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>{label}</label>
      <select
        name={name}
        {...(controlled
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : { defaultValue }
        )}
        className="w-full px-3 py-2 rounded border text-sm"
        style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
