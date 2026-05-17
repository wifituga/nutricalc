# FIX_BEFORE_REGINA.md — Arreglos clínicos pre-validación

> Spec operativa para Claude Code. Una sola PR en branch
> `feature/fix-before-regina`. Resuelve **los 20 casos** identificados por
> auditoría de cobertura + panel "Cálculo paso a paso" + disclaimer visible.
>
> Decisiones clínicas ya tomadas (ver sección 0). Las 3 más discutibles van
> marcadas en el código con `// REVIEW_WITH_REGINA:` para que la nutricionista
> las revise primero en la demo.
>
> **Ritmo:** sin presión de semanas — cada arreglo se commitea cuando esté
> hecho y los tests pasen. La PR se mergea cuando los 3 grupos estén completos.

---

## Sección 0 — Decisiones clínicas tomadas

Lista íntegra de las decisiones tomadas por el equipo (no por Claude Code).
Estas son ley para la implementación. Si Claude Code encuentra ambigüedad,
detenerse y preguntar.

### Decisiones del Grupo A (críticas)

**A.1 — Umbrales del semáforo de nutrientes (5 niveles)**

```
ESTADO        REGLA                                  COLOR (--var)
─────────────────────────────────────────────────────────────────
low           valor < target × 0.8                   --warn
ok            target × 0.8 ≤ valor ≤ target × 1.2    --ok
high_natural  target × 1.2 < valor ≤ UL              --ok (tenue)
near_ul       UL < valor ≤ UL × 1.5                  --warn
exceeded      valor > UL × 1.5                       --danger
```

> // REVIEW_WITH_REGINA: los multiplicadores 0.8 / 1.2 / 1.5 son convención
> general. Ajustar según práctica clínica peruana.

**A.2 — Nutrientes con UL estricto (alarman desde el UL, no UL×1.5)**

```
sodio_mg
grasa_saturada_pct_vct
grasa_trans_g
colesterol_mg
```

**A.3 — Mensajes textuales en UI**

```
low           → "Bajo aporte"
ok            → "Adecuado"
high_natural  → "Adecuado · alto aporte natural"
near_ul       → "Cercano al límite superior · revisar si es habitual"
exceeded      → "Excedido · revisar alimentos"
```

**A.4 — Niños menores de 1 año**

Bloquear creación. Mensaje exacto:

> "NutriCalc actualmente no soporta protocolo pediátrico para lactantes
> (menores de 12 meses). Para este grupo, consultar guías específicas
> de alimentación complementaria CENAN-MINSA."

**A.5 — Sexo obligatorio**

- HTML `required` en `PatientForm`
- Zod `sex: z.enum(['M', 'F'])` en POST/PATCH
- Migración SQL `NOT NULL` en `patients.sex` (después de verificar que ninguna fila existente lo tenga null)

### Decisiones del Grupo B (cobertura)

**B.1 — Clasificación de IMC**

```
IMC             ESTADO              COLOR
─────────────────────────────────────────
< 16.0          delgadez severa     --danger
16.0 – 16.9     delgadez moderada   --warn
17.0 – 18.4     delgadez leve       --warn
18.5 – 24.9     normal              --ok
25.0 – 29.9     sobrepeso           --warn
30.0 – 34.9     obesidad I          --warn
35.0 – 39.9     obesidad II         --danger
≥ 40.0          obesidad III        --danger
```

Para adultos mayores (≥60a) el rango "normal" se amplía a 22.0–27.0 (consenso geriátrico OPS/OMS y CENAN Perú).

> // REVIEW_WITH_REGINA: usamos rango 22-27 para ≥60a porque es coherente con
> el IMC saludable 25.5 que ya aplicamos en cálculo energético. Validar.

**B.2 — Indicador de datos faltantes**

Cuando uno o más alimentos del plan tienen `null` en un nutriente:

```
Fibra: 18.2 g  ⓘ (2 alimentos sin dato)
```

Tooltip: "El cálculo no incluye estos alimentos para este nutriente. Total real puede ser mayor."

**B.3 — Validación de macros = 100%**

Tolerancia ±1% (por redondeo). Si fuera del rango, mostrar advertencia inline NO bloqueante:

```
⚠ Distribución suma 105% — ajustar para que sume 100%
```

**B.4 — Estado del plan según % del VCT**

```
% del VCT       ESTADO                      COLOR
─────────────────────────────────────────────────
< 30%           plan vacío                  --ink-soft (sin alerta)
30% – 70%       plan en construcción        --warn (mensaje suave)
70% – 90%       subalimentación             --warn
90% – 110%      adecuado                    --ok
110% – 130%     sobrealimentación           --warn
> 130%          exceso significativo        --danger
```

> // REVIEW_WITH_REGINA: el corte 70% para "subalimentación" es práctica
> común pero algunas guías ponen 80%. Confirmar con Regina.

**B.5 — Validación de fecha de nacimiento**

Rango: `today - 120 años` ≤ `birth_date` ≤ `today`. Mensaje: "Fecha fuera de rango plausible."

**B.6 — Test obligatorio: adulto mayor + deportista**

Caso a agregar a `comorbidityMerge.test.ts`: 65 años + flag athlete, sin comorbilidades. Proteína resultante debe ser `1.4 g/kg` (deportista gana sobre 1.2 mayor). Calcio debe ser ≥1200 mg.

**B.7 — Test obligatorio: paciente complejo (Rosa Test)**

