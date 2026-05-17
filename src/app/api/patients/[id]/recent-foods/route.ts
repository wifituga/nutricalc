import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Food } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: items, error } = await supabase
    .from('meal_plan_items')
    .select('food_id, grams, meal_plans!inner(patient_id, plan_date)')
    .eq('meal_plans.patient_id', id)
    .order('plan_date', { foreignTable: 'meal_plans', ascending: false })
    .limit(80);

  if (error) return NextResponse.json({ recent: [] });

  const seen = new Set<number>();
  const picked: { food_id: number; grams: number; date: string }[] = [];
  for (const it of items ?? []) {
    const fid = it.food_id as number;
    if (seen.has(fid) || picked.length >= 10) continue;
    seen.add(fid);
    const mp = it.meal_plans as unknown as { plan_date: string };
    picked.push({ food_id: fid, grams: it.grams as number, date: mp.plan_date });
  }
  if (picked.length === 0) return NextResponse.json({ recent: [] });

  const { data: foods } = await supabase
    .from('foods')
    .select('id, code, group_letter, group_name, name, per_100g')
    .in('id', picked.map((p) => p.food_id));

  const fmap = new Map<number, Food>((foods ?? []).map((f) => [f.id as number, f as Food]));
  const recent = picked
    .map((p) => {
      const food = fmap.get(p.food_id);
      if (!food) return null;
      const days = Math.floor((Date.now() - new Date(p.date).getTime()) / 86400000);
      return { food, lastGrams: p.grams, lastUsedDays: days };
    })
    .filter(Boolean);

  return NextResponse.json({ recent });
}
