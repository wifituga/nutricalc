import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import type { Patient } from '@/lib/types';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Snapshot the patient + resolved targets at creation time (Task 3.8)
  let snapshot: Record<string, unknown> = {};
  if (body.patient_id) {
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', body.patient_id)
      .single();

    if (patient) {
      const { targets, vct, merged, comorbidities } =
        await resolvePatientTargets(supabase, patient as Patient);
      snapshot = {
        patient_snapshot: patient,
        calculated_tmb: vct?.tmb ?? null,
        calculated_get: vct?.get ?? null,
        calculated_encdt: vct?.encdt ?? 0,
        calculated_vct: vct?.vct ?? null,
        target_macros: { vct: vct?.vct ?? null },
        target_micros: targets,
        override_sources: { merged, comorbidities },
      };
    }
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({ ...body, ...snapshot, created_by_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