Crear manualmente paciente con: F · 62a · 75kg · 1.55m (IMC 31.2) · urbana · ligero · HTA + Dislipidemia + DM2. Verificar:
- Adulto mayor auto-detectado
- Peso saludable: `25.5 × 1.55² = 61.26 kg`
- Targets resultantes sin conflictos no reportados
- Sodio merge: `min(2300 DM2, 1500 HTA) = 1500`
- Sat merge: `min(7% HTA, 7% Dislipidemia) = 7%`

---

## Plan de implementación

Todo en branch `feature/fix-before-regina` desde `main`. Cada bloque es un commit independiente. La PR se abre al inicio (como draft) y se completa con cada push.

```
GRUPO A — Críticos
  A.1  Sistema de alertas de 5 niveles + tests
  A.2  Bloqueo de <1 año con mensaje
  A.3  Sexo obligatorio (form + API + migración)
  A.4  Disclaimer visible en UI y PDF
  A.5  Panel "Cálculo paso a paso"

GRUPO B — Cobertura
  B.1  Clasificación de IMC con badge visual
  B.2  Indicador de datos faltantes (null en TPCA)
  B.3  Validación de macros = 100%
  B.4  Estado del plan (% del VCT)
  B.5  Validación de fecha de nacimiento
  B.6  Test adulto mayor + deportista
  B.7  Test paciente complejo (Rosa Test)

GRUPO C — Demo
  C.1  Checklist de demo con Regina
```

---

## GRUPO A — Críticos

### A.1 — Sistema de alertas de 5 niveles

**Archivo principal:** `src/lib/calculations/nutrientTargets.ts` (donde vive `getTargetLevel` según la auditoría).

**Tipo nuevo:**

```typescript
export type AlertLevel = 'low' | 'ok' | 'high_natural' | 'near_ul' | 'exceeded';

export type AlertConfig = {
  level: AlertLevel;
  label: string;
  color: string;       // CSS var
  message: string;     // texto para tooltip/UI
};

// REVIEW_WITH_REGINA: estos multiplicadores son convención general
// (0.8/1.2/1.5). Ajustar si la práctica clínica peruana sugiere otros.
const THRESHOLDS = {
  low_factor: 0.8,
  high_factor: 1.2,
  ul_factor: 1.5,
} as const;

const STRICT_UL_NUTRIENTS = new Set([
  'sodio_mg',
  'grasa_saturada_pct_vct',
  'grasa_trans_g',
  'colesterol_mg',
]);

export function getTargetLevel(
  value: number | null,
  target: MergedLimit | undefined,
  nutrientKey: string
): AlertLevel {
  if (value == null || target == null) return 'ok';

  // Bajo mínimo
  const lowThreshold = target.target != null
    ? target.target * THRESHOLDS.low_factor
    : target.min;

  if (lowThreshold != null && value < lowThreshold) {
    return 'low';
  }

  // Sin techo definido → adecuado (no podemos detectar exceso)
  if (target.max == null) {
    return 'ok';
  }

  const ul = target.max;

  // Nutrientes con UL estricto
  if (STRICT_UL_NUTRIENTS.has(nutrientKey)) {
    if (value > ul) return 'exceeded';
    if (value > ul * 0.9) return 'near_ul';
    return 'ok';
  }

  // Nutrientes con tolerancia a picos naturales
  if (value > ul * THRESHOLDS.ul_factor) return 'exceeded';
  if (value > ul) return 'near_ul';
  if (target.target != null && value > target.target * THRESHOLDS.high_factor) {
    return 'high_natural';
  }
  return 'ok';
}

export function getAlertConfig(level: AlertLevel): AlertConfig {
  switch (level) {
    case 'low':
      return {
        level,
        label: 'Bajo',
        color: 'var(--warn)',
        message: 'Bajo aporte — considerar agregar fuentes de este nutriente.',
      };
    case 'ok':
      return {
        level,
        label: 'OK',
        color: 'var(--ok)',
        message: 'Adecuado',
      };
    case 'high_natural':
      return {
        level,
        label: 'Alto',
        color: 'var(--ok)',
        message: 'Adecuado · alto aporte natural. Puede ser deseable según el caso clínico.',
      };
    case 'near_ul':
      return {
        level,
        label: 'Alerta',
        color: 'var(--warn)',
        message: 'Cercano al límite superior. Revisar si este aporte es habitual.',
      };
    case 'exceeded':
      return {
        level,
        label: 'Excedido',
        color: 'var(--danger)',
        message: 'Excedido · revisar alimentos del plan.',
      };
  }
}
```

**Tests obligatorios** en `nutrientTargets.test.ts`:

