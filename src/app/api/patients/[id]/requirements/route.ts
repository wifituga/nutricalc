import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateVCT, type PhysiologicalState } from '@/lib/calculations/energyRequirement';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: p, error } = await supabase
    .from('patients')
    .select('birth_date,sex,height_cm,weight_kg,weight_pregest_kg,residence_area,lifestyle,physiological_state')
    .eq('id', id)
    .single();

  if (error || !p) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  if (!p.birth_date || !p.sex || !p.height_cm || !p.weight_kg || !p.residence_area || !p.lifestyle) {
    return NextResponse.json(
      { error: 'Datos antropométricos incompletos para calcular VCT' },
      { status: 422 },
    );
  }

  const result = calculateVCT({
    sex: p.sex as 'M' | 'F',
    birthDate: new Date(p.birth_date),
    heightCm: Number(p.height_cm),
    weightKg: Number(p.weight_kg),
    weightPregestKg: p.weight_pregest_kg ? Number(p.weight_pregest_kg) : undefined,
    residenceArea: p.residence_area as 'urbana' | 'rural',
    lifestyle: p.lifestyle as 'ligero' | 'no_ligero',
    physiologicalState: (p.physiological_state ?? 'standard') as PhysiologicalState,
  });

  return NextResponse.json(result);
}
