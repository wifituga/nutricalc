/**
 * Seed: data/cooking_factors.json → food_cooking_factors.
 * Mapea el food_name_raw a foods.id por similitud aproximada.
 * Run: npx tsx scripts/seed-cooking-factors.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type Factor = {
  group: string;
  food: string;
  method: string;
  factor: number;
  from_1985: boolean;
};
type FactorsFile = { _metadata: unknown; factors: Factor[] };

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((t) => t.length >= 3));
}

function score(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  const supabase = createClient(url, key);

  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'cooking_factors.json'), 'utf-8'),
  ) as FactorsFile;

  const { data: foods, error: fErr } = await supabase
    .from('foods')
    .select('id, name, group_letter');
  if (fErr) throw new Error(`Foods lookup failed: ${fErr.message}`);

  // Group_name (TAFERA) → group_letter (TPCA)
  const groupToLetter: Record<string, string> = {
    'Cereales y derivados':           'A',
    'Verduras, hortalizas y derivados': 'B',
    'Frutas y derivados':             'C',
    'Grasas, aceites y oleaginosas':  'D',
    'Pescados y mariscos':            'E',
    'Carnes y derivados':             'F',
    'Huevos y derivados':             'J',
    'Leguminosas y derivados':        'T',
    'Tubérculos, raíces y derivados': 'U',
  };

  const rows = raw.factors.map((f) => {
    const letter = groupToLetter[f.group];
    const candidates = (foods ?? []).filter((x) => x.group_letter === letter);
    let best: { id: number; name: string; s: number } | null = null;
    for (const c of candidates) {
      const s = score(f.food, c.name as string);
      if (s >= 0.5 && (!best || s > best.s)) best = { id: c.id as number, name: c.name as string, s };
    }
    return {
      food_id: best?.id ?? null,
      food_name_raw: f.food,
      group_name: f.group,
      cooking_method: f.method,
      factor: f.factor,
      from_1985: f.from_1985,
      notes: best ? `auto-mapped to "${best.name}" (score ${best.s.toFixed(2)})` : null,
    };
  });

  const mapped = rows.filter((r) => r.food_id != null).length;
  console.log(`Total factors: ${rows.length} · mapped to food_id: ${mapped} · unmapped: ${rows.length - mapped}`);

  const BATCH = 100;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('food_cooking_factors')
      .upsert(batch, { onConflict: 'food_id,cooking_method', ignoreDuplicates: false });
    if (error) {
      // food_id null entries can't be deduped by the unique constraint, so insert plain
      console.warn(`Batch ${i / BATCH + 1} upsert failed: ${error.message}; trying plain insert`);
      const { error: e2 } = await supabase.from('food_cooking_factors').insert(batch);
      if (e2) throw new Error(e2.message);
    }
    done += batch.length;
    console.log(`  ${done}/${rows.length}`);
  }

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
