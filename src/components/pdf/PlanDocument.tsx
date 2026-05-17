import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Food, MealPlan, MealPlanItem, Patient, NutrientTotals, HouseholdMeasure } from '@/lib/types';
import { MEAL_LABELS, MEAL_SLOTS, NUTRIENT_LABELS, PRIMARY_NUTRIENTS } from '@/lib/nutrition';
import { getTargetLevel, type ResolvedTargets } from '@/lib/calculations/nutrientTargets';
import type { VCTBreakdown } from '@/lib/calculations/energyRequirement';
import type { MacroBreakdown } from '@/lib/calculations/macroDistribution';

function formatQuantity(
  item: MealPlanItem,
  measures: Map<number, HouseholdMeasure>,
): string {
  if (item.household_measure_id) {
    const m = measures.get(item.household_measure_id);
    if (m) {
      const qty = item.household_measure_qty ?? 1;
      const qtyStr = qty === 1 ? '' : `${qty} `;
      return `${qtyStr}${m.measure_name} (${Math.round(item.grams)} g)`;
    }
  }
  return `${Math.round(item.grams)} g`;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1815',
    padding: 40,
    backgroundColor: '#f7f4ee',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#d6cfc0',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  clinicName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#6b4423' },
  planTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1a1815', marginBottom: 2 },
  patientName: { fontSize: 11, color: '#5c574e' },
  meta: { fontSize: 9, color: '#5c574e', textAlign: 'right' },
  section: { marginBottom: 14 },
  mealHeader: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#6b4423',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d6cfc0',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#efe9dd',
  },
  code: { width: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#6b4423' },
  foodName: { flex: 1, fontSize: 9 },
  grams: { width: 130, textAlign: 'right', fontFamily: 'Helvetica', fontSize: 9 },
  kcal: { width: 50, textAlign: 'right', fontFamily: 'Helvetica', fontSize: 9 },
  macrosBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d6cfc0',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#efe9dd',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
  },
  macroValue: { fontSize: 9, fontFamily: 'Helvetica', textAlign: 'right', width: 180 },
  disclaimerBanner: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#efe9dd',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#6b4423',
  },
  disclaimerBannerText: { fontSize: 8, color: '#5c574e', fontStyle: 'italic' },
  totalsBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d6cfc0',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#efe9dd',
  },
  totalsTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#d6cfc0',
  },
  totalLabel: { fontSize: 9, color: '#5c574e', flex: 1 },
  totalValue: { fontSize: 9, fontFamily: 'Helvetica', textAlign: 'right', width: 70 },
  alertWarn: { color: '#b88200' },
  alertDanger: { color: '#a8341c' },
  alertOk: { color: '#2d6a3e' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#d6cfc0',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#5c574e' },
  disclaimer: { fontSize: 7, color: '#a8341c', marginBottom: 2 },
});

interface Props {
  plan: MealPlan;
  patient: Patient;
  items: (MealPlanItem & { foods: Food })[];
  totals: NutrientTotals;
  targets: ResolvedTargets;
  vct: VCTBreakdown | null;
  macros: MacroBreakdown | null;
  measures: Map<number, HouseholdMeasure>;
  profileName: string;
  clinicName: string;
  nutritionistName: string;
  nutritionistLicense?: string;
}

