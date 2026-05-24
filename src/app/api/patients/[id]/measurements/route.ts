import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const measurementSchema = z.object({
  measured_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  height_cm:   z.number().positive().nullish(),
  weight_kg:   z.number().positive().nullish(),
  waist_cm:    z.number().positive().nullish(),
  hip_cm:      z.number().positive().nullish(),
  body_fat_pct: z.number().min(0).max(100).nullish(),
  notes:       z.string().nullish(),
}).refine(
  (d) => d.height_cm != null || d.weight_kg != null || d.waist_cm != null ||
         d.hip_cm != null || d.body_fat_pct != null,
  { message: 'Debe registrar al menos una medición' },
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('patient_measurements')
    .select('*')
    .eq('patient_id', id)
    .order('measured_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await request.json();
  const parsed = measurementSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('patient_measurements')
    .insert({ ...parsed.data, patient_id: id, created_by_id: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
