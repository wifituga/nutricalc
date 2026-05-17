# CONTEXT.md — Calculadora Nutricional Clínica (NutriCalc)

> Documento de contexto para Claude Code. **Léelo entero antes de empezar cualquier tarea.**

---

## 0. Archivos de referencia en este repositorio

Antes de empezar, Claude Code debe ubicar y leer estos archivos:

```
nutricalc/
├── CONTEXT.md                        ← este archivo
├── data/
│   └── tpca_2023.json                ← BASE DE DATOS OFICIAL (1125 alimentos)
└── reference/
    ├── prototipo.html                ← Prototipo HTML/CSS/JS validado por el cliente
    └── revision_humana.xlsx          ← Excel para revisión humana (opcional, no programar contra esto)
```

**Cómo usar cada uno:**

- **`data/tpca_2023.json`** — Fuente única de verdad para alimentos. Léelo solo para escribir el script de seed que lo migra a PostgreSQL. No lo modifiques manualmente.
- **`reference/prototipo.html`** — Es la UX que el cliente ya validó. **Replícalo, no lo modifiques.** De aquí extraes:
  - Paleta de colores (CSS variables)
  - Fuentes Google (Fraunces, Inter, JetBrains Mono)
  - Estructura de comidas, alertas, totales
  - Los 6 perfiles clínicos con sus límites (objeto `PROFILES` en el JS)
  - Lógica de cálculo de totales y niveles de alerta
- **`reference/revision_humana.xlsx`** — Solo para que un nutricionista revise valores manualmente. Claude Code no lo necesita para programar.

---

## 1. Resumen del proyecto

Aplicación web para una **consulta nutricional con varios nutricionistas en Perú** que atiende **múltiples tipos de pacientes** (renales, diabéticos, hipertensos, sanos, etc.). Permite:

1. Buscar alimentos peruanos en una base nutricional oficial
2. Armar un plan de alimentación del día por paciente (con comidas: desayuno, media mañana, almuerzo, media tarde, cena)
3. Calcular totales nutricionales en tiempo real
4. Alertar cuando los nutrientes exceden o no alcanzan los límites según el perfil clínico del paciente
5. Imprimir o exportar el plan en PDF para entregar al paciente

**Estado actual:** El prototipo (`reference/prototipo.html`) funciona 100% en navegador con los 1125 alimentos oficiales de la TPCA 2023, sin backend, sin persistencia. Sirvió para validar UX con el cliente.

**Objetivo de este repositorio (Fase 2):** Convertir el prototipo en aplicación web real con cuentas de usuario, persistencia de pacientes y planes, y reportes en PDF profesionales.

---

## 2. Datos nutricionales

### Fuente oficial verificada

**Tablas Peruanas de Composición de Alimentos (TPCA), 11.ª edición digital 2023**
- Autores: Reyes-García MM, Gómez-Sánchez Prieto VI, Espinoza-Barrientos CM
- Editor: Instituto Nacional de Salud del Perú · CENAN
- ISBN: 978-612-310-178-7
- Depósito Legal: 2025-02396 (Biblioteca Nacional del Perú)
- Disponible en repositorio.ins.gob.pe

### Cobertura extraída en `data/tpca_2023.json`

**1125 alimentos básicos** en 14 grupos (extracción verificada contra PDF original, sin códigos faltantes):

| Letra | Grupo | Alimentos |
|---|---|---|
| A | Cereales y derivados | 179 |
| B | Verduras, hortalizas y derivados | 131 |
| C | Frutas y derivados | 166 |
| D | Grasas, aceites y oleaginosas | 49 |
| E | Pescados y mariscos | 101 |
| F | Carnes y derivados | 134 |
| G | Leches y derivados | 38 |
| H | Bebidas (alcohólicas y analcohólicas) | 31 |
| J | Huevos y derivados | 15 |
| K | Productos azucarados | 8 |
| L | Misceláneos | 51 |
| Q | Alimentos infantiles | 17 |
| T | Leguminosas y derivados | 88 |
| U | Tubérculos, raíces y derivados | 87 |

