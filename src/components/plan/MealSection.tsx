'use client';

import { useEffect, useState } from 'react';
import { Trash2, Shuffle, Flame } from 'lucide-react';
import type { Food, MealPlanItem, HouseholdMeasure, CookingFactor } from '@/lib/types';
import SubstitutesPopover from './SubstitutesPopover';

type Item = MealPlanItem & { foods: Food };
type Patch = {
  grams?: number;
  household_measure_id?: number | null;
  household_measure_qty?: number | null;
  cooking_factor_id?: string | null;
};

interface Props {
  items: Item[];
  onUpdateItem: (itemId: string, patch: Patch) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  onSubstitute?: (itemId: string, newFoodId: number) => Promise<void>;
}

function computeSummary(items: Item[], factorsById: Map<string, number>) {
  let kcal = 0, prot = 0, fat = 0, cho = 0, grams = 0;
  for (const it of items) {
    grams += it.grams;
    const factor = it.cooking_factor_id ? factorsById.get(it.cooking_factor_id) ?? 1 : 1;
    const nutrG = it.grams * factor;
    const p = it.foods.per_100g;
    const k = p.energia_kcal != null ? p.energia_kcal * nutrG / 100 : 0;
    const pr = p.proteinas_g != null ? p.proteinas_g * nutrG / 100 : 0;
    const f = p.grasa_g != null ? p.grasa_g * nutrG / 100 : 0;
    const c = p.carbohidratos_disponibles_g != null ? p.carbohidratos_disponibles_g * nutrG / 100 : 0;
    kcal += k; prot += pr; fat += f; cho += c;
  }
  return {
    kcal: Math.round(kcal),
    prot: Math.round(prot * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    cho: Math.round(cho * 10) / 10,
    grams: Math.round(grams),
  };
}

export default function MealSection({ items, onUpdateItem, onRemove, onSubstitute }: Props) {
  // Fetch all factors used by items so subtotal can apply them
  const [factorsById, setFactorsById] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const ids = items.map((i) => i.cooking_factor_id).filter((x): x is string => !!x);
    if (ids.length === 0) {
      setFactorsById(new Map());
      return;
    }
    // Use a tiny inline endpoint via the per-food query (cooking-factors). Aggregate from items' foods.
    // Simpler: do one fetch per unique food. They are usually few.
    const uniqFoodIds = [...new Set(items.filter((i) => i.cooking_factor_id).map((i) => i.food_id))];
    Promise.all(uniqFoodIds.map((fid) =>
      fetch(`/api/foods/${fid}/cooking-factors`).then((r) => r.ok ? r.json() : { factors: [] }),
    )).then((results) => {
      const map = new Map<string, number>();
      for (const r of results) {
        for (const f of (r.factors ?? []) as CookingFactor[]) {
          map.set(f.id, f.factor);
        }
      }
      setFactorsById(map);
    });
  }, [items]);

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

  const summary = computeSummary(items, factorsById);

  return (
    <div
      className="rounded-lg border overflow-hidden bg-white"
      style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
    >
      <ul>
        {items.map((item, idx) => (
          <FoodRow
            key={item.id}
            item={item}
            isFirst={idx === 0}
            onUpdateItem={onUpdateItem}
            onRemove={onRemove}
            onSubstitute={onSubstitute}
          />
        ))}
      </ul>
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 border-t text-xs font-mono"
        style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
      >
        <span style={{ color: 'var(--ink-soft)' }}>
          Subtotal {items.length} {items.length === 1 ? 'alimento' : 'alimentos'}
        </span>
        <SummaryStat label="kcal" value={summary.kcal} accent />
        <SummaryStat label="prot" value={`${summary.prot} g`} />
        <SummaryStat label="grasa" value={`${summary.fat} g`} />
        <SummaryStat label="cho" value={`${summary.cho} g`} />
        <SummaryStat label="peso" value={`${summary.grams} g`} />
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </span>
      <span style={{ color: accent ? 'var(--ink)' : 'var(--ink)', fontWeight: accent ? 600 : 400 }}>
        {value}
      </span>
    </span>
  );
}

