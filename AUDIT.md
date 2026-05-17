# AUDIT.md — Auditoría de estado actual de NutriCalc

> Para Claude Code. Esta no es una tarea de implementación. Es una **auditoría
> de inventario**: ejecutas los comandos, observas la app, y devuelves un reporte
> estructurado al final del documento. **No modifiques código durante esta tarea.**
>
> Tiempo estimado: 45-60 minutos.

---

## Cómo trabajar este documento

1. Lee este archivo entero antes de empezar.
2. Ejecuta cada sección en orden.
3. Para cada item, marca con ✓ (existe y funciona), ⚠ (existe pero con problema)
   o ✗ (no existe). Anota observaciones cuando sea relevante.
4. Al final del documento hay una plantilla de **REPORTE FINAL**. Cópiala,
   rellénala y entrégala al usuario.
5. Si encuentras algo inesperado o no cubierto por las preguntas, agrégalo en
   la sección "Hallazgos adicionales" del reporte.

**Reglas:**
- No modifiques código ni base de datos.
- Si un comando falla, anota el error pero continúa con los demás items.
- Si un componente existe pero está parcialmente implementado, anota qué falta.
- Sé conciso pero específico (incluye rutas de archivos, nombres de funciones, etc.).

---

## Sección 1 — Base de datos

### 1.1 Tablas y conteos

Ejecuta estas queries en Supabase (o vía `psql` con la connection string del
proyecto). Anota el conteo de filas para cada una:

```sql
SELECT 'foods' as tabla, count(*) FROM foods
UNION ALL SELECT 'household_measures', count(*) FROM household_measures
UNION ALL SELECT 'dri_reference', count(*) FROM dri_reference
UNION ALL SELECT 'clinics', count(*) FROM clinics
UNION ALL SELECT 'nutritionists', count(*) FROM nutritionists
UNION ALL SELECT 'patients', count(*) FROM patients
UNION ALL SELECT 'meal_plans', count(*) FROM meal_plans
UNION ALL SELECT 'meal_plan_items', count(*) FROM meal_plan_items;
```

Si alguna tabla no existe, anótalo. Si un conteo es 0, anótalo (puede significar
que el seed no se ejecutó).

### 1.2 Esquema de `patients`

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
```

Verifica que existen estas columnas (de la Fase 2B):

- [ ] `birth_date` (date)
- [ ] `sex` (text con check M/F)
- [ ] `height_cm` (numeric)
- [ ] `weight_kg` (numeric)
- [ ] `weight_pregest_kg` (numeric, nullable)
- [ ] `residence_area` (text)
- [ ] `lifestyle` (text)
- [ ] `is_athlete` (boolean)
- [ ] `protein_factor_override` (numeric, nullable)
- [ ] `physiological_state` (text con default 'standard')
- [ ] `comorbidities` (text[])
- [ ] `custom_limits` (jsonb, nullable)
- [ ] `macro_distribution_override` (jsonb, nullable)

Anota cualquier columna faltante o con tipo incorrecto.

### 1.3 Esquema de `meal_plans`

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'meal_plans'
ORDER BY ordinal_position;
```

Verifica que existen (necesarios para snapshot de targets):

- [ ] `patient_snapshot` (jsonb)
- [ ] `calculated_tmb` (numeric)
- [ ] `calculated_get` (numeric)
- [ ] `calculated_encdt` (numeric)
- [ ] `calculated_vct` (numeric)
- [ ] `target_macros` (jsonb)
- [ ] `target_micros` (jsonb)
- [ ] `override_sources` (jsonb, nullable)

### 1.4 Datos reales

Verifica que hay datos no triviales (no solo seeds vacíos):

```sql
-- Foods debe tener ~1125
SELECT count(*) as foods_count FROM foods;

-- DRI debe tener ~1126
SELECT count(*) as dri_count FROM dri_reference;

-- Medidas caseras debería tener al menos ~323 si el sprint 5 corrió
SELECT count(*) as measures_count FROM household_measures;

-- Cuántos alimentos tienen al menos una medida casera
SELECT count(DISTINCT food_id) as foods_with_measures FROM household_measures;

-- Sample de medidas para confirmar estructura
SELECT food_id, measure_name, grams, match_confidence
FROM household_measures
LIMIT 5;
```

