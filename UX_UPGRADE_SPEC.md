# UX_UPGRADE_SPEC.md — Pulido integral de NutriCalc

> Especificación operativa para Claude Code. **Una sola PR grande** en `main`,
> 3 fases ordenadas internamente. Basado en `AUDIT.md` (estado real verificado).
>
> **Branch:** `feature/ux-upgrade-final`
> **Estimación:** 2-3 semanas
> **PR target:** `main`

---

## Contexto verificado por la auditoría

La lógica clínica está sólida (62/62 tests pasan, los 6 casos críticos del
CONTEXT.md funcionan). Los problemas son **visuales + 4 bugs concretos + falta
modo paciente**. NO hay que rehacer arquitectura ni inventar funcionalidad.

**Inventario clave:**
- ✓ Backend completo (1125 alimentos, 267 medidas caseras, 1126 DRIs)
- ✓ Librería de cálculos completa con merge funcionando + source tracking
- ✓ Componentes existen: RequirementsDetail con badges, MacroPanel, hierro absorbible
- ✗ Búsqueda sin tildes (extensión `unaccent` no instalada)
- ✗ PDF rinde `≥/≤` como "e" (fuente sin glifos)
- ✗ PDF no usa medidas caseras ni macros (funciones existen, no se invocan)
- ✗ PatientForm sin IMC en vivo
- ✗ `/api/patients/:id/requirements` solo devuelve VCT (no targets+sources)
- ✗ No existe `/p/[planId]` (modo paciente)
- ⚠ Código legacy: `NutrientRow.tsx`, `profiles.ts`, `/api/profiles`

---

## Fases (todas dentro de una sola PR)

```
Fase 1 — Bugs y completitud (2-3 días)
Fase 2 — Pulido visual (1 semana)
Fase 3 — Modo paciente (3-4 días)
```

Recomiendo commitear por fase dentro del mismo branch para que el reviewer pueda
seguir el progreso, pero el merge a `main` es una sola PR al final.

---

## Stack visual (sin cambios estructurales)

Mantener la identidad actual:

```css
/* Fuentes (ya cargadas) */
font-family: 'Fraunces', serif;       /* display */
font-family: 'Inter', sans-serif;     /* body */
font-family: 'JetBrains Mono', mono;  /* números, códigos */

/* Paleta */
--ink:       #1a1815;  /* texto principal */
--ink-soft:  #5c574e;  /* texto secundario */
--paper:     #f7f4ee;  /* fondo principal */
--paper-warm:#efe9dd;  /* fondo cards/hover */
--rule:      #d6cfc0;  /* bordes */
--accent:    #6b4423;  /* marca, hover, código TPCA */
--ok:        #2d6a3e;
--warn:      #b88200;
--danger:    #a8341c;

/* NUEVO — sombras sutiles para profundidad */
--shadow-card: 0 1px 2px rgba(26, 24, 21, 0.04), 0 0 0 0.5px rgba(26, 24, 21, 0.06);
--shadow-card-hover: 0 2px 8px rgba(26, 24, 21, 0.06), 0 0 0 0.5px rgba(26, 24, 21, 0.08);

/* NUEVO — radios consistentes */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
```

**Reglas:**
- Sin emojis decorativos
- Sentence case siempre (nunca Title Case ni ALL CAPS)
- Iconos: `lucide-react` (ya instalado), variante outline, 14-18px
- Códigos TPCA: JetBrains Mono, color `--accent`
- Valores numéricos: JetBrains Mono
- No inventar colores nuevos

---

# FASE 1 — BUGS Y COMPLETITUD (2-3 días)

Sin cambios visuales. Solo arreglar lo que falla y completar lo que está
incompleto. Cada uno se puede commitear por separado.

## 1.1 Búsqueda con `unaccent`

**Migración SQL** — `supabase/migrations/007_search_unaccent.sql`:

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.unaccent_immutable(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$;

DROP INDEX IF EXISTS foods_search_idx;

CREATE INDEX foods_search_idx ON foods
USING gin(to_tsvector('spanish', unaccent_immutable(name)));

CREATE OR REPLACE FUNCTION search_foods(
  search_query text,
  group_filter text DEFAULT NULL,
  result_limit int DEFAULT 20
)
RETURNS SETOF foods
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF search_query IS NULL OR length(trim(search_query)) = 0 THEN
    RETURN QUERY
      SELECT * FROM foods
      WHERE active = true
        AND (group_filter IS NULL OR group_letter = group_filter)
      ORDER BY group_letter, length(code), code
      LIMIT result_limit;
  ELSE
    RETURN QUERY
      SELECT f.* FROM foods f
      WHERE f.active = true
        AND (group_filter IS NULL OR f.group_letter = group_filter)
        AND to_tsvector('spanish', unaccent_immutable(f.name))
            @@ plainto_tsquery('spanish', unaccent_immutable(search_query))
      ORDER BY ts_rank(
        to_tsvector('spanish', unaccent_immutable(f.name)),
        plainto_tsquery('spanish', unaccent_immutable(search_query))
      ) DESC, length(f.code), f.code
      LIMIT result_limit;
  END IF;
END;
$$;

COMMIT;
```

**Ejecutar:** copiar y pegar en SQL Editor de Supabase, o vía CLI:
```bash
npx supabase db push
```

**Adaptar API route** — en el handler actual de `/api/foods` o `/api/foods/search`:

```typescript
// Antes (probablemente):
// .textSearch('name', q, { config: 'spanish' })

// Después:
const { data, error } = await supabase.rpc('search_foods', {
  search_query: q,
  group_filter: group || null,
  result_limit: limit,
});
```

Si el query parece un código TPCA (regex `^[A-Z]\s*\d+$`), buscar por código
directamente (más rápido y exacto):

```typescript
const codeMatch = q.match(/^([A-Z])\s*(\d+)$/i);
if (codeMatch) {
  const code = `${codeMatch[1].toUpperCase()}${codeMatch[2]}`;
  const { data } = await supabase.from('foods').select('*').eq('code', code).limit(1);
  if (data?.length) return NextResponse.json({ results: data });
}
```

**Test obligatorio:**
- "pan frances" → encuentra "Pan francés fortificado con hierro"
- "PAN FRANCES" → mismo resultado
- "frances" → encuentra el mismo
- "A49" → encuentra directamente Pan francés fortificado
- "" → primeros 20 alimentos
- "asdfqwerty" → 0 resultados sin error

## 1.2 PDF: registrar fuente con glifos `≥/≤`

**Archivo:** `src/components/pdf/PlanDocument.tsx`

`@react-pdf/renderer` viene con Helvetica base que **no tiene glifos para `≥`,
`≤`, `≥` y otros símbolos matemáticos**. Hay que registrar una fuente que sí
los tenga.

**Solución 1 (recomendada): registrar Inter desde Google Fonts**

Al inicio del archivo, antes del componente:

```typescript
import { Font, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://rsms.me/inter/font-files/Inter-Regular.woff', fontWeight: 400 },
    { src: 'https://rsms.me/inter/font-files/Inter-Medium.woff', fontWeight: 500 },
    { src: 'https://rsms.me/inter/font-files/Inter-Bold.woff', fontWeight: 700 },
  ],
});

