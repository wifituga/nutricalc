import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') ?? '').trim();
  const group = (searchParams.get('group') ?? '').trim();
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

  // Exact TPCA code shortcut (e.g. "A49", "a 49")
  const codeMatch = q.match(/^([A-Za-z])\s*(\d+)$/);
  if (codeMatch) {
    const code = `${codeMatch[1].toUpperCase()}${codeMatch[2]}`;
    const { data } = await supabase
      .from('foods')
      .select('id, code, group_letter, group_name, name, per_100g')
      .eq('code', code)
      .eq('active', true)
      .limit(1);
    if (data && data.length) {
      return NextResponse.json({ data, count: data.length, limit, offset: 0 });
    }
  }

  const { data, error } = await supabase.rpc('search_foods', {
    search_query: q,
    group_filter: group ? group.toUpperCase() : null,
    result_limit: limit,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((f: Record<string, unknown>) => ({
    id: f.id,
    code: f.code,
    group_letter: f.group_letter,
    group_name: f.group_name,
    name: f.name,
    per_100g: f.per_100g,
  }));

  return NextResponse.json({ data: rows, count: rows.length, limit, offset: 0 });
}