### 1.5 Índices y extensiones

```sql
-- Buscar extensión unaccent (clave para búsqueda con tildes)
SELECT extname FROM pg_extension WHERE extname IN ('unaccent', 'pg_trgm');

-- Listar índices de foods
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'foods';
```

Anota:
- ¿Existe extensión `unaccent`?
- ¿El índice de búsqueda usa `unaccent`?

### 1.6 Función RPC de búsqueda (si existe)

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('search_foods', 'unaccent_immutable');
```

¿Existe alguna función custom para búsqueda?

---

## Sección 2 — Librería de cálculos

Inspecciona `src/lib/calculations/` (o donde esté la lógica de cálculo en tu repo).

### 2.1 Archivos esperados

Para cada archivo, anota: existe ✓ / no existe ✗ / existe pero parcial ⚠.
Si existe, anota cuántas funciones exporta y si hay tests asociados.

```bash
ls src/lib/calculations/ 2>/dev/null
ls src/lib/calculations/__tests__/ 2>/dev/null
```

- [ ] `types.ts` o equivalente con branded types (Mg, G, Kcal, Months)
- [ ] `age.ts` — ageInYears, ageInMonths
- [ ] `healthyWeight.ts` — imcSaludable, pesoSaludable, selectWeight
- [ ] `energyRequirement.ts` — calculateTMB_adult, calculateVCT, NAF, ENCDT, PHYSIOLOGICAL_ADDITION
- [ ] `driLookup.ts` — getBaseDRIs
- [ ] `proteinTarget.ts`
- [ ] `macroDistribution.ts` — modos AMDR / manual / desde_g_por_kg
- [ ] `comorbidityMerge.ts` — mergeOverrides con 5 reglas
- [ ] `derivedComorbidities.ts` — auto-detección de older_adult, athlete
- [ ] `nutrientTotals.ts` — suma con resolveGrams
- [ ] `ironBioavailability.ts` — Monsen
- [ ] `alertLevels.ts` — semáforo

### 2.2 Ejecutar tests

```bash
npm test 2>&1 | head -100
# o
npx vitest run 2>&1 | head -100
```

Anota:
- ¿Cuántos tests existen en total?
- ¿Cuántos pasan?
- ¿Cuántos fallan? Si fallan, anota el nombre y la razón resumida.
- ¿Pasan los 3 casos del Excel peruano (Caso 1, 4, 8 del CONTEXT.md sección 10)?
- ¿Pasan los casos de merge M1, M2, M3?

### 2.3 Función `mergeOverrides` — comportamiento real

Abre `comorbidityMerge.ts` (o equivalente). Verifica:

- [ ] ¿Implementa las 5 reglas (máximo, mínimo, intersección rangos, proteína conflicto, hierro multiplicador)?
- [ ] ¿Retorna información de **qué comorbilidad impuso cada límite** (source)?
- [ ] ¿Detecta conflictos sin auto-mergear (caso renal + deportista)?

Si la función existe pero no incluye `source` en el output, eso explicaría por
qué la vista detallada solo muestra "[Base IOM]" en lugar de "[HTA]" / "[DM2]".

### 2.4 `clinical_overrides.json`

```bash
ls data/clinical_overrides.json 2>/dev/null && head -20 data/clinical_overrides.json
```

- [ ] ¿Existe el archivo?
- [ ] ¿Está cargado/leído por algún módulo de cálculos?

```bash
grep -r "clinical_overrides" src/ 2>/dev/null
```

---

## Sección 3 — API Routes

Lista las routes existentes:

```bash
find src/app/api -name "route.ts" -o -name "route.js" 2>/dev/null
```

Para cada ruta esperada, anota si existe (✓ / ✗) y, si existe, qué métodos HTTP
maneja (GET / POST / PATCH / DELETE):

### 3.1 Catálogos

- [ ] `GET /api/foods` o `/api/foods/search`
- [ ] `GET /api/foods/:id`
- [ ] `GET /api/foods/:id/measures`
- [ ] `GET /api/dris` o similar (para preview de DRIs sin paciente)
- [ ] `GET /api/comorbidities`

### 3.2 Pacientes

- [ ] `GET /api/patients` (lista)
- [ ] `POST /api/patients` (crear)
- [ ] `GET /api/patients/:id` (uno)
- [ ] `PATCH /api/patients/:id` (editar)
- [ ] `DELETE /api/patients/:id`
- [ ] **`GET /api/patients/:id/requirements`** — calcula TMB+GET+VCT+DRIs+merge
- [ ] `GET /api/patients/:id/recent-foods` (para autocompletado)

### 3.3 Planes

- [ ] `POST /api/patients/:id/plans` (crear plan)
- [ ] `GET /api/patients/:id/plans` (listar planes del paciente)
- [ ] `GET /api/plans/:id` (uno)
- [ ] `PATCH /api/plans/:id`
- [ ] `DELETE /api/plans/:id`
- [ ] `GET /api/plans/:id/totals` (totales calculados server-side)
- [ ] `GET /api/plans/:id/pdf`
- [ ] `POST /api/plans/:id/items`
- [ ] `PATCH /api/plans/items/:itemId`
- [ ] `DELETE /api/plans/items/:itemId`

### 3.4 Verificar respuesta de endpoints críticos

Si el repo tiene credenciales en `.env.local`, prueba directamente:

```bash
# Listar pacientes (necesita auth, puede fallar)
curl -s http://localhost:3000/api/patients | head -30

