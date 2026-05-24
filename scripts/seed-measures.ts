/**
 * Seed script: data/medidas_caseras.json → household_measures table.
 * Only high-confidence TAFERA 2016 matches (MVP rule #7), más overrides
 * manuales aprobados caso por caso (MANUAL_APPROVALS abajo).
 * Run: npx tsx scripts/seed-measures.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type Measure = {
  tafera_code: string;
  alimento_tafera: string;
  unidad_consumo: string;
  peso_neto_g: number;
  parte_comestible_pct: number | null;
  tpca_code: string | null;
  match_confidence: 'high' | 'medium' | 'unmatched';
};

// Medidas TAFERA 'medium' aprobadas manualmente por el equipo clínico.
// Cada entrada debe documentar por qué se acepta el match.
const MANUAL_APPROVALS: Array<{
  tpca_code: string;
  measure_name: string;
  grams: number;
  tafera_code: string;
  edible_pct: number | null;
  notes: string;
}> = [
  {
    tpca_code: 'A49', // Pan francés fortificado con hierro
    measure_name: 'Unidad mediana',
    grams: 62.3,
    tafera_code: '1-129',
    edible_pct: 100,
    notes: 'Aprobado manual: TAFERA "Pan francés de" (nombre truncado) = TPCA A49',
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars in .env.local');

  const supabase = createClient(url, key);

  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'medidas_caseras.json'), 'utf-8'),
  ) as Measure[];

  const high = raw.filter((m) => m.match_confidence === 'high' && m.tpca_code);
  console.log(`High-confidence measures: ${high.length}`);

  // Map TPCA code → foods.id
  const { data: foods, error: fErr } = await supabase
    .from('foods')
    .select('id, code');
  if (fErr) throw new Error(`Foods lookup failed: ${fErr.message}`);

  const codeToId = new Map<string, number>(
    (foods ?? []).map((f) => [f.code as string, f.id as number]),
  );

  const rows = high
    .map((m) => {
      const foodId = codeToId.get(m.tpca_code as string);
      if (!foodId) return null;
      return {
        food_id: foodId,
        measure_name: m.unidad_consumo,
        grams: m.peso_neto_g,
        tafera_code: m.tafera_code,
        match_confidence: 'high' as const,
        edible_pct: m.parte_comestible_pct,
        source: 'TAFERA_2016',
        active: true,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`Mapped to foods: ${rows.length} (skipped ${high.length - rows.length} without TPCA match)`);

  // Append manual approvals (medium-confidence matches validados a mano).
  for (const ap of MANUAL_APPROVALS) {
    const foodId = codeToId.get(ap.tpca_code);
    if (!foodId) {
      console.warn(`  SKIP manual approval ${ap.tpca_code}: no foods row`);
      continue;
    }
    rows.push({
      food_id: foodId,
      measure_name: ap.measure_name,
      grams: ap.grams,
      tafera_code: ap.tafera_code,
      match_confidence: 'high' as const,
      edible_pct: ap.edible_pct,
      source: 'TAFERA_2016_manual',
      active: true,
    });
  }
  console.log(`+${MANUAL_APPROVALS.length} manual approvals → ${rows.length} total`);

  const BATCH = 200;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('household_measures')
      .upsert(batch, { onConflict: 'food_id,measure_name,tafera_code', ignoreDuplicates: false });
    if (error) throw new Error(`Batch ${i / BATCH + 1} failed: ${error.message}`);
    done += batch.length;
    console.log(`  ${done}/${rows.length}`);
  }

  const distinctFoods = new Set(rows.map((r) => r.food_id)).size;
  console.log(`Seeded ${rows.length} household measures across ${distinctFoods} foods`);
}

main().catch((err) => { console.error(err); process.exit(1); });
