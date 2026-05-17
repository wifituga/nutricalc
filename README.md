# NutriCalc — Calculadora Nutricional Clínica

App web para consultas nutricionales en Perú. Permite armar planes de alimentación por paciente con base en la TPCA 2023, calcular totales nutricionales en tiempo real y exportar PDFs profesionales.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** con diseño editorial (Fraunces / Inter / JetBrains Mono)
- **Supabase** — PostgreSQL + Auth + RLS
- **@react-pdf/renderer** — PDF con branding clínico
- **Vercel** — hosting

---

## Setup local

### 1. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa con tus credenciales de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2. Base de datos

Ejecuta `supabase/migrations/001_initial_schema.sql` en el SQL Editor de tu proyecto Supabase.

### 3. Seeds

```bash
# Migrar los 1125 alimentos TPCA 2023
# Primero coloca data/tpca_2023.json en el repositorio
npx tsx scripts/seed-foods.ts

# Insertar los 6 perfiles clínicos del sistema
npx tsx scripts/seed-profiles.ts
```

### 4. Primer usuario

En Supabase → Authentication → Users, crea un usuario (email + password).  
Luego inserta su clínica y nutricionista en SQL:

```sql
-- Crea la clínica
INSERT INTO clinics (name) VALUES ('Mi Clínica Nutricional') RETURNING id;

-- Crea el nutricionista (usa el UUID del usuario creado en Auth)
INSERT INTO nutritionists (id, email, full_name, professional_license, clinic_id, role)
VALUES (
  '<UUID del usuario>',
  'nutricionista@ejemplo.com',
  'Lic. Ana García',
  '12345',
  '<UUID de la clínica>',
  'admin'
);
```

### 5. Servidor de desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000`.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/              ← Páginas autenticadas
│   │   ├── dashboard/
│   │   ├── patients/
│   │   │   ├── [id]/
│   │   │   │   ├── edit/
│   │   │   │   └── plans/[planId]/   ← Constructor de plan
│   │   │   └── new/
│   ├── api/                ← API Routes REST
│   │   ├── foods/
│   │   ├── patients/
│   │   ├── plans/
│   │   └── profiles/
│   └── login/
├── components/
│   ├── plan/               ← PlanBuilder, FoodSearch, MealSection, TotalsPanel
│   ├── pdf/                ← PlanDocument (react-pdf)
│   └── ui/                 ← Sidebar, PatientForm, AlertBadge, NutrientRow
├── lib/
│   ├── nutrition.ts        ← calculateTotals, getAlertLevel, labels
│   ├── profiles.ts         ← 6 perfiles clínicos del sistema
│   ├── types.ts            ← Tipos TypeScript (branded types incluidos)
│   └── supabase/           ← client.ts (browser) + server.ts (server)
scripts/
├── seed-foods.ts           ← Migra tpca_2023.json → foods table
└── seed-profiles.ts        ← Inserta perfiles clínicos
supabase/
└── migrations/
    └── 001_initial_schema.sql
data/
└── tpca_2023.json          ← Colocar aquí (no incluido por tamaño)
reference/
└── prototipo.html          ← UX validada por cliente (no incluido)
```

---

## Deploy en Vercel

1. Conecta el repositorio en vercel.com
2. Agrega las variables de entorno (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
3. Vercel detecta Next.js automáticamente

---

## Notas clínicas importantes

- Los valores null de nutrientes se muestran como "—", nunca se asumen como 0 (crítico para potasio en pacientes renales)
- Todo PDF incluye el disclaimer del nutricionista y la cita oficial de la TPCA 2023
- Los datos de pacientes se almacenan en Supabase con RLS (Ley 29733 Perú)
- Los perfiles clínicos predefinidos son aproximaciones de guías internacionales (KDOQI, ADA, AHA). La clínica debe validarlos antes de uso en producción

---

## Fases de desarrollo

- **Fase 2A (implementada):** Auth, CRUD pacientes, buscador de alimentos, constructor de plan, totales + alertas, PDF
- **Fase 2B:** Plantillas, Harris-Benedict, histórico, perfiles custom, Excel, grupo S de TPCA
- **Fase 3:** Multi-clínica SaaS, portal paciente, WhatsApp
