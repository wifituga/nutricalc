import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PlanBuilder from '@/components/plan/PlanBuilder';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import type { Food, MealPlan, MealPlanItem, Patient } from '@/lib/types';

type Ctx = { params: Promise<{ id: string; planId: string }> };

export default async function PlanPage({ params }: Ctx) {
  const { id: patientId, planId } = await params;
  const supabase = await createClient();

  const [{ data: plan }, { data: patient }] = await Promise.all([
    supabase
      .from('meal_plans')
      .select('*, meal_plan_items(*, foods(id, code, group_letter, name, per_100g))')
      .eq('id', planId)
      .single(),
    supabase.from('patients').select('*').eq('id', patientId).single(),
  ]);

  if (!plan || !patient) notFound();

  const items = (plan.meal_plan_items ?? []) as unknown as (MealPlanItem & { foods: Food })[];
  const { targets, vct } = await resolvePatientTargets(supabase, patient as Patient);

  return (
    <PlanBuilder
      plan={plan as unknown as MealPlan}
      patient={patient as unknown as Patient}
      initialItems={items}
      targets={targets}
      vct={vct}
    />
  );
}
