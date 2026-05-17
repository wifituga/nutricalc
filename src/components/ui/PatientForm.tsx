'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Patient, PhysiologicalState } from '@/lib/types';
import { SELECTABLE_COMORBIDITIES } from '@/lib/calculations/clinicalOverrides';
import { ageInYears } from '@/lib/calculations/age';
import {
  FormCard, FormRow, Field, RadioPill, CheckboxRow, NumberInput,
  InfoCard, LiveAnthropometryBlock, inputClass, btnPrimary, btnSecondary,
} from './form-primitives';

type Data = Partial<{
  full_name: string;
  document_id: string;
  birth_date: string;
  sex: 'M' | 'F';
  height_cm: number;
  weight_kg: number;
  weight_pregest_kg: number;
  physiological_state: PhysiologicalState;
  residence_area: 'urbana' | 'rural';
  lifestyle: 'ligero' | 'no_ligero';
  is_athlete: boolean;
  protein_factor_override: number;
  comorbidities: string[];
  notes: string;
}>;

const PHYSIO_OPTIONS: { value: PhysiologicalState; label: string }[] = [
  { value: 'standard',        label: 'Estándar' },
  { value: 'pregnancy_t1',    label: 'Embarazo — 1er trimestre · +85 kcal' },
  { value: 'pregnancy_t2',    label: 'Embarazo — 2do trimestre · +285 kcal' },
  { value: 'pregnancy_t3',    label: 'Embarazo — 3er trimestre · +475 kcal' },
  { value: 'lactation_0_6m',  label: 'Lactancia 0-6 meses · +500 kcal' },
  { value: 'lactation_6_12m', label: 'Lactancia 6-12 meses · +400 kcal' },
];

