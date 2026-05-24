import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: source } = await supabase
    .from('foods')
    .select('id, code, group_letter, name, per_100g')
    .eq('id', Number(id))
    .single();
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const baseKcal = (source.per_100g as { energia_kcal?: number | null })?.energia_kcal;
  if (baseKcal == null) {
    return NextResponse.json({ source, substitutes: [], reason: 'Sin kcal en el alimento base' });
  }

  // Same group, ±15% kcal, exclude self, limit 12
  const tolerance = 0.15;
  const min = baseKcal * (1 - tolerance);
  const max = baseKcal * (1 + tolerance);

  const { data, error } = await supabase
    .from('foods')
    .select('id, code, group_letter, name, per_100g')
    .eq('group_letter', source.group_letter)
    .eq('active', true)
    .neq('id', source.id)
    .limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const subs = (data ?? [])
    .filter((f) => {
      const k = (f.per_100g as { energia_kcal?: number | null })?.energia_kcal;
      return k != null && k >= min && k <= max;
    })
    .map((f) => {
      const k = (f.per_100g as { energia_kcal?: number | null })?.energia_kcal ?? 0;
      return {
        id: f.id,
        code: f.code,
        name: f.name,
        kcal: k,
        delta_pct: Math.round(((k - baseKcal) / baseKcal) * 100),
      };
    })
    .sort((a, b) => Math.abs(a.delta_pct) - Math.abs(b.delta_pct))
    .slice(0, 12);

  return NextResponse.json({
    source: { id: source.id, code: source.code, name: source.name, kcal: baseKcal },
    substitutes: subs,
  });
}