# Asumiendo que existe un paciente con UUID conocido:
# curl -s http://localhost:3000/api/patients/UUID/requirements | jq
```

Para el endpoint `/api/patients/:id/requirements`, **lo más importante**: anota
la estructura del JSON de respuesta. Específicamente:

- ¿Devuelve `vct: { tmb, naf, get, encdt, vct, weightUsed, weightSource }`?
- ¿Devuelve `limits` con valores resueltos después de merge?
- ¿Devuelve `override_sources` con info de qué patología impuso cada límite?
- ¿Devuelve `conflicts` si hay alguno?

---

## Sección 4 — Componentes UI

Lista los componentes existentes:

```bash
find src/components -type f -name "*.tsx" 2>/dev/null | sort
```

Para cada componente esperado, anota: existe ✓ / no existe ✗ / existe pero
incompleto ⚠.

### 4.1 Layout

- [ ] `Sidebar.tsx` o similar
- [ ] Layout principal de pantallas autenticadas
- [ ] Header con info del usuario logueado

### 4.2 Pacientes

- [ ] `PatientForm.tsx` — formulario crear/editar
  - [ ] ¿Captura todos los campos (incluyendo `is_athlete`, `physiological_state`, `comorbidities[]`)?
  - [ ] ¿Muestra peso pregestacional cuando se elige embarazo? (esto ya lo confirmaste: sí)
  - [ ] ¿Muestra factor proteico cuando se marca deportista? (esto ya lo confirmaste: sí)
  - [ ] ¿Calcula IMC en vivo mientras se ingresan peso y talla?
- [ ] `PatientList.tsx` — listado
- [ ] `PatientPage.tsx` — detalle del paciente (la pantalla que me mostraste)

### 4.3 Requerimientos calculados

- [ ] Componente que muestra TMB / NAF / GET / VCT
- [ ] Componente que muestra el desglose detallado de DRIs/macros
- [ ] **¿Existe vista detallada con badges `[HTA]`, `[DM2]` mostrando origen de overrides?**
  - Si solo muestra `[Base IOM]` para todo, está implementado parcialmente.
  - Verificar en el código si recibe `override_sources` y lo renderiza.

### 4.4 Distribución de macros

- [ ] ¿Existe componente `MacroDistribution*.tsx` o similar?
- [ ] Si existe, ¿está importado en alguna página? (`grep "MacroDistribution" src/app -r`)
- [ ] Si existe, ¿tiene los 3 modos (AMDR / manual / desde g/kg)?

### 4.5 Plan

- [ ] `PlanBuilder.tsx`
- [ ] `FoodSearch.tsx`
- [ ] `MealSection.tsx`
- [ ] `MealItem.tsx` o equivalente (item individual de comida)
  - [ ] ¿Acepta prop de medidas caseras?
  - [ ] ¿El selector de unidad muestra opciones reales o solo "gramos"?
- [ ] `TotalsPanel.tsx`
  - [ ] ¿Compara contra targets personalizados o contra `PROFILES` viejos?
- [ ] ¿Existe componente de **hierro absorbible** o panel relacionado?
  - `grep -r "ironBio\|hierro_absorb\|absorbibleIron\|Monsen" src/`

### 4.6 PDF

- [ ] `PlanDocument.tsx` (react-pdf)
- [ ] ¿Usa medidas caseras o solo gramos?
- [ ] ¿Muestra distribución de macros?
- [ ] **¿Cómo renderiza el símbolo `≥`?** (verificar si está hardcodeado como
  `"≥"` o como entidad `&ge;` o como string `">=`).

