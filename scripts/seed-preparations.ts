/**
 * Seed script: data/tpca_s_preparados.json → foods table.
 *
 * Carga el grupo S (Alimentos preparados) de TPCA 11ª edición digital 2025 (INS/CENAN).
 * Son preparaciones completas (entradas, segundos, refrescos, bebidas, postres) de la
 * encuesta CENAN+INEI de Composición Nutricional Fuera del Hogar 2008-2009, segmentadas
 * por estrato socioeconómico ENAPREF (A=más alto … E=más bajo).
 *
 * Cada preparación tiene 1 a 5 filas (una por estrato disponible). Las marcadas con * en
 * el PDF original son análisis químico parcial y vienen sin estrato.
 *
 * Esquema en BD:
 *  - code = `${codigo_base}_${estrato}` (ej. SE1_A), o `${codigo_base}` si no hay estrato
 *  - name = `${alimento} (estrato X)` cuando hay estrato; sin sufijo si no lo hay
 *  - group_letter = 'S', group_name = 'Alimentos preparados'
 *  - is_preparation = true
 *
 * Run: npx tsx scripts/seed-preparations.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type Entry = {
  codigo_base: string;
  estrato: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  subgrupo: string | null;
  alimento: string;
  energia_kcal: number | null;
  energia_kj: number | null;
  agua_g: number | null;
  proteinas_g: number | null;
  grasa_g: number | null;
  carbohidratos_totales_g: number | null;
  carbohidratos_disponibles_g: number | null;
  fibra_g: number | null;
  cenizas_g: number | null;
  calcio_mg: number | null;
  fosforo_mg: number | null;
  zinc_mg: number | null;
  hierro_mg: number | null;
  sodio_mg: number | null;
  potasio_mg: number | null;
  vitamina_a_ug: number | null;
  tiamina_mg: number | null;
  riboflavina_mg: number | null;
  niacina_mg: number | null;
  vitamina_c_mg: number | null;
  acido_folico_ug: number | null;
};

const NUTRIENT_FIELDS = [
  'energia_kcal', 'energia_kj', 'agua_g', 'proteinas_g', 'grasa_g',
  'carbohidratos_totales_g', 'carbohidratos_disponibles_g', 'fibra_g', 'cenizas_g',
  'calcio_mg', 'fosforo_mg', 'zinc_mg', 'hierro_mg', 'sodio_mg', 'potasio_mg',
  'vitamina_a_ug', 'tiamina_mg', 'riboflavina_mg', 'niacina_mg', 'vitamina_c_mg',
  'acido_folico_ug',
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing env vars');
  const supabase = createClient(url, key);

  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'tpca_s_preparados.json'), 'utf-8'),
  ) as { entries: Entry[] };

  console.log(`Loaded ${raw.entries.length} entries from JSON`);

  const rows = raw.entries.map((e) => {
    const code = e.estrato ? `${e.codigo_base}_${e.estrato}` : e.codigo_base;
    const baseName = e.alimento.replace(/\*+$/, '').trim();
    const name = e.estrato
      ? `${baseName} (estrato ${e.estrato})`
      : baseName;
    const per_100g: Record<string, number | null> = {};
    for (const f of NUTRIENT_FIELDS) per_100g[f] = e[f];
    // Field that exists in BD schema but not in S data
    per_100g['beta_caroteno_ug'] = null;
    return {
      code,
      group_letter: 'S',
      group_name: 'Alimentos preparados',
      name,
      per_100g,
      source: 'TPCA_2025_S',
      is_preparation: true,
      active: true,
    };
  });

  // Dedup by code (just in case)
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.code)) return false;
    seen.add(r.code);
    return true;
  });
  if (deduped.length !== rows.length) {
    console.warn(`Deduped ${rows.length - deduped.length} duplicate codes`);
  }
  console.log(`Inserting ${deduped.length} preparations...`);

  const BATCH = 200;
  let done = 0;
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH);
    const { error } = await supabase
      .from('foods')
      .upsert(batch, { onConflict: 'code' });
    if (error) throw new Error(`Batch ${i / BATCH + 1} failed: ${error.message}`);
    done += batch.length;
    console.log(`  ${done}/${deduped.length}`);
  }

  console.log(`✓ Seeded ${deduped.length} preparations from TPCA 2025 group S`);
}

main().catch((e) => { console.error(e); process.exit(1); });
