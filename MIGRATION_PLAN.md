# MIGRATION_PLAN.md — Plan de migración Fase 2A → 2B

> Documento operativo para Claude Code. Define los 6 sprints del upgrade,
> con archivos a tocar, criterios de "done" y tests obligatorios por sprint.

---

## Contexto previo

La app está desplegada en Vercel desde GitHub, con base de datos en Supabase
(`umasnghtdyffqbfxjwow`). No hay pacientes reales todavía. Estrategia: big bang
en `main`, sprints incrementales (~1 semana cada uno).

Antes de empezar, leer `CONTEXT.md` (especificación clínica completa) y `CLAUDE.md`
(estado del proyecto y stack).

---

## Pre-Sprint — Preparación (1 día)

### Tarea P.1 — Verificar archivos de referencia

Confirmar que existen en `data/`:
- `tpca_2023.json` (ya en BD desde Fase 2A)
- `medidas_caseras.json`
- `dris_iom.json`
- `peru_energy_guide.json`
- `clinical_overrides.json`

Si alguno falta, detener y avisar.

### Tarea P.2 — Backup del estado actual

Aunque no haya usuarios reales, antes del big bang:

```bash
# Tag de la versión actual antes de empezar
git tag v2a-final
git push origin v2a-final
```

Esto deja un punto de retorno si algo sale muy mal.

### Tarea P.3 — Instalar dependencias nuevas

```bash
npm install zod
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui
```

Configurar `vitest.config.ts` para que use `@/` alias como Next.js.

### Tarea P.4 — Estructura de carpetas para cálculos

Crear esqueleto vacío:

```
src/lib/calculations/
├── types.ts                      # Re-export branded types desde lib/types.ts
├── age.ts                        # birthDate → ageYears, ageMonths
├── healthyWeight.ts
├── energyRequirement.ts
├── driLookup.ts
├── proteinTarget.ts
├── macroDistribution.ts
├── comorbidityMerge.ts
├── derivedComorbidities.ts
├── nutrientTotals.ts
├── ironBioavailability.ts        # se implementa en Sprint 6
├── alertLevels.ts
├── index.ts                      # re-exports
└── __tests__/
    ├── age.test.ts
    ├── healthyWeight.test.ts
    ├── energyRequirement.test.ts
    ├── driLookup.test.ts
    ├── comorbidityMerge.test.ts
    └── nutrientTotals.test.ts
```

Cada archivo arranca solo con la firma de la función exportada y un test que falla.
Se irán llenando en cada sprint.

---

## Sprint 1 — Cálculo energético FAO/OMS + antropometría completa

**Objetivo:** que la pantalla del paciente muestre el VCT (Valor Calórico Total)
calculado automáticamente con FAO/OMS adaptado a Perú. Todavía NO se cambia la
lógica de alertas (eso es Sprint 2).

**Tiempo estimado:** 4-5 días.

### Tarea 1.1 — Migración de esquema (parte 1: campos del paciente)

Archivo: `supabase/migrations/002_patient_anthropometry.sql`

```sql
BEGIN;

-- Campos antropométricos completos
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('M', 'F')),
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS residence_area text
    CHECK (residence_area IN ('urbana', 'rural')),
  ADD COLUMN IF NOT EXISTS lifestyle text
    CHECK (lifestyle IN ('ligero', 'no_ligero'));

COMMIT;
```

Ejecutar en Supabase Dashboard (SQL Editor) o vía CLI.

### Tarea 1.2 — Implementar `src/lib/calculations/`

Funciones a implementar **en orden** (cada una con su test):

**1.2.1 — `age.ts`**
```typescript
export function ageInYears(birthDate: Date, referenceDate = new Date()): number;
export function ageInMonths(birthDate: Date, referenceDate = new Date()): number;
```

Tests obligatorios:
- Nacido hoy → 0 años, 0 meses
- Nacido el día del cumpleaños hace 25 años → 25 años, 300 meses
- Caso edge: nacido 29-feb en año bisiesto

**1.2.2 — `healthyWeight.ts`**
```typescript
export function imcSaludable(ageYears: number): 22 | 25.5;
export function pesoSaludable(heightM: number, ageYears: number): number;
export function selectWeightForCalculation(
  currentWeight: number,
  heightM: number,
  ageYears: number,
  pregestWeight?: number
): { weight: number; source: 'actual' | 'healthy' | 'pregestational' };
```