**No incluido (para Fase 2B):** grupo S (567 preparaciones con estratos socioeconómicos A-E). Requiere parser dedicado.

### Estructura de cada registro en el JSON

```typescript
type Food = {
  codigo: string;            // "A1", "F45", "U12"
  grupo_letra: string;       // "A"
  grupo: string;             // "Cereales y derivados"
  alimento: string;          // "Kiwicha, achita o achis o amaranto"

  energia_kcal: number | null;
  energia_kj: number | null;
  agua_g: number | null;
  proteinas_g: number | null;
  grasa_g: number | null;
  carbohidratos_totales_g: number | null;
  carbohidratos_disponibles_g: number | null;  // totales - fibra
  fibra_g: number | null;
  cenizas_g: number | null;
  calcio_mg: number | null;
  fosforo_mg: number | null;
  zinc_mg: number | null;
  hierro_mg: number | null;
  sodio_mg: number | null;
  potasio_mg: number | null;
  beta_caroteno_ug: number | null;
  vitamina_a_ug: number | null;     // equivalentes de retinol
  tiamina_mg: number | null;        // B1
  riboflavina_mg: number | null;    // B2
  niacina_mg: number | null;        // B3
  vitamina_c_mg: number | null;
  acido_folico_ug: number | null;
};
```

### Cobertura de datos (de la TPCA misma, no por error de extracción)

| Nutriente | Cobertura |
|---|---|
| energia_kcal | 100.0% |
| proteinas_g | 99.6% |
| grasa_g | 99.6% |
| carbohidratos_totales_g | 97.5% |
| hierro_mg | 95.7% |
| calcio_mg | 89.1% |
| fosforo_mg | 87.6% |
| vitamina_c_mg | 83.0% |
| fibra_g | 69.8% |
| sodio_mg | 59.3% |
| potasio_mg | 57.9% |

**IMPORTANTE:** Los valores faltantes deben tratarse como `null`, NUNCA como 0. Si un alimento no tiene dato de potasio en la TPCA, no podemos afirmar que aporta 0 mg. Para pacientes renales esto es crítico.

---

## 3. Decisiones de producto ya tomadas

| Decisión | Razón |
|---|---|
| Web app (no app nativa) | Múltiples nutricionistas, acceso PC + móvil, base centralizada |
| Base TPCA oficial peruana | Alimentos peruanos específicos; credibilidad institucional |
| Base unificada, no solo renal | La clínica atiende múltiples patologías |
| Sistema de perfiles clínicos con límites configurables | Misma calculadora para distintos pacientes |
| Comidas del día como dimensión explícita | Estructura típica de planes nutricionales en Perú |
| Códigos alfanuméricos TPCA visibles en UI | Los nutricionistas peruanos los reconocen (A1=Kiwicha, etc.) |

---

## 4. Arquitectura recomendada para Fase 2

### Stack sugerido

- **Frontend:** Next.js 14+ (App Router) con TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes (migrar a servicio separado solo si crece)
- **Base de datos:** PostgreSQL en Supabase (free tier para empezar)
- **Autenticación:** Supabase Auth (email + password)
- **Hosting:** Vercel (free tier suficiente)
- **PDF:** `@react-pdf/renderer`

### Por qué este stack

- **Next.js + Vercel + Supabase**: la pila más rápida para una clínica con 3-10 nutricionistas. Costo: ~US$20-50/mes en producción.
- **TypeScript no es opcional** en una app que maneja datos clínicos: previene errores como confundir mg con g, sumar gramaje a kcal.
- **Tailwind** replica el diseño editorial del prototipo.
- **No usar Firebase**: el modelo es relacional (pacientes ↔ planes ↔ items).

### Modelo de datos (esquema PostgreSQL)

