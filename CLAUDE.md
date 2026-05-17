# NutriCalc — Estado del proyecto

## Qué es
App web de planificación nutricional clínica para Perú (Clínica Nutria, Regina Elias).
Permite registrar pacientes con datos antropométricos completos, calcular requerimientos
energéticos y de nutrientes personalizados (FAO/OMS adaptado Perú + DRIs IOM/NASEM),
armar planes de alimentación diarios con medidas caseras peruanas, y exportar PDFs
profesionales para el paciente.

Base nutricional: **TPCA 2023** (1125 alimentos oficiales del INS Perú).
Medidas caseras: **TAFERA 2016** (CENAN, solo conversiones de peso).
Requerimientos energéticos: **FAO/OMS 2004 adaptado por CENAN Perú**.
Requerimientos micronutrientes: **DRIs IOM/NASEM**.
Overrides clínicos: **KDOQI 2020, ADA 2024, AHA 2021, DASH, WHO 2017**.

## Repositorio y deploy
- **GitHub:** https://github.com/wifituga/nutricalc
- **Hosting:** Vercel (deploy automático en cada push a `main`)
- **DB:** Supabase — proyecto `umasnghtdyffqbfxjwow`
- **Dev local:** `npm run dev` → http://localhost:3000

## Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS — Fraunces / Inter / JetBrains Mono · paleta cálida editorial
- Supabase — PostgreSQL + Auth + RLS
- @react-pdf/renderer — PDFs con branding clínico
- Zod — validación de inputs clínicos

## Estado de Fase 2A (completada — versión inicial básica)
- [x] Auth email+password (Supabase)
- [x] CRUD de pacientes con dropdown de 6 perfiles clínicos
- [x] Buscador de alimentos TPCA con full-text search (1125 alimentos)
- [x] Constructor de plan diario — 5 comidas, gramos editables, auto-guardado
- [x] Panel de totales nutricionales en tiempo real con alertas
- [x] Export a PDF con disclaimer legal + cita TPCA 2023
- [x] Deploy en Vercel + Supabase

## Fase 2B (en curso) — Upgrade a app clínica completa

Esta fase reemplaza el modelo simple de "perfiles clínicos como dropdown" por un
sistema con **tres dimensiones independientes**: estado fisiológico, nivel de actividad,
y perfil clínico con múltiples comorbilidades simultáneas. Agrega cálculo automático
de requerimientos personalizados, medidas caseras peruanas y biodisponibilidad de hierro.

**Estrategia:** big bang en `main`, sprints incrementales (~1 semana cada uno).
No hay usuarios clínicos reales todavía → migración de datos no es necesaria.

Ver `MIGRATION_PLAN.md` para el plan completo paso a paso.

### Sprints
- [x] **Sprint 1** — Cálculo energético FAO/OMS + antropometría completa
- [x] **Sprint 2** — DRIs IOM personalizados + targets por paciente
- [x] **Sprint 3** — Comorbilidades múltiples + merge automático
- [x] **Sprint 4** — Estado fisiológico (embarazo/lactancia) + distribución de macros
- [x] **Sprint 5** — Medidas caseras TAFERA
- [x] **Sprint 6** — Hierro absorbible (fórmula Monsen)

## Estructura actual (será refactorizada en sprints)
```
src/
├── app/(app)/          ← Páginas autenticadas
├── app/api/            ← API Routes REST
├── app/login/          ← Auth
├── components/plan/    ← PlanBuilder, FoodSearch, MealSection, TotalsPanel
├── components/pdf/     ← PlanDocument (react-pdf)
├── components/ui/      ← Sidebar, PatientForm, AlertBadge, NutrientRow
├── lib/
│   ├── nutrition.ts        ← (será reemplazado por src/lib/calculations/)
│   ├── profiles.ts         ← (será reemplazado por clinical_overrides.json)
│   ├── types.ts            ← Branded types (Mg, G, Kcal) — mantener
│   └── supabase/           ← client/server/admin — mantener
scripts/
├── seed-foods.ts           ← ya ejecutado (1125 alimentos)
├── seed-profiles.ts        ← deprecado, se reemplaza en sprint 3
└── (próximos seeds: dris, measures, overrides)
supabase/migrations/
└── 001_initial_schema.sql  ← se reemplaza con migrations incrementales
```

## Datos de referencia (en `data/`)
- `tpca_2023.json` — 1125 alimentos (ya en BD)
- `medidas_caseras.json` — 960 medidas TAFERA (323 high, 197 medium, 440 unmatched)
- `dris_iom.json` — 1126 valores DRI cubriendo 30 nutrientes × 22 etapas de vida
- `peru_energy_guide.json` — TMB / NAF urbano-rural / IMC saludable / ENCDT
- `clinical_overrides.json` — 9 comorbilidades con sus overrides y reglas de merge

## Reglas de negocio críticas (inviolables)

1. **Null ≠ 0** en datos nutricionales (TPCA y DRI). Mostrar "—" si falta dato.
2. **Peso saludable, no peso actual**: si IMC > IMC saludable (22 adultos / 25.5 ≥60a),
   usar peso saludable en cálculos. En embarazo, usar peso pregestacional.
3. **Adulto mayor a partir de 60 años** se auto-detecta de la edad. No es checkbox.
4. **Branded types obligatorios** en TypeScript: `type Mg = number & { __brand: 'mg' }`.
5. **No localStorage para datos clínicos** (Ley 29733 Perú).
6. **DRIs y overrides nunca hardcodeados.** Siempre en BD o archivo JSON.
7. **Solo medidas caseras `match_confidence='high'`** en MVP. Las medium se aprueban
   manualmente en sprint posterior; las unmatched se mapean luego.
8. **Nutrientes vienen SIEMPRE de TPCA 2023**, nunca de TAFERA 2016 (desactualizado).
9. Todo PDF lleva pie con **cita académica completa** + firma nutricionista (CNP N°).
10. Para auth, `createAdminClient()` solo en lookups internos; `createClient()` para
    operaciones sobre datos del usuario (preserva RLS).

## Variables de entorno
Están en `.env.local` y en Vercel dashboard. Ver `.env.local.example`.

## Comorbilidades soportadas (Sprint 3+)
- `renal_predialysis` — KDOQI 2020
- `renal_hemodialysis` — KDOQI 2020
- `diabetes_t1` — ADA 2024
- `diabetes_t2` — ADA 2024
- `diabetes_gestational` — ADA + IOM pregnancy
- `hypertension` — AHA 2021 + DASH
- `iron_deficiency_anemia` — WHO 2017
- `dyslipidemia` — AHA 2019
- `custom` — overrides manuales por nutricionista

**Auto-derivados (no checkboxes):**
- `older_adult` — edad ≥ 60 años
- `athlete` — flag `is_athlete` en paciente

⚠️ Los overrides deben ser **validados por Regina Elias** antes de uso clínico real.
Las guías son referenciales; la nutricionista puede sobrescribir cualquier límite.

## Casos clínicos que la app debe manejar correctamente al final de Fase 2B

- Adulto sano (ej. M 25a urbano)
- Deportista sano (con factor proteico ajustable)
- Embarazada T1/T2/T3 (peso pregestacional, adición energética)
- Lactante 0-6m / 6-12m
- Adulto mayor 60+ auto-detectado (IMC saludable 25.5, proteína 1.2)
- Diabético + Hipertenso (merge: sodio 1500, fibra 30, grasa 20-30%)
- Renal pre-diálisis con anemia (proteína baja + hierro alto)
- Embarazada con diabetes gestacional y anemia
- Renal pre-diálisis + Deportista (CONFLICTO de proteína, alerta + decisión manual)