Tests obligatorios (del CONTEXT.md sección 19):
- M 25a 1.85m 92kg → usa peso saludable 75.3kg (IMC actual 26.88 > 22)
- M 25a 1.85m 68kg → usa peso actual 68kg (IMC 19.87 < 22)
- ≥60a 1.70m 75kg → usa peso actual (IMC 25.95 ≈ 25.5)
- Embarazada pregest 60 actual 65 → usa 60 (pregestacional)

**1.2.3 — `energyRequirement.ts`**

Exportar las constantes NAF y ENCDT como objetos:
```typescript
export const NAF: Record<'urbana' | 'rural', Record<'ligero' | 'no_ligero', number>> = {
  urbana: { ligero: 1.55, no_ligero: 1.85 },
  rural:  { ligero: 1.65, no_ligero: 1.95 },
};

export const ENCDT_BY_AGE: Record<number, Record<'M' | 'F', number>> = {
  // ver peru_energy_guide.json
  1: { M: 13, F: 13 }, 2: { M: 12, F: 13 }, /* ... */ 17: { M: 14, F: 0 },
};

export const PHYSIOLOGICAL_ADDITION: Record<string, number> = {
  standard: 0,
  pregnancy_t1: 85, pregnancy_t2: 285, pregnancy_t3: 475,
  lactation_0_6m: 500, lactation_6_12m: 400,
};
```

Funciones:
```typescript
export function calculateTMB_adult(sex: 'M' | 'F', ageYears: number, weightKg: number): number;
export function calculateGET_child(sex: 'M' | 'F', ageYears: number, weightKg: number, lifestyle?: string): number;
export function calculateVCT(input: VCTInput): VCTBreakdown;

type VCTInput = {
  sex: 'M' | 'F';
  birthDate: Date;
  heightCm: number;
  weightKg: number;
  weightPregestKg?: number;
  residenceArea: 'urbana' | 'rural';
  lifestyle: 'ligero' | 'no_ligero';
  physiologicalState: PhysiologicalState;
};

type VCTBreakdown = {
  ageYears: number;
  weightUsed: number;
  weightSource: 'actual' | 'healthy' | 'pregestational';
  tmb: number;
  naf: number | null;       // null para niños
  get: number;
  encdt: number;
  adicion: number;
  vct: number;
};
```

Tests obligatorios (CONTEXT.md sección 19):

```typescript
test('Caso 1: F 3 años 16 kg', () => {
  const v = calculateVCT({
    sex: 'F', birthDate: addYears(today, -3),
    heightCm: 95, weightKg: 16,
    residenceArea: 'urbana', lifestyle: 'ligero',
    physiologicalState: 'standard',
  });
  expect(v.get).toBeCloseTo(1191.98, 1);
  expect(v.encdt).toBe(11);
  expect(v.vct).toBe(1203);  // o 1202.98 redondeado
});

test('Caso 4: M 25a 1.85m 92kg urbano ligero → usa peso saludable', () => {
  const v = calculateVCT({
    sex: 'M', birthDate: addYears(today, -25),
    heightCm: 185, weightKg: 92,
    residenceArea: 'urbana', lifestyle: 'ligero',
    physiologicalState: 'standard',
  });
  expect(v.weightUsed).toBeCloseTo(75.295, 2);
  expect(v.tmb).toBeCloseTo(1825.92, 1);
  expect(v.naf).toBe(1.55);
  expect(v.get).toBeCloseTo(2830.17, 1);
});

test('Caso 8: F 20a 1.67m pregest 70 actual 80, rural ligero, embarazo T3', () => {
  const v = calculateVCT({
    sex: 'F', birthDate: addYears(today, -20),
    heightCm: 167, weightKg: 80, weightPregestKg: 70,
    residenceArea: 'rural', lifestyle: 'ligero',
    physiologicalState: 'pregnancy_t3',
  });
  expect(v.weightUsed).toBeCloseTo(61.36, 2);  // peso saludable del pregest
  expect(v.tmb).toBeCloseTo(1395.77, 1);
  expect(v.naf).toBe(1.65);
  expect(v.adicion).toBe(475);
  expect(v.vct).toBe(2778);  // o 2778.02 redondeado
});
```

