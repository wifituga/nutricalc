export function imcSaludable(ageYears: number): 22 | 25.5 {
  return ageYears >= 60 ? 25.5 : 22;
}

export function pesoSaludable(heightM: number, ageYears: number): number {
  return imcSaludable(ageYears) * heightM * heightM;
}

export function selectWeightForCalculation(
  currentWeight: number,
  heightM: number,
  ageYears: number,
  pregestWeight?: number,
): { weight: number; source: 'actual' | 'healthy' | 'pregestational' } {
  const imc = imcSaludable(ageYears);
  const healthy = imc * heightM * heightM;

  if (pregestWeight !== undefined) {
    const imcPregest = pregestWeight / (heightM * heightM);
    if (imcPregest > imc) return { weight: healthy, source: 'healthy' };
    return { weight: pregestWeight, source: 'pregestational' };
  }

  const imcActual = currentWeight / (heightM * heightM);
  if (imcActual > imc) return { weight: healthy, source: 'healthy' };
  return { weight: currentWeight, source: 'actual' };
}
