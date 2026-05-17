import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildCalculationTrace } from '@/lib/calculations/calculationTrace';
import type { Patient } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).single();
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = await buildCalculationTrace(supabase, patient as Patient);
  if ('error' in result) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result);
}
