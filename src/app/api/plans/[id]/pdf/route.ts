import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { PlanDocument } from '@/components/pdf/PlanDocument';
import { calculateTotals } from '@/lib/nutrition';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import { COMORBIDITY_LABELS } from '@/lib/calculations/clinicalOverrides';
import { calculateMacroDistribution } from '@/lib/calculations/macroDistribution';
import { ageInYears } from '@/lib/calculations/age';
import type { Food, MealPlan, MealPlanItem, Patient, HouseholdMeasure } from '@/lib/types';
import type { DocumentProps } from '@react-pdf/renderer';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: plan }, { data: nutritionist }] = await Promise.all([
    supabase
      .from('meal_plans')
      .select(`
        *,
        patients(*, clinics(name)),
        meal_plan_items(*, foods(id, code, name, per_100g))
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('nutritionists')
      .select('full_name, professional_license, clinics(name)')
      .eq('id', user.id)
      .single(),
  ]);

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const patient = plan.patients as unknown as Patient & { clinics: { name: string } };
  const items = (plan.meal_plan_items ?? []) as unknown as (MealPlanItem & { foods: Food })[];
  const foodsMap = new Map<number, Food>(items.map((i) => [i.food_id, i.foods]));
  const totals = calculateTotals(items, foodsMap);

  const { targets, vct, comorbidities } = await resolvePatientTargets(supabase, patient);
  const profileName = comorbidities.length > 0
    ? comorbidities.map((c) => COMORBIDITY_LABELS[c] ?? c).join(', ')
    : 'Sin comorbilidades';

  // Household measures referenced by the plan items
  const measureIds = items
    .map((i) => i.household_measure_id)
    .filter((x): x is number => x != null);
  const measures = new Map<number, HouseholdMeasure>();
  if (measureIds.length) {
    const { data: ms } = await supabase
      .from('household_measures')
      .select('id, food_id, measure_name, grams, edible_pct')
      .in('id', measureIds);
    for (const m of ms ?? []) measures.set(m.id as number, m as HouseholdMeasure);
  }

  // Macro distribution (AMDR auto) when VCT is available
  const macros = vct && patient.birth_date
    ? calculateMacroDistribution(vct.vct, 'amdr_auto', {
        ageYears: ageInYears(new Date(patient.birth_date)),
        weightKg: vct.weightUsed,
      })
    : null;

  const doc = React.createElement(PlanDocument, {
    plan: plan as unknown as MealPlan,
    patient,
    items,
    totals,
    targets,
    vct,
    macros,
    measures,
    profileName,
    clinicName: (nutritionist?.clinics as unknown as { name: string } | null)?.name ?? '',
    nutritionistName: nutritionist?.full_name ?? '',
    nutritionistLicense: nutritionist?.professional_license ?? undefined,
  }) as unknown as React.ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(doc);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="plan-${id}.pdf"`,
    },
  });
}
