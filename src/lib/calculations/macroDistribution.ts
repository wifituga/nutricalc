export type MacroMode = 'amdr_auto' | 'manual' | 'from_protein_g_per_kg';

export const KCAL_PER_G = { cho: 4, prot: 4, fat: 9 } as const;

// AMDR (% del VCT) por etapa de vida — IOM
type Amdr = { cho: [number, number]; prot: [number, number]; fat: [number, number] };

function amdrFor(ageYears: number): Amdr {
  if (ageYears < 4) return { cho: [45, 65], prot: [5, 20], fat: [30, 40] };
  if (ageYears < 19) return { cho: [45, 65], prot: [10, 30], fat: [25, 35] };
  return { cho: [45, 65], prot: [10, 35], fat: [20, 35] };
}

function defaultPct(ageYears: number): { cho: number; prot: number; fat: number } {
  if (ageYears < 4) return { cho: 50, prot: 15, fat: 35 };
  return { cho: 55, prot: 20, fat: 25 };
}

export type MacroBreakdown = {
  cho: { pct: number; grams: number; kcal: number };
  prot: { pct: number; grams: number; kcal: number };
  fat: { pct: number; grams: number; kcal: number };
  warnings: string[];
};

function macro(pct: number, vct: number, kcalPerG: number) {
  const kcal = (pct / 100) * vct;
  return { pct: round1(pct), grams: round1(kcal / kcalPerG), kcal: Math.round(kcal) };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function amdrWarnings(
  pct: { cho: number; prot: number; fat: number },
  ageYears: number,
): string[] {
  const a = amdrFor(ageYears);
  const w: string[] = [];
  if (pct.cho < a.cho[0] || pct.cho > a.cho[1])
    w.push(`Carbohidratos ${round1(pct.cho)}% fuera de AMDR (${a.cho[0]}-${a.cho[1]}%)`);
  if (pct.prot < a.prot[0] || pct.prot > a.prot[1])
    w.push(`Proteínas ${round1(pct.prot)}% fuera de AMDR (${a.prot[0]}-${a.prot[1]}%)`);
  if (pct.fat < a.fat[0] || pct.fat > a.fat[1])
    w.push(`Grasa ${round1(pct.fat)}% fuera de AMDR (${a.fat[0]}-${a.fat[1]}%)`);
  return w;
}

export function calculateMacroDistribution(
  vctKcal: number,
  mode: MacroMode,
  options: {
    proteinFactor?: number;
    weightKg?: number;
    manualPct?: { cho: number; prot: number; fat: number };
    ageYears: number;
  },
): MacroBreakdown {
  const { ageYears } = options;

  if (mode === 'manual') {
    const p = options.manualPct;
    if (!p) throw new Error('manualPct requerido en modo manual');
    const warnings = amdrWarnings(p, ageYears);
    const sum = p.cho + p.prot + p.fat;
    if (Math.round(sum) !== 100) warnings.push(`Los porcentajes suman ${round1(sum)}%, no 100%`);
    return {
      cho: macro(p.cho, vctKcal, KCAL_PER_G.cho),
      prot: macro(p.prot, vctKcal, KCAL_PER_G.prot),
      fat: macro(p.fat, vctKcal, KCAL_PER_G.fat),
      warnings,
    };
  }

  if (mode === 'from_protein_g_per_kg') {
    if (options.proteinFactor == null || options.weightKg == null) {
      throw new Error('proteinFactor y weightKg requeridos en modo from_protein_g_per_kg');
    }
    const protGrams = options.proteinFactor * options.weightKg;
    const protKcal = protGrams * KCAL_PER_G.prot;
    const protPct = (protKcal / vctKcal) * 100;
    const fatPct = defaultPct(ageYears).fat;
    const fatKcal = (fatPct / 100) * vctKcal;
    const choKcal = vctKcal - protKcal - fatKcal;
    const choPct = (choKcal / vctKcal) * 100;
    const pct = { cho: choPct, prot: protPct, fat: fatPct };
    return {
      cho: { pct: round1(choPct), grams: round1(choKcal / KCAL_PER_G.cho), kcal: Math.round(choKcal) },
      prot: { pct: round1(protPct), grams: round1(protGrams), kcal: Math.round(protKcal) },
      fat: macro(fatPct, vctKcal, KCAL_PER_G.fat),
      warnings: amdrWarnings(pct, ageYears),
    };
  }

  // amdr_auto
  const d = defaultPct(ageYears);
  return {
    cho: macro(d.cho, vctKcal, KCAL_PER_G.cho),
    prot: macro(d.prot, vctKcal, KCAL_PER_G.prot),
    fat: macro(d.fat, vctKcal, KCAL_PER_G.fat),
    warnings: amdrWarnings(d, ageYears),
  };
}