**No avanzar al siguiente sprint hasta que los 3 tests pasen.**

### Tarea 1.3 — Endpoint REST

`src/app/api/patients/[id]/requirements/route.ts`

```typescript
GET /api/patients/:id/requirements
→ { vct: VCTBreakdown, patient: PatientSnapshot }
```

Validar con Zod. Usar `createClient()` (RLS).

### Tarea 1.4 — Actualizar `PatientForm.tsx`

Agregar campos:
- Fecha de nacimiento (date input)
- Sexo (radio M/F)
- Talla (number, en cm, validar 30-250)
- Peso (number, en kg, validar 2-300)
- Área de residencia (radio urbana/rural)
- Estilo de vida (radio ligero/no_ligero)
- (Por ahora dejar el dropdown viejo de `clinical_profile`; se elimina en Sprint 3)

Validar con Zod schema. Mostrar IMC actual y peso saludable en vivo a medida que
el usuario completa peso y talla.

### Tarea 1.5 — Pantalla del paciente: bloque "Requerimientos"

En la página del paciente (donde está el PlanBuilder), agregar un bloque nuevo
arriba que muestre:

```
┌─ Requerimiento energético ───────────────────────┐
│  TMB:    1320 kcal                               │
│  NAF:    1.55 (urbana ligero)                    │
│  GET:    2046 kcal                               │
│  Adición fisiológica: +0 kcal (estándar)         │
│  VCT:    2046 kcal/día                           │
│                                                  │
│  Peso usado: 75.3 kg (saludable, IMC actual 26.9)│
└──────────────────────────────────────────────────┘
```

Se actualiza al editar peso/talla/edad del paciente. No tocar todavía la lógica
de alertas (sigue usando `PROFILES` por ahora).

### Sprint 1 — Done criteria

- [ ] Migración 002 ejecutada en Supabase
- [ ] Los 3 tests del Excel peruano pasan en `vitest`
- [ ] `PatientForm` permite ingresar todos los campos antropométricos
- [ ] La pantalla del paciente muestra el bloque VCT con datos reales
- [ ] La app sigue funcionando como Fase 2A (las alertas no han cambiado todavía)
- [ ] No hay errores de TypeScript ni de lint
- [ ] Push a `main`, Vercel deploy verde

---

## Sprint 2 — DRIs IOM personalizados + targets por paciente

**Objetivo:** reemplazar los `PROFILES` genéricos por targets calculados a partir
de DRIs IOM personalizados por sexo/edad/estado fisiológico del paciente.

**Tiempo estimado:** 5-6 días.

### Tarea 2.1 — Migración de esquema

`supabase/migrations/003_dri_reference.sql`

Crear tabla `dri_reference` exactamente como en `CONTEXT.md` sección 12. Índice
`dri_lookup_idx` obligatorio (la app hará muchos lookups).

### Tarea 2.2 — Seed de DRIs

`scripts/seed-dris.ts`

Lee `data/dris_iom.json` (1126 valores) y los inserta en `dri_reference`.
Idempotente: si los registros ya existen, no duplicarlos (`ON CONFLICT DO NOTHING`
sobre una unique constraint compuesta).

```bash
npx tsx scripts/seed-dris.ts
# debería imprimir: "Seeded 1126 DRI records"
```

### Tarea 2.3 — `driLookup.ts`

```typescript
export type DRIValue = { rda?: number; ai?: number; ul?: number };

export async function getBaseDRIs(
  sex: 'M' | 'F',
  ageMonths: number,
  state: 'standard' | 'pregnancy' | 'lactation'
): Promise<Record<string, DRIValue>>;
```

Tests obligatorios:
- Mujer 25 años (300 meses) standard → hierro RDA = 18 mg, vit C RDA = 75 mg
- Hombre 25 años → hierro RDA = 8 mg, vit C RDA = 90 mg
- Mujer 25 años pregnancy → hierro RDA = 27 mg, ácido fólico = 600 µg
- Mujer 25 años lactation → hierro RDA = 9 mg, vit C RDA = 120 mg
- Niña 5 años (60 meses) → grupo "children_4_8y", calcio = 1000 mg

### Tarea 2.4 — Refactor de `calculateTotals` y alertas

