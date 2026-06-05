'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Check } from 'lucide-react';
import type { Patient, PhysiologicalState } from '@/lib/types';
import { SELECTABLE_COMORBIDITIES } from '@/lib/calculations/clinicalOverrides';
import { ageInYears } from '@/lib/calculations/age';
import { imcSaludable, pesoSaludable, classifyIMC, selectWeightForCalculation } from '@/lib/calculations/healthyWeight';
import { quickVCT, fmtNum } from '@/lib/patientDisplay';
import { Alert } from './primitives';
import {
  FormRow, Field, RadioPill, CheckboxRow, NumberInput, inputClass, btnPrimary, btnSecondary,
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

/* ---------- Sección numerada ---------- */
function Section({ n, title, tag, children }: { n: number; title: string; tag?: string; children: ReactNode }) {
  return (
    <section className="rounded-[10px] border" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}>
      <header className="flex items-center gap-3 border-b" style={{ borderColor: 'var(--rule)', padding: '13px 18px' }}>
        <span className="grid place-items-center mono font-semibold text-white shrink-0" style={{ width: 22, height: 22, borderRadius: 'var(--r-sm)', background: 'var(--accent)', fontSize: 12 }}>{n}</span>
        <span className="font-semibold" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</span>
        {tag && <span className="ml-auto text-[11px]" style={{ color: 'var(--ink-faint)' }}>{tag}</span>}
      </header>
      <div className="space-y-3.5 p-5">{children}</div>
    </section>
  );
}

