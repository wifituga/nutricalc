import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') ?? '').trim();
  const group = (searchParams.get('group') ?? '').trim();
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

  // TPCA code shortcut: exact ("A49", "a 49") or prefix ("A4", "T")
  const codeMatch = q.match(/^([A-Za-z])\s*(\d*)$/);
  if (codeMatch) {
    const letter = codeMatch[1].toUpperCase();
    const digits = codeMatch[2];
    const code = `${letter}${digits}`;
    const codeQuery = supabase
      .from('foods')
      .select('id, code, group_letter, group_name, name, per_100g')
      .eq('active', true)
      .order('code')
      .limit(limit);
    // Exact for full code, prefix for partial
    const { data } = digits
      ? await codeQuery.ilike('code', `${code}%`)
      : await codeQuery.eq('group_letter', letter);
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
