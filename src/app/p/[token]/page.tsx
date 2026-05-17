import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import PatientPlanView from '@/components/patient-view/PatientPlanView';

export const metadata = { title: 'Plan nutricional' };

export default async function PublicPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: plan } = await supabase
    .from('meal_plans')
    .select(`
      plan_date, name,
      patient:patients(full_name),
      created_by:nutritionists(full_name, professional_license, clinic:clinics(name)),
      items:meal_plan_items(
        id, meal, grams, position, household_measure_id, household_measure_qty,
        food:foods(code, name, group_letter)
      )
    `)
    .eq('share_token', token)
    .single();

  if (!plan) notFound();

  const measureIds = (plan.items ?? [])
    .map((i: { household_measure_id: number | null }) => i.household_measure_id)
    .filter((x: number | null): x is number => x != null);

  const measureMap = new Map<number, { measure_name: string }>();
  if (measureIds.length > 0) {
    const { data: measures } = await supabase
      .from('household_measures')
      .select('id, measure_name')
      .in('id', measureIds);
    for (const m of measures ?? []) {
      measureMap.set(m.id as number, { measure_name: m.measure_name as string });
    }
  }

  // Supabase returns single relations as arrays in the typed client; normalize.
  const norm = plan as unknown as {
    plan_date: string; name: string;
    patient: { full_name: string } | { full_name: string }[];
    created_by:
      | { full_name: string; professional_license: string | null; clinic: { name: string } | { name: string }[] | null }
      | { full_name: string; professional_license: string | null; clinic: { name: string } | { name: string }[] | null }[];
    items: {
      id: string; meal: string; grams: number; position: number;
      household_measure_id: number | null; household_measure_qty: number | null;
      food: { code: string; name: string; group_letter: string } | { code: string; name: string; group_letter: string }[];
    }[];
  };

  const one = <T,>(v: T | T[]): T => (Array.isArray(v) ? v[0] : v);
  const cb = one(norm.created_by);

  const viewPlan = {
    plan_date: norm.plan_date,
    name: norm.name,
    patient: one(norm.patient),
    created_by: {
      full_name: cb.full_name,
      professional_license: cb.professional_license,
      clinic: cb.clinic ? one(cb.clinic) : null,
    },
    items: norm.items.map((i) => ({ ...i, food: one(i.food) })),
  };

  return <PatientPlanView plan={viewPlan} measures={measureMap} />;
}