/* ---------- Chip toggle ---------- */
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="inline-flex items-center gap-2 rounded-full border transition-colors"
      style={{
        fontSize: 13,
        fontWeight: on ? 600 : 500,
        padding: '7px 13px 7px 11px',
        background: on ? 'var(--accent-soft)' : 'var(--surface)',
        borderColor: on ? '#dcc6ad' : 'var(--rule-strong)',
        color: on ? 'var(--accent-deep)' : 'var(--ink-soft)',
      }}
    >
      <span className="grid place-items-center" style={{ width: 15, height: 15, borderRadius: 4, border: on ? 'none' : '1.5px solid var(--rule-strong)', background: on ? 'var(--accent)' : 'transparent', color: '#fff' }}>
        {on && <Check size={10} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

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
  const minBirth = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate()).toISOString().split('T')[0];

  // ---- Cálculos en vivo ----
  const refWeight = isPregnancy && data.weight_pregest_kg ? data.weight_pregest_kg : data.weight_kg;
  const heightM = data.height_cm ? data.height_cm / 100 : null;
  const imc = heightM && refWeight ? refWeight / (heightM * heightM) : null;
  const cat = imc != null && ageY != null ? classifyIMC(imc, ageY) : null;
  const pesoSal = heightM && ageY != null ? pesoSaludable(heightM, ageY) : null;
  const weightUsed = heightM && refWeight && ageY != null
    ? selectWeightForCalculation(data.weight_kg ?? refWeight, heightM, ageY, isPregnancy ? data.weight_pregest_kg : undefined)
    : null;
  const vct = quickVCT({
    birth_date: data.birth_date ?? null,
    sex: data.sex ?? null,
    height_cm: data.height_cm ?? null,
    weight_kg: data.weight_kg ?? null,
    weight_pregest_kg: data.weight_pregest_kg ?? null,
    residence_area: data.residence_area ?? null,
    lifestyle: data.lifestyle ?? null,
    physiological_state: data.physiological_state ?? null,
  });

  const checklist: { label: string; state: 'ok' | 'pend' | 'err' }[] = [
    { label: 'Nombre completo', state: data.full_name?.trim() ? 'ok' : 'pend' },
    { label: 'Sexo', state: data.sex ? 'ok' : 'err' },
    { label: 'Fecha de nacimiento', state: data.birth_date ? 'ok' : 'err' },
    { label: 'Talla', state: data.height_cm ? 'ok' : 'pend' },
    { label: 'Peso', state: data.weight_kg ? 'ok' : 'pend' },
    { label: 'Área de residencia', state: data.residence_area ? 'ok' : 'pend' },
    { label: 'Nivel de actividad', state: data.lifestyle ? 'ok' : 'pend' },
  ];
  const pending = checklist.filter((c) => c.state !== 'ok').length;

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
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

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

  const inputStyle = { background: 'var(--surface)', borderColor: 'var(--rule)', color: 'var(--ink)' };

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      {/* ===== Columna de secciones ===== */}
      <div className="space-y-4 pb-24 lg:pb-0">
        <Section n={1} title="Identificación">
          <Field label="Nombre completo" required>
            <input type="text" required value={data.full_name ?? ''} onChange={(e) => set({ full_name: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <FormRow cols={2}>
            <Field label="DNI">
              <input type="text" maxLength={8} value={data.document_id ?? ''} onChange={(e) => set({ document_id: e.target.value })} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Fecha de nacimiento" required hint="dd/mm/aaaa">
              <input type="date" required value={data.birth_date ?? ''} min={minBirth} max={todayStr} onChange={(e) => set({ birth_date: e.target.value })} className={inputClass} style={inputStyle} />
            </Field>
          </FormRow>
          <Field label="Sexo" required>
            <div className="flex gap-2">
              <RadioPill checked={data.sex === 'F'} onClick={() => set({ sex: 'F' })} label="Femenino" />
              <RadioPill checked={data.sex === 'M'} onClick={() => set({ sex: 'M' })} label="Masculino" />
            </div>
            {!data.sex && <p className="text-xs mt-1" style={{ color: 'var(--c-def)' }}>El sexo es obligatorio para cálculos clínicos.</p>}
          </Field>
          {isInfant && (
            <Alert variant="conflict" title="Protocolo pediátrico no soportado">
              NutriCalc no soporta protocolo pediátrico para lactantes (menores de 12 meses). Para este grupo, consultar guías específicas de alimentación complementaria CENAN-MINSA. El guardado está deshabilitado.
            </Alert>
          )}
        </Section>

        <Section n={2} title="Antropometría" tag="cálculo en vivo →">
          <FormRow cols={2}>
            <Field label="Talla" suffix="cm">
              <NumberInput value={data.height_cm} onChange={(v) => set({ height_cm: v })} min={30} max={250} step={1} />
            </Field>
            <Field label="Peso actual" suffix="kg">
              <NumberInput value={data.weight_kg} onChange={(v) => set({ weight_kg: v })} min={2} max={300} step={0.1} />
            </Field>
          </FormRow>
          <Field label="Estado fisiológico">
            <select value={data.physiological_state ?? 'standard'} onChange={(e) => set({ physiological_state: e.target.value as PhysiologicalState })} className={inputClass} style={inputStyle}>
              {PHYSIO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          {isPregnancy && (
            <Field label="Peso pregestacional" suffix="kg" required hint="Se usa en cálculos en lugar del peso actual">
              <NumberInput value={data.weight_pregest_kg} onChange={(v) => set({ weight_pregest_kg: v })} min={2} max={300} step={0.1} />
            </Field>
          )}
        </Section>

        <Section n={3} title="Actividad física">
          <FormRow cols={2}>
            <Field label="Área de residencia">
              <div className="flex gap-2">
                <RadioPill checked={data.residence_area === 'urbana'} onClick={() => set({ residence_area: 'urbana' })} label="Urbana" />
                <RadioPill checked={data.residence_area === 'rural'} onClick={() => set({ residence_area: 'rural' })} label="Rural" />
              </div>
            </Field>
            <Field label="Nivel de actividad">
              <select value={data.lifestyle ?? ''} onChange={(e) => set({ lifestyle: (e.target.value || undefined) as Data['lifestyle'] })} className={inputClass} style={inputStyle}>
                <option value="">Seleccionar...</option>
                <option value="ligero">Ligero (sedentario / oficina)</option>
                <option value="no_ligero">No ligero (trabajo físico / activo)</option>
              </select>
            </Field>
          </FormRow>
          <CheckboxRow checked={data.is_athlete ?? false} onChange={(c) => set({ is_athlete: c })} label="Deportista / actividad física intensa" />
          {data.is_athlete && (
            <Field label="Factor proteico" suffix="g/kg peso saludable" hint="Deportistas: 1.2 a 2.0 g/kg. Por defecto se aplica 1.4 si lo dejas en blanco.">
              <NumberInput value={data.protein_factor_override} onChange={(v) => set({ protein_factor_override: v })} min={0.6} max={3.0} step={0.1} placeholder="1.4" />
            </Field>
          )}
        </Section>

        <Section n={4} title="Perfil clínico" tag="multi-selección">
          <div className="flex flex-wrap gap-2">
            {SELECTABLE_COMORBIDITIES.map((opt) => (
              <Chip key={opt.code} on={data.comorbidities?.includes(opt.code) ?? false} onClick={() => toggleComorbidity(opt.code)}>
                {opt.label}
              </Chip>
            ))}
          </div>
          {ageY != null && ageY >= 60 && (
            <Alert variant="info" title="Adulto mayor detectado automáticamente (≥60 años)">
              Se aplicarán overrides clínicos: proteína 1.2 g/kg, calcio ≥1200 mg, vitamina D ≥20 µg, IMC saludable de referencia 25.5.
            </Alert>
          )}
        </Section>

        <Section n={5} title="Notas clínicas" tag="opcional">
          <textarea
            value={data.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value })}
            className={inputClass + ' min-h-[100px] resize-none'}
            style={inputStyle}
            placeholder="Información adicional, alergias, observaciones..."
          />
        </Section>

        {error && <p className="text-sm" style={{ color: 'var(--c-def)' }}>{error}</p>}

        <div className="hidden lg:flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => router.back()} className={btnSecondary} style={{ background: 'var(--surface)', borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || isInfant} className={btnPrimary + ' disabled:opacity-50'} style={{ background: 'var(--accent)', color: 'var(--paper)' }}>
            {saving ? 'Guardando...' : patient ? 'Guardar cambios' : 'Crear paciente'}
          </button>
        </div>
      </div>

      {/* ===== Panel en vivo (desktop sticky) ===== */}
      <aside className="hidden lg:block sticky top-2 space-y-3">
        <div>
          <h3 className="font-display font-semibold" style={{ fontSize: 17, color: 'var(--ink)' }}>Vista en vivo</h3>
          <p className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Se recalcula mientras escribes</p>
        </div>

        {/* IMC */}
        <div className="rounded-[10px] border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}>
          {imc != null && cat ? (
            <>
              <div className="flex items-center gap-3">
                <div className="grid place-items-center shrink-0 rounded-full" style={{ width: 56, height: 56, background: `var(--c-${cat.color === 'ok' ? 'ok' : cat.color === 'warn' ? 'low' : 'def'}-bg)` }}>
                  <div className="grid place-items-center rounded-full mono font-semibold" style={{ width: 42, height: 42, background: 'var(--surface)', fontSize: 14, color: `var(--${cat.color})` }}>
                    {imc.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase" style={{ letterSpacing: '.08em', color: 'var(--ink-faint)' }}>{isPregnancy ? 'IMC pregest.' : 'IMC actual'}</div>
                  <div className="font-semibold text-[13px] capitalize" style={{ color: `var(--${cat.color})` }}>{cat.label}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>OMS {cat.range}</div>
                </div>
              </div>
              <LiveRow k="Peso saludable" v={pesoSal != null ? `${pesoSal.toFixed(1)} kg` : '—'} />
              <LiveRow k="Peso en cálculo" v={weightUsed ? `${weightUsed.weight.toFixed(1)} kg` : '—'} faint />
            </>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>Ingresa talla, peso y fecha de nacimiento para ver IMC.</p>
          )}
        </div>

        {/* VCT */}
        <div className="rounded-[10px] border p-4 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}>
          <div className="mono font-semibold leading-none" style={{ fontSize: 28, color: 'var(--accent-deep)' }}>{vct != null ? fmtNum(vct) : '—'}</div>
          <div className="text-[10px] uppercase mt-1.5" style={{ letterSpacing: '.1em', color: 'var(--ink-faint)' }}>VCT estimado · kcal/día</div>
        </div>

        {/* Checklist */}
        <div className="rounded-[10px] border p-3.5" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}>
          <div className="font-semibold text-[12px] mb-1.5" style={{ color: 'var(--ink)' }}>Para guardar</div>
          {checklist.map((c) => (
            <div key={c.label} className="flex items-center gap-2.5 py-1 text-[12.5px]" style={{ color: c.state === 'ok' ? 'var(--ink-soft)' : c.state === 'err' ? 'var(--c-def)' : 'var(--ink-faint)', fontWeight: c.state === 'err' ? 600 : 400 }}>
              <span className="grid place-items-center shrink-0 rounded-full" style={{ width: 17, height: 17, background: c.state === 'ok' ? 'var(--c-ok)' : c.state === 'err' ? 'var(--c-def)' : 'var(--surface-sunk)', border: c.state === 'pend' ? '1.5px solid var(--rule-strong)' : 'none', color: '#fff' }}>
                {c.state === 'ok' && <Check size={10} strokeWidth={3} />}
                {c.state === 'err' && <span className="text-[10px] font-bold leading-none">!</span>}
              </span>
              {c.label}
            </div>
          ))}
        </div>
      </aside>

      {/* ===== Barra inferior móvil ===== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 border-t px-4 py-2.5" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: '0 -4px 14px rgba(46,36,22,.08)' }}>
        <div className="flex-1 min-w-0">
          <div className="mono font-semibold" style={{ fontSize: 15, color: 'var(--accent-deep)' }}>
            VCT {vct != null ? `≈ ${fmtNum(vct)}` : '—'} <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>kcal</span>
          </div>
          <div className="text-[10.5px]" style={{ color: 'var(--ink-soft)' }}>
            {imc != null ? `IMC ${imc.toFixed(1)} · ` : ''}{pending === 0 ? 'datos completos' : `falta${pending === 1 ? '' : 'n'} ${pending} campo${pending === 1 ? '' : 's'}`}
          </div>
        </div>
        <button type="submit" disabled={saving || isInfant} className={btnPrimary + ' disabled:opacity-50'} style={{ background: 'var(--accent)', color: 'var(--paper)' }}>
          {saving ? 'Guardando...' : patient ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}

function LiveRow({ k, v, faint }: { k: string; v: string; faint?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-t mt-2 first:mt-3" style={{ borderColor: 'var(--rule)' }}>
      <span className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>{k}</span>
      <span className="mono font-semibold text-[13px]" style={{ color: faint ? 'var(--ink-faint)' : 'var(--ink)' }}>{v}</span>
    </div>
  );
}
