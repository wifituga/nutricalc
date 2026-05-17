# CONTEXT.md — NutriCalc · Especificación clínica completa

> Especificación clínica de la app. Léelo entero antes de empezar cualquier sprint
> de la migración descrita en `MIGRATION_PLAN.md`.

---

## 0. Archivos de referencia

```
nutricalc/
├── CLAUDE.md                         ← Estado del proyecto, stack, decisiones
├── CONTEXT.md                        ← este archivo (especificación clínica)
├── MIGRATION_PLAN.md                 ← Plan de sprints para Fase 2B
├── data/
│   ├── tpca_2023.json                ← 1125 alimentos (ya en BD)
│   ├── medidas_caseras.json          ← 960 medidas TAFERA (323 high)
│   ├── dris_iom.json                 ← 1126 valores DRI IOM/NASEM
│   ├── peru_energy_guide.json        ← Fórmulas FAO/OMS adaptadas Perú
│   └── clinical_overrides.json       ← Overrides + reglas de merge
└── reference/
    └── prototipo.html                ← Prototipo HTML inicial (Fase 2A)
```

---

## 1. Modelo del paciente — Tres dimensiones independientes

```typescript
type Patient = {
  // Identificación
  id: string;
  fullName: string;
  documentId: string;
  birthDate: Date;
  sex: 'M' | 'F';

  // Antropometría
  heightCm: number;
  weightKg: number;
  weightPregestKg?: number;

  // Dimensión 1: Estado fisiológico
  physiologicalState:
    | 'standard'
    | 'pregnancy_t1' | 'pregnancy_t2' | 'pregnancy_t3'
    | 'lactation_0_6m' | 'lactation_6_12m';

  // Dimensión 2: Actividad
  residenceArea: 'urbana' | 'rural';
  lifestyle: 'ligero' | 'no_ligero';
  isAthlete: boolean;
  proteinFactorOverride?: number;

  // Dimensión 3: Perfil clínico (múltiples)
  comorbidities: ComorbidityCode[];
  customLimits?: Limits;

  // Otros
  macroDistributionOverride?: { cho: number; prot: number; fat: number };
  notes?: string;
};

type ComorbidityCode =
  | 'renal_predialysis' | 'renal_hemodialysis'
  | 'diabetes_t1' | 'diabetes_t2' | 'diabetes_gestational'
  | 'hypertension' | 'iron_deficiency_anemia' | 'dyslipidemia'
  | 'custom';
// older_adult y athlete NO van aquí — se derivan automáticamente
```

### Auto-derivados (no checkboxes)

- **`older_adult`** — Cuando edad ≥ **60 años** (consistente con guía peruana CENAN
  donde IMC saludable cambia de 22 a 25.5 a los 60).
- **`athlete`** — Cuando flag `is_athlete = true`.

---

## 2. Base de alimentos — TPCA 2023

**Fuente:** Instituto Nacional de Salud del Perú · ISBN 978-612-310-178-7.

1125 alimentos en 14 grupos. Ya cargados en tabla `foods` desde Fase 2A.

Estructura del archivo `tpca_2023.json`:

```typescript
type Food = {
  id: number;
  codigo: string;                        // "A1", "F45"
  grupo_letra: string;
  grupo: string;
  alimento: string;
  energia_kcal: number | null;
  energia_kj: number | null;
  agua_g: number | null;
  proteinas_g: number | null;
  grasa_g: number | null;
  carbohidratos_totales_g: number | null;
  carbohidratos_disponibles_g: number | null;
  fibra_g: number | null;
  cenizas_g: number | null;
  calcio_mg: number | null;
  fosforo_mg: number | null;
  zinc_mg: number | null;
  hierro_mg: number | null;
  sodio_mg: number | null;
  potasio_mg: number | null;
  beta_caroteno_ug: number | null;
  vitamina_a_ug: number | null;
  tiamina_mg: number | null;
  riboflavina_mg: number | null;
  niacina_mg: number | null;
  vitamina_c_mg: number | null;
  acido_folico_ug: number | null;
};
```

