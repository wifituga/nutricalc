'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
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
        className="rounded-lg border border-dashed p-10 text-center"
        style={{ borderColor: 'var(--rule)' }}
      >
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Busca un alimento y agrégalo a esta comida.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="rounded-lg border overflow-hidden bg-white"
      style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
    >
      {items.map((item, idx) => (
        <FoodRow
          key={item.id}
          item={item}
          isFirst={idx === 0}
          onUpdateItem={onUpdateItem}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}

function FoodRow({
  item, isFirst, onUpdateItem, onRemove,
}: {
  item: Item;
  isFirst: boolean;
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
  const [confirming, setConfirming] = useState(false);

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
  const prot = item.foods.per_100g.proteinas_g != null
    ? Math.round(item.foods.per_100g.proteinas_g * effectiveGrams / 100 * 10) / 10
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
    <li
      className={`px-4 py-3 ${isFirst ? '' : 'border-t'} row-hover`}
      style={{ borderColor: 'var(--rule)' }}
    >
      <div className="flex items-start gap-3">
        {/* Left: name + code */}
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[11px] shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              {item.foods.code}
            </span>
            <span
              className="text-sm leading-snug truncate"
              style={{ color: 'var(--ink)' }}
              title={item.foods.name}
            >
              {item.foods.name}
            </span>
          </div>
          <div
            className="flex items-center gap-3 mt-1 text-xs font-mono"
            style={{ color: 'var(--ink-soft)' }}
          >
            <span style={{ color: 'var(--ink)' }}>{kcal ?? '—'} kcal</span>
            {prot != null && <span>· {prot} g prot</span>}
            {selectedMeasure && (
              <span>· {Math.round(effectiveGrams)} g</span>
            )}
          </div>
        </div>

        {/* Center: quantity controls — generous space, vertical stack */}
        <div className="shrink-0 w-[220px]">
          <div className="flex items-center gap-1.5">
            {selectedMeasure ? (
              <input
                type="number" min={0} step={0.25} value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                onBlur={onQtyBlur}
                aria-label="Cantidad"
                className="font-mono text-sm w-16 px-2 py-1.5 rounded border"
                style={{
                  background: 'var(--paper)',
                  borderColor: 'var(--rule)',
                  color: saving ? 'var(--ink-soft)' : 'var(--ink)',
                }}
              />
            ) : (
              <input
                type="number" min={0} step={1} value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                onBlur={onGramsBlur}
                aria-label="Gramos"
                className="font-mono text-sm w-20 px-2 py-1.5 rounded border"
                style={{
                  background: 'var(--paper)',
                  borderColor: 'var(--rule)',
                  color: saving ? 'var(--ink-soft)' : 'var(--ink)',
                }}
              />
            )}
            <select
              value={unit}
              onChange={(e) => onUnitChange(e.target.value)}
              aria-label="Unidad de medida"
              className="flex-1 text-xs px-2 py-1.5 rounded border min-w-0"
              style={{
                background: 'var(--paper)',
                borderColor: 'var(--rule)',
                color: 'var(--ink)',
              }}
            >
              <option value="grams">gramos</option>
              {measures.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.measure_name}
                </option>
              ))}
            </select>
          </div>
          {selectedMeasure && (
            <p
              className="text-[10px] mt-1 font-mono"
              style={{ color: 'var(--ink-soft)' }}
            >
              1 {selectedMeasure.measure_name.toLowerCase()} = {selectedMeasure.grams} g
            </p>
          )}
        </div>

        {/* Right: delete */}
        <div className="shrink-0 pt-1">
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRemove(item.id)}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: 'var(--danger)', color: 'var(--paper)' }}
              >
                Eliminar
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2 py-1 rounded text-xs"
                style={{ color: 'var(--ink-soft)' }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              aria-label={`Eliminar ${item.foods.name}`}
              title="Eliminar"
              className="p-2 rounded-md transition-colors hover:bg-[color:var(--paper-warm)]"
              style={{ color: 'var(--ink-soft)' }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
