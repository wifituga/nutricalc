/**
 * Seed script: migrates data/dris_iom.json → dri_reference table in Supabase.
 * Run: npx tsx scripts/seed-dris.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Idempotent: upserts on the (sex, age_min_months, physiological_state,
 * nutrient_key, value_type) natural key.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type DriRow = {
  sex: 'M' | 'F';
  age_min_months: number;
  age_max_months: number | null;
  physiological_state: 'standard' | 'pregnancy' | 'lactation';
  nutrient_key: string;
  value: number;
  value_type: 'RDA' | 'AI' | 'UL' | 'EAR';
  source: string;
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(url, key);

  const jsonPath = join(process.cwd(), 'data', 'dris_iom.json');
  console.log(`Reading ${jsonPath}...`);
  const parsed = JSON.parse(readFileSync(jsonPath, 'utf-8')) as { dris: DriRow[] };
  const rows = parsed.dris.map((r) => ({
    sex: r.sex,
    age_min_months: r.age_min_months,
    age_max_months: r.age_max_months,
    physiological_state: r.physiological_state,
    nutrient_key: r.nutrient_key,
    value_type: r.value_type,
    value: r.value,
    source: r.source ?? 'IOM_DRI',
  }));

  console.log(`Upserting ${rows.length} DRI records...`);

  const BATCH = 300;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('dri_reference')
      .upsert(batch, {
        onConflict: 'sex,age_min_months,physiological_state,nutrient_key,value_type',
        ignoreDuplicates: false,
      });
    if (error) throw new Error(`Batch ${i / BATCH + 1} failed: ${error.message}`);
    done += batch.length;
    console.log(`  ${done}/${rows.length}`);
  }

  console.log(`Seeded ${rows.length} DRI records`);
}

main().catch((err) => { console.error(err); process.exit(1); });