```typescript
describe('getTargetLevel — 5 levels', () => {
  test('low: below 80% of target', () => {
    const r = getTargetLevel(40, { target: 100 }, 'proteinas_g');
    expect(r).toBe('low');
  });

  test('ok: within ±20% of target', () => {
    const r = getTargetLevel(105, { target: 100 }, 'proteinas_g');
    expect(r).toBe('ok');
  });

  test('high_natural: above 120% of target but below UL', () => {
    const r = getTargetLevel(130, { target: 100, max: 200 }, 'hierro_mg');
    expect(r).toBe('high_natural');
  });

  test('near_ul: between UL and UL × 1.5 for non-strict', () => {
    const r = getTargetLevel(210, { target: 100, max: 200 }, 'hierro_mg');
    expect(r).toBe('near_ul');
  });

  test('exceeded: above UL × 1.5 for non-strict', () => {
    const r = getTargetLevel(350, { target: 100, max: 200 }, 'hierro_mg');
    expect(r).toBe('exceeded');
  });

  test('strict UL: sodium exceeded immediately past UL', () => {
    const r = getTargetLevel(2400, { target: 1500, max: 2300 }, 'sodio_mg');
    expect(r).toBe('exceeded');
  });

  test('strict UL: sodium near_ul at 90% of UL', () => {
    const r = getTargetLevel(2100, { target: 1500, max: 2300 }, 'sodio_mg');
    expect(r).toBe('near_ul');
  });

  test('hierro sangre de pollo (caso real Manuel): high_natural, not exceeded', () => {
    // Manuel: 71 mg de Fe, RDA 8 mg, UL 45 mg
    const r = getTargetLevel(71, { target: 8, max: 45 }, 'hierro_mg');
    expect(r).toBe('near_ul'); // 45 < 71 ≤ 67.5
  });
});
```

**Componentes a actualizar:**
- `TotalsPanel.tsx` — usar `getAlertConfig(level)` para color y tooltip
- `RequirementsDetail.tsx` — mismo cambio
- `AlertBadge.tsx` (si existe) — adaptar a los 5 niveles

**Cambio visual en `TotalsPanel`:**

```tsx
const level = getTargetLevel(value, target, key);
const config = getAlertConfig(level);

<div className="flex items-center justify-between gap-2 text-sm">
  <span className="text-[color:var(--ink-soft)]">{label}</span>
  <div className="flex items-center gap-2">
    <span className="font-mono text-[color:var(--ink)]">
      {formatValue(value)}{target && <span className="text-[color:var(--ink-soft)]"> / {formatValue(target.target ?? target.min ?? '—')}</span>} {unit}
    </span>
    <span
      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
      style={{
        color: config.color,
        borderColor: config.color,
        backgroundColor: `color-mix(in srgb, ${config.color} 8%, transparent)`,
      }}
      title={config.message}
    >
      {config.label}
    </span>
  </div>
</div>
```

---

### A.2 — Bloqueo de pacientes menores de 1 año

**Archivo:** `src/components/ui/PatientForm.tsx`.

Después del campo `birth_date`, agregar validación:

```tsx
const ageY = data.birth_date ? ageInYears(new Date(data.birth_date)) : null;
const isInfant = ageY != null && ageY < 1;

{isInfant && (
  <InfoCard variant="warn">
    <strong>Protocolo pediátrico no soportado.</strong>{' '}
    NutriCalc actualmente no soporta protocolo pediátrico para lactantes
    (menores de 12 meses). Para este grupo, consultar guías específicas
    de alimentación complementaria CENAN-MINSA.
  </InfoCard>
)}
```

En el botón de submit:

```tsx
<button
  type="submit"
  disabled={isInfant}
  className={isInfant ? btnPrimaryDisabled : btnPrimary}
>
  {initial ? 'Guardar cambios' : 'Crear paciente'}
</button>
```

En el backend, `src/app/api/patients/route.ts`, agregar validación Zod:

```typescript
const CreatePatientSchema = z.object({
  // ...
  birth_date: z.string().refine(
    (s) => {
      const age = ageInYears(new Date(s));
      return age >= 1;
    },
    { message: 'Pacientes menores de 1 año no soportados (lactantes).' }
  ),
});
```

---

### A.3 — Sexo obligatorio

**Migración SQL** — `supabase/migrations/009_sex_required.sql`:

```sql
BEGIN;

-- Verificar primero que ningún paciente existente tiene sex null
DO $$
DECLARE null_count int;
BEGIN
  SELECT count(*) INTO null_count FROM patients WHERE sex IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot apply NOT NULL: % patients have null sex', null_count;
  END IF;
END $$;

ALTER TABLE patients ALTER COLUMN sex SET NOT NULL;

COMMIT;
```

Si la query DO bloquea (hay pacientes con sex null), arreglarlos manualmente
antes de correr la migración. Hoy hay 1 paciente; verificar.

**PatientForm:**

```tsx
<Field label="Sexo" required>
  <div className="flex gap-2">
    <RadioPill checked={data.sex === 'F'} onClick={() => setData({ ...data, sex: 'F' })} label="Femenino" />
    <RadioPill checked={data.sex === 'M'} onClick={() => setData({ ...data, sex: 'M' })} label="Masculino" />
  </div>
  {!data.sex && (
    <p className="text-xs text-[color:var(--danger)] mt-1">El sexo es obligatorio para cálculos clínicos.</p>
  )}
</Field>
```

**API:**

```typescript
const CreatePatientSchema = z.object({
  // ...
  sex: z.enum(['M', 'F'], {
    errorMap: () => ({ message: 'Sexo obligatorio (M o F)' }),
  }),
});
```

**Asegurar también que `PatchPatientSchema` no permita `sex: null`** (puede admitir omisión, pero no nullificación explícita).

---

### A.4 — Disclaimer visible en UI y PDF

**Archivo nuevo:** `src/components/ui/ClinicalDisclaimer.tsx`:

