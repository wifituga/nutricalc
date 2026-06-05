'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Food, MealPlan, MealPlanItem, Patient } from '@/lib/types';
import { MEAL_LABELS, MEAL_SLOTS, calculateTotals } from '@/lib/nutrition';
import type { ResolvedTargets } from '@/lib/calculations/nutrientTargets';
import type { VCTBreakdown } from '@/lib/calculations/energyRequirement';
import { BarChart3, X, Eye, ExternalLink, Copy, ShoppingBag, FileDown, MoreHorizontal, StickyNote, Trash2 } from 'lucide-react';
import { fmtNum } from '@/lib/patientDisplay';
import { ClinicalDisclaimer } from '@/components/ui/ClinicalDisclaimer';
import { ageInYears } from '@/lib/calculations/age';
import { calculateAbsorbableIron, shouldShowAbsorbableIron } from '@/lib/calculations/ironBioavailability';
import FoodSearch from './FoodSearch';
import MealSection from './MealSection';
import TotalsPanel from './TotalsPanel';
import MacroPanel from './MacroPanel';
import MealDistributionPanel from './MealDistributionPanel';
import { calculateMacroDistribution, type MacroMode } from '@/lib/calculations/macroDistribution';

interface Props {
  plan: MealPlan;
  patient: Patient;
  initialItems: (MealPlanItem & { foods: Food })[];
  targets: ResolvedTargets;
  vct: VCTBreakdown | null;
}