Font.register({
  family: 'Fraunces',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.woff2', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9EYNyuemAk.woff2', fontWeight: 600 },
  ],
});
```

**Importante:** estas URLs deben ser accesibles desde el servidor de Vercel.
Si Vercel bloquea fetches externos en SSR de PDF, hostear las fuentes en
`public/fonts/` y registrarlas con `src: '/fonts/Inter-Regular.woff'`.

Luego cambiar el styling:

```typescript
const styles = StyleSheet.create({
  body: {
    fontFamily: 'Inter',  // antes: 'Helvetica'
    fontSize: 10,
    padding: 40,
    color: '#1a1815',
  },
  h1: {
    fontFamily: 'Fraunces',
    fontWeight: 600,
    fontSize: 18,
    marginBottom: 4,
  },
  // ... etc
});
```

**Test obligatorio:**
- Regenerar PDF de un plan existente
- Verificar que aparecen `≥56`, `≤2300`, etc. correctamente

**Solución 2 (alternativa, si la 1 da problemas):** reemplazar símbolos por
texto:

```typescript
// En lugar de "≥ 56"
formatLimit(t: Target) {
  if (t.min != null) return `mín ${t.min}`;
  if (t.max != null) return `máx ${t.max}`;
  return '—';
}
```

Si registrar fuentes resulta complicado, usar esta opción y dejar la fuente
para una PR posterior.

## 1.3 PDF: usar medidas caseras y mostrar macros

**Mostrar medida casera cuando exista:**

En el bucle de `meal_plan_items`, cuando renderices la cantidad:

```typescript
function formatQuantity(item: PlanItem, measures: Map<number, HouseholdMeasure>) {
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
```

En el PDF queda: "1 taza al ras (158 g)" en lugar de solo "158 g".

**Agregar sección de distribución de macros** después de los totales:

```typescript
<View style={styles.macrosBlock}>
  <Text style={styles.h2}>Distribución de macronutrientes</Text>
  <View style={styles.macrosRow}>
    <Text>Carbohidratos</Text>
    <Text>{macros.cho.grams} g · {macros.cho.kcal} kcal · {macros.cho.pct}%</Text>
  </View>
  <View style={styles.macrosRow}>
    <Text>Proteínas</Text>
    <Text>{macros.prot.grams} g · {macros.prot.kcal} kcal · {macros.prot.pct}%</Text>
  </View>
  <View style={styles.macrosRow}>
    <Text>Grasa</Text>
    <Text>{macros.fat.grams} g · {macros.fat.kcal} kcal · {macros.fat.pct}%</Text>
  </View>
</View>
```

Los datos vienen de `plan.target_macros` (ya están en el snapshot).

## 1.4 PatientForm: IMC y peso saludable en vivo

**Archivo:** `src/components/ui/PatientForm.tsx`

Agregar un bloque que se actualiza al cambiar peso/talla/edad:

```tsx
function LiveAnthropometryBlock({ patient }: { patient: PartialPatient }) {
  const ageY = useMemo(() => {
    if (!patient.birth_date) return null;
    return ageInYears(new Date(patient.birth_date));
  }, [patient.birth_date]);

  const heightM = patient.height_cm ? patient.height_cm / 100 : null;
  const weight = patient.weight_kg;

  if (!ageY || !heightM || !weight) return null;

  const imc = weight / (heightM * heightM);
  const imcSal = ageY >= 60 ? 25.5 : 22;
  const pesoSal = imcSal * heightM * heightM;
  const weightToUse = imc > imcSal ? pesoSal : weight;

  return (
    <div className="mt-3 p-3 bg-[color:var(--paper)] border border-[color:var(--rule)] rounded-md text-sm">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--ink-soft)] mb-0.5">
            IMC actual
          </div>
          <div className="font-mono text-base text-[color:var(--ink)]">
            {imc.toFixed(1)}
            <span className="text-xs text-[color:var(--ink-soft)] ml-1.5">
              {classifyIMC(imc)}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--ink-soft)] mb-0.5">
            Peso saludable
          </div>
          <div className="font-mono text-base text-[color:var(--ink)]">
            {pesoSal.toFixed(1)} <span className="text-xs">kg</span>
            <span className="text-xs text-[color:var(--ink-soft)] ml-1.5">
              IMC {imcSal}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--ink-soft)] mb-0.5">
            Peso usado en cálculos
          </div>
          <div className="font-mono text-base text-[color:var(--ink)]">
            {weightToUse.toFixed(1)} <span className="text-xs">kg</span>
            <span className="text-xs text-[color:var(--ink-soft)] ml-1.5">
              {imc > imcSal ? 'saludable' : 'actual'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function classifyIMC(imc: number): string {
  if (imc < 18.5) return 'bajo peso';
  if (imc < 25) return 'normal';
  if (imc < 30) return 'sobrepeso';
  return 'obesidad';
}
```

Renderizarlo después del bloque "Antropometría" en el formulario.

## 1.5 `/api/patients/:id/requirements` completo

**Archivo:** `src/app/api/patients/[id]/requirements/route.ts`

Reutilizar `resolvePatientTargets` que ya existe (en `src/lib/patientTargets.ts`
según el reporte) y exponerlo:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePatientTargets } from '@/lib/patientTargets';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  // resolvePatientTargets debe retornar { vct, targets, override_sources, conflicts }
  const result = await resolvePatientTargets(patient);

  return NextResponse.json({
    patient: {
      id: patient.id,
      full_name: patient.full_name,
      sex: patient.sex,
      birth_date: patient.birth_date,
      // ... campos públicos
    },
    vct: result.vct,
    targets: result.targets,
    override_sources: result.override_sources,
    conflicts: result.conflicts,
    active_comorbidities: result.active_comorbidities,
  });
}
```

Si `resolvePatientTargets` no devuelve hoy todo eso, hay que ampliarlo. Pero
según el reporte, "el merge/targets SÍ se calcula" — solo no se exponía vía API.

## 1.6 Limpieza de código legacy

Borrar archivos no usados:

```bash
rm src/components/ui/NutrientRow.tsx
rm src/lib/profiles.ts
rm -rf src/app/api/profiles  # toda la ruta
```

Buscar referencias rotas:
```bash
grep -r "NutrientRow\|@/lib/profiles\|/api/profiles" src/
```

Si alguna página todavía los importa, removerlos o reemplazarlos. Si no hay
referencias (esperado), el typecheck y build deben seguir funcionando.

---

# FASE 2 — PULIDO VISUAL (1 semana)

Mejorar cada pantalla manteniendo la identidad. Los componentes siguen siendo
los mismos, solo cambia presentación.

## 2.1 PatientForm — Rediseño visual

**Problemas a resolver** (del diagnóstico):
- Bloques con `<fieldset>` default del navegador
- Fecha en formato `mm/dd/yyyy`
- Sexo como dropdown opcional
- Inputs con spinners default

**Plantilla nueva** (estructura de cards):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { /* ... */ } from 'lucide-react';

export function PatientForm({ initial, onSubmit }: Props) {
  const [data, setData] = useState<PartialPatient>(initial ?? {});

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}
          className="max-w-2xl space-y-5">

      {/* Identificación */}
      <FormCard title="Identificación">
        <FormRow>
          <Field label="Nombre completo" required>
            <input
              type="text"
              required
              value={data.full_name ?? ''}
              onChange={(e) => setData({ ...data, full_name: e.target.value })}
              className={inputClass}
            />
          </Field>
        </FormRow>

        <FormRow cols={2}>
          <Field label="DNI">
            <input
              type="text"
              maxLength={8}
              value={data.document_id ?? ''}
              onChange={(e) => setData({ ...data, document_id: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Fecha de nacimiento" required hint="dd/mm/aaaa">
            <input
              type="date"
              required
              lang="es-PE"
              value={data.birth_date ?? ''}
              onChange={(e) => setData({ ...data, birth_date: e.target.value })}
              className={inputClass}
            />
          </Field>
        </FormRow>

        <Field label="Sexo" required>
          <div className="flex gap-2">
            <RadioPill
              checked={data.sex === 'F'}
              onClick={() => setData({ ...data, sex: 'F' })}
              label="Femenino"
            />
            <RadioPill
              checked={data.sex === 'M'}
              onClick={() => setData({ ...data, sex: 'M' })}
              label="Masculino"
            />
          </div>
        </Field>
      </FormCard>

      {/* Antropometría */}
      <FormCard title="Antropometría">
        <FormRow cols={2}>
          <Field label="Talla" suffix="cm">
            <NumberInput
              value={data.height_cm}
              onChange={(v) => setData({ ...data, height_cm: v })}
              min={30}
              max={250}
              step={1}
            />
          </Field>

          <Field label="Peso actual" suffix="kg">
            <NumberInput
              value={data.weight_kg}
              onChange={(v) => setData({ ...data, weight_kg: v })}
              min={2}
              max={300}
              step={0.1}
            />
          </Field>
        </FormRow>

        <Field label="Estado fisiológico">
          <select
            value={data.physiological_state ?? 'standard'}
            onChange={(e) => setData({ ...data, physiological_state: e.target.value })}
            className={inputClass}
          >
            <option value="standard">Estándar</option>
            <option value="pregnancy_t1">Embarazo — 1er trimestre (sem 1-13)</option>
            <option value="pregnancy_t2">Embarazo — 2do trimestre (sem 14-26)</option>
            <option value="pregnancy_t3">Embarazo — 3er trimestre (sem 27-40)</option>
            <option value="lactation_0_6m">Lactancia 0-6 meses</option>
            <option value="lactation_6_12m">Lactancia 6-12 meses</option>
          </select>
        </Field>

        {data.physiological_state?.startsWith('pregnancy') && (
          <Field
            label="Peso pregestacional"
            suffix="kg"
            hint="Se usa en cálculos en lugar del peso actual"
            required
          >
            <NumberInput
              value={data.weight_pregest_kg}
              onChange={(v) => setData({ ...data, weight_pregest_kg: v })}
              min={2}
              max={300}
              step={0.1}
            />
          </Field>
        )}

        {/* IMC en vivo */}
        <LiveAnthropometryBlock patient={data} />
      </FormCard>

      {/* Actividad física */}
      <FormCard title="Actividad física">
        <FormRow cols={2}>
          <Field label="Área de residencia">
            <div className="flex gap-2">
              <RadioPill
                checked={data.residence_area === 'urbana'}
                onClick={() => setData({ ...data, residence_area: 'urbana' })}
                label="Urbana"
              />
              <RadioPill
                checked={data.residence_area === 'rural'}
                onClick={() => setData({ ...data, residence_area: 'rural' })}
                label="Rural"
              />
            </div>
          </Field>

          <Field label="Nivel de actividad">
            <select
              value={data.lifestyle ?? ''}
              onChange={(e) => setData({ ...data, lifestyle: e.target.value })}
              className={inputClass}
            >
              <option value="">Seleccionar...</option>
              <option value="ligero">Ligero</option>
              <option value="no_ligero">No ligero (intenso)</option>
            </select>
          </Field>
        </FormRow>

        <CheckboxRow
          checked={data.is_athlete ?? false}
          onChange={(c) => setData({ ...data, is_athlete: c })}
          label="Deportista / actividad física intensa"
        />

        {data.is_athlete && (
          <Field
            label="Factor proteico"
            suffix="g/kg de peso saludable"
            hint="Recomendado para deportistas: 1.2 a 2.0 g/kg. Por defecto se aplica 1.4 si lo dejas en blanco."
          >
            <NumberInput
              value={data.protein_factor_override}
              onChange={(v) => setData({ ...data, protein_factor_override: v })}
              min={0.6}
              max={3.0}
              step={0.1}
              placeholder="1.4"
            />
          </Field>
        )}
      </FormCard>

      {/* Perfil clínico */}
      <FormCard title="Perfil clínico" subtitle="Puede marcar varios">
        <div className="space-y-2">
          {COMORBIDITY_OPTIONS.map((opt) => (
            <CheckboxRow
              key={opt.code}
              checked={data.comorbidities?.includes(opt.code) ?? false}
              onChange={(c) => {
                const current = data.comorbidities ?? [];
                setData({
                  ...data,
                  comorbidities: c
                    ? [...current, opt.code]
                    : current.filter((x) => x !== opt.code),
                });
              }}
              label={opt.label}
              hint={opt.hint}
            />
          ))}
        </div>

        {data.comorbidities?.includes('custom') && (
          <Field label="Notas para overrides personalizados" hint="Se aplicarán manualmente en el plan">
            <textarea
              value={(data.custom_limits as any)?.notes ?? ''}
              onChange={(e) => setData({ ...data, custom_limits: { ...data.custom_limits, notes: e.target.value } })}
              className={inputClass + ' min-h-[80px]'}
            />
          </Field>
        )}
      </FormCard>

      {/* Auto-detección de adulto mayor */}
      {data.birth_date && ageInYears(new Date(data.birth_date)) >= 60 && (
        <InfoCard variant="info">
          <strong>Adulto mayor detectado automáticamente</strong> (≥60 años).
          Se aplicarán overrides clínicos específicos: proteína 1.2 g/kg,
          calcio ≥1200 mg, vitamina D ≥20 µg, IMC saludable de referencia 25.5.
        </InfoCard>
      )}

      {/* Notas */}
      <FormCard title="Notas clínicas">
        <textarea
          value={data.notes ?? ''}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
          className={inputClass + ' min-h-[100px]'}
          placeholder="Información adicional, alergias, observaciones..."
        />
      </FormCard>

      <div className="flex justify-end gap-2 pt-4">
        <button type="button" className={btnSecondary}>Cancelar</button>
        <button type="submit" className={btnPrimary}>
          {initial ? 'Guardar cambios' : 'Crear paciente'}
        </button>
      </div>
    </form>
  );
}
```

### Componentes auxiliares de formulario

Crear `src/components/ui/form-primitives.tsx`:

```tsx
import { ReactNode } from 'react';

export function FormCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white border border-[color:var(--rule)] rounded-lg p-5 space-y-4"
             style={{ boxShadow: 'var(--shadow-card)' }}>
      <header>
        <h2 className="font-serif text-base font-medium text-[color:var(--ink)]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[color:var(--ink-soft)] mt-0.5">{subtitle}</p>
        )}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function FormRow({ children, cols = 1 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const gridCols = cols === 2 ? 'grid-cols-1 sm:grid-cols-2'
                  : cols === 3 ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1';
  return <div className={`grid ${gridCols} gap-4`}>{children}</div>;
}

export function Field({ label, hint, suffix, required, children }: {
  label: string;
  hint?: string;
  suffix?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-[color:var(--ink)]">
          {label}
          {required && <span className="text-[color:var(--accent)] ml-0.5">*</span>}
        </span>
        {suffix && (
          <span className="text-xs text-[color:var(--ink-soft)] font-mono">{suffix}</span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-xs text-[color:var(--ink-soft)] mt-1 italic">{hint}</p>
      )}
    </label>
  );
}

export function RadioPill({ checked, onClick, label }: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-2 text-sm rounded-md border transition-colors ${
        checked
          ? 'bg-[color:var(--ink)] text-[color:var(--paper)] border-[color:var(--ink)]'
          : 'bg-white text-[color:var(--ink-soft)] border-[color:var(--rule)] hover:border-[color:var(--accent)] hover:text-[color:var(--ink)]'
      }`}
    >
      {label}
    </button>
  );
}

export function CheckboxRow({ checked, onChange, label, hint }: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-[color:var(--rule)] text-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] focus:ring-offset-0"
      />
      <div className="flex-1">
        <span className="text-sm text-[color:var(--ink)] group-hover:text-[color:var(--accent)] transition-colors">
          {label}
        </span>
        {hint && (
          <p className="text-xs text-[color:var(--ink-soft)] mt-0.5">{hint}</p>
        )}
      </div>
    </label>
  );
}

export function NumberInput({
  value, onChange, min, max, step, placeholder,
}: {
  value?: number | null;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : parseFloat(v));
      }}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onFocus={(e) => e.currentTarget.select()}
      className="w-full px-3 py-2 bg-white border border-[color:var(--rule)] rounded-md text-[color:var(--ink)] font-mono text-sm focus:outline-none focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

export function InfoCard({ variant = 'info', children }: {
  variant?: 'info' | 'warn';
  children: ReactNode;
}) {
  const bg = variant === 'warn' ? 'bg-amber-50' : 'bg-[color:var(--paper-warm)]';
  return (
    <div className={`${bg} border border-[color:var(--rule)] rounded-md px-4 py-3 text-sm text-[color:var(--ink)]`}>
      {children}
    </div>
  );
}

export const inputClass =
  'w-full px-3 py-2 bg-white border border-[color:var(--rule)] rounded-md text-[color:var(--ink)] text-sm focus:outline-none focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]';

export const btnPrimary =
  'px-5 py-2.5 bg-[color:var(--accent)] text-[color:var(--paper)] rounded-md text-sm font-medium hover:bg-[color:var(--ink)] transition-colors';

export const btnSecondary =
  'px-5 py-2.5 bg-white border border-[color:var(--rule)] text-[color:var(--ink-soft)] rounded-md text-sm hover:border-[color:var(--accent)] hover:text-[color:var(--ink)] transition-colors';
```

### Lista de comorbilidades

```typescript
const COMORBIDITY_OPTIONS = [
  { code: 'renal_predialysis', label: 'Renal pre-diálisis', hint: 'ERC estadios 3-5 sin diálisis (KDOQI 2020)' },
  { code: 'renal_hemodialysis', label: 'Renal en hemodiálisis', hint: 'KDOQI 2020' },
  { code: 'diabetes_t1', label: 'Diabetes tipo 1', hint: 'ADA 2024' },
  { code: 'diabetes_t2', label: 'Diabetes tipo 2', hint: 'ADA 2024' },
  { code: 'diabetes_gestational', label: 'Diabetes gestacional', hint: 'Solo en embarazo' },
  { code: 'hypertension', label: 'Hipertensión arterial', hint: 'DASH + AHA 2021' },
  { code: 'iron_deficiency_anemia', label: 'Anemia ferropénica', hint: 'WHO 2017 · activa cálculo de hierro absorbible' },
  { code: 'dyslipidemia', label: 'Dislipidemia / Hipercolesterolemia', hint: 'AHA 2019' },
  { code: 'custom', label: 'Personalizado', hint: 'Overrides manuales' },
];
```

## 2.2 Página del paciente — Rediseño visual

**Archivo:** `src/app/(app)/patients/[id]/page.tsx` (o donde esté)

**Problemas a resolver:**
- Bloques crudos sin cards consistentes
- Sección "Planes" enterrada al final
- Header con jerarquía aplanada

**Estructura nueva** (mismas funcionalidades, mejor presentación):

```tsx
export default async function PatientPage({ params }) {
  const patient = await fetchPatient(params.id);
  const reqs = await fetchRequirements(params.id);  // ahora completo
  const plans = await fetchPatientPlans(params.id);

  const ageY = ageInYears(new Date(patient.birth_date));
  const isOlderAdult = ageY >= 60;
  const isAthlete = patient.is_athlete;
  const activeComorbidities = patient.comorbidities ?? [];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* Header con jerarquía clara */}
      <header className="flex items-start justify-between gap-4 pb-4 border-b border-[color:var(--rule)]">
        <div className="min-w-0 flex-1">
          <Link href="/patients" className="text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] inline-flex items-center gap-1 mb-2">
            <ArrowLeft size={12} /> Volver a pacientes
          </Link>
          <h1 className="font-serif text-3xl font-medium text-[color:var(--ink)] leading-tight truncate">
            {patient.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-[color:var(--ink-soft)]">
            <span>{ageY} años</span>
            <span className="text-[color:var(--rule)]">·</span>
            <span>{patient.sex === 'F' ? 'Femenino' : 'Masculino'}</span>
            {patient.document_id && (
              <>
                <span className="text-[color:var(--rule)]">·</span>
                <span className="font-mono text-xs">{patient.document_id}</span>
              </>
            )}
            {isOlderAdult && (
              <Badge variant="info">Adulto mayor</Badge>
            )}
            {isAthlete && (
              <Badge variant="accent">Deportista</Badge>
            )}
            {patient.physiological_state.startsWith('pregnancy') && (
              <Badge variant="warn">
                Embarazo {patient.physiological_state.split('_')[1].toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link href={`/patients/${patient.id}/edit`} className={btnSecondary}>
            Editar
          </Link>
          <DeletePatientButton id={patient.id} />
        </div>
      </header>

      {/* Acción principal: Crear plan — destacada */}
      <section className="bg-[color:var(--accent)] text-[color:var(--paper)] rounded-lg p-5 flex items-center justify-between"
               style={{ boxShadow: 'var(--shadow-card)' }}>
        <div>
          <h2 className="font-serif text-lg font-medium mb-1">
            ¿Listo para armar un plan?
          </h2>
          <p className="text-sm opacity-80">
            VCT objetivo: <span className="font-mono font-medium">{reqs.vct.vct} kcal/día</span>
          </p>
        </div>
        <NewPlanButton patientId={patient.id} />
      </section>

      {/* Comorbilidades activas (si hay) */}
      {activeComorbidities.length > 0 && (
        <FormCard title="Perfil clínico activo">
          <div className="flex flex-wrap gap-2">
            {activeComorbidities.map((c) => (
              <Badge key={c} variant="clinical">{labelOfComorbidity(c)}</Badge>
            ))}
          </div>
          {reqs.conflicts?.length > 0 && (
            <InfoCard variant="warn">
              <strong>Conflicto clínico detectado:</strong> {reqs.conflicts[0].message}
            </InfoCard>
          )}
        </FormCard>
      )}

      {/* Antropometría */}
      <FormCard title="Antropometría">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DataCell label="Talla" value={`${patient.height_cm} cm`} />
          <DataCell label="Peso actual" value={`${patient.weight_kg} kg`} />
          {patient.weight_pregest_kg && (
            <DataCell label="Peso pregestacional" value={`${patient.weight_pregest_kg} kg`} />
          )}
          <DataCell
            label="IMC actual"
            value={(patient.weight_kg / Math.pow(patient.height_cm / 100, 2)).toFixed(1)}
            hint={classifyIMC(/* ... */)}
          />
          <DataCell
            label="Peso usado"
            value={`${reqs.vct.weightUsed} kg`}
            hint={reqs.vct.weightSource === 'healthy' ? 'saludable' : 'actual'}
          />
          <DataCell label="Área" value={patient.residence_area} />
          <DataCell label="Actividad" value={patient.lifestyle} />
        </div>
      </FormCard>

      {/* Requerimiento energético */}
      <FormCard title="Requerimiento energético" subtitle="FAO/OMS 2004 · adaptación CENAN Perú">
        <div className="space-y-2">
          <EnergyRow label="TMB" value={reqs.vct.tmb} unit="kcal/día" />
          <EnergyRow label="NAF" value={reqs.vct.naf?.toFixed(2)} unit="" />
          <EnergyRow label="GET" value={reqs.vct.get} unit="kcal/día" />
          {reqs.vct.encdt > 0 && (
            <EnergyRow label="ENCDT (crecimiento)" value={`+${reqs.vct.encdt}`} unit="kcal/día" />
          )}
          {reqs.vct.adicion > 0 && (
            <EnergyRow label="Adición fisiológica" value={`+${reqs.vct.adicion}`} unit="kcal/día" />
          )}
          <div className="pt-2 mt-2 border-t border-[color:var(--rule)]">
            <EnergyRow label="VCT" value={reqs.vct.vct} unit="kcal/día" highlight />
          </div>
        </div>
      </FormCard>

      {/* Vista detallada de comorbilidad (componente existente) */}
      <RequirementsDetail merged={reqs.targets} sources={reqs.override_sources} />

      {/* Lista de planes */}
      <section>
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl font-medium text-[color:var(--ink)]">
            Planes
          </h2>
          <NewPlanButton patientId={patient.id} variant="secondary" />
        </header>

        {plans.length === 0 ? (
          <div className="bg-white border border-dashed border-[color:var(--rule)] rounded-lg p-8 text-center">
            <p className="text-[color:var(--ink-soft)] mb-3">
              Aún no hay planes creados para este paciente.
            </p>
            <NewPlanButton patientId={patient.id} />
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
```

Componentes auxiliares:

```tsx
function DataCell({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--ink-soft)] mb-0.5">
        {label}
      </div>
      <div className="font-mono text-sm text-[color:var(--ink)]">
        {value}
        {hint && <span className="text-xs text-[color:var(--ink-soft)] ml-1.5">{hint}</span>}
      </div>
    </div>
  );
}

function EnergyRow({ label, value, unit, highlight }: {
  label: string;
  value: number | string | undefined;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={highlight ? 'font-serif text-base font-medium' : 'text-sm text-[color:var(--ink-soft)]'}>
        {label}
      </span>
      <span className={`font-mono ${highlight ? 'text-lg font-medium text-[color:var(--ink)]' : 'text-sm text-[color:var(--ink)]'}`}>
        {value ?? '—'} {unit && <span className="text-xs text-[color:var(--ink-soft)]">{unit}</span>}
      </span>
    </div>
  );
}

function Badge({ variant, children }: { variant: 'info' | 'warn' | 'accent' | 'clinical'; children: ReactNode }) {
  const colors = {
    info: 'bg-blue-50 text-blue-900 border-blue-200',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
    accent: 'bg-[color:var(--paper-warm)] text-[color:var(--accent)] border-[color:var(--rule)]',
    clinical: 'bg-[color:var(--paper-warm)] text-[color:var(--ink)] border-[color:var(--rule)]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Link
      href={`/patients/${plan.patient_id}/plans/${plan.id}`}
      className="block bg-white border border-[color:var(--rule)] rounded-lg p-4 hover:border-[color:var(--accent)] transition-colors group"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-[color:var(--ink)] truncate group-hover:text-[color:var(--accent)]">
            {plan.name}
          </h3>
          <p className="text-xs text-[color:var(--ink-soft)] mt-0.5">
            {formatDate(plan.plan_date)} · {plan.calculated_vct} kcal
          </p>
        </div>
        <ChevronRight size={16} className="text-[color:var(--ink-soft)] group-hover:text-[color:var(--accent)] transition-colors" />
      </div>
    </Link>
  );
}
```

## 2.3 Constructor de plan — 4 mejoras

Estas son las que ya teníamos en el viejo `UX_UPGRADE_SPEC.md`. Aquí solo
reproduzco los componentes finales (la justificación está en el viejo doc o
en mensajes previos de la conversación).

### 2.3.1 FoodSearch refactorizado

Ver código completo en `UX_UPGRADE_SPEC.md` viejo, sección "Mejora 1 ... Componente FoodSearch.tsx".

Cambios importantes vs lo que está hoy:
- Usa el nuevo endpoint con `unaccent`
- Navegación con `↑ ↓ Enter Esc`
- Highlight del término buscado en los resultados
- Sección de "usados recientemente con este paciente" (nuevo endpoint en 2.4)
- Footer con shortcuts visibles
- Filtros de grupo como pills

### 2.3.2 TotalsPanel con scroll independiente

Ver código completo en `UX_UPGRADE_SPEC.md` viejo, sección "Mejora 2".

Estructura clave:
```css
.totals-panel {
  position: sticky;
  top: 1.5rem;
  max-height: calc(100vh - 8rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.totals-panel-body {
  flex: 1;
  overflow-y: auto;
}
```

Agrupación: Macronutrientes / Minerales / Vitaminas. Cada nutriente con:
valor actual / target · % con color semaforizado.

### 2.3.3 MealItem con stepper

Ver código completo en `UX_UPGRADE_SPEC.md` viejo, sección "Mejora 3".

Cambios:
- Botones `−` / `+` grandes en lugar de spinners default
- Input que selecciona todo al hacer focus
- Selector de unidad integrado: gramos / medidas caseras
- **Importante:** ahora SÍ poblar `measures` desde el endpoint `/api/foods/:id/measures`

### 2.3.4 Tabs de comidas con conteo visible

```tsx
<nav className="flex gap-1 border-b border-[color:var(--rule)] overflow-x-auto">
  {meals.map(meal => {
    const count = itemsByMeal[meal]?.length ?? 0;
    const kcal = itemsByMeal[meal]?.reduce((s, i) => s + calcKcal(i), 0) ?? 0;
    const active = activeMeal === meal;
    return (
      <button
        key={meal}
        onClick={() => setActiveMeal(meal)}
        className={`shrink-0 flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 transition-colors ${
          active
            ? 'border-[color:var(--accent)] text-[color:var(--ink)]'
            : 'border-transparent text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]'
        }`}
      >
        <span className="font-serif text-sm">{MEAL_LABELS[meal]}</span>
        {count > 0 && (
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
            active
              ? 'bg-[color:var(--accent)] text-[color:var(--paper)]'
              : 'bg-[color:var(--paper-warm)] text-[color:var(--ink-soft)]'
          }`}>
            {count}
          </span>
        )}
      </button>
    );
  })}