**Regla inviolable:** `null` significa "sin dato", **nunca** es 0.

---

## 3. Cálculo energético — FAO/OMS 2004 adaptado por CENAN Perú

### Conceptos

| Sigla | Significado | Cálculo |
|---|---|---|
| **IMC saludable** | Punto de referencia | 22 (<60a), 25.5 (≥60a) |
| **Peso saludable** | Si IMC > saludable | `IMC_saludable × talla²(m)` |
| **TMB** | Tasa Metabólica Basal | Ecuaciones FAO/OMS por edad/sexo |
| **NAF** | Nivel Actividad Física | Tabla urbana/rural × ligero/no_ligero |
| **GET** | Gasto Energético Total | `TMB × NAF` (adultos); fórmula directa (niños) |
| **ENCDT** | Energía para Crecimiento | Tabla por edad/sexo (<18a) |
| **VCT** | Valor Calórico Total | `GET + ENCDT + adición fisiológica` |

### Ecuaciones TMB para adultos (≥18 años)

```typescript
function calculateTMB_adult(sex: 'M'|'F', ageYears: number, weightKg: number): number {
  if (sex === 'M') {
    if (ageYears < 30) return 15.057 * weightKg + 692.2;
    if (ageYears < 60) return 11.472 * weightKg + 873.1;
    return 11.711 * weightKg + 587.7;
  } else {
    if (ageYears < 30) return 14.818 * weightKg + 486.6;
    if (ageYears < 60) return 8.126 * weightKg + 845.6;
    return 9.082 * weightKg + 658.5;
  }
}
```

### Selección de peso

```typescript
function selectWeight(currentWeight: number, heightM: number, ageYears: number,
                     pregestWeight?: number): number {
  if (pregestWeight) return selectWeight(pregestWeight, heightM, ageYears);

  const imcSaludable = ageYears >= 60 ? 25.5 : 22.0;
  const pesoSaludable = imcSaludable * heightM * heightM;
  const imcActual = currentWeight / (heightM * heightM);

  return imcActual > imcSaludable ? pesoSaludable : currentWeight;
}
```

### Tabla NAF

| Área | Estilo | NAF |
|---|---|---|
| Urbana | ligero | **1.55** |
| Urbana | no ligero | **1.85** |
| Rural | ligero | **1.65** |
| Rural | no ligero | **1.95** |

### Cálculo completo de VCT

Para adultos: `TMB × NAF + adición`
Para niños 1-17a: fórmula directa GET sin TMB×NAF
Adolescentes 12-17a: GET ± 15% según actividad

Adiciones fisiológicas:
- Embarazo T1: **+85 kcal**
- Embarazo T2: **+285 kcal**
- Embarazo T3: **+475 kcal**
- Lactancia 0-6m: **+500 kcal**
- Lactancia 6-12m: **+400 kcal**

ENCDT (energía para crecimiento, solo <18a) — ver `peru_energy_guide.json`.

---

## 4. DRIs — IOM/NASEM

**1126 valores · 30 nutrientes · 22 etapas de vida.**

Vitaminas: A, C, D, E, K, B1, B2, B3, B6, B9 (folato), B12.
Minerales: Ca, Cr, Cu, F, I, Fe, Mg, Mn, Mo, P, Se, Zn.
Macros: agua, CHO, fibra, grasa total, linoleico, α-linolenico, proteínas.

Cada valor tiene tipo: **RDA**, **AI**, **UL**.

### AMDR (rangos de macros)

| Grupo | CHO | Prot | Grasa |
|---|---|---|---|
| Niños 1-3a | 45-65% | 5-20% | 30-40% |
| Niños 4-18a | 45-65% | 10-30% | 25-35% |
| Adultos | 45-65% | 10-35% | 20-35% |

**Defaults:** 55% CHO, 20% PROT, 25% GRASA (adultos).

### Función de lookup

```typescript
function getBaseDRIs(sex: 'M'|'F', ageMonths: number,
                    state: 'standard'|'pregnancy'|'lactation'): Record<string, DRIValue>;
```

---

## 5. Comorbilidades — Overrides

