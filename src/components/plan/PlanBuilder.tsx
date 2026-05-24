'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import type { Food, MealPlan, MealPlanItem, Patient } from '@/lib/types';
import { MEAL_LABELS, MEAL_SLOTS, calculateTotals } from '@/lib/nutrition';
import type { ResolvedTargets } from '@/lib/calculations/nutrientTargets';
import type { VCTBreakdown } from '@/lib/calculations/energyRequirement';
import { BarChart3, X, Eye, ExternalLink } from 'lucide-react';
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
  const [items, setItems] = useState<(MealPlanItem & { foods: Food })[]>(initialItems);
  const [activeMeal, setActiveMeal] = useState<string>('desayuno');
  const [showTotals, setShowTotals] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [planName, setPlanName] = useState(plan.name);
  const [planDate, setPlanDate] = useState(plan.plan_date);
  const [saving, setSaving] = useState(false);
  const [macroMode, setMacroMode] = useState<MacroMode>('amdr_auto');
  const [macroManual, setMacroManual] = useState({ cho: 55, prot: 20, fat: 25 });
  const [proteinFactor, setProteinFactor] = useState(1.0);

  const foodsMap = new Map<number, Food>(items.map((i) => [i.food_id, i.foods]));
  const totals = calculateTotals(items, foodsMap);

  const ageYears = patient.birth_date ? ageInYears(new Date(patient.birth_date)) : null;
  const showIron = shouldShowAbsorbableIron({
    sex: patient.sex,
    ageYears,
    physiologicalState: patient.physiological_state,
    comorbidities: patient.comorbidities,
  });
  const iron = showIron
    ? calculateAbsorbableIron(items.map((i) => ({ food: i.foods, grams: i.grams })))
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
    patch: { grams: number; household_measure_id?: number | null; household_measure_qty?: number | null },
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

  async function savePlanMeta() {
    setSaving(true);
    await fetch(`/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: planName, plan_date: planDate }),
    });
    setSaving(false);
  }

  const macroResult = vct && ageYears != null
    ? calculateMacroDistribution(vct.vct, macroMode, {
        ageYears,
        weightKg: vct.weightUsed,
        proteinFactor,
        manualPct: macroManual,
      })
    : null;

  const panels = (
    <div className="flex flex-col gap-4">
      <TotalsPanel totals={totals} targets={targets} vct={vct} iron={iron} />
      {vct && macroResult && (
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
      )}
      {vct && macroResult && (
        <MealDistributionPanel vctKcal={vct.vct} macros={macroResult} items={items} />
      )}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-h-0">
      {/* Left: plan builder */}
      <div className="min-w-0 flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <Link
            href={`/patients/${patient.id}`}
            className="text-xs inline-flex items-center gap-1 hover:underline w-fit"
            style={{ color: 'var(--ink-soft)' }}
          >
            ← {patient.full_name}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              onBlur={savePlanMeta}
              className="font-display text-xl font-semibold bg-transparent border-b min-w-0 flex-1"
              style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}
            />
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              onBlur={savePlanMeta}
              className="font-mono text-sm bg-transparent border rounded px-2 py-1.5"
              style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}
            />
            {plan.share_token && (
              <a
                href={`/p/${plan.share_token}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm bg-white hover:bg-[color:var(--paper-warm)] transition-colors"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                <Eye size={13} /> Modo paciente <ExternalLink size={11} />
              </a>
            )}
            <a
              href={`/api/plans/${plan.id}/pdf`}
              target="_blank"
              className="px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-[color:var(--accent)] hover:text-white transition-colors"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Exportar PDF
            </a>
          </div>
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
          onUpdateItem={updateItem}
          onRemove={removeItem}
        />

        <ClinicalDisclaimer variant="inline" />
      </div>

      {/* Right: totals + macros (desktop) */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scroll-fade pr-1">
          {panels}
        </div>
      </aside>

      {/* Mobile FAB + drawer */}
      <button
        onClick={() => setShowTotals(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 rounded-full px-4 py-3 flex items-center gap-2 text-sm font-medium"
        style={{ background: 'var(--accent)', color: 'var(--paper)', boxShadow: 'var(--shadow-card-hover)' }}
      >
        <BarChart3 size={16} />
        {Math.round(totals.energia_kcal?.value ?? 0)} kcal
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
              <button onClick={() => setShowTotals(false)} style={{ color: 'var(--ink-soft)' }}>
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">{panels}</div>
          </div>
        </div>
      )}
    </div>
  );
}
