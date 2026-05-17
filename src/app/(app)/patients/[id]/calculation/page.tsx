import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { buildCalculationTrace } from '@/lib/calculations/calculationTrace';
import { CalculationTrace } from '@/components/calculation/CalculationTrace';
import type { Patient } from '@/lib/types';

export default async function CalculationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).single();
  if (!patient) notFound();

  const result = await buildCalculationTrace(supabase, patient as Patient);

  if ('error' in result) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{result.error}</p>
      </div>
    );
  }

  return <CalculationTrace result={result} />;
}