export default function PlanBuilder({ plan, patient, initialItems, targets, vct }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<(MealPlanItem & { foods: Food })[]>(initialItems);
  const [activeMeal, setActiveMeal] = useState<string>('desayuno');
  const [duplicating, setDuplicating] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [planName, setPlanName] = useState(plan.name);
  const [planDate, setPlanDate] = useState(plan.plan_date);
  const [saving, setSaving] = useState(false);
  const [macroMode, setMacroMode] = useState<MacroMode>('amdr_auto');
  const [macroManual, setMacroManual] = useState({ cho: 55, prot: 20, fat: 25 });
  const [proteinFactor, setProteinFactor] = useState(1.0);

  const [cookingFactorsMap, setCookingFactorsMap] = useState<Map<string, number>>(new Map());

  // Fetch factors actually referenced by items so totals stay accurate
  useEffect(() => {
    const ids = items.map((i) => i.cooking_factor_id).filter((x): x is string => !!x);
    if (ids.length === 0) {
      setCookingFactorsMap(new Map());
      return;
    }
    const uniqFoodIds = [...new Set(items.filter((i) => i.cooking_factor_id).map((i) => i.food_id))];
    Promise.all(
      uniqFoodIds.map((fid) =>
        fetch(`/api/foods/${fid}/cooking-factors`).then((r) => (r.ok ? r.json() : { factors: [] })),
      ),
    ).then((results) => {
      const map = new Map<string, number>();
      for (const r of results) {
        for (const f of (r.factors ?? []) as { id: string; factor: number }[]) {
          map.set(f.id, f.factor);
        }
      }
      setCookingFactorsMap(map);
    });
  }, [items]);

  const foodsMap = new Map<number, Food>(items.map((i) => [i.food_id, i.foods]));
  const totals = calculateTotals(items, foodsMap, cookingFactorsMap);

  const ageYears = patient.birth_date ? ageInYears(new Date(patient.birth_date)) : null;
  const showIron = shouldShowAbsorbableIron({
    sex: patient.sex,
    ageYears,
    physiologicalState: patient.physiological_state,
    comorbidities: patient.comorbidities,
  });
  const iron = showIron
    ? calculateAbsorbableIron(items.map((i) => {
        const f = i.cooking_factor_id ? cookingFactorsMap.get(i.cooking_factor_id) ?? 1 : 1;
        return { food: i.foods, grams: i.grams * f };
      }))
    : null;

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

  const updateItem = useCallback(async (
    itemId: string,
    patch: {
      grams?: number;
      household_measure_id?: number | null;
      household_measure_qty?: number | null;
      cooking_factor_id?: string | null;
    },
  ) => {
    const res = await fetch(`/api/plans/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const updated = await res.json() as MealPlanItem & { foods: Food };
    setItems((prev) => prev.map((i) => i.id === itemId ? updated : i));
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    await fetch(`/api/plans/items/${itemId}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const substituteItem = useCallback(async (itemId: string, newFoodId: number) => {
    const res = await fetch(`/api/plans/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_id: newFoodId,
        household_measure_id: null,
        household_measure_qty: null,
      }),
    });
    if (!res.ok) return;
    const updated = await res.json() as MealPlanItem & { foods: Food };
    setItems((prev) => prev.map((i) => i.id === itemId ? updated : i));
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

  async function duplicatePlan() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const suggested = tomorrow.toISOString().split('T')[0];
    const newDate = window.prompt('Fecha del nuevo plan (YYYY-MM-DD):', suggested);
    if (!newDate) return;
    setDuplicating(true);
    const res = await fetch(`/api/plans/${plan.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_date: newDate }),
    });
    setDuplicating(false);
    if (!res.ok) {
      window.alert('Error al duplicar el plan');
      return;
    }
    const created = await res.json();
    router.push(`/patients/${patient.id}/plans/${created.id}`);
  }

  async function editNotes() {
    setMenuOpen(false);
    const next = window.prompt('Notas internas del plan:', plan.notes ?? '');
    if (next == null) return;
    await fetch(`/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: next }),
    });
  }

  async function deletePlan() {
    setMenuOpen(false);
    if (!window.confirm('¿Eliminar este plan? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/plans/${plan.id}`, { method: 'DELETE' });
    if (res.ok) router.push(`/patients/${patient.id}`);
    else window.alert('Error al eliminar el plan');
  }

  // kcal por comida para las pestañas
  const kcalByMeal = new Map<string, number>();
  for (const slot of MEAL_SLOTS) {
    const t = calculateTotals(items.filter((i) => i.meal === slot), foodsMap, cookingFactorsMap);
    kcalByMeal.set(slot, Math.round(t.energia_kcal?.value ?? 0));
  }

  const macroResult = vct && ageYears != null
    ? calculateMacroDistribution(vct.vct, macroMode, {
        ageYears,
        weightKg: vct.weightUsed,
        proteinFactor,
        manualPct: macroManual,
      })
    : null;

  const macroPanel = vct && macroResult ? (
    <MacroPanel
      vctKcal={vct.vct}
      weightKg={vct.weightUsed}
      mode={macroMode}
      setMode={setMacroMode}
      manual={macroManual}
      setManual={setMacroManual}
      proteinFactor={proteinFactor}
      setProteinFactor={setProteinFactor}
      result={macroResult}
    />
  ) : null;
  const distributionPanel = vct && macroResult ? (
    <MealDistributionPanel vctKcal={vct.vct} macros={macroResult} items={items} />
  ) : null;

  // Mobile-only: all panels stacked inside drawer
  const allPanelsForDrawer = (
    <div className="flex flex-col gap-4">
      <TotalsPanel totals={totals} targets={targets} vct={vct} iron={iron} />
      {macroPanel}
      {distributionPanel}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] min-h-0">
      {/* Left column: builder + macros/distribution at the bottom */}
      <div className="min-w-0 flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <Link
            href={`/patients/${patient.id}`}
            className="text-[12.5px] inline-flex items-center gap-1 hover:underline w-fit"
            style={{ color: 'var(--ink-soft)' }}
          >
            ← {patient.full_name}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              onBlur={savePlanMeta}
              className="font-display text-xl font-semibold bg-transparent border-b min-w-0 flex-1 focus:outline-none"
              style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}
            />
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              onBlur={savePlanMeta}
              className="mono text-sm bg-transparent border rounded-[5px] px-2 py-1.5 w-full sm:w-auto"
              style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}
            />
            <div className="flex items-center gap-2 shrink-0">
              {/* Primaria: PDF */}
              <a
                href={`/api/plans/${plan.id}/pdf`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-[7px] text-sm font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--paper)', padding: '8px 14px' }}
              >
                <FileDown size={15} /> <span className="hidden sm:inline">Exportar </span>PDF
              </a>
              {/* Ghost: Vista paciente */}
              {plan.share_token && (
                <a
                  href={`/p/${plan.share_token}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-[7px] border text-sm font-medium"
                  style={{ background: 'var(--surface)', borderColor: 'var(--rule-strong)', color: 'var(--ink)', padding: '7px 12px' }}
                  title="Abrir la vista que ve el paciente"
                >
                  <Eye size={14} /> <span className="hidden md:inline">Vista paciente</span><span className="md:hidden">Vista</span> <ExternalLink size={11} />
                </a>
              )}
              {/* Menú ⋯ */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Más acciones"
                  className="grid place-items-center rounded-[7px] border"
                  style={{ width: 36, height: 36, background: 'var(--surface)', borderColor: 'var(--rule-strong)', color: 'var(--ink-soft)' }}
                >
                  <MoreHorizontal size={17} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 z-40 w-52 rounded-[7px] border py-1" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-pop)' }}>
                      <MenuItem icon={<Copy size={14} />} onClick={() => { setMenuOpen(false); duplicatePlan(); }} disabled={duplicating}>
                        {duplicating ? 'Duplicando…' : 'Duplicar plan'}
                      </MenuItem>
                      <a href={`/api/plans/${plan.id}/shopping-list`} target="_blank" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm row-hover" style={{ color: 'var(--ink)' }}>
                        <ShoppingBag size={14} style={{ color: 'var(--ink-soft)' }} /> Lista de compras
                      </a>
                      <MenuItem icon={<StickyNote size={14} />} onClick={editNotes}>Notas del plan</MenuItem>
                      <div className="my-1 border-t" style={{ borderColor: 'var(--rule)' }} />
                      <MenuItem icon={<Trash2 size={14} />} onClick={deletePlan} danger>Eliminar plan</MenuItem>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Meal tabs */}
        <div className="flex gap-0.5 border-b overflow-x-auto scroll-fade" style={{ borderColor: 'var(--rule)' }}>
          {MEAL_SLOTS.map((slot) => {
            const active = slot === activeMeal;
            const count = items.filter((i) => i.meal === slot).length;
            const kcal = kcalByMeal.get(slot) ?? 0;
            return (
              <button
                key={slot}
                onClick={() => setActiveMeal(slot)}
                className="relative flex flex-col items-start whitespace-nowrap shrink-0"
                style={{ padding: '8px 14px', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1 }}
              >
                <span className="text-[13.5px] font-semibold" style={{ color: active ? 'var(--accent-deep)' : 'var(--ink-faint)' }}>
                  {MEAL_LABELS[slot]}
                  {count > 0 && <span className="mono ml-1.5 text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{count}</span>}
                </span>
                <span className="mono text-[10.5px]" style={{ color: active ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
                  {kcal > 0 ? `${fmtNum(kcal)} kcal` : '—'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Food search */}
        <FoodSearch onSelect={addFood} />

        {/* Meal items */}
        <MealSection
          items={items.filter((i) => i.meal === activeMeal)}
          onUpdateItem={updateItem}
          onRemove={removeItem}
          onSubstitute={substituteItem}
        />

        {/* Macros + distribución debajo de la tabla (aprovecha espacio vertical).
            En xl van en 2 columnas, en lg/md en una sola, en mobile el drawer las tiene también. */}
        {(macroPanel || distributionPanel) && (
          <div className="hidden lg:grid lg:grid-cols-1 xl:grid-cols-2 gap-4 mt-2">
            {macroPanel}
            {distributionPanel}
          </div>
        )}

        <ClinicalDisclaimer variant="inline" />
      </div>

      {/* Right column: TotalsPanel (sticky, siempre visible en desktop) */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scroll-fade pr-1">
          <TotalsPanel totals={totals} targets={targets} vct={vct} iron={iron} />
        </div>
      </aside>

      {/* Mobile: FAB + drawer */}
      <button
        onClick={() => setShowTotals(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 rounded-full px-4 py-3 flex items-center gap-2 text-sm font-semibold"
        style={{ background: 'var(--accent)', color: 'var(--paper)', boxShadow: 'var(--shadow-pop)' }}
        aria-label="Abrir panel de totales y macros"
      >
        <BarChart3 size={16} />
        <span className="mono">{fmtNum(Math.round(totals.energia_kcal?.value ?? 0))}</span> kcal
      </button>

      {showTotals && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowTotals(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--paper)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--rule)' }}>
              <h3 className="font-display font-medium" style={{ color: 'var(--ink)' }}>Totales del día</h3>
              <button onClick={() => setShowTotals(false)} aria-label="Cerrar" style={{ color: 'var(--ink-soft)' }}>
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">{allPanelsForDrawer}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon, children, onClick, disabled, danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm row-hover disabled:opacity-50"
      style={{ color: danger ? 'var(--c-def)' : 'var(--ink)' }}
    >
      <span style={{ color: danger ? 'var(--c-def)' : 'var(--ink-soft)' }}>{icon}</span>
      {children}
    </button>
  );
}
