'use client';

import { useEffect, useState } from 'react';
import type { Food, MealPlanItem, HouseholdMeasure } from '@/lib/types';

type Item = MealPlanItem & { foods: Food };
type Patch = { grams: number; household_measure_id?: number | null; household_measure_qty?: number | null };

interface Props {
  items: Item[];
  onUpdateItem: (itemId: string, patch: Patch) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

export default function MealSection({ items, onUpdateItem, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--rule)' }}
      >
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Busca un alimento y agrégalo a esta comida.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--paper-warm)' }}>
          <tr>
            <th className="text-left px-3 py-2 font-medium w-16" style={{ color: 'var(--ink-soft)' }}>Código</th>
            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--ink-soft)' }}>Alimento</th>
            <th className="text-left px-3 py-2 font-medium w-56" style={{ color: 'var(--ink-soft)' }}>Cantidad</th>
            <th className="text-right px-3 py-2 font-medium w-20" style={{ color: 'var(--ink-soft)' }}>kcal</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <FoodRow key={item.id} item={item} onUpdateItem={onUpdateItem} onRemove={onRemove} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FoodRow({ item, onUpdateItem, onRemove }: {
  item: Item;
  onUpdateItem: (id: string, patch: Patch) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [measures, setMeasures] = useState<HouseholdMeasure[]>([]);
  const [unit, setUnit] = useState<string>(
    item.household_measure_id ? String(item.household_measure_id) : 'grams',
  );
  const [grams, setGrams] = useState(item.grams);
  const [qty, setQty] = useState(item.household_measure_qty ?? 1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/foods/${item.food_id}/measures`)
      .then((r) => r.ok ? r.json() : { measures: [] })
      .then((d) => { if (!cancelled) setMeasures(d.measures ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.food_id]);

  const selectedMeasure = unit !== 'grams'
    ? measures.find((m) => String(m.id) === unit)
    : undefined;
  const effectiveGrams = selectedMeasure ? selectedMeasure.grams * qty : grams;

  const kcal = item.foods.per_100g.energia_kcal != null
    ? Math.round(item.foods.per_100g.energia_kcal * effectiveGrams / 100)
    : null;

  async function persist(patch: Patch) {
    setSaving(true);
    await onUpdateItem(item.id, patch);
    setSaving(false);
  }

  function onUnitChange(value: string) {
    setUnit(value);
    if (value === 'grams') {
      persist({ grams, household_measure_id: null, household_measure_qty: null });
    } else {
      const m = measures.find((x) => String(x.id) === value);
      if (m) persist({ grams: m.grams * qty, household_measure_id: m.id, household_measure_qty: qty });
    }
  }

  function onQtyBlur() {
    if (selectedMeasure) {
      persist({
        grams: selectedMeasure.grams * qty,
        household_measure_id: selectedMeasure.id,
        household_measure_qty: qty,
      });
    }
  }

  function onGramsBlur() {
    if (!selectedMeasure && grams !== item.grams) {
      persist({ grams, household_measure_id: null, household_measure_qty: null });
    }
  }

  return (
    <tr className="border-t" style={{ borderColor: 'var(--rule)' }}>
      <td className="px-3 py-2">
        <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{item.foods.code}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-sm" style={{ color: 'var(--ink)' }} title={item.foods.name}>
          {item.foods.name.length > 45 ? item.foods.name.slice(0, 45) + '…' : item.foods.name}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          {selectedMeasure ? (
            <input
              type="number" min={0} step={0.25} value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              onBlur={onQtyBlur}
              className="font-mono text-sm w-14 px-2 py-0.5 rounded border focus:outline-none"
              style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: saving ? 'var(--ink-soft)' : 'var(--ink)' }}
            />
          ) : (
            <input
              type="number" min={0} step={1} value={grams}
              onChange={(e) => setGrams(Number(e.target.value))}
              onBlur={onGramsBlur}
              className="font-mono text-sm w-16 px-2 py-0.5 rounded border focus:outline-none"
              style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: saving ? 'var(--ink-soft)' : 'var(--ink)' }}
            />
          )}
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="text-xs px-1 py-0.5 rounded border focus:outline-none max-w-[8.5rem]"
            style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            <option value="grams">gramos</option>
            {measures.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.measure_name} ({m.grams} g)
              </option>
            ))}
          </select>
          {selectedMeasure && (
            <span className="text-xs font-mono" style={{ color: 'var(--ink-soft)' }}>
              = {Math.round(effectiveGrams)} g
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
        {kcal ?? '—'}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => onRemove(item.id)}
          className="text-xs hover:opacity-60"
          style={{ color: 'var(--danger)' }}
          title="Eliminar"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
