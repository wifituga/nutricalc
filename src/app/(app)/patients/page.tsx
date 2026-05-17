import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Patient } from '@/lib/types';

const PROFILE_LABELS: Record<string, string> = {
  adulto_sano: 'Adulto sano',
  renal_predialisis: 'Renal pre-diálisis',
  renal_dialisis: 'Renal en diálisis',
  diabetes: 'Diabetes',
  hipertension: 'Hipertensión',
  custom: 'Personalizado',
};

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('patients')
    .select('id, full_name, document_id, clinical_profile, birth_date, created_at')
    .order('full_name');

  if (q?.trim()) {
    query = query.ilike('full_name', `%${q.trim()}%`);
  }

  const { data: patients } = await query;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Pacientes
        </h1>
        <Link
          href="/patients/new"
          className="px-4 py-2 rounded text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--paper)' }}
        >
          Nuevo paciente
        </Link>
      </div>

      <form method="GET" className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre..."
          className="w-full max-w-sm px-3 py-2 rounded border text-sm focus:outline-none"
          style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
        />
      </form>

      {patients && patients.length > 0 ? (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--paper-warm)' }}>
              <tr>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--ink-soft)' }}>Nombre</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--ink-soft)' }}>DNI</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--ink-soft)' }}>Perfil clínico</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient: Partial<Patient>) => (
                <tr
                  key={patient.id}
                  className="border-t"
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--ink)' }}>
                    {patient.full_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>
                    {patient.document_id ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--ink-soft)' }}>
                    {PROFILE_LABELS[patient.clinical_profile ?? ''] ?? patient.clinical_profile}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="text-xs font-medium hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="rounded-lg border p-10 text-center"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
        >
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            {q ? 'Sin resultados.' : 'Aún no hay pacientes registrados.'}
          </p>
        </div>
      )}
    </div>
  );
}