```sql
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
  professional_license text,    -- nro de colegiatura CNP
  clinic_id uuid REFERENCES clinics(id),
  role text CHECK (role IN ('admin', 'nutritionist')) DEFAULT 'nutritionist',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  assigned_nutritionist_id uuid REFERENCES nutritionists(id),
  full_name text NOT NULL,
  document_id text,             -- DNI
  birth_date date,
  sex text CHECK (sex IN ('M', 'F', 'other')),
  height_cm numeric,
  weight_kg numeric,
  clinical_profile text NOT NULL DEFAULT 'adulto_sano',
  custom_limits jsonb,          -- solo si clinical_profile = 'custom'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE foods (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,    -- "A1", "F45", etc.
  group_letter text NOT NULL,
  group_name text NOT NULL,
  name text NOT NULL,
  per_100g jsonb NOT NULL,
  source text NOT NULL,         -- 'TPCA_2023' o 'custom_<clinic_id>'
  is_preparation boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX foods_search_idx ON foods USING gin(to_tsvector('spanish', name));
CREATE INDEX foods_group_idx ON foods(group_letter);

CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES nutritionists(id),
  plan_date date NOT NULL,
  name text NOT NULL,
  notes text,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  food_id integer NOT NULL REFERENCES foods(id),
  meal text NOT NULL CHECK (meal IN ('desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena')),
  grams numeric NOT NULL CHECK (grams >= 0),
  position integer NOT NULL DEFAULT 0,
  notes text
);
CREATE INDEX meal_plan_items_plan_idx ON meal_plan_items(meal_plan_id);

CREATE TABLE nutrient_profiles (
  id text PRIMARY KEY,          -- 'adulto_sano', 'renal_predialisis', etc.
  name text NOT NULL,
  limits jsonb NOT NULL,
  is_system boolean DEFAULT false,
  clinic_id uuid REFERENCES clinics(id),  -- null si is_system=true
  created_at timestamptz DEFAULT now()
);
```

### Script de seed (crítico para la migración inicial)

Crear `scripts/seed-foods.ts` que:

1. Lea `data/tpca_2023.json`
2. Para cada alimento, separe los campos identificatorios (`codigo`, `grupo_letra`, `grupo`, `alimento`) del resto, que va en el JSONB `per_100g`
3. Inserte en la tabla `foods` con `source='TPCA_2023'`

También crear `scripts/seed-profiles.ts` que copie los 6 perfiles clínicos del objeto `PROFILES` en `reference/prototipo.html` (líneas con `const PROFILES = {...}`) a la tabla `nutrient_profiles` con `is_system=true`.

### Endpoints API mínimos

```
GET    /api/foods?q=&group=&limit=&offset=    Buscar/listar alimentos
GET    /api/foods/:id

POST   /api/patients                          Crear paciente (autoriza por clinic_id)
GET    /api/patients
GET    /api/patients/:id
PATCH  /api/patients/:id
DELETE /api/patients/:id

POST   /api/patients/:patientId/plans
GET    /api/patients/:patientId/plans
GET    /api/plans/:id
PATCH  /api/plans/:id
DELETE /api/plans/:id
POST   /api/plans/:id/items
PATCH  /api/plans/items/:itemId
DELETE /api/plans/items/:itemId

GET    /api/plans/:id/pdf                     Generar PDF con branding de clínica
GET    /api/plans/:id/totals                  Calcular totales server-side

GET    /api/profiles                          Listar perfiles clínicos
POST   /api/profiles                          Crear perfil custom para la clínica
```

---

## 5. Lógica de negocio crítica

### Cálculo de totales

```ts
function calculateTotals(items: PlanItem[], foods: Map<number, Food>): Totals {
  const totals: Totals = initEmptyTotals();
  for (const item of items) {
    const food = foods.get(item.foodId);
    if (!food) continue;
    const factor = item.grams / 100;
    for (const [nutrient, value] of Object.entries(food.per_100g)) {
      if (value != null) {
        totals[nutrient] = (totals[nutrient] ?? 0) + value * factor;
      }
    }
  }
  return roundTotals(totals);
}
```

