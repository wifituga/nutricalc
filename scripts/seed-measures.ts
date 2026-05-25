/**
 * Seed script: data/medidas_caseras.json → household_measures table.
 *
 * Carga TODAS las medidas TAFERA 2016 cuyo TPCA code esté mapeado a un alimento
 * en la BD (high + medium). Las medium fueron revisadas manualmente como
 * matches legítimos pero con diferencias sintácticas (truncados, comas,
 * paréntesis) que bajaron el score del fuzzy match automático.
 *
 * El campo `match_confidence` se conserva en BD para que la UI pueda mostrar
 * un hint cuando la medida proviene de un match medium (auto-aprobado).
 *
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

// Medidas TAFERA 'medium' aprobadas manualmente por nombre exacto.
// Sobrescriben la confidence a 'high' porque se validó el alimento.
const MANUAL_APPROVALS: Array<{
  tpca_code: string;
  measure_name: string;
  grams: number;
  tafera_code: string;
  edible_pct: number | null;
  notes: string;
}> = [
  {
    tpca_code: 'A49',
    measure_name: 'Unidad mediana',
    grams: 62.3,
    tafera_code: '1-129',
    edible_pct: 100,
    notes: 'Aprobado manual: TAFERA "Pan francés de" (truncado) = TPCA A49',
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

  // Accept high + medium (medium = legitimate match with weak fuzzy score)
  const accepted = raw.filter(
    (m) => (m.match_confidence === 'high' || m.match_confidence === 'medium') && m.tpca_code,
  );
  const highCount = accepted.filter((m) => m.match_confidence === 'high').length;
  const mediumCount = accepted.filter((m) => m.match_confidence === 'medium').length;
  console.log(`Accepted measures: ${accepted.length} (high ${highCount} + medium ${mediumCount})`);

  // Map TPCA code → foods.id. Supabase enforces a server-side max of 1000 rows
  // per request, so we paginate explicitly to capture all foods (>1000 now).
  const foods: { id: number; code: string }[] = [];
  const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('foods')
      .select('id, code')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Foods lookup failed at offset ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    foods.push(...(data as { id: number; code: string }[]));
    if (data.length < PAGE) break;
  }
  console.log(`Foods loaded: ${foods.length}`);

  const codeToId = new Map<string, number>(
    foods.map((f) => [f.code as string, f.id as number]),
  );

  type Row = {
    food_id: number;
    measure_name: string;
    grams: number;
    tafera_code: string;
    match_confidence: 'high' | 'medium';
    edible_pct: number | null;
    source: string;
    active: boolean;
    notes?: string | null;
  };

  const rows: Row[] = [];
  let skipped = 0;
  for (const m of accepted) {
    const foodId = codeToId.get(m.tpca_code as string);
    if (!foodId) { skipped++; continue; }
    rows.push({
      food_id: foodId,
      measure_name: m.unidad_consumo,
      grams: m.peso_neto_g,
      tafera_code: m.tafera_code,
      match_confidence: m.match_confidence as 'high' | 'medium',
      edible_pct: m.parte_comestible_pct,
      source: 'TAFERA_2016',
      active: true,
    });
  }
  console.log(`Mapped to foods: ${rows.length} (skipped ${skipped} without TPCA match)`);

  // Append manual approvals
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
      match_confidence: 'high',
      edible_pct: ap.edible_pct,
      source: 'TAFERA_2016_manual',
      active: true,
      notes: ap.notes,
    });
  }
  console.log(`+${MANUAL_APPROVALS.length} manual approvals → ${rows.length} total`);

  // Dedup by upsert key (food_id, measure_name, tafera_code): keep first occurrence
  const seen = new Set<string>();
  const dedupedRows: typeof rows = [];
  let dups = 0;
  for (const r of rows) {
    const k = `${r.food_id}|${r.measure_name}|${r.tafera_code}`;
    if (seen.has(k)) { dups++; continue; }
    seen.add(k);
    dedupedRows.push(r);
  }
  if (dups > 0) console.log(`Deduped ${dups} duplicate rows within batch → ${dedupedRows.length} unique`);

  const BATCH = 200;
  let done = 0;
  for (let i = 0; i < dedupedRows.length; i += BATCH) {
    const batch = dedupedRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('household_measures')
      .upsert(batch, { onConflict: 'food_id,measure_name,tafera_code', ignoreDuplicates: false });
    if (error) throw new Error(`Batch ${i / BATCH + 1} failed: ${error.message}`);
    done += batch.length;
    console.log(`  ${done}/${dedupedRows.length}`);
  }

  const distinctFoods = new Set(dedupedRows.map((r) => r.food_id)).size;
  console.log(`Seeded ${dedupedRows.length} household measures across ${distinctFoods} foods`);
}

main().catch((err) => { console.error(err); process.exit(1); });
