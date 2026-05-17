import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewPlanButton from '@/components/ui/NewPlanButton';
import DeletePatientButton from '@/components/ui/DeletePatientButton';
import { calculateVCT, type PhysiologicalState } from '@/lib/calculations/energyRequirement';
import { ageInYears } from '@/lib/calculations/age';

const PROFILE_LABELS: Record<string, string> = {
  adulto_sano:       'Adulto sano',
  renal_predialisis: 'Renal pre-diálisis',
  renal_dialisis:    'Renal en diálisis',
  diabetes:          'Diabetes',
  hipertension:      'Hipertensión',
  custom:            'Personalizado',
};

const PHYSIO_LABELS: Record<string, string> = {
  standard:         '',
  pregnancy_t1:     'Embarazo T1',
  pregnancy_t2:     'Embarazo T2',
  pregnancy_t3:     'Embarazo T3',
  lactation_0_6m:   'Lactancia 0-6m',
  lactation_6_12m:  'Lactancia 6-12m',
};

const LIFESTYLE_LABELS: Record<string, string> = {
  ligero:     'Ligero',
  no_ligero:  'No ligero',
};

const AREA_LABELS: Record<string, string> = {
  urbana: 'Urbana',
  rural:  'Rural',
};

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: patient }, { data: plans }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase
      .from('meal_plans')
      .select('id, name, plan_date, notes')
      .eq('patient_id', id)
      .order('plan_date', { ascending: false }),
  ]);

  if (!patient) notFound();

  const today = new Date();
  const age = patient.birth_date ? ageInYears(new Date(patient.birth_date), today) : null;

  // Calculate VCT if enough data available
  let vct: ReturnType<typeof calculateVCT> | null = null;
  if (patient.birth_date && patient.sex && patient.height_cm && patient.weight_kg
      && patient.residence_area && patient.lifestyle) {
    try {
      vct = calculateVCT({
        sex: patient.sex as 'M' | 'F',
        birthDate: new Date(patient.birth_date),
        heightCm: Number(patient.height_cm),
        weightKg: Number(patient.weight_kg),
        weightPregestKg: patient.weight_pregest_kg ? Number(patient.weight_pregest_kg) : undefined,
        residenceArea: patient.residence_area as 'urbana' | 'rural',
        lifestyle: patient.lifestyle as 'ligero' | 'no_ligero',
        physiologicalState: (patient.physiological_state ?? 'standard') as PhysiologicalState,
      });
    } catch {
      vct = null;
    }
  }

  const physioLabel = patient.physiological_state
    ? PHYSIO_LABELS[patient.physiological_state] ?? ''
    : '';

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/patients" className="text-xs hover:underline" style={{ color: 'var(--ink-soft)' }}>
            ← Pacientes
          </Link>
          <h1 className="font-display text-2xl font-semibold mt-1" style={{ color: 'var(--ink)' }}>
            {patient.full_name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            {PROFILE_LABELS[patient.clinical_profile] ?? patient.clinical_profile}
            {physioLabel ? ` · ${physioLabel}` : ''}
            {age !== null ? ` · ${age} años` : ''}
            {patient.sex ? ` · ${patient.sex === 'M' ? 'Masculino' : 'Femenino'}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/patients/${id}/edit`}
            className="px-3 py-1.5 rounded border text-sm"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            Editar
          </Link>
          <DeletePatientButton patientId={id} />
        </div>
      </div>

      {/* ── Datos antropométricos ── */}
      <div
        className="rounded-lg border p-5 mb-4 grid grid-cols-3 gap-4"
        style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}
      >
        <InfoItem label="DNI" value={patient.document_id ?? '—'} />
        <InfoItem label="Talla" value={patient.height_cm ? `${patient.height_cm} cm` : '—'} />
        <InfoItem label="Peso" value={patient.weight_kg ? `${patient.weight_kg} kg` : '—'} />
        {patient.weight_pregest_kg && (
          <InfoItem label="Peso pregest." value={`${patient.weight_pregest_kg} kg`} />
        )}
        {patient.residence_area && (
          <InfoItem label="Área" value={AREA_LABELS[patient.residence_area] ?? patient.residence_area} />
        )}
        {patient.lifestyle && (
          <InfoItem label="Actividad" value={LIFESTYLE_LABELS[patient.lifestyle] ?? patient.lifestyle} />
        )}
        {patient.is_athlete && (
          <InfoItem label="Deportista" value="Sí" />
        )}
        {patient.notes && (
          <div className="col-span-3">
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--ink-soft)' }}>Notas</p>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{patient.notes}</p>
          </div>
        )}
      </div>

      {/* ── VCT Block ── */}
      {vct ? (
        <div
          className="rounded-lg border p-5 mb-6"
          style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}
        >
          <h2 className="font-display text-base font-semibold mb-3" style={{ color: 'var(--ink)' }}>
            Requerimiento energético (FAO/OMS · CENAN Perú)
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {vct.tmb > 0 && (
              <>
                <VctRow label="TMB" value={`${Math.round(vct.tmb)} kcal/día`} />
                <VctRow label="NAF" value={vct.naf?.toString() ?? '—'} />
                <VctRow label="GET" value={`${Math.round(vct.get)} kcal/día`} />
              </>
            )}
            {vct.tmb === 0 && (
              <VctRow label="GET" value={`${Math.round(vct.get)} kcal/día`} />
            )}
            {vct.encdt > 0 && (
              <VctRow label="ENCDT" value={`+${vct.encdt} kcal/día`} />
            )}
            {vct.adicion > 0 && (
              <VctRow label="Adición fisiológica" value={`+${vct.adicion} kcal/día`} />
            )}
            <div className="col-span-2 mt-1 pt-2 border-t flex justify-between font-semibold"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
            >
              <span>VCT</span>
              <span>{Math.round(vct.vct)} kcal/día</span>
            </div>
          </div>
          {vct.weightSource !== 'actual' && (
            <p className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>
              * Cálculo con{' '}
              {vct.weightSource === 'healthy' ? 'peso saludable' : 'peso pregestacional'}{' '}
              ({vct.weightUsed.toFixed(1)} kg)
            </p>
          )}
        </div>
      ) : (
        <div
          className="rounded-lg border p-4 mb-6 text-sm"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)', color: 'var(--ink-soft)' }}
        >
          Complete fecha de nacimiento, sexo, talla, peso, área de residencia y nivel de actividad
          para calcular el VCT.
        </div>
      )}

      {/* ── Planes ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>Planes</h2>
        <NewPlanButton patientId={id} />
      </div>

      {plans && plans.length > 0 ? (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/patients/${id}/plans/${plan.id}`}
              className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:opacity-80"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{plan.name}</p>
                {plan.notes && (
                  <p className="text-xs truncate max-w-md" style={{ color: 'var(--ink-soft)' }}>{plan.notes}</p>
                )}
              </div>
              <span className="font-mono text-xs shrink-0 ml-4" style={{ color: 'var(--ink-soft)' }}>
                {plan.plan_date}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
        >
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Sin planes aún.</p>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--ink-soft)' }}>{label}</p>
      <p className="font-mono text-sm" style={{ color: 'var(--ink)' }}>{value}</p>
    </div>
  );
}

function VctRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
      <span className="text-right font-mono" style={{ color: 'var(--ink)' }}>{value}</span>
    </>
  );
}
