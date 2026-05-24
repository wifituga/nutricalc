'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, CheckCircle2 } from 'lucide-react';
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
const SHORT_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  media_manana: 'Media mañana',
  almuerzo: 'Almuerzo',
  media_tarde: 'Media tarde',
  cena: 'Cena',
};

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
        className="px-4 py-3 border-b flex items-center justify-between gap-2"
        style={{ borderColor: 'var(--rule)' }}
      >
        <p className="font-display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Distribución por comida
        </p>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1 text-xs font-mono"
            style={{ color: sum === 100 ? 'var(--ok)' : 'var(--warn)' }}
          >
            {sum === 100 && <CheckCircle2 size={12} />} Σ {sum}%
          </span>
          <button
            onClick={() => setDist(MEAL_DISTRIBUTION_DEFAULT)}
            title="Restaurar 25/10/30/10/25"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-[color:var(--paper)]"
            style={{ color: 'var(--ink-soft)' }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        <ul className="space-y-1.5">
          {targets.map((t) => {
            const actual = actualByMeal.get(t.slot)!;
            const delta = actual.kcal - t.kcal;
            const off = t.kcal > 0 && Math.abs(delta) / t.kcal > 0.15;
            const progress = t.kcal > 0 ? Math.min(100, (actual.kcal / t.kcal) * 100) : 0;
            return (
              <li
                key={t.slot}
                className="rounded-md bg-white border px-3 py-2"
                style={{ borderColor: 'var(--rule)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium flex-1 truncate"
                    style={{ color: 'var(--ink)' }}
                  >
                    {SHORT_LABELS[t.slot]}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={t.pct}
                      onChange={(e) => setPct(t.slot, Number(e.target.value) || 0)}
                      aria-label={`% ${SHORT_LABELS[t.slot]}`}
                      className="w-12 px-1.5 py-0.5 rounded border text-right font-mono text-xs"
                      style={{
                        background: 'var(--paper)',
                        borderColor: 'var(--rule)',
                        color: 'var(--ink)',
                      }}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--ink-soft)' }}>%</span>
                  </div>
                </div>

                {/* progress bar */}
                <div
                  className="mt-1.5 h-1 rounded-full overflow-hidden"
                  style={{ background: 'var(--paper-warm)' }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: off ? 'var(--warn)' : 'var(--accent)',
                    }}
                  />
                </div>

                <div
                  className="flex items-center justify-between mt-1 text-[11px] font-mono"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  <span>
                    {actual.kcal} / {t.kcal} kcal
                    {t.kcal > 0 && (
                      <span
                        className="ml-1"
                        style={{ color: off ? 'var(--warn)' : 'var(--ink-soft)' }}
                      >
                        ({delta >= 0 ? '+' : ''}{delta})
                      </span>
                    )}
                  </span>
                  <span title={`P ${t.prot_g} g · C ${t.cho_g} g · G ${t.fat_g} g`}>
                    P{t.prot_g} · C{t.cho_g} · G{t.fat_g}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

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