**Fuente:** archivo `clinical_overrides.json`.

| Comorbilidad | Guía | Overrides principales |
|---|---|---|
| `renal_predialysis` | KDOQI 2020 | Prot 0.6-0.8 g/kg, P 800, K 2700, Na 2300 |
| `renal_hemodialysis` | KDOQI 2020 | Prot 1.2-1.4, P 1000, K 3000, Na 2000, Ca 1200 |
| `diabetes_t1` | ADA 2024 | CHO 45-60%, Grasa 20-30%, Sat <10%, Fibra 30, Na 2300 |
| `diabetes_t2` | ADA 2024 | + Prot 1.0-1.2 g/kg |
| `diabetes_gestational` | ADA + IOM | CHO 40-50%, Grasa 30-40%, Fibra 30, Prot 1.1-1.3 |
| `hypertension` | AHA + DASH | Na 1500, K 4700, Ca 1200, Mg 420, Sat <7% |
| `iron_deficiency_anemia` | WHO 2017 | Fe target × 1.5, Vit C 100 |
| `dyslipidemia` | AHA 2019 | Sat <7%, Trans 0, Col <200, Fibra soluble 10 |
| `older_adult` (auto, ≥60a) | IOM + ESPEN | Prot 1.2 g/kg, Ca 1200, Vit D 20 |
| `athlete` (flag) | ISSN 2017 | Prot 1.2-2.0 (default 1.4), CHO 50-65% |
| `custom` | Manual | Todos los límites definidos por nutricionista |

### Reglas de merge para múltiples comorbilidades

| Regla | Aplica a | Cómo |
|---|---|---|
| **Máximos** | Na, P, K en renales, grasa saturada, colesterol | Tomar el **más bajo** |
| **Mínimos** | Fibra, K en HTA, Ca, Vit C, Vit D | Tomar el **más alto** |
| **Rangos %** | CHO%, Prot%, Grasa% | **Intersección** (max de mins, min de maxs) |
| **Proteína g/kg** ESPECIAL | proteinas_g_per_kg | Si rangos no se solapan → **CONFLICTO**, decisión manual |
| **Hierro** ESPECIAL | hierro_mg | Anemia: `RDA × 1.5`, topado al UL |

### Ejemplos

**Caso M1 — DM2 + HTA (mujer 45a, 60kg):**
```
Sodio = 1500 mg  [HTA gana]
Fibra = 30 g     [DM2 gana]
Grasa = 20-30%   [intersección DM2(20-30) ∩ HTA(20-35)]
Sat = <7%        [HTA gana]
Prot = 1.1 g/kg → 66g [DM2]
```

**Caso M2 — Renal pre-diálisis + Deportista (M 35a):**
```
Prot: CONFLICTO (renal 0.6-0.8 vs deportista 1.2-2.0)
      → NO auto-mergear, mostrar alerta, decisión clínica
P = 800 mg  [Renal]
K = 2700 mg [Renal]
```

**Caso M3 — Embarazo T2 + Anemia (mujer 28a):**
```
Hierro target = min(27 × 1.5, UL 45) = 40.5 mg
Vit C mín = 100 mg [Anemia]
```

---

## 6. Vista UI dual — Pantalla principal vs. detalle

**Pantalla principal** (default, simple): solo valores finales, sin badges.

**Vista detallada** (al clickear "Ver detalle"): muestra el origen de cada límite.

```
Pantalla principal:                  Vista detallada:
Sodio: ≤ 1500 mg                     Sodio: ≤ 1500 mg [HTA ↓ desde 2300]
Fibra: ≥ 30 g                        Fibra: ≥ 30 g [DM2 ↑ desde 25]
```

---

## 7. Medidas caseras — TAFERA 2016

**Fuente:** CENAN/INS Perú · solo conversiones de peso (los nutrientes vienen de TPCA 2023).

```typescript
type HouseholdMeasure = {
  tafera_code: string;
  alimento_tafera: string;
  unidad_consumo: string;
  peso_neto_g: number;
  parte_comestible_pct: number | null;
  tpca_code: string | null;
  match_confidence: 'high' | 'medium' | 'unmatched';
  match_score: number;
};
```

