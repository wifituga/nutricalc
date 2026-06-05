import { Coffee, Apple, UtensilsCrossed, Cookie, Moon } from 'lucide-react';
import ShareBar from './ShareBar';

type Item = {
  id: string;
  meal: string;
  grams: number;
  position: number;
  household_measure_id: number | null;
  household_measure_qty: number | null;
  food: { code: string; name: string; group_letter: string; per_100g: { energia_kcal: number | null } };
};

type Plan = {
  plan_date: string;
  name: string;
  patient: { full_name: string };
  created_by: {
    full_name: string;
    professional_license: string | null;
    clinic: { name: string } | null;
  };
  items: Item[];
};

const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  media_manana: 'Media mañana',
  almuerzo: 'Almuerzo',
  media_tarde: 'Media tarde',
  cena: 'Cena',
};
const MEAL_ORDER = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena'];
const MEAL_TIME: Record<string, string> = {
  desayuno: '7:00 – 8:00', media_manana: '10:30', almuerzo: '13:00 – 14:00', media_tarde: '16:30', cena: '19:00 – 20:00',
};
const MEAL_ICON: Record<string, typeof Coffee> = {
  desayuno: Coffee, media_manana: Apple, almuerzo: UtensilsCrossed, media_tarde: Cookie, cena: Moon,
};

function formatPortion(item: Item, measures: Map<number, { measure_name: string }>): string {
  if (item.household_measure_id) {
    const m = measures.get(item.household_measure_id);
    if (m) {
      const qty = item.household_measure_qty ?? 1;
      return `${qty} ${m.measure_name}`;
    }
  }
  return `${Math.round(item.grams)} g`;
}

export default function PatientPlanView({
  plan,
  measures,
}: {
  plan: Plan;
  measures: Map<number, { measure_name: string }>;
}) {
  const byMeal = MEAL_ORDER
    .map((m) => ({
      key: m,
      label: MEAL_LABELS[m],
      time: MEAL_TIME[m],
      Icon: MEAL_ICON[m],
      items: plan.items.filter((i) => i.meal === m).sort((a, b) => a.position - b.position),
    }))
    .filter((m) => m.items.length > 0);

  const kcalTotal = Math.round(
    plan.items.reduce((sum, i) => {
      const k = i.food.per_100g?.energia_kcal;
      return sum + (k != null ? (k * i.grams) / 100 : 0);
    }, 0),
  );
  const kcalStr = kcalTotal.toLocaleString('es-PE').replace(/,/g, ' ');

  const date = new Date(plan.plan_date).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const clinic = plan.created_by.clinic?.name ?? 'Clínica Nutria';

  return (
    <main className="min-h-screen pb-24" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <article className="max-w-xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
        {/* Hero */}
        <header className="text-center">
          <p className="text-[11px] uppercase mb-4" style={{ letterSpacing: '.18em', color: 'var(--ink-faint)' }}>
            Plan nutricional · {clinic}
          </p>
          <h1 className="font-display font-semibold leading-[1.05]" style={{ fontSize: 40, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            {plan.patient.full_name}
          </h1>
          <p className="text-sm mt-3 capitalize" style={{ color: 'var(--ink-soft)' }}>{date}</p>

          {/* Una sola cifra */}
          <div className="mt-8 mb-2">
            <div className="mono font-semibold leading-none" style={{ fontSize: 52, color: 'var(--accent-deep)' }}>{kcalStr}</div>
            <div className="text-[11px] uppercase mt-2" style={{ letterSpacing: '.14em', color: 'var(--ink-faint)' }}>kilocalorías al día</div>
          </div>
          <div className="flex justify-center gap-6 mt-6 text-[12px]" style={{ color: 'var(--ink-soft)' }}>
            <span>{byMeal.length} comidas</span>
            <span>·</span>
            <span>Medidas caseras</span>
            <span>·</span>
            <span>Personalizado</span>
          </div>
        </header>

        {/* Comidas */}
        <div className="mt-12 space-y-9">
          {byMeal.map((meal) => (
            <section key={meal.key}>
              <div className="flex items-center gap-3 mb-4">
                <span className="grid place-items-center rounded-full shrink-0" style={{ width: 38, height: 38, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid #e0cfba' }}>
                  <meal.Icon size={18} />
                </span>
                <div>
                  <h2 className="font-display font-semibold" style={{ fontSize: 21, color: 'var(--ink)' }}>{meal.label}</h2>
                  <p className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Sugerido {meal.time}</p>
                </div>
              </div>
              <ul className="space-y-2.5 pl-1">
                {meal.items.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-3">
                    <span className="shrink-0 mt-2 rounded-full" style={{ width: 5, height: 5, background: 'var(--accent)' }} />
                    <span className="flex-1 text-[15px]" style={{ color: 'var(--ink)' }}>{item.food.name}</span>
                    <span className="mono text-[13px] shrink-0" style={{ color: 'var(--ink-soft)' }}>{formatPortion(item, measures)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Consejo cálido */}
        <div className="mt-12 rounded-[10px] p-5" style={{ background: 'var(--accent-soft)', border: '1px solid #e0cfba' }}>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--accent-deep)' }}>
            Sigue las medidas caseras indicadas y mantén horarios regulares. Toma agua a lo largo del día y, ante cualquier
            duda sobre una porción o un alimento, escríbeme. Estamos en esto juntos.
          </p>
        </div>

        {/* Cierre de confianza */}
        <footer className="mt-10 pt-7 border-t text-center" style={{ borderColor: 'var(--rule)' }}>
          <p className="font-display italic" style={{ fontSize: 22, color: 'var(--ink)' }}>{plan.created_by.full_name}</p>
          <p className="text-[12.5px] mt-1" style={{ color: 'var(--ink-soft)' }}>
            Nutricionista{plan.created_by.professional_license && <> · CNP N° <span className="mono">{plan.created_by.professional_license}</span></>} · {clinic}
          </p>
          <div className="mt-6 space-y-1.5 text-[11px] leading-relaxed" style={{ color: 'var(--ink-faint)' }}>
            <p>Composición de alimentos: Tablas Peruanas de Composición de Alimentos (TPCA), INS/CENAN.</p>
            <p>Documento de apoyo profesional; no reemplaza la consulta presencial ni el juicio clínico.</p>
            <p>Sus datos están protegidos conforme a la Ley N.° 29733 de Protección de Datos Personales del Perú.</p>
          </div>
        </footer>
      </article>

      <ShareBar title={`Plan nutricional · ${plan.patient.full_name}`} />
    </main>
  );
}