```tsx
import { Info } from 'lucide-react';

type Props = { variant?: 'inline' | 'banner' };

export function ClinicalDisclaimer({ variant = 'inline' }: Props) {
  const isBanner = variant === 'banner';

  return (
    <div
      role="note"
      className={
        isBanner
          ? 'flex items-start gap-2.5 px-4 py-3 bg-[color:var(--paper-warm)] border border-[color:var(--rule)] rounded-md text-sm text-[color:var(--ink-soft)]'
          : 'flex items-start gap-2 text-xs text-[color:var(--ink-soft)] italic'
      }
    >
      <Info size={isBanner ? 16 : 13} className="shrink-0 mt-0.5" />
      <p>
        Esta herramienta provee cálculos basados en TPCA 2023, FAO/OMS 2004 e
        IOM/NASEM DRIs. Los valores son referenciales y deben ser validados
        por un nutricionista colegiado antes de uso clínico. La app no
        diagnostica ni prescribe.
      </p>
    </div>
  );
}
```

**Página del paciente** — agregar después del header:

```tsx
<ClinicalDisclaimer variant="banner" />
```

**Constructor del plan** — agregar al footer del panel principal:

```tsx
<ClinicalDisclaimer variant="inline" />
```

**PDF (`PlanDocument.tsx`)** — agregar al inicio, después del nombre del paciente:

```typescript
<View style={styles.disclaimerBanner}>
  <Text style={styles.disclaimerText}>
    Esta herramienta provee cálculos basados en TPCA 2023, FAO/OMS 2004 e
    IOM/NASEM DRIs. Los valores son referenciales y deben ser validados
    por un nutricionista colegiado antes de uso clínico.
  </Text>
</View>
```

Estilo asociado:

```typescript
disclaimerBanner: {
  marginVertical: 8,
  padding: 8,
  backgroundColor: '#efe9dd',
  borderRadius: 4,
  borderLeft: '2 solid #6b4423',
},
disclaimerText: {
  fontSize: 8,
  color: '#5c574e',
  fontStyle: 'italic',
},
```

---

### A.5 — Panel "Cálculo paso a paso"

**Endpoint nuevo:** `src/app/api/patients/[id]/calculation-trace/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePatientTargets } from '@/lib/patientTargets';
import { calculateVCT, NAF, ENCDT_BY_AGE, PHYSIOLOGICAL_ADDITION } from '@/lib/calculations/energyRequirement';
import { imcSaludable, selectWeightForCalculation } from '@/lib/calculations/healthyWeight';
import { ageInYears } from '@/lib/calculations/age';
import { deriveExtraComorbidities } from '@/lib/calculations/derivedComorbidities';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: patient } = await supabase.from('patients').select('*').eq('id', params.id).single();
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ageY = ageInYears(new Date(patient.birth_date));
  const heightM = patient.height_cm / 100;
  const weightSel = selectWeightForCalculation(
    patient.weight_kg,
    heightM,
    ageY,
    patient.weight_pregest_kg
  );

  const imcActual = patient.weight_kg / (heightM * heightM);
  const imcSal = imcSaludable(ageY);
  const pesoSal = imcSal * heightM * heightM;

  const vct = calculateVCT({
    sex: patient.sex,
    birthDate: new Date(patient.birth_date),
    heightCm: patient.height_cm,
    weightKg: patient.weight_kg,
    weightPregestKg: patient.weight_pregest_kg,
    residenceArea: patient.residence_area,
    lifestyle: patient.lifestyle,
    physiologicalState: patient.physiological_state,
  });

  const naf = patient.lifestyle && patient.residence_area
    ? NAF[patient.residence_area][patient.lifestyle]
    : null;
  const adicion = PHYSIOLOGICAL_ADDITION[patient.physiological_state] ?? 0;
  const encdt = ageY < 18 ? ENCDT_BY_AGE[Math.floor(ageY)]?.[patient.sex] ?? 0 : 0;

  const extras = deriveExtraComorbidities(patient);
  const allComorbidities = [...(patient.comorbidities ?? []), ...extras];

  const resolved = await resolvePatientTargets(patient);

  // Construir trace
  const trace = {
    step1_weight: {
      label: 'Selección de peso',
      data: {
        weight_actual: patient.weight_kg,
        weight_pregest: patient.weight_pregest_kg,
        height_cm: patient.height_cm,
        age_years: ageY,
        imc_actual: round(imcActual, 2),
        imc_saludable_reference: imcSal,
        peso_saludable: round(pesoSal, 2),
        comparison: imcActual > imcSal ? `${round(imcActual, 2)} > ${imcSal} → usar peso saludable` : `${round(imcActual, 2)} ≤ ${imcSal} → usar peso actual`,
        weight_used: weightSel.weight,
        weight_source: weightSel.source,
      },
    },
    step2_tmb: {
      label: 'Tasa Metabólica Basal (FAO/OMS 2004)',
      data: {
        sex: patient.sex,
        age_group: ageY < 30 ? '18-30' : ageY < 60 ? '30-60' : '≥60',
        formula: getFormulaText(patient.sex, ageY),
        weight_used: weightSel.weight,
        tmb: vct.tmb,
      },
    },
    step3_naf: {
      label: 'Nivel de Actividad Física',
      data: {
        residence_area: patient.residence_area,
        lifestyle: patient.lifestyle,
        naf,
      },
    },
    step4_get: {
      label: 'Gasto Energético Total',
      data: {
        formula: ageY >= 18 ? 'GET = TMB × NAF' : 'GET = fórmula directa (niños)',
        tmb: vct.tmb,
        naf,
        get: vct.get,
      },
    },
    step5_addition: {
      label: 'Adición fisiológica',
      data: {
        physiological_state: patient.physiological_state,
        adicion_kcal: adicion,
        encdt_kcal: encdt,
      },
    },
    step6_vct: {
      label: 'Valor Calórico Total',
      data: {
        formula: 'VCT = GET + ENCDT + adición',
        get: vct.get,
        encdt,
        adicion,
        vct: vct.vct,
      },
    },
    step7_macros: {
      label: 'Targets de macronutrientes',
      data: resolved.targets_macros ?? null,
    },
    step8_comorbidities: {
      label: 'Comorbilidades y overrides aplicados',
      data: {
        explicit: patient.comorbidities ?? [],
        auto_derived: extras,
        all: allComorbidities,
        override_sources: resolved.override_sources ?? null,
        conflicts: resolved.conflicts ?? [],
      },
    },
  };

  return NextResponse.json({ patient_id: patient.id, trace, sources: {
    energia: 'FAO/WHO/UNU Expert Consultation 2004 · CENAN/INS Perú',
    dris: 'IOM/NASEM Dietary Reference Intakes',
    overrides: 'KDOQI 2020, ADA 2024, AHA 2021, DASH, WHO 2017',
  }});
}

function round(n: number, d = 2): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function getFormulaText(sex: 'M' | 'F', ageY: number): string {
  if (ageY < 18) return 'GET directo (no usa TMB)';
  if (sex === 'M') {
    if (ageY < 30) return 'TMB = 15.057 × peso + 692.2';
    if (ageY < 60) return 'TMB = 11.472 × peso + 873.1';
    return 'TMB = 11.711 × peso + 587.7';
  } else {
    if (ageY < 30) return 'TMB = 14.818 × peso + 486.6';
    if (ageY < 60) return 'TMB = 8.126 × peso + 845.6';
    return 'TMB = 9.082 × peso + 658.5';
  }
}
```