function FoodRow({
  item, isFirst, onUpdateItem, onRemove, onSubstitute,
}: {
  item: Item;
  isFirst: boolean;
  onUpdateItem: (id: string, patch: Patch) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSubstitute?: (id: string, newFoodId: number) => Promise<void>;
}) {
  const [measures, setMeasures] = useState<HouseholdMeasure[]>([]);
  const [factors, setFactors] = useState<CookingFactor[]>([]);
  const [factorsFallback, setFactorsFallback] = useState(false);
  const [unit, setUnit] = useState<string>(
    item.household_measure_id ? String(item.household_measure_id) : 'grams',
  );
  const [grams, setGrams] = useState(item.grams);
  const [qty, setQty] = useState(item.household_measure_qty ?? 1);
  const [factorId, setFactorId] = useState<string | null>(item.cooking_factor_id);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showSubstitutes, setShowSubstitutes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/foods/${item.food_id}/measures`)
      .then((r) => r.ok ? r.json() : { measures: [] })
      .then((d) => { if (!cancelled) setMeasures(d.measures ?? []); })
      .catch(() => {});
    fetch(`/api/foods/${item.food_id}/cooking-factors`)
      .then((r) => r.ok ? r.json() : { factors: [], fallback: false })
      .then((d) => {
        if (cancelled) return;
        setFactors(d.factors ?? []);
        setFactorsFallback(!!d.fallback);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.food_id]);

  const selectedMeasure = unit !== 'grams'
    ? measures.find((m) => String(m.id) === unit)
    : undefined;
  const effectiveGrams = selectedMeasure ? selectedMeasure.grams * qty : grams;
  const selectedFactor = factorId ? factors.find((f) => f.id === factorId) : null;
  const nutritionalG = selectedFactor ? effectiveGrams * selectedFactor.factor : effectiveGrams;

  const kcal = item.foods.per_100g.energia_kcal != null
    ? Math.round(item.foods.per_100g.energia_kcal * nutritionalG / 100)
    : null;
  const prot = item.foods.per_100g.proteinas_g != null
    ? Math.round(item.foods.per_100g.proteinas_g * nutritionalG / 100 * 10) / 10
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

  function onFactorChange(value: string) {
    const newId = value === '' ? null : value;
    setFactorId(newId);
    persist({ cooking_factor_id: newId });
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
            {selectedFactor && (
              <span style={{ color: 'var(--warn)' }}>
                · cocido ({selectedFactor.cooking_method.toLowerCase()}, ×{selectedFactor.factor})
              </span>
            )}
          </div>
          {factors.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Flame size={11} style={{ color: factorId ? 'var(--warn)' : 'var(--ink-soft)' }} />
              <select
                value={factorId ?? ''}
                onChange={(e) => onFactorChange(e.target.value)}
                aria-label="Estado y método de cocción"
                className="text-[11px] px-1.5 py-0.5 rounded border max-w-full min-w-0"
                style={{
                  background: factorId ? '#fdf6e3' : 'var(--paper)',
                  borderColor: factorId ? 'var(--warn)' : 'var(--rule)',
                  color: 'var(--ink)',
                }}
                title={
                  factorsFallback
                    ? 'No hay factor directo para este alimento; mostrando opciones del mismo grupo'
                    : 'El peso registrado es del alimento cocido; aplicará factor TAFERA 2016 para convertir a crudo'
                }
              >
                <option value="">Peso en crudo (sin factor)</option>
                <optgroup label={factorsFallback ? 'Factores del grupo (referenciales)' : 'Factores TAFERA 2016'}>
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>
                      Cocido — {f.cooking_method}{factorsFallback ? ` · ${f.food_name_raw}` : ''} (×{f.factor})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}
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
              {measures.length > 0 && (
                <optgroup label={`${measures.length} medidas caseras (TAFERA 2016)`}>
                  {measures.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.measure_name} ({m.grams} g){m.match_confidence === 'medium' ? ' ·' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          {selectedMeasure && (
            <p
              className="text-[10px] mt-1 font-mono flex items-center gap-1"
              style={{ color: 'var(--ink-soft)' }}
            >
              <span>1 {selectedMeasure.measure_name.toLowerCase()} = {selectedMeasure.grams} g</span>
              {selectedMeasure.match_confidence === 'medium' && (
                <span
                  title="Match TAFERA→TPCA aprobado automáticamente — verificar si tienes dudas"
                  style={{ color: 'var(--warn)' }}
                >
                  · auto
                </span>
              )}
            </p>
          )}
        </div>

        {/* Right: actions */}
        <div className="shrink-0 pt-1 flex items-center gap-1">
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
            <>
              {onSubstitute && (
                <button
                  onClick={() => setShowSubstitutes(true)}
                  aria-label={`Sustituir ${item.foods.name}`}
                  title="Sustituir por alimento similar"
                  className="p-2 rounded-md transition-colors hover:bg-[color:var(--paper-warm)]"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  <Shuffle size={15} />
                </button>
              )}
              <button
                onClick={() => setConfirming(true)}
                aria-label={`Eliminar ${item.foods.name}`}
                title="Eliminar"
                className="p-2 rounded-md transition-colors hover:bg-[color:var(--paper-warm)]"
                style={{ color: 'var(--ink-soft)' }}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {showSubstitutes && onSubstitute && (
        <SubstitutesPopover
          foodId={item.food_id}
          foodName={item.foods.name}
          onSelect={async (subId) => {
            setShowSubstitutes(false);
            await onSubstitute(item.id, subId);
          }}
          onClose={() => setShowSubstitutes(false)}
        />
      )}
    </li>
  );
}