**Estado:**
- 323 high confidence → MVP (169 alimentos cubiertos)
- 197 medium → revisión manual posterior
- 440 unmatched → mapeo manual posterior

---

## 8. Biodisponibilidad de hierro — Fórmula Monsen 1978

```typescript
function calculateAbsorbableIron(mealItems: PlanItem[]): number {
  let heme = 0, nonHeme = 0, vitC = 0, meatGrams = 0;

  for (const item of mealItems) {
    const food = getFood(item.foodId);
    const grams = resolveGrams(item);
    const factor = grams / 100;

    const split = splitHeme(food);
    heme += split.heme * factor;
    nonHeme += split.nonHeme * factor;
    vitC += (food.vitamina_c_mg ?? 0) * factor;
    if (['E', 'F'].includes(food.grupo_letra)) meatGrams += grams;
  }

  // Factor de absorción no-hem por comida
  let f: number;
  if (vitC >= 75 || meatGrams >= 75) f = 0.08;       // alta
  else if (vitC >= 25 || meatGrams >= 30) f = 0.05;  // media
  else f = 0.03;                                     // baja

  return heme * 0.25 + nonHeme * f;
}

function splitHeme(food: Food): { heme: number; nonHeme: number } {
  const total = food.hierro_mg ?? 0;
  // Heurística: 40% del Fe en carnes/pescados es hem
  if (['E', 'F'].includes(food.grupo_letra)) {
    return { heme: total * 0.40, nonHeme: total * 0.60 };
  }
  return { heme: 0, nonHeme: total };
}
```

**Mostrar siempre para:** mujeres 12-50a, embarazadas, lactantes, niños,
pacientes con `iron_deficiency_anemia`.

---

## 9. Esquema PostgreSQL final (post Fase 2B)

```sql
CREATE TABLE foods (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  group_letter text NOT NULL,
  group_name text NOT NULL,
  name text NOT NULL,
  per_100g jsonb NOT NULL,
  source text NOT NULL DEFAULT 'TPCA_2023',
  is_preparation boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

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

CREATE TABLE dri_reference (
  id serial PRIMARY KEY,
  sex text NOT NULL CHECK (sex IN ('M', 'F')),
  age_min_months integer NOT NULL,
  age_max_months integer,
  physiological_state text NOT NULL,
  nutrient_key text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('RDA', 'AI', 'UL', 'EAR')),
  value numeric NOT NULL,
  source text NOT NULL DEFAULT 'IOM_DRI'
);

CREATE TABLE clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE nutritionists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  professional_license text,
  clinic_id uuid REFERENCES clinics(id),
  role text CHECK (role IN ('admin', 'nutritionist')) DEFAULT 'nutritionist',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  assigned_nutritionist_id uuid REFERENCES nutritionists(id),

  full_name text NOT NULL,
  document_id text,
  birth_date date,
  sex text CHECK (sex IN ('M', 'F')),
  height_cm numeric,
  weight_kg numeric,
  weight_pregest_kg numeric,

  physiological_state text NOT NULL DEFAULT 'standard'
    CHECK (physiological_state IN ('standard',
            'pregnancy_t1','pregnancy_t2','pregnancy_t3',
            'lactation_0_6m','lactation_6_12m')),
  residence_area text CHECK (residence_area IN ('urbana','rural')),
  lifestyle text CHECK (lifestyle IN ('ligero','no_ligero')),
  is_athlete boolean DEFAULT false,
  protein_factor_override numeric,

  comorbidities text[] DEFAULT '{}',
  custom_limits jsonb,
  macro_distribution_override jsonb,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES nutritionists(id),
  plan_date date NOT NULL,
  name text NOT NULL,
  notes text,
  is_template boolean DEFAULT false,

  -- Snapshot del paciente al crear el plan
  patient_snapshot jsonb NOT NULL,
  calculated_tmb numeric NOT NULL,
  calculated_get numeric NOT NULL,
  calculated_encdt numeric DEFAULT 0,
  calculated_vct numeric NOT NULL,
  target_macros jsonb NOT NULL,
  target_micros jsonb NOT NULL,
  override_sources jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  food_id integer NOT NULL REFERENCES foods(id),
  meal text NOT NULL CHECK (meal IN ('desayuno','media_manana','almuerzo','media_tarde','cena')),
  grams numeric NOT NULL CHECK (grams >= 0),
  household_measure_id integer REFERENCES household_measures(id),
  household_measure_qty numeric,
  position integer NOT NULL DEFAULT 0,
  notes text
);
```

