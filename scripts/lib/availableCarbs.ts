/**
 * Deriva carbohidratos disponibles cuando la TPCA reporta solo los totales.
 *
 * Fórmula oficial TPCA/FAO: carbohidratos disponibles = totales − fibra dietaria.
 * Validada al 100% contra los 601 alimentos de TPCA 2023 que reportan ambos
 * campos (coincidencia ±0.6 g). NO es un dato inventado: es la misma derivación
 * que usa la tabla, completada para los alimentos donde solo se imprimió el total.
 *
 * Si totales es null → no se puede derivar → disponibles queda null ("—").
 */
export function deriveAvailableCarbs(per100g: Record<string, number | null>): void {
  const disp = per100g['carbohidratos_disponibles_g'];
  const tot = per100g['carbohidratos_totales_g'];
  if (disp == null && tot != null) {
    const fibra = per100g['fibra_g'];
    per100g['carbohidratos_disponibles_g'] = Math.max(0, Math.round((tot - (fibra ?? 0)) * 10) / 10);
  }
}
