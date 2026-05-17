import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') ?? '';
  const group = searchParams.get('group') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);
  const offset = Number(searchParams.get('offset') ?? 0);

  let query = supabase
    .from('foods')
    .select('id, code, group_letter, group_name, name, per_100g', { count: 'exact' })
    .eq('active', true)
    .range(offset, offset + limit - 1)
    .order('name');

  if (q.trim()) {
    query = query.textSearch('name', q.trim().split(/\s+/).join(' & '), {
      type: 'websearch',
      config: 'spanish',
    });
  }

  if (group) {
    query = query.eq('group_letter', group.toUpperCase());
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, limit, offset });
}
