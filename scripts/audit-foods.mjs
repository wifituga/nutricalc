/**
 * Auditoría de integridad de la tabla foods contra las fuentes TPCA.
 * Lectura-only. Run: node scripts/audit-foods.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const num = (v) => (v == null || v === '' || v === 'nd') ? null : Number(v);

async function loadAll() {
  const PAGE = 500;
  let rows = [], from = 0;
  for (;;) {
    const { data, error } = await supabase.from('foods')
      .select('id, code, name, group_letter, source, is_preparation, active, per_100g')
      .order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

const NUTRIENTS = [
  'energia_kcal','energia_kj','agua_g','proteinas_g','grasa_g','carbohidratos_totales_g',
  'carbohidratos_disponibles_g','fibra_g','cenizas_g','calcio_mg','fosforo_mg','zinc_mg',
  'hierro_mg','sodio_mg','potasio_mg','beta_caroteno_ug','vitamina_a_ug','tiamina_mg',
  'riboflavina_mg','niacina_mg','vitamina_c_mg','acido_folico_ug',
];

const all = await loadAll();
const active = all.filter((f) => f.active);
console.log('═══ AUDITORÍA foods ═══');
console.log('Total filas:', all.length, '| activas:', active.length);
const bySource = {};
for (const f of active) bySource[f.source] = (bySource[f.source] ?? 0) + 1;
console.log('Por source:', JSON.stringify(bySource));

// 1) carb gap
let carbGap = 0, carbBothNull = 0;
for (const f of active) {
  const t = num(f.per_100g?.carbohidratos_totales_g), p = num(f.per_100g?.carbohidratos_disponibles_g);
  if (p == null && t != null) carbGap++;
  if (p == null && t == null) carbBothNull++;
}
console.log('\n── Carbohidratos ──');
console.log('disponibles=null pero totales presente (se ven SIN carbs):', carbGap);
console.log('ambos null (sin dato legítimo, "—"):', carbBothNull);

// 2) valores imposibles
const issues = [];
for (const f of active) {
  const n = f.per_100g ?? {};
  for (const k of NUTRIENTS) {
    const v = num(n[k]);
    if (v != null && v < 0) issues.push(`${f.code} ${k} negativo: ${v}`);
  }
  const kcal = num(n.energia_kcal), prot = num(n.proteinas_g), fat = num(n.grasa_g), cho = num(n.carbohidratos_disponibles_g) ?? num(n.carbohidratos_totales_g);
  // Atwater aproximado: kcal ≈ 4*prot + 9*fat + 4*cho (tolerancia amplia ±35%)
  if (kcal != null && kcal > 5 && prot != null && fat != null && cho != null) {
    const est = 4*prot + 9*fat + 4*cho;
    if (est > 5 && Math.abs(est - kcal) / kcal > 0.5) {
      issues.push(`${f.code} ${f.name.slice(0,30)} kcal=${kcal} vs Atwater=${est.toFixed(0)} (Δ${(Math.abs(est-kcal)/kcal*100).toFixed(0)}%)`);
    }
  }
}
console.log('\n── Valores sospechosos ──');
console.log('negativos:', issues.filter((i)=>i.includes('negativo')).length);
const atwater = issues.filter((i)=>i.includes('Atwater'));
console.log('desajuste energético >50% (Atwater):', atwater.length);
atwater.slice(0, 10).forEach((i) => console.log('  ', i));

// 3) nulls por nutriente
console.log('\n── Nulls por nutriente (sobre activas) ──');
for (const k of NUTRIENTS) {
  const nulls = active.filter((f) => num(f.per_100g?.[k]) == null).length;
  if (nulls > 0) console.log(`  ${k}: ${nulls} null (${(nulls/active.length*100).toFixed(0)}%)`);
}

// 4) cross-check contra fuente JSON (TPCA 2023 individual)
console.log('\n── Cross-check vs data/tpca_2023.json ──');
const src = JSON.parse(readFileSync(join(process.cwd(), 'data', 'tpca_2023.json'), 'utf-8'));
const srcByCode = new Map(src.map((x) => [String(x.codigo), x]));
let checked = 0, mismatches = 0;
const sampleKeys = ['energia_kcal','proteinas_g','grasa_g','carbohidratos_totales_g','hierro_mg','sodio_mg'];
for (const f of active.filter((x) => x.source === 'TPCA_2023')) {
  const s = srcByCode.get(f.code);
  if (!s) continue;
  checked++;
  for (const k of sampleKeys) {
    const dbv = num(f.per_100g?.[k]), sv = num(s[k]);
    if (dbv == null && sv == null) continue;
    if (dbv == null || sv == null || Math.abs(dbv - sv) > 0.05) {
      mismatches++;
      if (mismatches <= 10) console.log(`  ${f.code} ${k}: BD=${dbv} fuente=${sv}`);
    }
  }
}
console.log(`Comparados ${checked} alimentos × ${sampleKeys.length} campos · discrepancias: ${mismatches}`);

// 5) arroz spot-check
console.log('\n── Spot-check arroz ──');
for (const f of active.filter((x) => x.name.toLowerCase().includes('arroz')).slice(0, 6)) {
  const n = f.per_100g ?? {};
  console.log(`  ${f.code} ${f.name.slice(0,32)} | kcal:${n.energia_kcal} tot:${n.carbohidratos_totales_g} disp:${n.carbohidratos_disponibles_g} fibra:${n.fibra_g}`);
}