</nav>
```

## 2.4 Nuevo endpoint: alimentos recientes

`src/app/api/patients/[id]/recent-foods/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from('meal_plan_items')
    .select(`
      food_id, grams, household_measure_id, household_measure_qty,
      meal_plans!inner(patient_id, plan_date)
    `)
    .eq('meal_plans.patient_id', params.id)
    .order('meal_plans(plan_date)', { ascending: false })
    .limit(60);

  if (error) {
    return NextResponse.json({ recent: [] });
  }

  const seen = new Set<number>();
  const recent: Array<any> = [];

  for (const item of items ?? []) {
    if (seen.has(item.food_id) || recent.length >= 10) continue;
    seen.add(item.food_id);
    const date = (item as any).meal_plans.plan_date;
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    recent.push({ food_id: item.food_id, grams: item.grams, days });
  }

  if (recent.length === 0) return NextResponse.json({ recent: [] });

  const { data: foods } = await supabase
    .from('foods')
    .select('*')
    .in('id', recent.map((r) => r.food_id));

  const foodMap = new Map(foods?.map((f) => [f.id, f]) ?? []);
  const result = recent
    .map((r) => {
      const food = foodMap.get(r.food_id);
      return food ? { food, lastGrams: r.grams, lastUsedDays: r.days } : null;
    })
    .filter(Boolean);

  return NextResponse.json({ recent: result });
}
```

## 2.5 Sidebar con iconos

`src/components/ui/Sidebar.tsx`:

```tsx
import { Home, Users } from 'lucide-react';

