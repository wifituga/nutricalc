import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ count: patientsCount }, { count: plansCount }] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase.from('meal_plans').select('*', { count: 'exact', head: true }),
  ]);

  const { data: recentPlans } = await supabase
    .from('meal_plans')
    .select('id, name, plan_date, patients(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        Inicio
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>
        Bienvenido al sistema de planificación nutricional clínica.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Pacientes" value={patientsCount ?? 0} href="/patients" />
        <StatCard label="Planes creados" value={plansCount ?? 0} href="/patients" />
      </div>

      {recentPlans && recentPlans.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>
            Planes recientes
          </h2>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
            {recentPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/patients/${(plan as unknown as { patients: { id: string } }).patients?.id ?? ''}/plans/${plan.id}`}
                className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{plan.name}</p>
                  <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                    {(plan.patients as unknown as { full_name: string } | null)?.full_name}
                  </p>
                </div>
                <span className="font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>
                  {plan.plan_date}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(!recentPlans || recentPlans.length === 0) && (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
        >
          <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>
            Aún no hay planes creados.
          </p>
          <Link
            href="/patients"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Ir a Pacientes para crear un plan
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border p-5 hover:opacity-80 transition-opacity"
      style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}
    >
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </p>
      <p className="font-display text-3xl font-semibold" style={{ color: 'var(--accent)' }}>
        {value}
      </p>
    </Link>
  );
}
