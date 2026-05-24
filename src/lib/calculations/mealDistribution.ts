import type { MacroBreakdown } from './macroDistribution';

export type MealSlot = 'desayuno' | 'media_manana' | 'almuerzo' | 'media_tarde' | 'cena';

export const MEAL_DISTRIBUTION_DEFAULT: Record<MealSlot, number> = {
  desayuno: 25,
  media_manana: 10,
  almuerzo: 30,
  media_tarde: 10,
  cena: 25,
};

export type MealTarget = {
  slot: MealSlot;
  pct: number;
  kcal: number;
  cho_g: number;
  prot_g: number;
  fat_g: number;
};

export function buildMealTargets(
  vctKcal: number,
  macros: MacroBreakdown,
  distribution: Record<MealSlot, number>,
): MealTarget[] {
  const slots: MealSlot[] = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena'];
  return slots.map((slot) => {
    const pct = distribution[slot] ?? 0;
    const frac = pct / 100;
    return {
      slot,
      pct,
      kcal: Math.round(vctKcal * frac),
      cho_g: Math.round(macros.cho.grams * frac * 10) / 10,
      prot_g: Math.round(macros.prot.grams * frac * 10) / 10,
      fat_g: Math.round(macros.fat.grams * frac * 10) / 10,
    };
  });
}

export function distributionSum(d: Record<MealSlot, number>): number {
  return (d.desayuno ?? 0) + (d.media_manana ?? 0) + (d.almuerzo ?? 0) + (d.media_tarde ?? 0) + (d.cena ?? 0);
}