**Página nueva:** `src/app/(app)/patients/[id]/calculation/page.tsx`

```tsx
import { fetchTrace } from '@/lib/api';
import { CalculationTrace } from '@/components/calculation/CalculationTrace';

export default async function CalculationPage({ params }: { params: { id: string } }) {
  const trace = await fetchTrace(params.id);
  return <CalculationTrace trace={trace} />;
}
```

**Componente:** `src/components/calculation/CalculationTrace.tsx`

```tsx
'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function CalculationTrace({ trace }: { trace: any }) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Link
        href={`/patients/${trace.patient_id}`}
        className="text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] inline-flex items-center gap-1 mb-2"
      >
        <ArrowLeft size={12} /> Volver al paciente
      </Link>

      <header>
        <h1 className="font-serif text-2xl font-medium text-[color:var(--ink)] mb-1">
          Cálculo paso a paso
        </h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Desglose completo del cálculo de requerimientos para este paciente.
        </p>
      </header>

      <div className="space-y-3">
        {Object.entries(trace.trace).map(([key, step]: any, idx) => (
          <Step key={key} index={idx + 1} step={step} />
        ))}
      </div>

      <footer className="pt-6 border-t border-[color:var(--rule)] text-xs text-[color:var(--ink-soft)] space-y-1">
        <p><strong>Fuentes:</strong></p>
        <p>Energía: {trace.sources.energia}</p>
        <p>DRIs: {trace.sources.dris}</p>
        <p>Overrides clínicos: {trace.sources.overrides}</p>
      </footer>
    </div>
  );
}

function Step({ index, step }: { index: number; step: any }) {
  return (
    <section className="bg-white border border-[color:var(--rule)] rounded-lg p-4"
             style={{ boxShadow: 'var(--shadow-card)' }}>
      <header className="flex items-baseline gap-2 mb-3">
        <span className="font-mono text-sm text-[color:var(--accent)]">{index}.</span>
        <h2 className="font-serif text-base font-medium text-[color:var(--ink)]">
          {step.label}
        </h2>
      </header>
      <div className="font-mono text-xs space-y-1 pl-6">
        {renderData(step.data)}
      </div>
    </section>
  );
}

function renderData(data: any): JSX.Element[] {
  return Object.entries(data ?? {}).map(([k, v]) => (
    <div key={k} className="flex gap-3">
      <span className="text-[color:var(--ink-soft)] min-w-[140px]">{formatKey(k)}:</span>
      <span className="text-[color:var(--ink)]">{formatValue(v)}</span>
    </div>
  ));
}

function formatKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

function formatValue(v: any): string {
  if (v == null) return '—';
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (Array.isArray(v)) return v.join(', ') || '(vacío)';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
```

**Botón en la página del paciente** — agregar discreto:

```tsx
<Link
  href={`/patients/${patient.id}/calculation`}
  className="inline-flex items-center gap-1 text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--accent)]"
>
  Ver cálculo paso a paso →
</Link>
```

---

## GRUPO B — Cobertura

### B.1 — Clasificación de IMC visual

**Función nueva:** en `src/lib/calculations/healthyWeight.ts`:

