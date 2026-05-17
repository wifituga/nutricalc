import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { PlanDocument } from '@/components/pdf/PlanDocument';
import { calculateTotals } from '@/lib/nutrition';
import type { Food, MealPlan, MealPlanItem, Patient, NutrientProfile } from '@/lib/types';
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

  const { data: profileData } = await supabase
    .from('nutrient_profiles')
    .select('*')
    .eq('id', patient.clinical_profile)
    .single();

  const profile = profileData as NutrientProfile | null;
  const profileLimits = patient.custom_limits ?? profile?.limits ?? {};
  const profileName = profile?.name ?? patient.clinical_profile;

  const doc = React.createElement(PlanDocument, {
    plan: plan as unknown as MealPlan,
    patient,
    items,
    totals,
    profileLimits,
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
