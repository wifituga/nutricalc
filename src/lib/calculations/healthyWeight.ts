export function imcSaludable(ageYears: number): 22 | 25.5 {
  return ageYears >= 60 ? 25.5 : 22;
}

export type IMCCategory = {
  range: string;
  label: string;
  color: 'ok' | 'warn' | 'danger';
};

export function classifyIMC(imc: number, ageYears: number): IMCCategory {
  // REVIEW_WITH_REGINA: para ≥60a usamos rango 22-27 (consenso geriátrico
  // OPS/OMS y CENAN Perú), coherente con IMC saludable 25.5 en cálculo
  // energético. Validar con Regina si prefiere usar OMS estándar (18.5-24.9).

  if (ageYears >= 60) {
    if (imc < 22) return { range: '<22', label: 'bajo peso', color: 'warn' };
    if (imc < 27) return { range: '22.0–26.9', label: 'normal', color: 'ok' };
    if (imc < 30) return { range: '27.0–29.9', label: 'sobrepeso', color: 'warn' };
    if (imc < 35) return { range: '30.0–34.9', label: 'obesidad I', color: 'warn' };
    if (imc < 40) return { range: '35.0–39.9', label: 'obesidad II', color: 'danger' };
    return { range: '≥40', label: 'obesidad III', color: 'danger' };
  }

  if (imc < 16) return { range: '<16', label: 'delgadez severa', color: 'danger' };
  if (imc < 17) return { range: '16.0–16.9', label: 'delgadez moderada', color: 'warn' };
  if (imc < 18.5) return { range: '17.0–18.4', label: 'delgadez leve', color: 'warn' };
  if (imc < 25) return { range: '18.5–24.9', label: 'normal', color: 'ok' };
  if (imc < 30) return { range: '25.0–29.9', label: 'sobrepeso', color: 'warn' };
  if (imc < 35) return { range: '30.0–34.9', label: 'obesidad I', color: 'warn' };
  if (imc < 40) return { range: '35.0–39.9', label: 'obesidad II', color: 'danger' };
  return { range: '≥40', label: 'obesidad III', color: 'danger' };
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
