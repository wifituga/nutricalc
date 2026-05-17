import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import NewPlanButton from '@/components/ui/NewPlanButton';
import DeletePatientButton from '@/components/ui/DeletePatientButton';
import { FormCard } from '@/components/ui/form-primitives';
import { btnSecondary } from '@/components/ui/form-styles';
import { ageInYears } from '@/lib/calculations/age';
import { classifyIMC } from '@/lib/calculations/healthyWeight';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import { COMORBIDITY_LABELS } from '@/lib/calculations/clinicalOverrides';
import RequirementsDetail from '@/components/plan/RequirementsDetail';
import { ClinicalDisclaimer } from '@/components/ui/ClinicalDisclaimer';

const PHYSIO_LABELS: Record<string, string> = {
  pregnancy_t1: 'Embarazo T1', pregnancy_t2: 'Embarazo T2', pregnancy_t3: 'Embarazo T3',
  lactation_0_6m: 'Lactancia 0-6m', lactation_6_12m: 'Lactancia 6-12m',
};
const AREA_LABELS: Record<string, string> = { urbana: 'Urbana', rural: 'Rural' };
const LIFESTYLE_LABELS: Record<string, string> = { ligero: 'Ligero', no_ligero: 'No ligero' };

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: patient }, { data: plans }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase
      .from('meal_plans')
      .select('id, name, plan_date, notes, calculated_vct')
      .eq('patient_id', id)
      .order('plan_date', { ascending: false }),
  ]);

  if (!patient) notFound();

  const age = patient.birth_date ? ageInYears(new Date(patient.birth_date)) : null;
  const { vct, merged, comorbidities } = await resolvePatientTargets(supabase, patient);

  const isOlder = age != null && age >= 60;
  const physioLabel = patient.physiological_state
    ? PHYSIO_LABELS[patient.physiological_state] ?? ''
    : '';
  const imc = patient.height_cm && patient.weight_kg
    ? patient.weight_kg / Math.pow(patient.height_cm / 100, 2)
    : null;
  const conflicts = Object.values(merged).filter((m) => m.conflict);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--rule)' }}>
        <div className="min-w-0 flex-1">
          <Link href="/patients" className="text-xs inline-flex items-center gap-1 mb-2 hover:underline"
            style={{ color: 'var(--ink-soft)' }}>
            <ArrowLeft size={12} /> Volver a pacientes
          </Link>
          <h1 className="font-display text-3xl font-medium leading-tight truncate" style={{ color: 'var(--ink)' }}>
            {patient.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {age != null && <span>{age} años</span>}
            {patient.sex && <><Sep /><span>{patient.sex === 'F' ? 'Femenino' : 'Masculino'}</span></>}
            {patient.document_id && <><Sep /><span className="font-mono text-xs">{patient.document_id}</span></>}
            {isOlder && <Badge variant="info">Adulto mayor</Badge>}
            {patient.is_athlete && <Badge variant="accent">Deportista</Badge>}
            {physioLabel && <Badge variant="warn">{physioLabel}</Badge>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/patients/${id}/edit`} className={btnSecondary}
            style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}>
            Editar
          </Link>
          <DeletePatientButton patientId={id} />
        </div>
      </header>

      <ClinicalDisclaimer variant="banner" />

      {/* CTA crear plan */}
      {vct && (
        <section className="rounded-lg p-5 flex items-center justify-between"
          style={{ background: 'var(--accent)', color: 'var(--paper)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h2 className="font-display text-lg font-medium mb-1">¿Listo para armar un plan?</h2>
            <p className="text-sm opacity-90">
              VCT objetivo: <span className="font-mono font-medium">{Math.round(vct.vct)} kcal/día</span>
            </p>
          </div>
          <NewPlanButton patientId={id} />
        </section>
      )}

      {/* Perfil clínico */}
      {comorbidities.length > 0 && (
        <FormCard title="Perfil clínico activo">
          <div className="flex flex-wrap gap-2">
            {comorbidities.map((c) => (
              <Badge key={c} variant="clinical">{COMORBIDITY_LABELS[c] ?? c}</Badge>
            ))}
          </div>
          {conflicts.length > 0 && (
            <div className="border rounded-md px-4 py-3 text-sm"
              style={{ background: '#fdf6e3', borderColor: 'var(--warn)', color: 'var(--ink)' }}>
              <strong>Conflicto clínico detectado.</strong> Hay rangos incompatibles
              entre comorbilidades — requiere decisión clínica manual (ver detalle).
            </div>
          )}
        </FormCard>
      )}

      {/* Antropometría */}
      <FormCard title="Antropometría">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DataCell label="Talla" value={patient.height_cm ? `${patient.height_cm} cm` : '—'} />
          <DataCell label="Peso actual" value={patient.weight_kg ? `${patient.weight_kg} kg` : '—'} />
          {patient.weight_pregest_kg && (
            <DataCell label="Peso pregest." value={`${patient.weight_pregest_kg} kg`} />
          )}
          {imc != null && (
            <DataCell label="IMC actual" value={imc.toFixed(1)}
              hint={classifyIMC(imc, age ?? 30).label}
              hintColor={`var(--${classifyIMC(imc, age ?? 30).color})`} />
          )}
          {vct && (
            <DataCell label="Peso usado" value={`${vct.weightUsed.toFixed(1)} kg`}
              hint={vct.weightSource === 'actual' ? 'actual'
                : vct.weightSource === 'healthy' ? 'saludable' : 'pregestacional'} />
          )}
          {patient.residence_area && (
            <DataCell label="Área" value={AREA_LABELS[patient.residence_area] ?? patient.residence_area} />
          )}
          {patient.lifestyle && (
            <DataCell label="Actividad" value={LIFESTYLE_LABELS[patient.lifestyle] ?? patient.lifestyle} />
          )}
        </div>
        {patient.notes && (
          <p className="text-sm pt-2 border-t" style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>
            {patient.notes}
          </p>
        )}
      </FormCard>

      {/* Requerimiento energético */}
      {vct ? (
        <FormCard title="Requerimiento energético" subtitle="FAO/OMS 2004 · adaptación CENAN Perú">
          <div className="space-y-2">
            {vct.tmb > 0 && <EnergyRow label="TMB" value={`${Math.round(vct.tmb)} kcal/día`} />}
            {vct.naf != null && <EnergyRow label="NAF" value={vct.naf.toFixed(2)} />}
            <EnergyRow label="GET" value={`${Math.round(vct.get)} kcal/día`} />
            {vct.encdt > 0 && <EnergyRow label="ENCDT (crecimiento)" value={`+${vct.encdt} kcal/día`} />}
            {vct.adicion > 0 && <EnergyRow label="Adición fisiológica" value={`+${vct.adicion} kcal/día`} />}
            <div className="pt-2 mt-1 border-t" style={{ borderColor: 'var(--rule)' }}>
              <EnergyRow label="VCT" value={`${Math.round(vct.vct)} kcal/día`} highlight />
            </div>
          </div>
        </FormCard>
      ) : (
        <FormCard title="Requerimiento energético">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Complete fecha de nacimiento, sexo, talla, peso, área de residencia y nivel
            de actividad para calcular el VCT.
          </p>
        </FormCard>
      )}

      {vct && (
        <Link
          href={`/patients/${id}/calculation`}
          className="inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: 'var(--ink-soft)' }}
        >
          Ver cálculo paso a paso →
        </Link>
      )}

      <RequirementsDetail merged={merged} comorbidities={comorbidities} />

      {/* Planes */}
      <section>
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-medium" style={{ color: 'var(--ink)' }}>Planes</h2>
          <NewPlanButton patientId={id} />
        </header>
        {plans && plans.length > 0 ? (
          <div className="space-y-2">
            {plans.map((plan) => (
              <Link key={plan.id} href={`/patients/${id}/plans/${plan.id}`}
                className="block bg-white border rounded-lg p-4 hover:opacity-90 transition-opacity"
                style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate" style={{ color: 'var(--ink)' }}>{plan.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                      {plan.plan_date}
                      {plan.calculated_vct ? ` · ${Math.round(plan.calculated_vct)} kcal` : ''}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--ink-soft)' }} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed rounded-lg p-8 text-center"
            style={{ borderColor: 'var(--rule)' }}>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Sin planes aún.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Sep() {
  return <span style={{ color: 'var(--rule)' }}>·</span>;
}

function DataCell({ label, value, hint, hintColor }: {
  label: string; value: string; hint?: string; hintColor?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div className="font-mono text-sm" style={{ color: 'var(--ink)' }}>
        {value}
        {hint && <span className="text-xs ml-1.5" style={{ color: hintColor ?? 'var(--ink-soft)' }}>{hint}</span>}
      </div>
    </div>
  );
}

function EnergyRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={highlight ? 'font-display text-base font-medium' : 'text-sm'}
        style={{ color: highlight ? 'var(--ink)' : 'var(--ink-soft)' }}>
        {label}
      </span>
      <span className={`font-mono ${highlight ? 'text-lg font-medium' : 'text-sm'}`}
        style={{ color: 'var(--ink)' }}>
        {value}
      </span>
    </div>
  );
}

function Badge({ variant, children }: {
  variant: 'info' | 'warn' | 'accent' | 'clinical';
  children: React.ReactNode;
}) {
  const styleMap = {
    info:     { background: '#eaf2fb', color: '#1e4a73', borderColor: '#b9d4ee' },
    warn:     { background: '#fdf6e3', color: '#7a5a00', borderColor: 'var(--warn)' },
    accent:   { background: 'var(--paper-warm)', color: 'var(--accent)', borderColor: 'var(--rule)' },
    clinical: { background: 'var(--paper-warm)', color: 'var(--ink)', borderColor: 'var(--rule)' },
  }[variant];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium"
      style={styleMap}>
      {children}
    </span>
  );
}
