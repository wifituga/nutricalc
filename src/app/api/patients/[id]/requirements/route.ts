import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import type { Patient } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const { targets, vct, merged, comorbidities } =
    await resolvePatientTargets(supabase, patient as Patient);

  if (!vct) {
    return NextResponse.json(
      { error: 'Datos antropométricos incompletos para calcular requerimientos' },
      { status: 422 },
    );
  }

  const conflicts = Object.entries(merged)
    .filter(([, m]) => m.conflict)
    .map(([key, m]) => ({
      key,
      sources: m.conflictDetails?.sources ?? (m.source ? [m.source] : []),
      message: `Rangos incompatibles para ${key} — requiere decisión clínica`,
    }));

  return NextResponse.json({
    patient: {
      id: patient.id,
      full_name: patient.full_name,
      sex: patient.sex,
      birth_date: patient.birth_date,
      physiological_state: patient.physiological_state,
    },
    vct,
    targets,
    override_sources: merged,
    active_comorbidities: comorbidities,
    conflicts,
  });
}
