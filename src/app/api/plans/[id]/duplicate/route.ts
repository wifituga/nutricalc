import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import type { Patient } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { plan_date?: string; name?: string };

  // Load source plan with items
  const { data: source, error: sErr } = await supabase
    .from('meal_plans')
    .select('*, meal_plan_items(food_id, meal, grams, household_measure_id, household_measure_qty, position)')
    .eq('id', id)
    .single();
  if (sErr || !source) {
    return NextResponse.json({ error: sErr?.message ?? 'Not found' }, { status: 404 });
  }

  // Recompute snapshot from current patient state (in case anthropometry changed)
  let snapshot: Record<string, unknown> = {};
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', source.patient_id)
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

  const today = new Date().toISOString().split('T')[0];
  const newName = body.name ?? `${source.name} (copia)`;
  const newDate = body.plan_date ?? today;

  // Insert new plan
  const { data: created, error: cErr } = await supabase
    .from('meal_plans')
    .insert({
      patient_id: source.patient_id,
      name: newName,
      plan_date: newDate,
      notes: source.notes,
      ...snapshot,
      created_by_id: user.id,
    })
    .select()
    .single();
  if (cErr || !created) {
    return NextResponse.json({ error: cErr?.message ?? 'Failed to create copy' }, { status: 500 });
  }

  // Insert items copy
  const items = (source.meal_plan_items ?? []) as Array<{
    food_id: number; meal: string; grams: number;
    household_measure_id: number | null; household_measure_qty: number | null;
    position: number;
  }>;
  if (items.length > 0) {
    const rows = items.map((it) => ({
      meal_plan_id: created.id,
      food_id: it.food_id,
      meal: it.meal,
      grams: it.grams,
      household_measure_id: it.household_measure_id,
      household_measure_qty: it.household_measure_qty,
      position: it.position,
    }));
    const { error: iErr } = await supabase.from('meal_plan_items').insert(rows);
    if (iErr) {
      return NextResponse.json({ error: iErr.message, plan_id: created.id }, { status: 500 });
    }
  }

  return NextResponse.json(created, { status: 201 });
}