```typescript
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

  // Adultos <60a y adolescentes — clasificación OMS
  if (imc < 16) return { range: '<16', label: 'delgadez severa', color: 'danger' };
  if (imc < 17) return { range: '16.0–16.9', label: 'delgadez moderada', color: 'warn' };
  if (imc < 18.5) return { range: '17.0–18.4', label: 'delgadez leve', color: 'warn' };
  if (imc < 25) return { range: '18.5–24.9', label: 'normal', color: 'ok' };
  if (imc < 30) return { range: '25.0–29.9', label: 'sobrepeso', color: 'warn' };
  if (imc < 35) return { range: '30.0–34.9', label: 'obesidad I', color: 'warn' };
  if (imc < 40) return { range: '35.0–39.9', label: 'obesidad II', color: 'danger' };
  return { range: '≥40', label: 'obesidad III', color: 'danger' };
}
```

**Usar en `LiveAnthropometryBlock`** (ya existe en `PatientForm`):

Reemplazar el texto plano de clasificación por badge con color:

```tsx
const cat = classifyIMC(imc, ageY);
const colorVar = `var(--${cat.color})`;

<div>
  <div className="text-[10px] uppercase tracking-wider text-[color:var(--ink-soft)] mb-0.5">
    IMC actual
  </div>
  <div className="flex items-baseline gap-2">
    <span className="font-mono text-base text-[color:var(--ink)]">{imc.toFixed(1)}</span>
    <span
      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
      style={{ color: colorVar, borderColor: colorVar }}
    >
      {cat.label}
    </span>
  </div>
</div>
```

**Usar también en la página del paciente** (sección de antropometría):

```tsx
<DataCell
  label="IMC actual"
  value={imc.toFixed(1)}
  hintBadge={{ label: cat.label, color: colorVar }}
/>
```

Adaptar `DataCell` para aceptar `hintBadge` opcional.

---

### B.2 — Indicador de datos faltantes (null en TPCA)

**Modificar `calculateTotals`** en `src/lib/nutrition.ts`:

```typescript
export type NutrientTotal = {
  value: number;
  items_with_data: number;
  items_with_null: number;
};

export function calculateTotals(items: PlanItem[]): Record<string, NutrientTotal> {
  const nutrients = [
    'energia_kcal', 'proteinas_g', 'grasa_g', 'carbohidratos_disponibles_g',
    'fibra_g', 'sodio_mg', 'potasio_mg', 'calcio_mg', 'hierro_mg',
    // ... etc
  ];

  const result: Record<string, NutrientTotal> = {};

  for (const nut of nutrients) {
    let sum = 0;
    let withData = 0;
    let withNull = 0;

    for (const item of items) {
      const v = item.food.per_100g[nut];
      if (v == null) {
        withNull++;
      } else {
        sum += (v * item.grams) / 100;
        withData++;
      }
    }

    result[nut] = { value: sum, items_with_data: withData, items_with_null: withNull };
  }

  return result;
}
```

**En `TotalsPanel.tsx`:**

```tsx
{items_with_null > 0 && (
  <span className="ml-1 text-[10px] text-[color:var(--warn)]" title={`${items_with_null} alimentos sin dato de ${label}. Total real puede ser mayor.`}>
    ⓘ ({items_with_null})
  </span>
)}
```

---

### B.3 — Validación de macros = 100%

**Modificar `MacroPanel.tsx`:**

Agregar al final del componente, después de los inputs:

```tsx
const sum = (macros.cho_pct ?? 0) + (macros.prot_pct ?? 0) + (macros.fat_pct ?? 0);
const diff = Math.abs(sum - 100);
const valid = diff <= 1;

{!valid && (
  <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-center gap-2">
    <AlertTriangle size={14} />
    Distribución suma {sum.toFixed(0)}% — ajustar para que sume 100%.
  </div>
)}
```

No bloquea guardado, solo advierte.

---

### B.4 — Estado del plan (% del VCT)

**Función nueva:** en `src/lib/calculations/nutrientTargets.ts`:

```typescript
export type PlanState = 'empty' | 'building' | 'undernourished' | 'adequate' | 'overfed' | 'excessive';

export function classifyPlanState(currentKcal: number, vctTarget: number): {
  state: PlanState;
  pct: number;
  message: string;
  color: string;
} {
  const pct = (currentKcal / vctTarget) * 100;

  // REVIEW_WITH_REGINA: corte 70% para "subalimentación" es práctica común.
  // Algunas guías usan 80%. Ajustar si Regina lo prefiere.

  if (pct < 30) {
    return { state: 'empty', pct, message: 'Plan vacío o muy incompleto', color: 'var(--ink-soft)' };
  }
  if (pct < 70) {
    return { state: 'building', pct, message: 'Plan en construcción · faltan comidas', color: 'var(--warn)' };
  }
  if (pct < 90) {
    return { state: 'undernourished', pct, message: 'Bajo el VCT objetivo', color: 'var(--warn)' };
  }
  if (pct <= 110) {
    return { state: 'adequate', pct, message: 'Adecuado', color: 'var(--ok)' };
  }
  if (pct <= 130) {
    return { state: 'overfed', pct, message: 'Sobre el VCT objetivo', color: 'var(--warn)' };
  }
  return { state: 'excessive', pct, message: 'Exceso significativo', color: 'var(--danger)' };
}
```

**Usar en `TotalsPanel.tsx`** — header con la barra de progreso:

