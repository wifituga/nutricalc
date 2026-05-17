import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateTotals } from '@/lib/nutrition';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import type { Food, MealPlanItem, Patient } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('meal_plans')
    .select('patients(*), meal_plan_items(*, foods(*))')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const items = (data.meal_plan_items ?? []) as unknown as (MealPlanItem & { foods: Food })[];
  const foodsMap = new Map<number, Food>(items.map((i) => [i.food_id, i.foods]));
  const totals = calculateTotals(items, foodsMap);

  const patient = data.patients as unknown as Patient | null;
  const { targets, vct } = patient
    ? await resolvePatientTargets(supabase, patient)
    : { targets: {}, vct: null };

  return NextResponse.json({ totals, targets, vct });
}
