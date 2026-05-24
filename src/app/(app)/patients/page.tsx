import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Search, ChevronRight, UserPlus } from 'lucide-react';
import type { Patient } from '@/lib/types';
import { COMORBIDITY_LABELS } from '@/lib/calculations/clinicalOverrides';

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('patients')
    .select('id, full_name, document_id, comorbidities, birth_date, created_at')
    .order('full_name');

  if (q?.trim()) {
    query = query.ilike('full_name', `%${q.trim()}%`);
  }

  const { data: patients } = await query;
  const total = patients?.length ?? 0;

  return (
    <div className="max-w-5xl">
      <header className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-medium" style={{ color: 'var(--ink)' }}>
            Pacientes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
            {total === 0
              ? 'Aún no hay pacientes'
              : total === 1
              ? '1 paciente registrado'
              : `${total} pacientes registrados`}
            {q?.trim() && ` · resultado para "${q.trim()}"`}
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium shrink-0"
          style={{ background: 'var(--accent)', color: 'var(--paper)' }}
        >
          <Plus size={14} /> Nuevo paciente
        </Link>
      </header>

      <form method="GET" className="mb-4">
        <div className="relative max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--ink-soft)' }}
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2 rounded-md border text-sm"
            style={{
              background: 'white',
              borderColor: 'var(--rule)',
              color: 'var(--ink)',
            }}
          />
        </div>
      </form>

      {patients && patients.length > 0 ? (
        <div
          className="rounded-lg border overflow-hidden bg-white"
          style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--paper-warm)' }}>
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
                    Nombre
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
                    DNI
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
                    Comorbilidades
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient: Partial<Patient>) => {
                  const labels = patient.comorbidities && patient.comorbidities.length > 0
                    ? patient.comorbidities.map((c) => COMORBIDITY_LABELS[c] ?? c)
                    : null;
                  return (
                    <tr
                      key={patient.id}
                      className="border-t row-hover"
                      style={{ borderColor: 'var(--rule)' }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--ink)' }}>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="hover:underline"
                        >
                          {patient.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>
                        {patient.document_id ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {labels ? (
                          <div className="flex flex-wrap gap-1">
                            {labels.slice(0, 3).map((l) => (
                              <span
                                key={l}
                                className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]"
                                style={{
                                  borderColor: 'var(--rule)',
                                  background: 'var(--paper-warm)',
                                  color: 'var(--ink)',
                                }}
                              >
                                {l}
                              </span>
                            ))}
                            {labels.length > 3 && (
                              <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                                +{labels.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                            Sin comorbilidades
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right w-12">
                        <Link
                          href={`/patients/${patient.id}`}
                          aria-label={`Ver ${patient.full_name}`}
                          className="inline-flex p-1.5 rounded hover:bg-[color:var(--paper)]"
                          style={{ color: 'var(--ink-soft)' }}
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg border p-12 text-center bg-white"
          style={{ borderColor: 'var(--rule)' }}
        >
          <UserPlus size={28} className="mx-auto mb-3" style={{ color: 'var(--ink-soft)' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
            {q?.trim() ? `Sin resultados para "${q.trim()}".` : 'Aún no hay pacientes registrados.'}
          </p>
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--paper)' }}
          >
            <Plus size={14} /> Crear primer paciente
          </Link>
        </div>
      )}
    </div>
  );
}