export function Sidebar({ user }: { user: { full_name: string; email: string } }) {
  return (
    <aside className="w-56 bg-[color:var(--paper)] border-r border-[color:var(--rule)] flex flex-col p-4">
      {/* Brand */}
      <div className="mb-8 pb-4 border-b border-[color:var(--rule)]">
        <h1 className="font-serif text-xl font-medium text-[color:var(--ink)] leading-none">
          NutriCalc
        </h1>
        <p className="text-xs text-[color:var(--ink-soft)] mt-1">Clínica Nutria</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        <NavItem href="/dashboard" icon={Home} label="Inicio" />
        <NavItem href="/patients" icon={Users} label="Pacientes" />
      </nav>

      {/* User */}
      <div className="pt-4 border-t border-[color:var(--rule)]">
        <p className="text-sm font-medium text-[color:var(--ink)] truncate">
          {user.full_name}
        </p>
        <button className="text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--danger)] mt-1">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  // Usar usePathname para detectar activo
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] hover:bg-white transition-colors"
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}
```

## 2.6 Responsive básico

En el constructor del plan, el panel derecho colapsa en mobile/tablet:

```tsx
<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
  <main className="space-y-6 min-w-0">{/* plan */}</main>

  <aside className="hidden lg:block">
    <TotalsPanel {...} />
  </aside>