Modificar `src/lib/nutrition.ts` (o moverlo a `src/lib/calculations/nutrientTotals.ts`):

```typescript
// Antes:
const limits = PROFILES[patient.clinical_profile].limits;

// Después:
const ageMonths = ageInMonths(patient.birthDate);
const state = mapPhysiologicalToDRI(patient.physiological_state);
const limits = await getBaseDRIs(patient.sex, ageMonths, state);
const vct = calculateVCT(patient);

// Convert DRI values to Limit objects for alert system
const targets = {
  energia_kcal: { target: vct.vct },
  proteinas_g: limits.proteinas_g,
  hierro_mg: { target: limits.hierro_mg.rda ?? limits.hierro_mg.ai, max: limits.hierro_mg.ul },
  // ... etc
};
```

### Tarea 2.5 — Actualizar endpoint `/api/plans/:id/totals`

Debe devolver:
```typescript
{
  totals: Totals,
  targets: ResolvedTargets,    // ahora vienen de DRIs, no de PROFILES
  alerts: AlertLevels,
}
```

### Tarea 2.6 — Actualizar `TotalsPanel.tsx`

El semáforo ahora compara contra el target personalizado. Mostrar:
- Energía / VCT del paciente
- Cada nutriente / RDA o AI (con tope UL si aplica)

### Tarea 2.7 — Eliminar dependencia de `PROFILES`

El archivo `src/lib/profiles.ts` queda solo para la lista de comorbilidades visibles
en el dropdown (que se reemplazará en Sprint 3). El objeto `PROFILES.limits` ya no
se usa en cálculos.

### Sprint 2 — Done criteria

- [ ] Tabla `dri_reference` poblada con 1126 registros
- [ ] Tests de `driLookup` pasan
- [ ] El panel de totales muestra targets personalizados (hierro 18 para mujer 25a, no genérico)
- [ ] Cambiar el sexo o la edad del paciente cambia los targets en vivo
- [ ] Embarazadas ven targets de embarazo (hierro 27)
- [ ] Push a `main`, deploy verde

---

## Sprint 3 — Comorbilidades múltiples + merge automático

**Objetivo:** convertir el dropdown de perfil clínico en checkboxes múltiples con
merge de límites según las reglas de `clinical_overrides.json`.

**Tiempo estimado:** 6-7 días. **Este es el sprint con más riesgo de bugs.**

### Tarea 3.1 — Migración de esquema (la grande)

`supabase/migrations/004_comorbidities.sql`

```sql
BEGIN;

-- 1. Agregar columnas nuevas
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS comorbidities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_athlete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS protein_factor_override numeric,
  ADD COLUMN IF NOT EXISTS custom_limits jsonb;

CREATE INDEX IF NOT EXISTS patients_comorbidities_idx ON patients USING gin(comorbidities);

-- 2. Migrar datos viejos del dropdown (aunque no haya usuarios reales,
--    puede haber datos de prueba)
UPDATE patients SET comorbidities = CASE
  WHEN clinical_profile = 'adulto_sano' THEN '{}'
  WHEN clinical_profile = 'renal_predialisis' THEN ARRAY['renal_predialysis']
  WHEN clinical_profile = 'renal_dialisis' THEN ARRAY['renal_hemodialysis']
  WHEN clinical_profile = 'diabetes' THEN ARRAY['diabetes_t2']
  WHEN clinical_profile = 'hipertension' THEN ARRAY['hypertension']
  WHEN clinical_profile = 'custom' THEN ARRAY['custom']
  ELSE '{}'
END
WHERE comorbidities = '{}';

-- 3. Dropear la columna vieja
ALTER TABLE patients DROP COLUMN IF EXISTS clinical_profile;

COMMIT;
```

### Tarea 3.2 — Cargar `clinical_overrides.json` en memoria

NO va a la BD (cambia poco). Se importa como módulo:

```typescript
// src/lib/calculations/clinicalOverrides.ts
import overrides from '@/data/clinical_overrides.json';
export const CLINICAL_OVERRIDES = overrides as ClinicalOverridesData;
```

### Tarea 3.3 — `comorbidityMerge.ts` (la función más compleja)

Implementar exactamente la lógica de `CONTEXT.md` sección 6, con las 5 reglas:

