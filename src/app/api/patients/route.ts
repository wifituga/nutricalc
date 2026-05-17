import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
  const offset = Number(searchParams.get('offset') ?? 0);

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .order('full_name')
    .range(offset, offset + limit - 1);

  if (q.trim()) {
    query = query.ilike('full_name', `%${q.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, limit, offset });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: nutritionist } = await supabase
    .from('nutritionists')
    .select('clinic_id')
    .eq('id', user.id)
    .single();

  if (!nutritionist?.clinic_id) {
    return NextResponse.json({ error: 'Nutritionist has no clinic assigned' }, { status: 400 });
  }

  const body = await request.json();
  const { data, error } = await supabase
    .from('patients')
    .insert({ ...body, clinic_id: nutritionist.clinic_id, assigned_nutritionist_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