export function PlanDocument({
  plan, patient, items, totals, targets, vct, macros, measures, profileName,
  clinicName, nutritionistName, nutritionistLicense,
}: Props) {
  const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>{clinicName || 'NutriCalc'}</Text>
            <Text style={styles.planTitle}>{plan.name}</Text>
            <Text style={styles.patientName}>{patient.full_name} · {profileName}</Text>
          </View>
          <View>
            <Text style={styles.meta}>Fecha: {plan.plan_date}</Text>
            <Text style={styles.meta}>Impreso: {today}</Text>
            {patient.weight_kg && <Text style={styles.meta}>Peso: {patient.weight_kg} kg</Text>}
            {patient.height_cm && <Text style={styles.meta}>Talla: {patient.height_cm} cm</Text>}
          </View>
        </View>

        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerBannerText}>
            Esta herramienta provee cálculos basados en TPCA 2023, FAO/OMS 2004 e
            IOM/NASEM DRIs. Los valores son referenciales y deben ser validados
            por un nutricionista colegiado antes de uso clínico.
          </Text>
        </View>

        {/* Meals */}
        {MEAL_SLOTS.map((slot) => {
          const slotItems = items.filter((i) => i.meal === slot);
          if (slotItems.length === 0) return null;
          return (
            <View key={slot} style={styles.section}>
              <Text style={styles.mealHeader}>{MEAL_LABELS[slot]}</Text>
              {slotItems.map((item) => {
                const kcal = item.foods.per_100g.energia_kcal != null
                  ? Math.round(item.foods.per_100g.energia_kcal * item.grams / 100)
                  : null;
                return (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.code}>{item.foods.code}</Text>
                    <Text style={styles.foodName}>{item.foods.name}</Text>
                    <Text style={styles.grams}>{formatQuantity(item, measures)}</Text>
                    <Text style={styles.kcal}>{kcal != null ? `${kcal} kcal` : '—'}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <Text style={styles.totalsTitle}>
            Totales nutricionales del día{vct ? ` · VCT ${Math.round(vct.vct)} kcal` : ''}
          </Text>
          {PRIMARY_NUTRIENTS.map((key) => {
            const info = NUTRIENT_LABELS[key];
            const value = totals[key]?.value ?? null;
            const target = targets[key];
            const level = value != null && target ? getTargetLevel(value, target, key) : null;
            const valueStr = value != null
              ? `${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} ${info.unit}`
              : '—';
            const targetStr = target
              ? target.target != null
                ? ` / meta ${target.target}`
                : target.min != null
                  ? ` / min ${target.min}`
                  : target.max != null ? ` / max ${target.max}` : ''
              : '';
            const colorStyle = level === 'exceeded' ? styles.alertDanger
              : level === 'near_ul' || level === 'low' ? styles.alertWarn
              : level === 'ok' || level === 'high_natural' ? styles.alertOk
              : undefined;

            return (
              <View key={key} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{info.label}</Text>
                <Text style={[styles.totalValue, ...(colorStyle ? [colorStyle] : [])]}>
                  {valueStr}{targetStr}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Macro distribution */}
        {macros && (
          <View style={styles.macrosBox}>
            <Text style={styles.totalsTitle}>Distribución de macronutrientes (AMDR sugerido)</Text>
            <View style={styles.macrosRow}>
              <Text style={styles.totalLabel}>Carbohidratos</Text>
              <Text style={styles.macroValue}>
                {macros.cho.grams} g · {macros.cho.kcal} kcal · {macros.cho.pct}%
              </Text>
            </View>
            <View style={styles.macrosRow}>
              <Text style={styles.totalLabel}>Proteínas</Text>
              <Text style={styles.macroValue}>
                {macros.prot.grams} g · {macros.prot.kcal} kcal · {macros.prot.pct}%
              </Text>
            </View>
            <View style={styles.macrosRow}>
              <Text style={styles.totalLabel}>Grasa</Text>
              <Text style={styles.macroValue}>
                {macros.fat.grams} g · {macros.fat.kcal} kcal · {macros.fat.pct}%
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.disclaimer}>
            Plan elaborado por {nutritionistName}{nutritionistLicense ? `, Colegiatura CNP N°${nutritionistLicense}` : ''}.
            Información de apoyo profesional, no reemplaza consulta presencial.
          </Text>
          <Text style={styles.footerText}>
            Composición en 100 g de porción comestible. Fuente: Reyes-García MM, Gómez-Sánchez Prieto VI, Espinoza-Barrientos CM.
            Tablas Peruanas de Composición de Alimentos. 11.ª ed. Lima: Instituto Nacional de Salud, 2023. ISBN 978-612-310-178-7.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