1. **Máximos** (sodio, fósforo, grasa saturada, colesterol): tomar el más bajo
2. **Mínimos** (fibra, potasio en HTA, calcio): tomar el más alto
3. **Rangos %** (CHO, grasa, proteína): intersección
4. **Proteína g/kg** especial: detectar conflicto sin auto-mergear
5. **Hierro especial**: multiplicador (×1.5 en anemia) con tope UL

```typescript
export type MergedLimit = {
  min?: number;
  max?: number;
  target?: number;
  source?: string;          // qué comorbilidad lo impuso
  baseValue?: number;       // valor original antes del override
  conflict?: boolean;       // si hay rangos incompatibles
  conflictDetails?: { sources: string[]; values: any[] };
};

export type MergedTargets = Record<string, MergedLimit>;

export function mergeOverrides(
  baseDRIs: Record<string, DRIValue>,
  activeComorbidities: ComorbidityCode[],
  patient: Patient
): MergedTargets;
```

### Tarea 3.4 — Tests exhaustivos de merge

`__tests__/comorbidityMerge.test.ts` debe cubrir TODOS estos casos (de `CONTEXT.md`
sección 19):

```typescript
describe('comorbidityMerge', () => {
  test('Sano sin comorbilidades: limits = base DRI', () => { ... });

  test('Caso M1: DM2 + HTA (mujer 45a, 60kg)', () => {
    const result = mergeOverrides(baseDRIs, ['diabetes_t2', 'hypertension'], patient);
    expect(result.sodio_mg.max).toBe(1500);
    expect(result.sodio_mg.source).toBe('hypertension');
    expect(result.fibra_g.min).toBe(30);
    expect(result.fibra_g.source).toBe('diabetes_t2');
    expect(result.grasa_pct_vct.min).toBe(20);
    expect(result.grasa_pct_vct.max).toBe(30);
    expect(result.grasa_saturada_pct_vct.max).toBe(7);
  });

  test('Caso M2: Renal pre-diálisis + Deportista → conflicto proteína', () => {
    const result = mergeOverrides(baseDRIs, ['renal_predialysis'],
                                  { ...patient, is_athlete: true });
    expect(result.proteinas_g_per_kg.conflict).toBe(true);
    expect(result.fosforo_mg.max).toBe(800);
    expect(result.potasio_mg.max).toBe(2700);
  });

  test('Caso M3: Embarazo T2 + Anemia → hierro 40.5 mg (× 1.5)', () => {
    const result = mergeOverrides(
      { hierro_mg: { rda: 27, ul: 45 } },
      ['iron_deficiency_anemia'],
      patient
    );
    expect(result.hierro_mg.target).toBeCloseTo(40.5, 1);
    expect(result.vitamina_c_mg.min).toBe(100);
  });

  test('Adulto mayor 65a + HTA: calcio = 1200 (ambos lo piden)', () => { ... });

  test('Tope UL: hierro ×1.5 no puede pasar UL 45', () => { ... });

  test('Adulto mayor se aplica automáticamente a >= 60 años', () => {
    const olderPatient = { ...patient, birthDate: addYears(today, -65) };
    const result = mergeOverrides(baseDRIs, [], olderPatient);
    expect(result.proteinas_g_per_kg.target).toBe(1.2);
    expect(result.calcio_mg.min).toBe(1200);
  });
});
```

### Tarea 3.5 — `derivedComorbidities.ts`

```typescript
export function getDerivedComorbidities(patient: Patient): ComorbidityCode[] {
  const result: ComorbidityCode[] = [...patient.comorbidities];
  if (ageInYears(patient.birthDate) >= 60) result.push('older_adult');
  if (patient.is_athlete) result.push('athlete');
  return result;
}
```

Esta función se llama antes de `mergeOverrides`.

### Tarea 3.6 — Refactor de `PatientForm.tsx`

Reemplazar el `<select>` de perfil clínico por:

