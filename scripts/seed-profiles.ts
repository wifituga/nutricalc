/**
 * Seed script: inserts system nutrient profiles → nutrient_profiles table.
 * Run: npx tsx scripts/seed-profiles.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SYSTEM_PROFILES } from '../src/lib/profiles';

dotenv.config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(url, key);

  const rows = Object.entries(SYSTEM_PROFILES).map(([id, profile]) => ({
    id,
    name: profile.name,
    limits: profile.limits,
    is_system: true,
    clinic_id: null,
  }));

  const { error } = await supabase
    .from('nutrient_profiles')
    .upsert(rows, { onConflict: 'id' });

  if (error) throw new Error(`Failed: ${error.message}`);
  console.log(`✓ ${rows.length} profiles seeded.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