**Reglas clave:**
- Si un alimento no tiene dato para cierto nutriente (null), **NO se asume 0**: se ignora.
- Los gramos son siempre por porción **comestible** (descontando cáscara, hueso, etc.). Convención TPCA.
- La TPCA reporta `carbohidratos_totales` Y `carbohidratos_disponibles`. Para diabéticos importa disponibles (excluye fibra). Permitir elegir.

### Sistema de alertas por perfil

```ts
type Limit = { max?: number; min?: number; label: string };

function getAlertLevel(value: number, limit: Limit): 'ok' | 'warn' | 'alert' | 'neutral' {
  if (limit.max != null) {
    const ratio = value / limit.max;
    if (ratio > 1.0) return 'alert';
    if (ratio > 0.85) return 'warn';
    return 'ok';
  }
  if (limit.min != null) {
    const ratio = value / limit.min;
    if (ratio < 0.6) return 'alert';
    if (ratio < 0.85) return 'warn';
    return 'ok';
  }
  return 'neutral';
}
```

### Perfiles clínicos predefinidos

⚠️ **Los valores son aproximaciones de guías internacionales. ANTES de usar en producción, la clínica debe validarlos contra sus guías de referencia** (KDOQI para renales, ADA/SEEN para diabetes, AHA para hipertensión) y ajustar.

Los 6 perfiles iniciales (adulto_sano, renal_predialisis, renal_dialisis, diabetes, hipertension, custom) están definidos en el objeto `PROFILES` dentro de `reference/prototipo.html`. Copiar tal cual a la tabla `nutrient_profiles` con `is_system=true`.

---

## 6. Diseño visual

El cliente validó la estética del prototipo (`reference/prototipo.html`). **Mantener fielmente:**

**Fuentes (Google Fonts):**
- Display: `Fraunces` (400-700) — títulos, etiquetas de comidas
- Body: `Inter` (400-700) — texto general
- Monospace: `JetBrains Mono` (500) — valores numéricos, códigos TPCA

**Paleta (copiar de las CSS variables del prototipo):**
```css
--ink:       #1a1815;
--ink-soft:  #5c574e;
--paper:     #f7f4ee;
--paper-warm:#efe9dd;
--rule:      #d6cfc0;
--accent:    #6b4423;
--ok:        #2d6a3e;
--warn:      #b88200;
--danger:    #a8341c;
```

**Principios:**
- Estética editorial/clínica: serif para títulos, monospace para números
- Tono cálido (marrones, crema) — NO blancos puros ni grises corporativos
- Sin sombras dramáticas, sin gradientes, sin emojis decorativos
- El código TPCA (A1, F45) debe ser visible — los nutricionistas peruanos lo usan

---

## 7. Funcionalidades por fase

### Fase 2A — MVP (4-6 semanas full-time)

- [ ] Setup Next.js + TypeScript + Tailwind + Supabase
- [ ] Script de seed: `data/tpca_2023.json` → tabla `foods`
- [ ] Script de seed: perfiles del prototipo → tabla `nutrient_profiles`
- [ ] Auth: login/logout, una clínica con varios nutricionistas
- [ ] CRUD de pacientes
- [ ] Buscador de alimentos con autocomplete (full-text search PostgreSQL) y filtro por grupo
- [ ] Constructor de plan del día (replicar UX del prototipo)
- [ ] Cálculo de totales en vivo con alertas por perfil
- [ ] Guardar/cargar planes
- [ ] Exportar plan a PDF con branding de clínica

### Fase 2B — Funcionalidades clínicas (4 semanas adicionales)

- [ ] Plantillas de planes reutilizables
- [ ] Cálculo automático de requerimientos energéticos (Harris-Benedict, Mifflin-St Jeor, FAO/OMS)
- [ ] Histórico de planes con comparación
- [ ] Perfiles clínicos personalizables por clínica
- [ ] Exportar a Excel
- [ ] Importar el grupo S de preparaciones de la TPCA 2023

### Fase 3 — Crecimiento (opcional)

