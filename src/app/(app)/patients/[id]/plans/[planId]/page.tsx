import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PlanBuilder from '@/components/plan/PlanBuilder';
import type { Food, MealPlan, MealPlanItem, Patient, NutrientProfile } from '@/lib/types';

type Ctx = { params: Promise<{ id: string; planId: string }> };

export default async function PlanPage({ params }: Ctx) {
  const { id: patientId, planId } = await params;
  const supabase = await createClient();

  const [
    { data: plan },
    { data: patient },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from('meal_plans')
      .select('*, meal_plan_items(*, foods(id, code, group_letter, name, per_100g))')
      .eq('id', planId)
      .single(),
    supabase.from('patients').select('*').eq('id', patientId).single(),
    supabase.from('nutrient_profiles').select('*').order('is_system', { ascending: false }),
  ]);

  if (!plan || !patient) notFound();

  const items = (plan.meal_plan_items ?? []) as unknown as (MealPlanItem & { foods: Food })[];
  const profile = profiles?.find((p: NutrientProfile) => p.id === patient.clinical_profile);

  return (
    <PlanBuilder
      plan={plan as unknown as MealPlan}
      patient={patient as unknown as Patient}
      initialItems={items}
      profileLimits={patient.custom_limits ?? profile?.limits ?? {}}
      profileName={profile?.name ?? patient.clinical_profile}
    />
  );
}
