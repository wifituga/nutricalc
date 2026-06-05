/**
 * Seed script: migrates data/tpca_2023.json → foods table in Supabase.
 * Run: npx tsx scripts/seed-foods.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { deriveAvailableCarbs } from './lib/availableCarbs';

dotenv.config({ path: '.env.local' });

const NUTRIENT_FIELDS = [
  'energia_kcal', 'energia_kj', 'agua_g', 'proteinas_g', 'grasa_g',
  'carbohidratos_totales_g', 'carbohidratos_disponibles_g', 'fibra_g', 'cenizas_g',
  'calcio_mg', 'fosforo_mg', 'zinc_mg', 'hierro_mg', 'sodio_mg', 'potasio_mg',
  'beta_caroteno_ug', 'vitamina_a_ug', 'tiamina_mg', 'riboflavina_mg',
  'niacina_mg', 'vitamina_c_mg', 'acido_folico_ug',
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(url, key);

  const jsonPath = join(process.cwd(), 'data', 'tpca_2023.json');
  console.log(`Reading ${jsonPath}...`);
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>[];

  const foods = raw.map((item) => {
    const per_100g: Record<string, number | null> = {};
    for (const field of NUTRIENT_FIELDS) {
      const val = item[field];
      per_100g[field] = (val == null || val === '' || val === 'nd') ? null : Number(val);
    }
    deriveAvailableCarbs(per_100g);

    return {
      code: String(item.codigo),
      group_letter: String(item.grupo_letra),
      group_name: String(item.grupo),
      name: String(item.alimento),
      per_100g,
      source: 'TPCA_2023',
      is_preparation: false,
      active: true,
    };
  });

  console.log(`Inserting ${foods.length} foods...`);

  // Batch inserts (Supabase limit: 1000 rows per request)
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < foods.length; i += BATCH) {
    const batch = foods.slice(i, i + BATCH);
    const { error } = await supabase
      .from('foods')
      .upsert(batch, { onConflict: 'code' });

    if (error) throw new Error(`Batch ${i / BATCH + 1} failed: ${error.message}`);
    inserted += batch.length;
    console.log(`  ${inserted}/${foods.length}`);
  }

  console.log('✓ Foods seeded successfully.');
}

main().catch((err) => { console.error(err); process.exit(1); });