```tsx
<fieldset>
  <legend>Perfil clínico (puede marcar varios)</legend>
  <Checkbox name="renal_predialysis" />
  <Checkbox name="renal_hemodialysis" />
  <Checkbox name="diabetes_t1" />
  <Checkbox name="diabetes_t2" />
  <Checkbox name="diabetes_gestational" />
  <Checkbox name="hypertension" />
  <Checkbox name="iron_deficiency_anemia" />
  <Checkbox name="dyslipidemia" />
  <Checkbox name="custom" />
</fieldset>

<div>
  <Checkbox name="is_athlete" label="Es deportista" />
  {patient.is_athlete && (
    <Input name="protein_factor_override"
           placeholder="1.4"
           hint="g/kg de peso saludable" />
  )}
</div>

{ageYears >= 60 && (
  <InfoBadge>
    Adulto mayor detectado automáticamente (≥60 años).
    Se aplican overrides: proteína 1.2 g/kg, calcio 1200 mg, vit D 20 µg.
  </InfoBadge>
)}
```

### Tarea 3.7 — Vista detallada con badges

Crear `components/plan/RequirementsDetail.tsx` que se abre desde un botón
"Ver detalle por comorbilidad" en el bloque de requerimientos.

Mostrar para cada nutriente:
- Valor final aplicado
- Badge con el origen (ej. `[HTA]`, `[DM2]`, `[Base IOM]`)
- Valor base de referencia
- Si subió o bajó (↑ / ↓)

Ejemplo:
```
Sodio:    ≤ 1500 mg  [HTA ↓ desde 2300]
Fibra:    ≥ 30 g     [DM2 ↑ desde 25g]
Grasa:    20-30%     [DM2 ∩ HTA-saturada]
```

### Tarea 3.8 — Actualizar `meal_plans` para snapshots

`supabase/migrations/005_meal_plans_snapshot.sql`

```sql
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS patient_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS calculated_tmb numeric,
  ADD COLUMN IF NOT EXISTS calculated_get numeric,
  ADD COLUMN IF NOT EXISTS calculated_encdt numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculated_vct numeric,
  ADD COLUMN IF NOT EXISTS target_macros jsonb,
  ADD COLUMN IF NOT EXISTS target_micros jsonb,
  ADD COLUMN IF NOT EXISTS override_sources jsonb;
```

Cuando se crea un plan, se guarda el snapshot completo del paciente + targets
resueltos. Si después se cambian datos del paciente, el plan histórico mantiene
sus targets originales.

### Sprint 3 — Done criteria

- [ ] Migraciones 004 y 005 ejecutadas
- [ ] **TODOS los tests de `comorbidityMerge.test.ts` pasan** (es el sprint más riesgoso)
- [ ] El form de paciente usa checkboxes; ya no hay dropdown de perfil
- [ ] Pacientes ≥60 años ven el badge de adulto mayor automático
- [ ] Vista detallada muestra badges de origen
- [ ] Conflicto renal+deportista se muestra como alerta, no se auto-aplica
- [ ] El plan guarda snapshot de targets al crearlo
- [ ] Push a `main`, deploy verde

---

## Sprint 4 — Estado fisiológico + distribución de macros

**Objetivo:** soportar embarazadas y lactantes con cálculos correctos, y permitir
al nutricionista configurar la distribución de macros (% CHO/PROT/GRASA).

**Tiempo estimado:** 4-5 días.

### Tarea 4.1 — Migración de esquema

```sql
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS physiological_state text NOT NULL DEFAULT 'standard'
    CHECK (physiological_state IN ('standard',
            'pregnancy_t1', 'pregnancy_t2', 'pregnancy_t3',
            'lactation_0_6m', 'lactation_6_12m')),
  ADD COLUMN IF NOT EXISTS weight_pregest_kg numeric,
  ADD COLUMN IF NOT EXISTS macro_distribution_override jsonb;
```

### Tarea 4.2 — UI: dropdown de estado fisiológico

En `PatientForm`, agregar:

```tsx
<Select name="physiological_state">
  <option value="standard">Estándar</option>
  <option value="pregnancy_t1">Embarazo — 1er trimestre (sem 1-13) · +85 kcal</option>
  <option value="pregnancy_t2">Embarazo — 2do trimestre (sem 14-26) · +285 kcal</option>
  <option value="pregnancy_t3">Embarazo — 3er trimestre (sem 27-40) · +475 kcal</option>
  <option value="lactation_0_6m">Lactancia 0-6 meses · +500 kcal</option>
  <option value="lactation_6_12m">Lactancia 6-12 meses · +400 kcal</option>
</Select>

{patient.physiological_state.startsWith('pregnancy') && (
  <Input name="weight_pregest_kg" required
         label="Peso pregestacional (kg)" />
)}
```