</div>

{/* FAB en mobile/tablet */}
<button
  className="lg:hidden fixed bottom-4 right-4 bg-[color:var(--accent)] text-[color:var(--paper)] rounded-full px-4 py-3 flex items-center gap-2 text-sm font-medium z-40 shadow-lg"
  onClick={() => setShowTotals(true)}
>
  <BarChart size={16} />
  {Math.round(totals.energia_kcal ?? 0)} kcal
</button>

{showTotals && (
  <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowTotals(false)}>
    <div
      className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-2xl overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex justify-between items-center p-4 border-b border-[color:var(--rule)]">
        <h3 className="font-serif font-medium">Totales del día</h3>
        <button onClick={() => setShowTotals(false)}><X size={18} /></button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <TotalsPanel {...} />
      </div>
    </div>
  </div>
)}
```

---

# FASE 3 — MODO PACIENTE (3-4 días)

## 3.1 Tabla `meal_plans.share_token`

Migración SQL — `supabase/migrations/008_plan_share_token.sql`:

```sql
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Generar tokens para planes existentes
UPDATE meal_plans
SET share_token = encode(gen_random_bytes(16), 'hex')
WHERE share_token IS NULL;

-- Default para nuevos
ALTER TABLE meal_plans
  ALTER COLUMN share_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
