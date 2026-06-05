import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PatientForm from '@/components/ui/PatientForm';
import Link from 'next/link';

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).single();
  if (!patient) notFound();

  return (
    <div className="max-w-5xl">
      <Link href={`/patients/${id}`} className="text-xs hover:underline" style={{ color: 'var(--ink-soft)' }}>
        ← Volver
      </Link>
      <h1 className="font-display font-semibold mt-2 mb-5" style={{ fontSize: 28, letterSpacing: '-.015em', color: 'var(--ink)' }}>
        Editar paciente
      </h1>
      <PatientForm patient={patient} />
    </div>
  );
}