- [ ] Multi-clínica (SaaS)
- [ ] Portal del paciente (móvil)
- [ ] Recordatorios por WhatsApp
- [ ] Reporte de adherencia
- [ ] Integración con balanzas Bluetooth

---

## 8. Cosas que NO hacer

1. **No clasificar alimentos por palabras clave en el nombre.** La TPCA ya viene con grupo asignado por código (campo `grupo_letra` en el JSON). Usarlo tal cual.

2. **No asumir valores en datos faltantes.** Si la TPCA no tiene el potasio de un alimento, mostrar "—" en la UI, no "0". Crítico para pacientes renales.

3. **No mezclar unidades en el código.** Usar tipos branded de TypeScript:
   ```ts
   type Mg = number & { __brand: 'mg' };
   type G = number & { __brand: 'g' };
   type Kcal = number & { __brand: 'kcal' };
   ```

4. **No hacer cálculos automatizados sin disclaimer.** La app NO diagnostica ni prescribe. Todo PDF debe llevar al pie: "Plan elaborado por [Nombre del nutricionista, Colegiatura CNP N°XXXX]. Información de apoyo profesional, no reemplaza consulta presencial."

5. **No usar localStorage para datos de pacientes.** Datos clínicos en backend con auth real. Cumplir **Ley 29733 (Protección de Datos Personales del Perú)** — datos de salud son categoría especial.

6. **No copiar literal el código del prototipo en producción.** El prototipo es validación de UX, no arquitectura:
   - El JSON embebido es solo para prototipo
   - Las funciones globales deben ser hooks de React
   - No tiene manejo de errores ni estados de carga

7. **No truncar nombres largos sin tooltip.** Algunos alimentos TPCA tienen nombres >60 caracteres (ej. "Pan bollo o bollitos de queso de Huancavelica"). Tooltip al pasar el cursor.

8. **No modificar `reference/prototipo.html` ni `data/tpca_2023.json`.** Son archivos de referencia. La app real se construye en `src/`.

---

## 9. Cita obligatoria en exports/PDFs

Los PDFs generados deben incluir en el pie:

> Composición en 100 g de porción comestible. Fuente: Reyes-García MM, Gómez-Sánchez Prieto VI, Espinoza-Barrientos CM. Tablas Peruanas de Composición de Alimentos. 11.ª ed. Lima: Instituto Nacional de Salud, 2023. ISBN 978-612-310-178-7.

---

## 10. Tareas inmediatas (en este orden)

1. **Verificar archivos de referencia.** Comprobar que existen:
   - `data/tpca_2023.json` (~823 KB, 1125 alimentos)
   - `reference/prototipo.html` (~440 KB, con datos embebidos)

2. **Setup del repositorio.**
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src-dir
   npm install @supabase/supabase-js @supabase/ssr
   npm install -D @types/node
   ```

3. **Configurar Supabase.** Crear proyecto en supabase.com, agregar credenciales a `.env.local`, generar el esquema SQL de la sección 4.

4. **Escribir script de seed:** `scripts/seed-foods.ts` que migra el JSON a PostgreSQL.

5. **Implementar Auth + Patients CRUD.**

6. **Implementar buscador de alimentos** (endpoint + UI con autocomplete debounced ~300ms).

7. **Implementar constructor de plan** (replicar UX de `reference/prototipo.html`).

8. **Implementar cálculo de totales + alertas** (reutilizar lógica del prototipo, refactorizada en TypeScript).

9. **Exportar a PDF** con `@react-pdf/renderer` y branding de clínica.

10. **Deploy a Vercel + Supabase de producción.**

---

## 11. Contexto del cliente

- **Tipo:** Consulta nutricional con varios nutricionistas en Perú
- **Pacientes:** Múltiples patologías (renales, diabéticos, hipertensos, sanos)
- **Ubicación:** Perú · Zona horaria America/Lima
- **Idioma:** Español (es-PE)
- **Pendientes:** Branding final, política de retención de datos, modelo de pricing

---

**Última actualización:** Datos verificados contra TPCA 2023 oficial (11.ª edición INS, ISBN 978-612-310-178-7).
