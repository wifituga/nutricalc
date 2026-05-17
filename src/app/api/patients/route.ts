import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const patientSchema = z.object({
  full_name:              z.string().min(1, 'Nombre requerido'),
  document_id:            z.string().nullish(),
  birth_date:             z.string().nullish(),
  sex:                    z.enum(['M', 'F']).nullish(),
  height_cm:              z.number().positive().nullish(),
  weight_kg:              z.number().positive().nullish(),
  weight_pregest_kg:      z.number().positive().nullish(),
  physiological_state:    z.enum([
    'standard',
    'pregnancy_t1', 'pregnancy_t2', 'pregnancy_t3',
    'lactation_0_6m', 'lactation_6_12m',
  ]).default('standard'),
  residence_area:         z.enum(['urbana', 'rural']).nullish(),
  lifestyle:              z.enum(['ligero', 'no_ligero']).nullish(),
  is_athlete:             z.boolean().default(false),
  protein_factor_override: z.number().positive().nullish(),
  comorbidities:          z.array(z.string()).default([]),
  notes:                  z.string().nullish(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q      = searchParams.get('q') ?? '';
  const limit  = Math.min(Number(searchParams.get('limit') ?? 50), 200);
  const offset = Number(searchParams.get('offset') ?? 0);

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .order('full_name')
    .range(offset, offset + limit - 1);

  if (q.trim()) query = query.ilike('full_name', `%${q.trim()}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, limit, offset });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await request.json();
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: nutritionist } = await admin
    .from('nutritionists')
    .select('clinic_id')
    .eq('id', user.id)
    .single();

  if (!nutritionist?.clinic_id) {
    return NextResponse.json({ error: 'Nutritionist has no clinic assigned' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...parsed.data,
      clinic_id: nutritionist.clinic_id,
      assigned_nutritionist_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
