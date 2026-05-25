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

  // Paginated foods load (Supabase server limit is 1000 rows/req)
  const foods: { id: number; name: string; group_letter: string }[] = [];
  const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('foods')
      .select('id, name, group_letter')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Foods lookup failed at offset ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    foods.push(...(data as typeof foods));
    if (data.length < PAGE) break;
  }
  console.log(`Foods loaded: ${foods.length}`);

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

  type Row = {
    food_id: number | null;
    food_name_raw: string;
    group_name: string;
    cooking_method: string;
    factor: number;
    from_1985: boolean;
    notes: string | null;
  };

  // First pass: score-best mapping per entry
  const provisional: Row[] = raw.factors.map((f) => {
    const letter = groupToLetter[f.group];
    const candidates = foods.filter((x) => x.group_letter === letter);
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

  // Second pass: avoid (food_id, cooking_method) collisions — the unique constraint
  // doesn't allow them. Keep the first mapped row for each (food_id, method) key
  // and demote subsequent ones to food_id=null (still searchable via group fallback).
  const seen = new Set<string>();
  let demoted = 0;
  const rows: Row[] = provisional.map((r) => {
    if (r.food_id == null) return r;
    const key = `${r.food_id}|${r.cooking_method}`;
    if (seen.has(key)) {
      demoted++;
      return { ...r, food_id: null, notes: `${r.notes ?? ''} · demoted (collision)` };
    }
    seen.add(key);
    return r;
  });

  const mapped = rows.filter((r) => r.food_id != null).length;
  console.log(`Total factors: ${rows.length} · mapped: ${mapped} · group-only: ${rows.length - mapped} (${demoted} demoted by collision)`);

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