```

## 3.2 Ruta `/p/[token]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { PatientPlanView } from '@/components/patient-view/PatientPlanView';

export default async function PublicPlanPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  const { data: plan } = await supabase
    .from('meal_plans')
    .select(`
      id, plan_date, name, target_macros,
      patient:patients(full_name),
      created_by:nutritionists(full_name, professional_license, clinic:clinics(name)),
      items:meal_plan_items(
        id, meal, grams, household_measure_id, household_measure_qty, position,
        food:foods(code, name, group_letter)
      )
    `)
    .eq('share_token', params.token)
    .single();

  if (!plan) notFound();

  // Cargar nombres de medidas caseras
  const measureIds = plan.items
    .map((i: any) => i.household_measure_id)
    .filter(Boolean);
  let measureMap = new Map();
  if (measureIds.length > 0) {
    const { data: measures } = await supabase
      .from('household_measures')
      .select('id, measure_name, grams')
      .in('id', measureIds);
    measureMap = new Map(measures?.map((m: any) => [m.id, m]) ?? []);
  }

  return <PatientPlanView plan={plan as any} measures={measureMap} />;
}

export const metadata = { title: 'Plan nutricional' };
```

## 3.3 `PatientPlanView`

`src/components/patient-view/PatientPlanView.tsx`:

```tsx
'use client';

