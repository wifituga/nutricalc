'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { Food, MealPlanItem } from '@/lib/types';
import { calculateTotals, MEAL_LABELS } from '@/lib/nutrition';
import {
  MEAL_DISTRIBUTION_DEFAULT,
  buildMealTargets,
  distributionSum,
  type MealSlot,
} from '@/lib/calculations/mealDistribution';
import type { MacroBreakdown } from '@/lib/calculations/macroDistribution';

interface Props {
  vctKcal: number;
  macros: MacroBreakdown;
  items: (MealPlanItem & { foods: Food })[];
}

const SLOTS: MealSlot[] = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena'];

export default function MealDistributionPanel({ vctKcal, macros, items }: Props) {
  const [dist, setDist] = useState<Record<MealSlot, number>>(MEAL_DISTRIBUTION_DEFAULT);

  const targets = buildMealTargets(vctKcal, macros, dist);
  const sum = distributionSum(dist);

  const actualByMeal = useMemo(() => {
    const map = new Map<MealSlot, { kcal: number; prot: number; cho: number; fat: number }>();
    for (const slot of SLOTS) {
      const slotItems = items.filter((i) => i.meal === slot);
      const foodsMap = new Map<number, Food>(slotItems.map((i) => [i.food_id, i.foods]));
      const t = calculateTotals(slotItems, foodsMap);
      map.set(slot, {
        kcal: Math.round(t.energia_kcal?.value ?? 0),
        prot: Math.round((t.proteinas_g?.value ?? 0) * 10) / 10,
        cho: Math.round((t.carbohidratos_disponibles_g?.value ?? 0) * 10) / 10,
        fat: Math.round((t.grasa_g?.value ?? 0) * 10) / 10,
      });
    }
    return map;
  }, [items]);

  const setPct = (slot: MealSlot, value: number) => {
    setDist((prev) => ({ ...prev, [slot]: Math.max(0, Math.min(100, value)) }));
  };

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--rule)' }}
      >
        <p className="font-display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Distribución por comida
        </p>
        <button
          onClick={() => setDist(MEAL_DISTRIBUTION_DEFAULT)}
          title="Restaurar 25/10/30/10/25"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{ color: 'var(--ink-soft)' }}
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      <div className="px-4 py-3">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--ink-soft)' }}>
              <th className="text-left font-normal pb-1">Comida</th>
              <th className="text-right font-normal pb-1">%</th>
              <th className="text-right font-normal pb-1">kcal meta</th>
              <th className="text-right font-normal pb-1">P · C · G (g)</th>
              <th className="text-right font-normal pb-1">Actual</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => {
              const actual = actualByMeal.get(t.slot)!;
              const delta = actual.kcal - t.kcal;
              const off = t.kcal > 0 && Math.abs(delta) / t.kcal > 0.15;
              return (
                <tr key={t.slot} className="border-t" style={{ borderColor: 'var(--rule)' }}>
                  <td className="py-1.5" style={{ color: 'var(--ink)' }}>
                    {MEAL_LABELS[t.slot]}
                  </td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={t.pct}
                      onChange={(e) => setPct(t.slot, Number(e.target.value) || 0)}
                      className="w-12 px-1 py-0.5 rounded border text-right font-mono"
                      style={{
                        background: 'var(--paper)',
                        borderColor: 'var(--rule)',
                        color: 'var(--ink)',
                      }}
                    />
                  </td>
                  <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink)' }}>
                    {t.kcal}
                  </td>
                  <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>
                    {t.prot_g} · {t.cho_g} · {t.fat_g}
                  </td>
                  <td
                    className="py-1.5 text-right font-mono"
                    style={{ color: off ? 'var(--warn)' : 'var(--ink-soft)' }}
                    title={`Actual: ${actual.kcal} kcal · P${actual.prot} C${actual.cho} G${actual.fat}`}
                  >
                    {actual.kcal}
                    {t.kcal > 0 && (
                      <span className="ml-1 text-[10px]">
                        ({delta >= 0 ? '+' : ''}{delta})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t" style={{ borderColor: 'var(--rule)' }}>
              <td className="pt-2 font-semibold" style={{ color: 'var(--ink)' }}>Suma</td>
              <td
                className="pt-2 text-right font-mono font-semibold"
                style={{ color: sum === 100 ? 'var(--ok)' : 'var(--warn)' }}
              >
                {sum}%
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>

        {sum !== 100 && (
          <div
            className="mt-3 px-3 py-2 border rounded-md text-xs flex items-start gap-2"
            style={{ background: '#fdf6e3', borderColor: 'var(--warn)', color: '#7a5a00' }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>Los porcentajes suman {sum}%. Ajusta para que sumen 100%.</p>
          </div>
        )}
      </div>
    </div>
  );
}
