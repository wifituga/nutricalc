'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import type { Food, MealPlan, MealPlanItem, Patient, ProfileLimits } from '@/lib/types';
import { MEAL_LABELS, MEAL_SLOTS, calculateTotals, getAlertLevel, NUTRIENT_LABELS, PRIMARY_NUTRIENTS } from '@/lib/nutrition';
import FoodSearch from './FoodSearch';
import MealSection from './MealSection';
import TotalsPanel from './TotalsPanel';

interface Props {
  plan: MealPlan;
  patient: Patient;
  initialItems: (MealPlanItem & { foods: Food })[];
  profileLimits: ProfileLimits;
  profileName: string;
}

export default function PlanBuilder({ plan, patient, initialItems, profileLimits, profileName }: Props) {
  const [items, setItems] = useState<(MealPlanItem & { foods: Food })[]>(initialItems);
  const [activeMeal, setActiveMeal] = useState<string>('desayuno');
  const [isPending, startTransition] = useTransition();
  const [planName, setPlanName] = useState(plan.name);
  const [planDate, setPlanDate] = useState(plan.plan_date);
  const [saving, setSaving] = useState(false);

  const foodsMap = new Map<number, Food>(items.map((i) => [i.food_id, i.foods]));
  const totals = calculateTotals(items, foodsMap);

  const addFood = useCallback(async (food: Food) => {
    const res = await fetch('/api/plans/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meal_plan_id: plan.id,
        food_id: food.id,
        meal: activeMeal,
        grams: 100,
        position: items.filter((i) => i.meal === activeMeal).length,
      }),
    });
    if (!res.ok) return;
    const newItem = (await res.json()) as MealPlanItem & { foods: Food };
    startTransition(() => setItems((prev) => [...prev, newItem]));
  }, [plan.id, activeMeal, items]);

  const updateGrams = useCallback(async (itemId: string, grams: number) => {
    const res = await fetch(`/api/plans/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grams }),
    });
    if (!res.ok) return;
    const updated = await res.json() as MealPlanItem & { foods: Food };
    setItems((prev) => prev.map((i) => i.id === itemId ? updated : i));
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    await fetch(`/api/plans/items/${itemId}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  async function savePlanMeta() {
    setSaving(true);
    await fetch(`/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: planName, plan_date: planDate }),
    });
    setSaving(false);
  }

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Left: plan builder */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/patients/${patient.id}`} className="text-xs hover:underline shrink-0" style={{ color: 'var(--ink-soft)' }}>
            ← {patient.full_name}
          </Link>
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            onBlur={savePlanMeta}
            className="font-display text-xl font-semibold bg-transparent border-b focus:outline-none min-w-0 flex-1"
            style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}
          />
          <input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            onBlur={savePlanMeta}
            className="font-mono text-sm bg-transparent border rounded px-2 py-1 focus:outline-none"
            style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}
          />
          <a
            href={`/api/plans/${plan.id}/pdf`}
            target="_blank"
            className="px-3 py-1.5 rounded border text-sm font-medium"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            Exportar PDF
          </a>
        </div>

        {/* Meal tabs */}
        <div className="flex gap-1 border-b" style={{ borderColor: 'var(--rule)' }}>
          {MEAL_SLOTS.map((slot) => {
            const active = slot === activeMeal;
            const count = items.filter((i) => i.meal === slot).length;
            return (
              <button
                key={slot}
                onClick={() => setActiveMeal(slot)}
                className="px-4 py-2 text-sm font-display transition-colors relative"
                style={{
                  color: active ? 'var(--accent)' : 'var(--ink-soft)',
                  fontWeight: active ? 600 : 400,
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {MEAL_LABELS[slot]}
                {count > 0 && (
                  <span
                    className="ml-1.5 font-mono text-xs"
                    style={{ color: 'var(--ink-soft)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Food search */}
        <FoodSearch onSelect={addFood} />

        {/* Meal items */}
        <MealSection
          items={items.filter((i) => i.meal === activeMeal)}
          onUpdateGrams={updateGrams}
          onRemove={removeItem}
        />
      </div>

      {/* Right: totals panel */}
      <div className="w-72 shrink-0">
        <TotalsPanel totals={totals} profileLimits={profileLimits} profileName={profileName} />
      </div>
    </div>
  );
}
