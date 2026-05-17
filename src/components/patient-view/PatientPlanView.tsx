type Item = {
  id: string;
  meal: string;
  grams: number;
  position: number;
  household_measure_id: number | null;
  household_measure_qty: number | null;
  food: { code: string; name: string; group_letter: string };
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
      items: plan.items
        .filter((i) => i.meal === m)
        .sort((a, b) => a.position - b.position),
    }))
    .filter((m) => m.items.length > 0);

  const date = new Date(plan.plan_date).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <main className="min-h-screen" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <article className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-16">
        <header className="border-b pb-8 mb-10" style={{ borderColor: 'var(--rule)' }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--ink-soft)' }}>
            Plan nutricional · {plan.created_by.clinic?.name ?? 'Clínica Nutria'}
          </p>
          <h1 className="font-display text-3xl md:text-5xl font-medium leading-tight mb-3"
            style={{ color: 'var(--ink)' }}>
            {plan.patient.full_name}
          </h1>
          <p className="text-sm md:text-base" style={{ color: 'var(--ink-soft)' }}>{date}</p>
        </header>

        <div className="space-y-12">
          {byMeal.map((meal) => (
            <section key={meal.key}>
              <h2 className="font-display text-2xl md:text-3xl font-medium mb-5 pb-2 border-b border-dashed"
                style={{ color: 'var(--accent)', borderColor: 'var(--rule)' }}>
                {meal.label}
              </h2>
              <ul className="space-y-3">
                {meal.items.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-4 text-base md:text-lg">
                    <span className="font-display text-xl leading-tight shrink-0"
                      style={{ color: 'var(--accent)' }}>·</span>
                    <div className="flex-1">{item.food.name}</div>
                    <span className="font-mono text-sm md:text-base shrink-0"
                      style={{ color: 'var(--ink-soft)' }}>
                      {formatPortion(item, measures)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="border-t mt-16 pt-6 text-xs md:text-sm leading-relaxed space-y-3"
          style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}>
          <p>
            Plan elaborado por{' '}
            <strong style={{ color: 'var(--ink)' }}>{plan.created_by.full_name}</strong>
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