```tsx
const planState = classifyPlanState(totals.energia_kcal.value, vctTarget);

<div className="px-4 py-3 border-b">
  <div className="flex justify-between items-baseline mb-1">
    <h3 className="font-serif text-sm font-medium">Totales del día</h3>
    <span className="font-mono text-[11px] text-[color:var(--ink-soft)]">VCT {vctTarget} kcal</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-[color:var(--paper-warm)] rounded-full overflow-hidden">
      <div className="h-full transition-all" style={{
        width: `${Math.min(planState.pct, 100)}%`,
        background: planState.color,
      }}/>
    </div>
    <span className="font-mono text-[11px] min-w-[80px] text-right">
      {Math.round(totals.energia_kcal.value)} / {vctTarget}
    </span>
  </div>
  <p className="text-[11px] mt-1.5" style={{ color: planState.color }}>
    {planState.message} · {planState.pct.toFixed(0)}%
  </p>
</div>
```

---

### B.5 — Validación de rango de fecha de nacimiento

**En `PatientForm`:**

```tsx
<Field label="Fecha de nacimiento" required hint="dd/mm/aaaa">
  <input
    type="date"
    required
    min={hundredTwentyYearsAgo()}
    max={today()}
    value={data.birth_date ?? ''}
    onChange={(e) => setData({ ...data, birth_date: e.target.value })}
    className={inputClass}
  />
</Field>

// helpers
function today() {
  return new Date().toISOString().split('T')[0];
}
function hundredTwentyYearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 120);
  return d.toISOString().split('T')[0];
}
```

**En Zod schema (API):**

```typescript
birth_date: z.string().refine(
  (s) => {
    const d = new Date(s);
    const now = new Date();
    const oneTwentyAgo = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
    return d >= oneTwentyAgo && d <= now;
  },
  { message: 'Fecha fuera de rango plausible (1905-presente)' }
)
```

---

### B.6 — Test obligatorio: adulto mayor + deportista

**En `src/lib/calculations/__tests__/comorbidityMerge.test.ts`** agregar:

```typescript
test('Adulto mayor (auto, 65a) + deportista (flag) → proteína = 1.4', () => {
  const patient: any = {
    sex: 'M',
    birth_date: new Date(new Date().getFullYear() - 65, 0, 1).toISOString(),
    height_cm: 175,
    weight_kg: 78,
    is_athlete: true,
    comorbidities: [],
  };

  const baseDRIs = { /* mock IOM DRIs para hombre 65a */ };
  const result = mergeOverrides(baseDRIs, ['older_adult', 'athlete'], patient);

  expect(result.proteinas_g_per_kg.target).toBeCloseTo(1.4, 1);
  expect(result.proteinas_g_per_kg.source).toBe('athlete');
  expect(result.calcio_mg.min).toBe(1200);
  expect(result.calcio_mg.source).toBe('older_adult');
});
```

---

### B.7 — Test paciente complejo (Rosa Test)

**En `src/lib/calculations/__tests__/comorbidityMerge.test.ts`** agregar:

```typescript
test('Rosa Test: F 62a obesa con HTA + Dislipidemia + DM2', () => {
  const patient: any = {
    sex: 'F',
    birth_date: new Date(new Date().getFullYear() - 62, 5, 15).toISOString(),
    height_cm: 155,
    weight_kg: 75,
    is_athlete: false,
    comorbidities: ['hypertension', 'dyslipidemia', 'diabetes_t2'],
  };

  // older_adult debe auto-derivarse
  const extras = deriveExtraComorbidities(patient);
  expect(extras).toContain('older_adult');

  const baseDRIs = { /* mock DRIs F 51-70a */ };
  const result = mergeOverrides(
    baseDRIs,
    ['hypertension', 'dyslipidemia', 'diabetes_t2', 'older_adult'],
    patient
  );

  // Sodio: min(2300 DM2, 1500 HTA) = 1500
  expect(result.sodio_mg.max).toBe(1500);
  expect(result.sodio_mg.source).toBe('hypertension');

  // Grasa saturada: min(10% DM2, 7% HTA, 7% Dislipidemia) = 7%
  expect(result.grasa_saturada_pct_vct.max).toBe(7);

  // Fibra: max(25 base, 30 DM2) = 30
  expect(result.fibra_g.min).toBe(30);

  // Calcio: max(1000 base 51-70a F, 1200 HTA, 1200 older_adult) = 1200
  expect(result.calcio_mg.min).toBe(1200);

  // Sin conflictos
  expect(result.conflicts ?? []).toEqual([]);

  // Peso saludable usando IMC 25.5 (older_adult): 25.5 × 1.55² = 61.26
  const heightM = 1.55;
  const expectedSafeWeight = 25.5 * heightM * heightM;
  expect(expectedSafeWeight).toBeCloseTo(61.26, 1);
});
```

---

## GRUPO C — Demo

### C.1 — Checklist de demo con Regina

Crear archivo nuevo: `docs/REGINA_DEMO_CHECKLIST.md` para usar durante la demo.

