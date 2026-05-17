# NutriCalc — Estado actual del proyecto

## Qué es
App web de planificación nutricional clínica para Perú (Clínica Nutria, Regina Elias).
Permite armar planes de alimentación diarios por paciente, calcular totales nutricionales
en tiempo real con alertas por perfil clínico, y exportar PDFs profesionales.
Base de datos: TPCA 2023 (1125 alimentos oficiales del INS Perú).

## Repositorio y deploy
- **GitHub:** https://github.com/wifituga/nutricalc
- **Hosting:** Vercel (conectado a GitHub, deploy automático en cada push a `main`)
- **Base de datos:** Supabase — proyecto `umasnghtdyffqbfxjwow`
- **Dev local:** `npm run dev` → http://localhost:3000

## Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS — paleta cálida editorial (Fraunces / Inter / JetBrains Mono)
- Supabase — PostgreSQL + Auth + RLS
- @react-pdf/renderer — PDF con branding clínico
- Vercel — hosting

## Estado de la Fase 2A (completada)
- [x] Auth email+password (Supabase)
- [x] CRUD de pacientes con 6 perfiles clínicos
- [x] Buscador de alimentos TPCA con full-text search (1125 alimentos cargados)
- [x] Constructor de plan del día — 5 comidas, gramos editables, auto-guardado
- [x] Panel de totales nutricionales en tiempo real con alertas (ok/warn/danger)
- [x] Exportar plan a PDF con disclaimer legal y cita TPCA 2023
- [x] Deploy en Vercel + Supabase

## Estructura clave
```
src/
├── app/(app)/          ← Páginas autenticadas (dashboard, patients, plan builder)
├── app/api/            ← API Routes REST (foods, patients, plans, profiles, pdf)
├── app/login/          ← Auth pages
├── components/plan/    ← PlanBuilder, FoodSearch, MealSection, TotalsPanel
├── components/pdf/     ← PlanDocument (react-pdf)
├── components/ui/      ← Sidebar, PatientForm, AlertBadge, NutrientRow
├── lib/
│   ├── nutrition.ts    ← calculateTotals, getAlertLevel
│   ├── profiles.ts     ← 6 perfiles clínicos del sistema
│   ├── types.ts        ← Tipos TypeScript con branded types (Mg, G, Kcal)
│   └── supabase/       ← client.ts (browser), server.ts (SSR), admin.ts (service role)
scripts/
├── seed-foods.ts       ← Migra tpca_2023.json → foods (ya ejecutado)
└── seed-profiles.ts    ← Inserta 6 perfiles (ya ejecutado)
supabase/migrations/
└── 001_initial_schema.sql  ← Schema completo con RLS
```

## Reglas de negocio críticas
- Null ≠ 0: nutrientes sin dato se muestran como "—", nunca se asumen 0 (potasio en renales)
- No localStorage para datos clínicos (Ley 29733 Perú)
- Todo PDF lleva disclaimer del nutricionista + cita TPCA 2023 (ISBN 978-612-310-178-7)
- Las API routes usan `createAdminClient()` (service role) para lookups internos de nutritionists,
  y `createClient()` (sesión del usuario + RLS) para operaciones sobre patients/plans

## Variables de entorno
Están en `.env.local` (local) y en Vercel dashboard (producción).
No están en el repo. Ver `.env.local.example` para los nombres.

## Perfiles clínicos disponibles
adulto_sano, renal_predialisis, renal_dialisis, diabetes, hipertension, custom
⚠️ Los límites son aproximaciones de guías internacionales (KDOQI/ADA/AHA).
La clínica debe validarlos antes de uso clínico real.

## Pendiente (Fase 2B)
- Plantillas de planes reutilizables
- Cálculo automático de requerimientos energéticos (Harris-Benedict, Mifflin-St Jeor)
- Histórico de planes con comparación
- Perfiles clínicos personalizables por clínica
- Exportar a Excel
- Importar grupo S de TPCA (567 preparaciones)