Validación con Zod: si embarazo, peso pregestacional es obligatorio.

### Tarea 4.3 — `macroDistribution.ts`

```typescript
export type MacroMode = 'amdr_auto' | 'manual' | 'from_protein_g_per_kg';

export function calculateMacroDistribution(
  vctKcal: number,
  mode: MacroMode,
  options: {
    proteinFactor?: number;       // g/kg, requerido en modo from_protein
    weightKg?: number;
    manualPct?: { cho: number; prot: number; fat: number };
    ageYears: number;
  }
): {
  cho: { pct: number; grams: number; kcal: number };
  prot: { pct: number; grams: number; kcal: number };
  fat: { pct: number; grams: number; kcal: number };
  warnings: string[];  // si está fuera de AMDR
};
```

Tests obligatorios:
- Modo AMDR adulto: 55% CHO, 20% PROT, 25% GRASA por defecto
- Modo manual: respeta los % dados, advierte si fuera de AMDR
- Modo desde proteína: 1.0 g/kg × 60 kg = 60g = 240 kcal; resto se distribuye

### Tarea 4.4 — UI: panel de distribución de macros

Tres pestañas o radio:

```
[ AMDR sugerido ] [ Manual ] [ Desde proteína g/kg ]

CHO  [55]%  → 254 g  (1015 kcal)
PROT [20]%  →  92 g  ( 370 kcal)
FAT  [25]%  →  51 g  ( 463 kcal)

Total: 100% · 1848 kcal · Meta VCT: 1850 kcal ✓
```

### Sprint 4 — Done criteria

- [ ] Embarazadas y lactantes funcionan correctamente (adición energética + DRIs)
- [ ] Peso pregestacional se usa en TMB de embarazadas
- [ ] Tests de `macroDistribution` pasan
- [ ] UI permite los 3 modos de distribución
- [ ] Push a `main`, deploy verde

---

## Sprint 5 — Medidas caseras TAFERA

**Objetivo:** permitir al nutricionista usar "1 taza" en lugar de gramos.
La conversión a gramos es automática.

**Tiempo estimado:** 3-4 días.

### Tarea 5.1 — Migración + seed

```sql
CREATE TABLE household_measures (
  id serial PRIMARY KEY,
  food_id integer NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  measure_name text NOT NULL,
  grams numeric NOT NULL CHECK (grams > 0),
  tafera_code text,
  match_confidence text CHECK (match_confidence IN ('high', 'medium', 'manual')),
  edible_pct numeric,
  notes text,
  source text NOT NULL DEFAULT 'TAFERA_2016',
  active boolean DEFAULT true
);
CREATE INDEX household_measures_food_idx ON household_measures(food_id) WHERE active = true;

ALTER TABLE meal_plan_items
  ADD COLUMN IF NOT EXISTS household_measure_id integer REFERENCES household_measures(id),
  ADD COLUMN IF NOT EXISTS household_measure_qty numeric;
```

`scripts/seed-measures.ts`: insertar SOLO las medidas con `match_confidence='high'`
(323 entradas, 169 alimentos cubiertos). Las medium y unmatched se manejan después.

### Tarea 5.2 — Endpoint

`GET /api/foods/:id/measures` → devuelve las medidas caseras de un alimento.

### Tarea 5.3 — `nutrientTotals.ts` — resolver gramos

```typescript
function resolveGrams(item: PlanItem, measures: Map<number, HouseholdMeasure>): number {
  if (item.household_measure_id) {
    const m = measures.get(item.household_measure_id);
    if (m) return m.grams * (item.household_measure_qty ?? 1);
  }
  return item.grams;
}
```

### Tarea 5.4 — UI: selector de cantidad en `MealSection`

Reemplazar el input simple de gramos por:

```tsx
<input type="number" value={qty} onChange={...} />
<select value={unitType} onChange={...}>
  <option value="grams">gramos</option>
  {measures.map(m => (
    <option value={m.id}>{m.measure_name} ({m.grams} g)</option>
  ))}
</select>
```

Si elige una medida casera, los gramos se calculan automáticamente.

### Sprint 5 — Done criteria