const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  media_manana: 'Media mañana',
  almuerzo: 'Almuerzo',
  media_tarde: 'Media tarde',
  cena: 'Cena',
};

export function PatientPlanView({ plan, measures }: any) {
  const meals = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena'];
  const itemsByMeal = meals.map((m) => ({
    key: m,
    label: MEAL_LABELS[m],
    items: plan.items.filter((i: any) => i.meal === m).sort((a: any, b: any) => a.position - b.position),
  }));

  const date = new Date(plan.plan_date).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <main className="min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <article className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-16">

        {/* Encabezado */}
        <header className="border-b border-[color:var(--rule)] pb-8 mb-10">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)] mb-3">
            Plan nutricional · {plan.created_by.clinic?.name ?? 'Clínica Nutria'}
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-medium leading-tight mb-3 text-[color:var(--ink)]">
            {plan.patient.full_name}
          </h1>
          <p className="text-[color:var(--ink-soft)] text-sm md:text-base">
            {date}
          </p>
        </header>

        {/* Comidas */}
        <div className="space-y-12">
          {itemsByMeal.filter((m) => m.items.length > 0).map((meal) => (
            <section key={meal.key}>
              <h2 className="font-serif text-2xl md:text-3xl font-medium text-[color:var(--accent)] mb-5 pb-2 border-b border-dashed border-[color:var(--rule)]">
                {meal.label}
              </h2>
              <ul className="space-y-3">
                {meal.items.map((item: any) => (
                  <li key={item.id} className="flex items-baseline gap-4 text-base md:text-lg">
                    <span className="font-serif text-[color:var(--accent)] text-xl leading-tight shrink-0">·</span>
                    <div className="flex-1">{item.food.name}</div>
                    <span className="font-mono text-sm md:text-base text-[color:var(--ink-soft)] shrink-0">
                      {formatPortionForPatient(item, measures)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-[color:var(--rule)] mt-16 pt-6 text-xs md:text-sm text-[color:var(--ink-soft)] leading-relaxed space-y-3">
          <p>
            Plan elaborado por{' '}
            <strong className="text-[color:var(--ink)]">{plan.created_by.full_name}</strong>
            {plan.created_by.professional_license && (
              <>, CNP N° <span className="font-mono">{plan.created_by.professional_license}</span></>
            )}.
          </p>
          <p className="italic">
            Información de apoyo profesional, no reemplaza consulta presencial.
            Ante cualquier duda, consulte con su nutricionista.
          </p>
        </footer>

      </article>
    </main>
  );
}

function formatPortionForPatient(item: any, measures: Map<number, any>): string {
  if (item.household_measure_id) {
    const m = measures.get(item.household_measure_id);
    if (m) {
      const qty = item.household_measure_qty ?? 1;
      const qtyStr = qty === 1 ? '1' : qty.toString();
      return `${qtyStr} ${m.measure_name}`;
    }
  }
  return `${Math.round(item.grams)} g`;
}
```

## 3.4 Botón "Modo paciente" en el constructor

En el header del constructor del plan, junto a "Exportar PDF":

```tsx
<a
  href={`/p/${plan.share_token}`}
  target="_blank"
  rel="noopener"
  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[color:var(--rule)] rounded-md text-[color:var(--ink-soft)] hover:border-[color:var(--accent)] hover:text-[color:var(--ink)] transition-colors"
>
  <Eye size={12} />
  Modo paciente
  <ExternalLink size={10} />
</a>
```

---

## Tests obligatorios antes de mergear

### Funcionalidad (todos deben pasar)

```bash
npm test
# 62 tests + nuevos deben pasar
```

### Manual (con un paciente complejo creado: María Test Embarazo de la auditoría)

- [ ] Búsqueda "pan frances" encuentra "Pan francés"
- [ ] Búsqueda "A49" encuentra Pan francés directamente
- [ ] Búsqueda con `↑↓ Enter` funciona
- [ ] PatientForm muestra IMC en vivo al ingresar peso y talla
- [ ] PatientForm muestra peso pregestacional al elegir embarazo
- [ ] Página del paciente: badges (Embarazo T2, Adulto mayor si aplica) visibles
- [ ] Página del paciente: bloque "Crear plan" destacado en la parte superior
- [ ] Vista detallada muestra badges `[HTA]`, `[DM2]`, etc. para paciente con comorbilidades
- [ ] Constructor: panel de totales scrollea independiente
- [ ] Constructor: panel muestra TODOS los nutrientes sin cortarse
- [ ] Constructor: MealItem permite cambiar gramos con stepper sin abrir input
- [ ] Constructor: si el alimento tiene medidas caseras (ej. A3 Arroz), el dropdown las muestra
- [ ] PDF: `≥` y `≤` se ven correctamente (no "e")
- [ ] PDF: alimentos muestran "1 taza al ras (158 g)" cuando hay medida casera
- [ ] PDF: aparece sección de distribución de macros
- [ ] `/p/[token]`: la URL pública carga el plan
- [ ] `/p/[token]`: no muestra códigos TPCA, ni valores nutricionales numéricos
- [ ] `/p/[token]`: muestra firma del nutricionista
- [ ] Responsive: en mobile, FAB de totales aparece y abre drawer

### Build limpio

```bash
npm run lint
npm run type-check    # o tsc --noEmit
npm run build
```

---

## Orden recomendado de commits

```
Día 1-2  feat(search): unaccent extension + RPC search_foods
Día 2    fix(pdf): register Inter/Fraunces fonts for math glyphs
Día 2    feat(pdf): use household measures + add macros section
Día 3    feat(form): live IMC and healthy weight in PatientForm
Día 3    feat(api): complete /api/patients/[id]/requirements
Día 3    chore: remove legacy Fase 2A code

Día 4-5  feat(ui): form-primitives + redesigned PatientForm
Día 6-7  feat(ui): redesigned patient page with cards
Día 8    feat(plan): refactored FoodSearch with keyboard nav
Día 9    feat(plan): TotalsPanel with independent scroll
Día 10   feat(plan): MealItem with stepper + measure selector
Día 10   feat(plan): meal tabs with counts
Día 11   feat(ui): sidebar with icons + responsive FAB

Día 12   feat(db): meal_plans.share_token
Día 13   feat(public): /p/[token] route + PatientPlanView
Día 14   feat(plan): "Modo paciente" button + final QA

Final    docs: update CLAUDE.md with new state
```

---

## Reglas inviolables durante esta PR

1. **No tocar la lógica de cálculo** (`src/lib/calculations/`). 62 tests pasan, no romperlos.
2. **No cambiar el esquema clínico** (DRIs, comorbilidades, overrides). Solo agregar `share_token` y `unaccent`.
3. **No introducir nuevas dependencias visuales pesadas.** Quedarse con Tailwind + lucide-react.
4. **No cambiar identidad visual** (fuentes, paleta).
5. **Commitear por unidades coherentes.** Cada commit debe dejar la app build-limpia.
6. **Si algo no está claro, preguntar al usuario antes de inventar.**

---

## Qué pasa después

Una vez mergeada esta PR:

1. Demo con Regina (los 5 casos clínicos representativos del MIGRATION_PLAN sección 14)
2. Regina valida `clinical_overrides.json` (deuda pendiente)
3. Recoger feedback y decidir Fase 3 (modelo Pro/Pro Max, multi-clínica, etc.)
4. Re-mapear los 11 códigos TPCA faltantes para recuperar las 56 medidas perdidas

---

**Última actualización:** Spec basada en `AUDIT.md` (verificación real del repo).
3 fases internas dentro de una sola PR. Estimación 2-3 semanas.