---

## Sección 5 — Páginas (rutas de Next.js)

Lista las páginas:

```bash
find src/app -name "page.tsx" 2>/dev/null | sort
```

### 5.1 Rutas esperadas

- [ ] `/` (home/landing)
- [ ] `/login`
- [ ] `/dashboard` o `/(app)`
- [ ] `/patients`
- [ ] `/patients/new`
- [ ] `/patients/[id]`
- [ ] `/patients/[id]/edit`
- [ ] `/patients/[id]/plans/new`
- [ ] `/plans/[id]` (constructor del plan)
- [ ] `/plans/[id]/pdf` (descarga)
- [ ] **`/p/[planId]`** (modo paciente, lo más probable es que NO exista)

---

## Sección 6 — Test manual en la app desplegada

Abre la app en `localhost:3000` o la URL de Vercel. Loguéate con la cuenta
existente.

### 6.1 Crear paciente complejo

Crea este paciente de prueba:

```
Nombre: María Test Embarazo
DNI: 99999991
Fecha nacimiento: 15/03/1998 (≈28 años)
Sexo: Femenino
Talla: 162 cm
Peso: 70 kg
Peso pregestacional: 60 kg (cuando aparezca el campo)
Área: Urbana
Actividad: Ligero
Deportista: No
Estado fisiológico: Embarazo T2
Comorbilidades: Diabetes gestacional, Anemia ferropénica
```

Anota:

- [ ] ¿Apareció el campo de peso pregestacional al elegir embarazo T2?
- [ ] ¿Apareció algún campo extra al marcar diabetes gestacional o anemia?
- [ ] ¿Hubo errores de validación inesperados?
- [ ] ¿Se guardó correctamente?

### 6.2 Ver requerimientos del paciente complejo

Después de crearlo, entra al detalle:

- [ ] ¿Aparece TMB, GET, VCT calculados?
- [ ] ¿La VCT incluye la adición de embarazo T2 (+285 kcal)?
- [ ] ¿Aparece distribución de macros en algún lado?
- [ ] ¿Aparecen los DRIs personalizados (hierro 27mg para embarazo, etc.)?
- [ ] ¿Las dos comorbilidades aparecen mencionadas en algún lado?
- [ ] ¿El detalle por comorbilidad muestra de dónde viene cada override
      o solo dice `[Base IOM]`?
- [ ] ¿Existe vista o sección de hierro absorbible?

Toma 2-3 screenshots de esta pantalla y de cualquier sección expandida.

### 6.3 Crear deportista

```
Nombre: Carlos Test Deportista
DNI: 99999992
Fecha nacimiento: 10/05/1990 (≈35 años)
Sexo: Masculino
Talla: 178 cm
Peso: 82 kg
Área: Urbana
Actividad: No ligero
Deportista: Sí
Estado fisiológico: Estándar
Comorbilidades: ninguna
```

- [ ] ¿Apareció campo de factor proteico al marcar deportista?
- [ ] ¿Qué valor default mostró?
- [ ] ¿Se puede editar?

