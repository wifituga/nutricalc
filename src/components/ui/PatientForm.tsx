'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ClinicalProfile, Patient } from '@/lib/types';

const PROFILES: { value: ClinicalProfile; label: string }[] = [
  { value: 'adulto_sano', label: 'Adulto sano' },
  { value: 'renal_predialisis', label: 'Renal pre-diálisis' },
  { value: 'renal_dialisis', label: 'Renal en diálisis' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hipertension', label: 'Hipertensión' },
  { value: 'custom', label: 'Personalizado' },
];

interface Props {
  patient?: Patient;
}

export default function PatientForm({ patient }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const form = e.currentTarget;
    const fd = new FormData(form);

    const body: Record<string, unknown> = {
      full_name: fd.get('full_name'),
      document_id: fd.get('document_id') || null,
      birth_date: fd.get('birth_date') || null,
      sex: fd.get('sex') || null,
      height_cm: fd.get('height_cm') ? Number(fd.get('height_cm')) : null,
      weight_kg: fd.get('weight_kg') ? Number(fd.get('weight_kg')) : null,
      clinical_profile: fd.get('clinical_profile'),
      notes: fd.get('notes') || null,
    };

    const url = patient ? `/api/patients/${patient.id}` : '/api/patients';
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre completo *" name="full_name" required defaultValue={patient?.full_name} />
      <Field label="DNI" name="document_id" defaultValue={patient?.document_id ?? ''} />
      <Field label="Fecha de nacimiento" name="birth_date" type="date" defaultValue={patient?.birth_date ?? ''} />

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Sexo</label>
        <select
          name="sex"
          defaultValue={patient?.sex ?? ''}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
        >
          <option value="">— No especificado —</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Talla (cm)" name="height_cm" type="number" defaultValue={patient?.height_cm?.toString() ?? ''} />
        <Field label="Peso (kg)" name="weight_kg" type="number" step="0.1" defaultValue={patient?.weight_kg?.toString() ?? ''} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Perfil clínico *</label>
        <select
          name="clinical_profile"
          defaultValue={patient?.clinical_profile ?? 'adulto_sano'}
          required
          className="w-full px-3 py-2 rounded border text-sm"
          style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
        >
          {PROFILES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Notas clínicas</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={patient?.notes ?? ''}
          className="w-full px-3 py-2 rounded border text-sm resize-none"
          style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
        />
      </div>

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

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        className="w-full px-3 py-2 rounded border text-sm focus:outline-none"
        style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
      />
    </div>
  );
}
