'use client';

import { useState } from 'react';
import type { Food, MealPlanItem } from '@/lib/types';

type Item = MealPlanItem & { foods: Food };

interface Props {
  items: Item[];
  onUpdateGrams: (itemId: string, grams: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

export default function MealSection({ items, onUpdateGrams, onRemove }: Props) {
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
            <th className="text-right px-3 py-2 font-medium w-28" style={{ color: 'var(--ink-soft)' }}>Gramos</th>
            <th className="text-right px-3 py-2 font-medium w-20" style={{ color: 'var(--ink-soft)' }}>kcal</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <FoodRow
              key={item.id}
              item={item}
              onUpdateGrams={onUpdateGrams}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FoodRow({ item, onUpdateGrams, onRemove }: {
  item: Item;
  onUpdateGrams: (id: string, g: number) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [grams, setGrams] = useState(item.grams);
  const [saving, setSaving] = useState(false);

  const kcal = item.foods.per_100g.energia_kcal != null
    ? Math.round(item.foods.per_100g.energia_kcal * grams / 100)
    : null;

  async function handleBlur() {
    if (grams === item.grams) return;
    setSaving(true);
    await onUpdateGrams(item.id, grams);
    setSaving(false);
  }

  return (
    <tr className="border-t" style={{ borderColor: 'var(--rule)' }}>
      <td className="px-3 py-2">
        <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
          {item.foods.code}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="text-sm" style={{ color: 'var(--ink)' }} title={item.foods.name}>
          {item.foods.name.length > 55 ? item.foods.name.slice(0, 55) + '…' : item.foods.name}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          min={0}
          step={1}
          value={grams}
          onChange={(e) => setGrams(Number(e.target.value))}
          onBlur={handleBlur}
          className="font-mono text-sm text-right w-20 px-2 py-0.5 rounded border focus:outline-none"
          style={{
            background: 'var(--paper)',
            borderColor: 'var(--rule)',
            color: saving ? 'var(--ink-soft)' : 'var(--ink)',
          }}
        />
        <span className="ml-1 text-xs" style={{ color: 'var(--ink-soft)' }}>g</span>
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