### 6.4 Crear adulto mayor con HTA

```
Nombre: Rosa Test Mayor HTA
DNI: 99999993
Fecha nacimiento: 1955-08-20 (≈70 años)
Sexo: Femenino
Talla: 158 cm
Peso: 72 kg
Área: Urbana
Actividad: Ligero
Comorbilidades: Hipertensión arterial
```

- [ ] ¿La app detecta auto que es adulto mayor?
- [ ] ¿Lo muestra visualmente en algún lado (badge, mensaje)?
- [ ] ¿Aplica el IMC saludable 25.5 en lugar de 22 al calcular peso saludable?
- [ ] Verificar peso saludable mostrado: con talla 1.58m e IMC 25.5 = **63.6 kg**.
      Con IMC 22 daría 54.9 kg (incorrecto).

### 6.5 Crear plan para el paciente embarazada

Entra a "María Test Embarazo" y crea un plan nuevo. Agrega estos alimentos:

```
Desayuno:
- Pan francés (probar buscar con "pan frances" sin tilde)
- Huevo
- Leche descremada

Almuerzo:
- Arroz blanco cocido
- Filete de pollo
- Ensalada de verduras
```

Anota:

- [ ] ¿La búsqueda "pan frances" encuentra "Pan francés"? (espero que NO según
      lo que vimos antes)
- [ ] ¿Aparece selector de medidas caseras para los alimentos? (taza, cucharón, etc.)
- [ ] ¿O solo se puede ingresar gramos?
- [ ] ¿El panel de totales se puede scrollear?
- [ ] ¿Se muestran TODOS los micronutrientes o algunos están cortados?
- [ ] ¿Los % vs target son contra el VCT personalizado o contra un default?

### 6.6 Exportar PDF del plan

- [ ] ¿El PDF muestra "e56" en lugar de "≥56" (bug confirmado)?
- [ ] ¿Usa medidas caseras o gramos?
- [ ] ¿Aparece distribución de macros?
- [ ] ¿Aparece el nombre de la nutricionista y CNP en el pie?
- [ ] ¿La cita académica está completa?

---

## Sección 7 — Hallazgos del navegador

Abre las DevTools (F12) en la app desplegada o local. Mientras navegas por la
app:

- [ ] ¿Hay errores en consola? Anota los más recurrentes.
- [ ] ¿Hay warnings de React (key, deprecation, etc.)?
- [ ] ¿Hay requests fallidos (4xx, 5xx) en Network tab?
- [ ] ¿Cuánto tarda la búsqueda de alimentos? (latencia perceptible?)
- [ ] ¿Cuánto tarda en cargar la página del paciente?

---

## Sección 8 — Estado del repositorio

```bash
git log --oneline -20
git status
git branch -a
```

- [ ] ¿Hay cambios sin commitear?
- [ ] ¿Qué tan reciente es el último commit?
- [ ] ¿En qué branch está el código de Fase 2B? ¿Ya mergeado a main?

---

# REPORTE FINAL (plantilla)

> Esta sección la rellenas y entregas al usuario.

