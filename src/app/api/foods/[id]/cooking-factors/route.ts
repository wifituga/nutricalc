import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Direct food_id matches
  const { data: direct, error } = await supabase
    .from('food_cooking_factors')
    .select('id, food_name_raw, cooking_method, factor, from_1985, notes')
    .eq('food_id', Number(id))
    .order('cooking_method');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also include same-group fallbacks (e.g. generic "Pollo, carne" for any chicken)
  if ((direct?.length ?? 0) === 0) {
    const { data: food } = await supabase
      .from('foods')
      .select('group_letter, name')
      .eq('id', Number(id))
      .single();
    if (food) {
      // Map group_letter back to group_name used in seed
      const letterToGroup: Record<string, string> = {
        A: 'Cereales y derivados',
        B: 'Verduras, hortalizas y derivados',
        C: 'Frutas y derivados',
        D: 'Grasas, aceites y oleaginosas',
        E: 'Pescados y mariscos',
        F: 'Carnes y derivados',
        J: 'Huevos y derivados',
        T: 'Leguminosas y derivados',
        U: 'Tubérculos, raíces y derivados',
      };
      const grp = letterToGroup[food.group_letter as string];
      if (grp) {
        const { data: fallback } = await supabase
          .from('food_cooking_factors')
          .select('id, food_name_raw, cooking_method, factor, from_1985, notes')
          .eq('group_name', grp)
          .order('food_name_raw')
          .order('cooking_method')
          .limit(40);
        return NextResponse.json({ factors: fallback ?? [], fallback: true });
      }
    }
  }

  return NextResponse.json({ factors: direct ?? [], fallback: false });
}