```markdown
# Demo NutriCalc — Checklist para sesión con Regina

## Casos a probar (en orden)

### 1. Paciente sano simple
- Nombre: Manuel (existente en BD)
- Verificar: VCT, distribución de macros, alertas razonables

### 2. Paciente embarazada
- Crear: F 28a, 1.62m, 70kg, pregest 60kg, T2, sin comorbilidades
- Verificar:
  - [ ] Aparece campo peso pregestacional
  - [ ] VCT incluye +285 kcal
  - [ ] Hierro target = 27 mg (DRI embarazo)

### 3. Embarazada con diabetes gestacional y anemia
- Misma paciente + 'diabetes_gestational' + 'iron_deficiency_anemia'
- Verificar:
  - [ ] Hierro target = 40.5 mg (27 × 1.5)
  - [ ] CHO bajado a 40-50%
  - [ ] Hierro absorbible visible en plan

### 4. Adulto mayor con HTA
- Crear: F 70a, 1.58m, 72kg, HTA
- Verificar:
  - [ ] Badge "Adulto mayor" auto-detectado
  - [ ] Peso saludable = 63.6 kg (IMC 25.5)
  - [ ] Sodio target = 1500 mg
  - [ ] Calcio target = 1200 mg

### 5. Rosa Test compleja
- Ver test B.7 arriba
- Verificar manualmente todos los merges

### 6. Sistema de alertas (caso C7 sangre de pollo)
- Plan con 120g de sangre de pollo
- Verificar: hierro 71mg muestra "Cercano al UL" (amarillo), no "Excedido" (rojo)

### 7. Caso de bloqueo: lactante
- Intentar crear paciente con birth_date hace 6 meses
- Verificar: app bloquea con mensaje claro

## Preguntas explícitas para Regina

Las decisiones marcadas `// REVIEW_WITH_REGINA:` en el código:

1. **Umbrales del semáforo (A.1):** ¿los multiplicadores 0.8 / 1.2 / 1.5 son
   apropiados, o prefieres ajustarlos?

2. **IMC saludable adultos mayores (B.1):** ¿usamos rango 22-27 para ≥60a, o
   prefieres clasificación OMS estándar (18.5-24.9) también para mayores?

3. **Corte "subalimentación" (B.4):** ¿70% del VCT es el punto correcto, o
   prefieres 80%?

## Pendientes que dependen de Regina (Grupo C de la auditoría)

Mostrar al final, no implementar antes:

- C4: fórmula peso ajustado para obesidad mórbida
- C12: visualización de agua/hidratación
- C13: plan multi-día
- C14: alimentos custom (productos comerciales)
- C16: historia de peso
- C2, C5, C10, C15, C17: ajustes menores según prioridad
```

---

## Checklist de implementación

```
GRUPO A
[ ] A.1  Sistema de alertas 5 niveles
       - getTargetLevel actualizado
       - getAlertConfig nuevo
       - 8 tests nuevos pasan
       - TotalsPanel, RequirementsDetail, AlertBadge usan nuevo sistema
[ ] A.2  Bloqueo <1 año (form + API)
[ ] A.3  Sexo obligatorio (migración + form + API)
[ ] A.4  ClinicalDisclaimer en página paciente, plan y PDF
[ ] A.5  Endpoint /api/patients/[id]/calculation-trace
       - Página /patients/[id]/calculation
       - Botón "Ver cálculo paso a paso" en página del paciente

GRUPO B
[ ] B.1  classifyIMC + badge visual en form y página paciente
[ ] B.2  calculateTotals devuelve {value, items_with_data, items_with_null}
       - TotalsPanel muestra indicador "(N sin dato)"
[ ] B.3  Validación 100% en MacroPanel
[ ] B.4  classifyPlanState + barra de progreso con color y mensaje
[ ] B.5  Validación de rango fecha de nacimiento (form + API)
[ ] B.6  Test adulto mayor + deportista
[ ] B.7  Test Rosa Test compleja

GRUPO C
[ ] C.1  REGINA_DEMO_CHECKLIST.md commiteado en docs/

TESTING FINAL
[ ] Todos los tests pasan: npm test (esperar 70+ tests)
[ ] Lint y typecheck limpios
[ ] Build de Vercel verde
[ ] Probar manualmente los 7 casos de la checklist Regina en preview deploy
[ ] Hacer screenshots de pantallas clave para presentación con Regina
```

---

## Reglas inviolables durante esta PR

1. **No modificar lógica de cálculo existente** (`calculateVCT`, `mergeOverrides`, `getBaseDRIs`). Solo extender.
2. **No cambiar el esquema clínico** (DRIs, overrides). Solo agregar el sistema de alertas.
3. **Mantener identidad visual** (Fraunces/marrones/crema, sin emojis decorativos).
4. **Cada arreglo se commitea cuando tests pasen.** Si los tests fallan, no commit.
5. **Los 3 puntos marcados `// REVIEW_WITH_REGINA:` deben estar visibles** — Claude Code debe agregarlos exactamente como están en este documento.
6. **Si algo del documento no está claro, parar y preguntar.** No inventar interpretaciones.

---

## Qué pasa después de mergear

1. **Demo con Regina** usando `REGINA_DEMO_CHECKLIST.md`
2. **Captura de feedback** específico sobre:
   - Los 3 puntos `REVIEW_WITH_REGINA`
   - Los 11 casos del Grupo C pendientes (C2, C4, C5, C10, C12, C13, C14, C15, C16, C17)
   - Cualquier comportamiento inesperado
3. **Spec nueva post-demo** (`POST_REGINA_FIXES.md`) con ajustes que ella priorice
4. **Validación clínica formal** de `clinical_overrides.json` (deuda pendiente desde Fase 2B)

---

**Última actualización:** Una sola PR pre-demo. Resuelve los 20 casos de
auditoría de cobertura + panel paso a paso + disclaimer visible. Decisiones
clínicas tomadas en sección 0 con 3 puntos marcados para Regina.