```
═══════════════════════════════════════════════════════════════
REPORTE DE AUDITORÍA — NutriCalc
═══════════════════════════════════════════════════════════════
Fecha: [YYYY-MM-DD]
Branch evaluado: [branch name]
Último commit: [hash + mensaje]

───────────────────────────────────────────────────────────────
1. BASE DE DATOS
───────────────────────────────────────────────────────────────
Tablas (filas):
- foods: [N]
- household_measures: [N]
- dri_reference: [N]
- patients: [N]
- meal_plans: [N]

Columnas faltantes/incorrectas: [lista o "ninguna"]

Extensión unaccent: [SÍ/NO]
Índice de búsqueda usa unaccent: [SÍ/NO]
Función search_foods existe: [SÍ/NO]

───────────────────────────────────────────────────────────────
2. LIBRERÍA DE CÁLCULOS
───────────────────────────────────────────────────────────────
Archivos en src/lib/calculations/:
[listar con ✓ / ✗ / ⚠ y notas]

Tests:
- Total: [N]
- Pasan: [N]
- Fallan: [N] — [lista de los que fallan]

Tests de cálculos críticos:
- Caso 1 (F 3a 16kg → VCT 1203): [PASA/FALLA]
- Caso 4 (M 25a peso saludable → 2830): [PASA/FALLA]
- Caso 8 (Embarazo T3 rural → 2778): [PASA/FALLA]
- Merge M1 (DM2 + HTA → sodio 1500): [PASA/FALLA]
- Merge M2 (Renal + Deportista → conflicto): [PASA/FALLA]
- Merge M3 (Embarazo + Anemia → Fe 40.5): [PASA/FALLA]

`mergeOverrides` retorna info de source: [SÍ/NO]

───────────────────────────────────────────────────────────────
3. API ROUTES
───────────────────────────────────────────────────────────────
Existen: [lista]
Faltan: [lista]

Respuesta de /api/patients/:id/requirements:
[ESTRUCTURA REAL DEL JSON, con un sample]

───────────────────────────────────────────────────────────────
4. COMPONENTES UI
───────────────────────────────────────────────────────────────
Implementados y conectados a páginas:
[lista]

Implementados pero NO conectados (huérfanos):
[lista — IMPORTANTE]

NO implementados:
[lista]

───────────────────────────────────────────────────────────────
5. COMPORTAMIENTO REAL DE LA APP
───────────────────────────────────────────────────────────────
Paciente embarazada (María Test):
- Campo peso pregestacional aparece: [SÍ/NO]
- VCT calculado: [valor]
- Adición T2 (+285) aplicada: [SÍ/NO]
- DRIs personalizados visibles: [SÍ/NO + qué se ve y qué no]
- Medidas caseras disponibles en plan: [SÍ/NO]
- Hierro absorbible visible: [SÍ/NO + dónde]

Paciente deportista (Carlos Test):
- Campo factor proteico aparece: [SÍ/NO]
- Default mostrado: [valor]

Paciente adulto mayor (Rosa Test):
- Auto-detección visible: [SÍ/NO + dónde]
- Peso saludable usa IMC 25.5: [SÍ/NO]

Búsqueda con tildes:
- "pan frances" encuentra "Pan francés": [SÍ/NO]

PDF:
- Bug "e56" en lugar de "≥56": [PRESENTE/AUSENTE]
- Usa medidas caseras: [SÍ/NO]
- Muestra macros: [SÍ/NO]

───────────────────────────────────────────────────────────────
6. CONSOLA Y NETWORK
───────────────────────────────────────────────────────────────
Errores recurrentes en consola: [lista o "ninguno"]
Warnings de React: [lista breve]
Requests fallidos: [lista]
Latencia búsqueda: [ms aprox]
Latencia página paciente: [ms aprox]

───────────────────────────────────────────────────────────────
7. HALLAZGOS ADICIONALES
───────────────────────────────────────────────────────────────
[Cualquier cosa rara que viste y no estaba cubierta arriba.]

───────────────────────────────────────────────────────────────
8. RECOMENDACIONES DEL AUDITOR
───────────────────────────────────────────────────────────────
Lo que veo como bloqueador para producción:
[lista breve, máximo 5 items]

Lo que veo como mejora obvia:
[lista breve, máximo 5 items]

═══════════════════════════════════════════════════════════════
FIN DEL REPORTE
═══════════════════════════════════════════════════════════════
```

---

## Reglas de oro de esta auditoría

1. **No modificar nada.** Si encuentras un bug que se arregla en 2 minutos,
   anótalo en el reporte pero NO lo arregles ahora.
2. **Documentar lo que ves, no lo que esperas.** Si una función existe pero
   no hace lo que dice el nombre, anótalo así.
3. **Ser conciso pero específico.** "PatientForm.tsx existe, captura 12 campos,
   no incluye custom_limits para perfil personalizado" es mejor que "PatientForm
   parece bien".
4. **Adjuntar evidencia donde sea útil.** Una línea de código relevante, un
   sample de JSON, un mensaje de error.

Cuando termines, comparte el REPORTE FINAL completo con el usuario.
