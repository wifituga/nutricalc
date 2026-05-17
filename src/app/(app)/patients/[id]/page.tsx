import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewPlanButton from '@/components/ui/NewPlanButton';
import DeletePatientButton from '@/components/ui/DeletePatientButton';

const PROFILE_LABELS: Record<string, string> = {
  adulto_sano: 'Adulto sano',
  renal_predialisis: 'Renal pre-diálisis',
  renal_dialisis: 'Renal en diálisis',
  diabetes: 'Diabetes',
  hipertension: 'Hipertensión',
  custom: 'Personalizado',
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

  const age = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

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
            {age ? ` · ${age} años` : ''}
            {patient.sex ? ` · ${patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : 'Otro'}` : ''}
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

      {/* Info grid */}
      <div
        className="rounded-lg border p-5 mb-6 grid grid-cols-3 gap-4"
        style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}
      >
        <InfoItem label="DNI" value={patient.document_id ?? '—'} />
        <InfoItem label="Talla" value={patient.height_cm ? `${patient.height_cm} cm` : '—'} />
        <InfoItem label="Peso" value={patient.weight_kg ? `${patient.weight_kg} kg` : '—'} />
        {patient.notes && (
          <div className="col-span-3">
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--ink-soft)' }}>Notas</p>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{patient.notes}</p>
          </div>
        )}
      </div>

      {/* Plans */}
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
