import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const GROUP_LABELS: Record<string, string> = {
  A: 'Cereales y panes',
  B: 'Verduras',
  C: 'Frutas',
  D: 'Grasas y aceites',
  E: 'Pescados y mariscos',
  F: 'Carnes y embutidos',
  G: 'Lácteos y huevos',
  H: 'Bebidas',
  J: 'Huevos',
  K: 'Azúcares',
  L: 'Misceláneos',
  Q: 'Infantiles',
  T: 'Leguminosas',
  U: 'Tubérculos y raíces',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: plan, error } = await supabase
    .from('meal_plans')
    .select('id, name, plan_date, meal_plan_items(grams, foods(id, code, group_letter, name))')
    .eq('id', id)
    .single();
  if (error || !plan) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 });
  }

  type Item = { grams: number; foods: { id: number; code: string; group_letter: string; name: string } | null };
  const items = (plan.meal_plan_items ?? []) as unknown as Item[];

  // Aggregate grams per food_id
  const agg = new Map<number, { code: string; group_letter: string; name: string; grams: number }>();
  for (const it of items) {
    if (!it.foods) continue;
    const fid = it.foods.id;
    const cur = agg.get(fid);
    if (cur) cur.grams += it.grams;
    else agg.set(fid, {
      code: it.foods.code,
      group_letter: it.foods.group_letter,
      name: it.foods.name,
      grams: it.grams,
    });
  }

  // Group by group_letter, sort foods by name
  const byGroup = new Map<string, Array<{ code: string; name: string; grams: number }>>();
  for (const { code, group_letter, name, grams } of agg.values()) {
    const list = byGroup.get(group_letter) ?? [];
    list.push({ code, name, grams: Math.round(grams * 10) / 10 });
    byGroup.set(group_letter, list);
  }
  const groups = [...byGroup.entries()]
    .map(([letter, foods]) => ({
      letter,
      label: GROUP_LABELS[letter] ?? letter,
      foods: foods.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter));

  // HTML response — easy to print, easy to read
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Lista de compras · ${plan.name}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 1.5rem; color: #1a1815; line-height: 1.5; }
  header { border-bottom: 1px solid #d6cfc0; padding-bottom: 1rem; margin-bottom: 1.5rem; }
  h1 { font-family: Georgia, serif; font-weight: 500; font-size: 1.75rem; margin: 0; }
  .meta { color: #5c574e; font-size: 0.85rem; margin-top: 0.25rem; }
  h2 { font-family: Georgia, serif; font-weight: 500; font-size: 1.05rem; color: #6b4423; margin: 1.5rem 0 0.5rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #efe9dd; }
  td.code { color: #6b4423; font-family: ui-monospace, monospace; font-size: 0.75rem; width: 50px; }
  td.qty  { text-align: right; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; width: 100px; color: #5c574e; }
  .empty { color: #5c574e; padding: 2rem; text-align: center; }
  @media print {
    body { margin: 0; padding: 1rem; }
    button { display: none; }
  }
  .actions { margin-top: 2rem; display: flex; gap: 0.5rem; }
  button { background: #6b4423; color: #f7f4ee; border: 0; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.85rem; cursor: pointer; }
  button.secondary { background: white; border: 1px solid #d6cfc0; color: #1a1815; }
</style>
</head>
<body>
  <header>
    <h1>Lista de compras</h1>
    <p class="meta">${plan.name} · ${plan.plan_date}</p>
  </header>
  ${
    groups.length === 0
      ? '<p class="empty">El plan no tiene alimentos todavía.</p>'
      : groups.map((g) => `
    <h2>${g.label}</h2>
    <table>
      <tbody>
        ${g.foods.map((f) => `
          <tr>
            <td class="code">${f.code}</td>
            <td>${f.name}</td>
            <td class="qty">${f.grams} g</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')
  }
  <div class="actions">
    <button onclick="window.print()">Imprimir</button>
    <button class="secondary" onclick="window.close()">Cerrar</button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