- [ ] Tabla `household_measures` con 323 entradas
- [ ] 169 alimentos tienen al menos una medida casera disponible
- [ ] El selector funciona en el constructor de plan
- [ ] Los totales calculan correctamente cuando se usan medidas caseras
- [ ] Push a `main`, deploy verde

---

## Sprint 6 (opcional) — Hierro absorbible

**Objetivo:** calcular hierro absorbible por comida con fórmula Monsen.
Útil especialmente para mujeres, embarazadas y pacientes con anemia.

**Tiempo estimado:** 2-3 días.

### Tarea 6.1 — `ironBioavailability.ts`

Implementación según `CONTEXT.md` sección 10.

Tests obligatorios:
- Comida vegetariana con poca vit C → factor 0.03
- Comida con 100g carne → factor 0.08
- Hierro hem de carne se absorbe al 25%

### Tarea 6.2 — UI

En el panel de totales, mostrar:
- Hierro total
- Hierro absorbible (con tooltip explicando que es Monsen)
- Por comida: ver factor de biodisponibilidad

Mostrar siempre para mujeres 12-50, embarazadas, lactantes, niños, o pacientes
con anemia.

### Sprint 6 — Done criteria

- [ ] Tests de Monsen pasan
- [ ] Hierro absorbible visible para los grupos relevantes
- [ ] Push a `main`, deploy verde

---

## Validación final con Regina

Antes de declarar Fase 2B completa:

1. **Demo con Regina** usando 5 casos clínicos representativos:
   - Adulto sano
   - Deportista
   - Embarazada T2
   - Adulto mayor con HTA
   - Diabético con anemia ferropénica

2. **Regina valida los overrides clínicos.** Si discrepa con algún valor de
   `clinical_overrides.json`, ajustar y redeployar.

3. **Regina aprueba el disclaimer del PDF** con su nombre y N° de colegiatura CNP.

4. **Pruebas con 3-5 pacientes ficticios** que ella cree, para verificar
   que el flujo completo (crear paciente → requerimientos → plan → PDF) es
   usable en consulta real.

5. **Tag de versión:** `git tag v2b-final`.

---

## Reglas inviolables durante toda la migración

1. **Nunca borrar datos en producción sin backup.** Cada migración SQL debe ser
   reversible o tener un rollback documentado.

2. **Nunca commitear secrets.** `.env.local` está en `.gitignore`.

3. **Cada sprint termina con todos los tests pasando.** Sin tests verdes, no se
   pushea a main.

4. **Nunca asumir `null = 0`** en datos nutricionales o DRIs.

5. **TypeScript strict mode siempre activo.** No usar `any`.

6. **Cada PR (aunque sea a main) debe pasar lint + typecheck + tests.**

7. **Si un sprint se atasca más de 2 días sobre el estimado, parar y reevaluar.**
   No avanzar sobre fundación rota.

8. **Si los tests de `comorbidityMerge` no pasan, NO seguir a Sprint 4.** Es la
   base de todos los cálculos posteriores.

---

## Resumen de migraciones SQL en orden

```
001_initial_schema.sql           ← ya aplicada (Fase 2A)
002_patient_anthropometry.sql    ← Sprint 1
003_dri_reference.sql            ← Sprint 2
004_comorbidities.sql            ← Sprint 3
005_meal_plans_snapshot.sql      ← Sprint 3
006_physiological_state.sql      ← Sprint 4
007_household_measures.sql       ← Sprint 5
```

---

## Cuando algo se atasca

Si Claude Code encuentra un problema que no está cubierto en este plan o en
`CONTEXT.md`:

1. NO inventar la solución.
2. Detener el sprint, anotar el problema, preguntar al usuario.
3. Proponer 2-3 opciones con sus trade-offs.
4. Solo después de la decisión del usuario, retomar.

Esto es especialmente importante en:
- Reglas clínicas no cubiertas explícitamente (preguntar a Regina vía el usuario)
- Conflictos entre comorbilidades no listados en los ejemplos
- Edge cases de cálculo energético (infantes <1 año, embarazadas adolescentes <14)

---

**Última actualización:** Plan de migración Fase 2A → Fase 2B (sprints 1-6)
basado en CONTEXT.md y estado actual del repo NutriCalc.