---

## 10. Casos de test obligatorios

### Energía (FAO/OMS adaptado Perú)

**Caso 1 — F 3 años 16 kg:**
```
GET = 263.4 + 65.3×16 - 0.454×16² = 1191.98
ENCDT = 11
VCT = 1202.98 kcal ✓
```

**Caso 4 — M 25a 1.85m 92kg urbano ligero:**
```
IMC actual 26.88 → usar peso saludable 75.295 kg (IMC 22)
TMB = 15.057×75.295 + 692.2 = 1825.92
NAF = 1.55
GET = 2830.17 kcal ✓
```

**Caso 8 — F 20a 1.67m pregest 70 actual 80, rural ligero, embarazo T3:**
```
IMC pregest 25.10 → peso saludable 61.36 kg
TMB = 14.818×61.36 + 486.6 = 1395.77
NAF = 1.65
GET = 2303.02
+475 (T3)
VCT = 2778.02 kcal ✓
```

### Merge de comorbilidades

**Caso M1 — DM2 + HTA (mujer 45a, 60kg):**
- Sodio: 1500 [HTA]
- Fibra: 30 [DM2]
- Grasa: 20-30% [intersección]
- Sat: <7% [HTA]
- Prot: 1.1 g/kg → 66g [DM2]

**Caso M2 — Renal pre-diálisis + Deportista (M 35a, 70kg):**
- Prot: CONFLICTO (0.6-0.8 vs 1.2-2.0) → alerta, no auto-mergear
- P: 800 [Renal]
- K: 2700 [Renal]

**Caso M3 — Embarazo T2 + Anemia (F 28a):**
- Hierro target: min(27 × 1.5, UL 45) = 40.5 mg
- Vit C mín: 100 mg [Anemia]

---

## 11. Cita obligatoria en PDFs

> Composición de alimentos: Reyes-García MM, Gómez-Sánchez Prieto VI, Espinoza-Barrientos CM. Tablas Peruanas de Composición de Alimentos. 11.ª ed. Lima: Instituto Nacional de Salud, 2023. ISBN 978-612-310-178-7. — Requerimientos energéticos: FAO/WHO/UNU 2004, adaptación CENAN/INS Perú. — Requerimientos de micronutrientes: DRIs, IOM/NASEM. — Medidas caseras: TAFERA, CENAN/INS Perú, 2016. — Recomendaciones por comorbilidad: KDOQI 2020, ADA 2024, AHA 2021, DASH, AHA 2019, WHO 2017.

Y firma: "Plan elaborado por [Nombre, CNP N°XXXX]. Información de apoyo profesional, no reemplaza consulta presencial."

---

## 12. Reglas inviolables

1. `null` ≠ 0 en nutrientes ni DRIs
2. Peso saludable cuando IMC > saludable; peso pregestacional en embarazo
3. Adulto mayor auto-detectado a partir de 60 años
4. Branded types en TypeScript (`Mg`, `G`, `Kcal`, `Months`)
5. DRIs en BD, overrides en JSON; nunca hardcodeados
6. Solo medidas `confidence='high'` en MVP
7. Nutrientes siempre de TPCA 2023, nunca de TAFERA 2016
8. No localStorage para datos clínicos (Ley 29733)
9. No auto-mergear proteína g/kg si rangos no se solapan
10. Vista detallada con badges solo en modo "detalle", no en pantalla principal

---

**Para el plan operativo de sprints, ver `MIGRATION_PLAN.md`.**
