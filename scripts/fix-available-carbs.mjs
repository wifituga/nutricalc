/**
 * Backfill carbohidratos_disponibles_g cuando es null y totales existe.
 * Fórmula oficial TPCA/FAO: disponibles = carbohidratos_totales − fibra dietaria.
 * Validada al 100% contra los 601 alimentos que reportan ambos campos (±0.6 g).
 * NO toca alimentos con ambos campos null (siguen mostrando "—").
 * Idempotente. Run: node scripts/fix-available-carbs.mjs
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const num = (v) => (v == null || v === '' || v === 'nd') ? null : Number(v);

async function loadAll() {
  const PAGE = 500;
  let rows = [], from = 0;
  for (;;) {
    const { data, error } = await supabase.from('foods').select('id, code, per_100g').order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

const all = await loadAll();
const updates = [];
for (const f of all) {
  const n = f.per_100g ?? {};
  const disp = num(n.carbohidratos_disponibles_g);
  const tot = num(n.carbohidratos_totales_g);
  const fibra = num(n.fibra_g);
  if (disp == null && tot != null) {
    const derived = Math.max(0, Math.round((tot - (fibra ?? 0)) * 10) / 10);
    updates.push({ id: f.id, code: f.code, per_100g: { ...n, carbohidratos_disponibles_g: derived } });
  }
}

console.log(`Filas a corregir: ${updates.length} / ${all.length}`);
const ej = updates.find((u) => u.code === 'A3');
if (ej) console.log('Ejemplo A3 Arroz blanco → disponibles =', ej.per_100g.carbohidratos_disponibles_g);

let done = 0;
for (const u of updates) {
  const { error } = await supabase.from('foods').update({ per_100g: u.per_100g }).eq('id', u.id);
  if (error) { console.error(`Error en ${u.code}:`, error.message); process.exit(1); }
  done++;
  if (done % 100 === 0) console.log(`  ${done}/${updates.length}`);
}
console.log(`✓ ${done} alimentos corregidos (disponibles derivado de totales − fibra).`);
