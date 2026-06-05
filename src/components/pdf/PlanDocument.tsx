import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Food, MealPlan, MealPlanItem, Patient, NutrientTotals, HouseholdMeasure } from '@/lib/types';
import { MEAL_LABELS, MEAL_SLOTS, NUTRIENT_LABELS, PRIMARY_NUTRIENTS } from '@/lib/nutrition';
import { getTargetLevel, type ResolvedTargets } from '@/lib/calculations/nutrientTargets';
import type { VCTBreakdown } from '@/lib/calculations/energyRequirement';
import type { MacroBreakdown } from '@/lib/calculations/macroDistribution';
import { ageInYears } from '@/lib/calculations/age';
import { PDF } from './pdfTokens';
import { FF } from './registerFonts';

// Fuentes de marca (Fraunces/Inter/JetBrains Mono) registradas desde el
// filesystem empaquetado (registerFonts.ts). Si no estuvieran disponibles, FF
// cae a Helvetica automáticamente y el PDF se genera igual.

function formatQuantity(item: MealPlanItem, measures: Map<number, HouseholdMeasure>): string {
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
  page: { fontFamily: FF.sans, fontSize: 10, color: PDF.ink, padding: 40, paddingBottom: 90, backgroundColor: PDF.paper },

  // header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  mark: { width: 22, height: 22, borderRadius: PDF.rSm, backgroundColor: PDF.accent, color: '#fff', fontFamily: FF.display, fontWeight: 600, fontSize: 13, textAlign: 'center', paddingTop: 4, marginRight: 7 },
  clinicName: { fontSize: 12, fontFamily: FF.sansBold, fontWeight: 700, color: PDF.accent },
  planTitle: { fontSize: 17, fontFamily: FF.display, fontWeight: 600, color: PDF.ink },
  folio: { fontSize: 8, fontFamily: FF.mono, color: PDF.inkFaint, textAlign: 'right' },
  meta: { fontSize: 8, fontFamily: FF.mono, color: PDF.inkSoft, textAlign: 'right' },

  // patient strip
  strip: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: PDF.surfaceSunk, borderRadius: PDF.rMd, padding: 9, marginBottom: 12 },
  stripCell: { width: '25%', paddingVertical: 2 },
  stripLabel: { fontSize: 7, color: PDF.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  stripValue: { fontSize: 10, fontFamily: FF.sansBold, fontWeight: 700, color: PDF.ink, marginTop: 1 },

  // disclaimer
  disclaimerBanner: { padding: 7, backgroundColor: PDF.accentSoft, borderRadius: PDF.rSm, borderLeftWidth: 2, borderLeftColor: PDF.accent, marginBottom: 12 },
  disclaimerBannerText: { fontSize: 8, color: PDF.accentDeep, fontStyle: 'italic' },

  // meals
  section: { marginBottom: 12 },
  mealHeader: { fontSize: 11, fontFamily: FF.sansBold, fontWeight: 700, color: PDF.accentDeep, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: PDF.rule, marginBottom: 3 },
  row: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: PDF.surfaceSunk },
  code: { width: 38, fontSize: 9, fontFamily: FF.mono, color: PDF.accent },
  foodName: { flex: 1, fontSize: 9 },
  grams: { width: 140, textAlign: 'right', fontSize: 9, fontFamily: FF.mono, color: PDF.inkSoft },
  kcal: { width: 52, textAlign: 'right', fontSize: 9, fontFamily: FF.mono },

  // boxes
  box: { marginTop: 10, borderWidth: 1, borderColor: PDF.rule, borderRadius: PDF.rMd, padding: 10, backgroundColor: PDF.surface },
  boxTitle: { fontSize: 10, fontFamily: FF.sansBold, fontWeight: 700, marginBottom: 6, color: PDF.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5, borderBottomWidth: 1, borderBottomColor: PDF.surfaceSunk },
  totalLabel: { fontSize: 9, color: PDF.inkSoft, flex: 1 },
  totalValue: { fontSize: 9, textAlign: 'right', width: 110, fontFamily: FF.mono },
  macroValue: { fontSize: 9, textAlign: 'right', width: 180, fontFamily: FF.mono },
  partialNote: { fontSize: 7.5, color: PDF.cLow, marginTop: 5, fontStyle: 'italic' },
  alertWarn: { color: PDF.cLow }, alertDanger: { color: PDF.cDef }, alertOk: { color: PDF.cOk },

  // signature + footer
  sign: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signName: { fontSize: 13, fontFamily: FF.display, fontWeight: 600, color: PDF.ink },
  signSub: { fontSize: 8, color: PDF.inkSoft, marginTop: 2 },
  shareNote: { fontSize: 7.5, fontFamily: FF.mono, color: PDF.inkFaint, textAlign: 'right', maxWidth: 200 },

  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: PDF.rule, paddingTop: 6 },
  footerDisclaimer: { fontSize: 7, color: PDF.cDef, marginBottom: 2 },
  footerText: { fontSize: 6.5, color: PDF.inkSoft, lineHeight: 1.4 },
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
  const age = patient.birth_date ? ageInYears(new Date(patient.birth_date)) : null;
  const folio = plan.id?.slice(0, 8).toUpperCase();
  const hasPartial = PRIMARY_NUTRIENTS.some((k) => (totals[k]?.items_with_null ?? 0) > 0);
  const shareUrl = plan.share_token
    ? `nutricalc.pe/p/${plan.share_token}`
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header con marca + folio */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.mark}>N</Text>
              <Text style={styles.clinicName}>{clinicName || 'NutriCalc'}</Text>
            </View>
            <Text style={styles.planTitle}>{plan.name}</Text>
          </View>
          <View>
            <Text style={styles.folio}>Folio {folio}</Text>
            <Text style={styles.meta}>Plan: {plan.plan_date}</Text>
            <Text style={styles.meta}>Impreso: {today}</Text>
          </View>
        </View>

        {/* Franja de paciente */}
        <View style={styles.strip}>
          <View style={[styles.stripCell, { width: '40%' }]}>
            <Text style={styles.stripLabel}>Paciente</Text>
            <Text style={styles.stripValue}>{patient.full_name}</Text>
          </View>
          <View style={styles.stripCell}>
            <Text style={styles.stripLabel}>Edad / sexo</Text>
            <Text style={styles.stripValue}>{age != null ? `${age} a` : '—'} {patient.sex ? `· ${patient.sex === 'F' ? 'F' : 'M'}` : ''}</Text>
          </View>
          <View style={styles.stripCell}>
            <Text style={styles.stripLabel}>Antropometría</Text>
            <Text style={styles.stripValue}>{patient.weight_kg ? `${patient.weight_kg} kg` : '—'} {patient.height_cm ? `· ${patient.height_cm} cm` : ''}</Text>
          </View>
          <View style={[styles.stripCell, { width: '40%' }]}>
            <Text style={styles.stripLabel}>Perfil clínico</Text>
            <Text style={styles.stripValue}>{profileName}</Text>
          </View>
          {vct && (
            <View style={styles.stripCell}>
              <Text style={styles.stripLabel}>VCT objetivo</Text>
              <Text style={styles.stripValue}>{Math.round(vct.vct)} kcal/día</Text>
            </View>
          )}
        </View>

        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerBannerText}>
            Cálculos basados en TPCA (INS/CENAN), FAO/OMS 2004 (adaptación CENAN) e IOM/NASEM DRIs.
            Documento de apoyo profesional; no reemplaza la consulta presencial ni el juicio clínico del nutricionista colegiado.
          </Text>
        </View>

        {/* Comidas */}
        {MEAL_SLOTS.map((slot) => {
          const slotItems = items.filter((i) => i.meal === slot);
          if (slotItems.length === 0) return null;
          return (
            <View key={slot} style={styles.section} wrap={false}>
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

        {/* Totales */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Totales nutricionales del día{vct ? ` · VCT ${Math.round(vct.vct)} kcal` : ''}</Text>
          {PRIMARY_NUTRIENTS.map((key) => {
            const info = NUTRIENT_LABELS[key];
            const value = totals[key]?.value ?? null;
            const nulls = totals[key]?.items_with_null ?? 0;
            const target = targets[key];
            const level = value != null && target ? getTargetLevel(value, target, key) : null;
            const valueStr = value != null
              ? `${nulls > 0 ? '≥ ' : ''}${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} ${info.unit}`
              : '—';
            const targetStr = target
              ? target.target != null ? ` / meta ${target.target}`
                : target.min != null ? ` / min ${target.min}`
                : target.max != null ? ` / max ${target.max}` : ''
              : '';
            const colorStyle = nulls > 0 ? styles.alertWarn
              : level === 'exceeded' ? styles.alertDanger
              : level === 'near_ul' || level === 'low' ? styles.alertWarn
              : level === 'ok' || level === 'high_natural' ? styles.alertOk
              : undefined;
            return (
              <View key={key} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{info.label}</Text>
                <Text style={[styles.totalValue, ...(colorStyle ? [colorStyle] : [])]}>{valueStr}{targetStr}</Text>
              </View>
            );
          })}
          {hasPartial && (
            <Text style={styles.partialNote}>
              ≥ indica total parcial: uno o más alimentos no tienen ese nutriente registrado en TPCA. El valor real podría ser mayor.
            </Text>
          )}
        </View>

        {/* Macros */}
        {macros && (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Distribución de macronutrientes (AMDR sugerido)</Text>
            {([['Carbohidratos', macros.cho], ['Proteínas', macros.prot], ['Grasa', macros.fat]] as const).map(([label, m]) => (
              <View key={label} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{label}</Text>
                <Text style={styles.macroValue}>{m.grams} g · {m.kcal} kcal · {m.pct}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Firma */}
        <View style={styles.sign}>
          <View>
            <Text style={styles.signName}>{nutritionistName}</Text>
            <Text style={styles.signSub}>
              Nutricionista{nutritionistLicense ? ` · CNP N° ${nutritionistLicense}` : ''}{clinicName ? ` · ${clinicName}` : ''}
            </Text>
          </View>
          {shareUrl && <Text style={styles.shareNote}>Versión en línea:{'\n'}{shareUrl}</Text>}
        </View>

        {/* Footer legal */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerDisclaimer}>
            Plan elaborado por {nutritionistName}{nutritionistLicense ? `, CNP N° ${nutritionistLicense}` : ''}. Apoyo profesional; no reemplaza la consulta presencial. Datos protegidos — Ley N° 29733 (Perú).
          </Text>
          <Text style={styles.footerText}>
            Composición en 100 g de porción comestible. Fuente: Reyes-García MM, Gómez-Sánchez Prieto VI, Espinoza-Barrientos CM. Tablas Peruanas de Composición de Alimentos. INS/CENAN, Lima. · Requerimiento energético: FAO/OMS 2004 (adaptación CENAN). · Micronutrientes: DRIs IOM/NASEM. · Overrides clínicos: KDOQI 2020, ADA 2024, AHA, DASH, WHO 2017.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
