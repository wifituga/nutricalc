import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ageInYears } from '@/lib/calculations/age';

const patchSchema = z.object({
  full_name:               z.string().min(1).optional(),
  document_id:             z.string().nullish(),
  birth_date:              z.string().refine(
    (s) => {
      const d = new Date(s);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const oneTwentyAgo = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      return d >= oneTwentyAgo && d <= now && ageInYears(d) >= 1;
    },
    { message: 'Fecha de nacimiento inválida o menor de 1 año (lactante no soportado).' },
  ).optional(),
  sex:                     z.enum(['M', 'F']).optional(),
  height_cm:               z.number().positive().nullish(),
  weight_kg:               z.number().positive().nullish(),
  weight_pregest_kg:       z.number().positive().nullish(),
  physiological_state:     z.enum([
    'standard',
    'pregnancy_t1', 'pregnancy_t2', 'pregnancy_t3',
    'lactation_0_6m', 'lactation_6_12m',
  ]).optional(),
  residence_area:          z.enum(['urbana', 'rural']).nullish(),
  lifestyle:               z.enum(['ligero', 'no_ligero']).nullish(),
  is_athlete:              z.boolean().optional(),
  protein_factor_override: z.number().positive().nullish(),
  comorbidities:           z.array(z.string()).optional(),
  notes:                   z.string().nullish(),
}).refine(
  (d) => !d.physiological_state?.startsWith('pregnancy') || d.weight_pregest_kg != null,
  { message: 'El peso pregestacional es obligatorio en embarazo', path: ['weight_pregest_kg'] },
);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await request.json();
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('patients')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('patients').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
