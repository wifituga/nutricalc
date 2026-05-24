import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('household_measures')
    .select('id, measure_name, grams, edible_pct, match_confidence')
    .eq('food_id', Number(id))
    .eq('active', true)
    .order('grams');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ measures: data ?? [] });
}