export default function PatientForm({ patient }: { patient?: Patient }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Data>({
    full_name: patient?.full_name,
    document_id: patient?.document_id ?? undefined,
    birth_date: patient?.birth_date ?? undefined,
    sex: patient?.sex ?? undefined,
    height_cm: patient?.height_cm ?? undefined,
    weight_kg: patient?.weight_kg ?? undefined,
    weight_pregest_kg: patient?.weight_pregest_kg ?? undefined,
    physiological_state: patient?.physiological_state ?? 'standard',
    residence_area: patient?.residence_area ?? undefined,
    lifestyle: patient?.lifestyle ?? undefined,
    is_athlete: patient?.is_athlete ?? false,
    protein_factor_override: patient?.protein_factor_override ?? undefined,
    comorbidities: patient?.comorbidities ?? [],
    notes: patient?.notes ?? undefined,
  });

  const set = (patch: Data) => setData((d) => ({ ...d, ...patch }));
  const isPregnancy = data.physiological_state?.startsWith('pregnancy') ?? false;
  const ageY = data.birth_date ? ageInYears(new Date(data.birth_date)) : null;
  const isInfant = ageY != null && ageY < 1;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const minBirth = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate())
    .toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const body = {
      full_name: data.full_name,
      document_id: data.document_id || null,
      birth_date: data.birth_date || null,
      sex: data.sex || null,
      height_cm: data.height_cm ?? null,
      weight_kg: data.weight_kg ?? null,
      weight_pregest_kg: data.weight_pregest_kg ?? null,
      physiological_state: data.physiological_state ?? 'standard',
      residence_area: data.residence_area || null,
      lifestyle: data.lifestyle || null,
      is_athlete: data.is_athlete ?? false,
      protein_factor_override: data.protein_factor_override ?? null,
      comorbidities: data.comorbidities ?? [],
      notes: data.notes || null,
    };

    const url = patient ? `/api/patients/${patient.id}` : '/api/patients';
    const method = patient ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Error al guardar');
      setSaving(false);
      return;
    }
    const saved = await res.json();
    router.push(`/patients/${saved.id}`);
    router.refresh();
  }

  function toggleComorbidity(code: string) {
    const cur = data.comorbidities ?? [];
    set({ comorbidities: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <FormCard title="Identificación">
        <Field label="Nombre completo" required>
          <input
            type="text" required value={data.full_name ?? ''}
            onChange={(e) => set({ full_name: e.target.value })}
            className={inputClass}
            style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}
          />
        </Field>
        <FormRow cols={2}>
          <Field label="DNI">
            <input
              type="text" maxLength={8} value={data.document_id ?? ''}
              onChange={(e) => set({ document_id: e.target.value })}
              className={inputClass}
              style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}
            />
          </Field>
          <Field label="Fecha de nacimiento" required hint="dd/mm/aaaa">
            <input
              type="date" required value={data.birth_date ?? ''}
              min={minBirth} max={todayStr}
              onChange={(e) => set({ birth_date: e.target.value })}
              className={inputClass}
              style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}
            />
          </Field>
        </FormRow>
        <Field label="Sexo" required>
          <div className="flex gap-2">
            <RadioPill checked={data.sex === 'F'} onClick={() => set({ sex: 'F' })} label="Femenino" />
            <RadioPill checked={data.sex === 'M'} onClick={() => set({ sex: 'M' })} label="Masculino" />
          </div>
          {!data.sex && (
            <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
              El sexo es obligatorio para cálculos clínicos.
            </p>
          )}
        </Field>
        {isInfant && (
          <InfoCard variant="warn">
            <strong>Protocolo pediátrico no soportado.</strong>{' '}
            NutriCalc actualmente no soporta protocolo pediátrico para lactantes
            (menores de 12 meses). Para este grupo, consultar guías específicas
            de alimentación complementaria CENAN-MINSA.
          </InfoCard>
        )}
      </FormCard>

      <FormCard title="Antropometría">
        <FormRow cols={2}>
          <Field label="Talla" suffix="cm">
            <NumberInput value={data.height_cm} onChange={(v) => set({ height_cm: v })}
              min={30} max={250} step={1} />
          </Field>
          <Field label="Peso actual" suffix="kg">
            <NumberInput value={data.weight_kg} onChange={(v) => set({ weight_kg: v })}
              min={2} max={300} step={0.1} />
          </Field>
        </FormRow>
        <Field label="Estado fisiológico">
          <select
            value={data.physiological_state ?? 'standard'}
            onChange={(e) => set({ physiological_state: e.target.value as PhysiologicalState })}
            className={inputClass}
            style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            {PHYSIO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {isPregnancy && (
          <Field label="Peso pregestacional" suffix="kg" required
            hint="Se usa en cálculos en lugar del peso actual">
            <NumberInput value={data.weight_pregest_kg} onChange={(v) => set({ weight_pregest_kg: v })}
              min={2} max={300} step={0.1} />
          </Field>
        )}
        <LiveAnthropometryBlock
          birthDate={data.birth_date} heightCm={data.height_cm}
          weightKg={data.weight_kg} weightPregestKg={data.weight_pregest_kg}
          isPregnancy={isPregnancy}
        />
      </FormCard>

      <FormCard title="Actividad física">
        <FormRow cols={2}>
          <Field label="Área de residencia">
            <div className="flex gap-2">
              <RadioPill checked={data.residence_area === 'urbana'}
                onClick={() => set({ residence_area: 'urbana' })} label="Urbana" />
              <RadioPill checked={data.residence_area === 'rural'}
                onClick={() => set({ residence_area: 'rural' })} label="Rural" />
            </div>
          </Field>
          <Field label="Nivel de actividad">
            <select
              value={data.lifestyle ?? ''}
              onChange={(e) => set({ lifestyle: (e.target.value || undefined) as Data['lifestyle'] })}
              className={inputClass}
              style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}
            >
              <option value="">Seleccionar...</option>
              <option value="ligero">Ligero (sedentario / oficina)</option>
              <option value="no_ligero">No ligero (trabajo físico / activo)</option>
            </select>
          </Field>
        </FormRow>
        <CheckboxRow checked={data.is_athlete ?? false}
          onChange={(c) => set({ is_athlete: c })}
          label="Deportista / actividad física intensa" />
        {data.is_athlete && (
          <Field label="Factor proteico" suffix="g/kg peso saludable"
            hint="Deportistas: 1.2 a 2.0 g/kg. Por defecto se aplica 1.4 si lo dejas en blanco.">
            <NumberInput value={data.protein_factor_override}
              onChange={(v) => set({ protein_factor_override: v })}
              min={0.6} max={3.0} step={0.1} placeholder="1.4" />
          </Field>
        )}
      </FormCard>

      <FormCard title="Perfil clínico" subtitle="Puede marcar varios">
        <div className="space-y-2">
          {SELECTABLE_COMORBIDITIES.map((opt) => (
            <CheckboxRow
              key={opt.code}
              checked={data.comorbidities?.includes(opt.code) ?? false}
              onChange={() => toggleComorbidity(opt.code)}
              label={opt.label}
            />
          ))}
        </div>
      </FormCard>

      {ageY != null && ageY >= 60 && (
        <InfoCard variant="info">
          <strong>Adulto mayor detectado automáticamente</strong> (≥60 años).
          Se aplicarán overrides clínicos: proteína 1.2 g/kg, calcio ≥1200 mg,
          vitamina D ≥20 µg, IMC saludable de referencia 25.5.
        </InfoCard>
      )}

      <FormCard title="Notas clínicas">
        <textarea
          value={data.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value })}
          className={inputClass + ' min-h-[100px] resize-none'}
          style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}
          placeholder="Información adicional, alergias, observaciones..."
        />
      </FormCard>

      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className={btnSecondary}
          style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || isInfant}
          className={btnPrimary + ' disabled:opacity-50'}
          style={{ background: 'var(--accent)', color: 'var(--paper)' }}
        >
          {saving ? 'Guardando...' : patient ? 'Guardar cambios' : 'Crear paciente'}
        </button>
      </div>
    </form>
  );
}
