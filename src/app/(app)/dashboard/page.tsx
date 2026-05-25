import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Users, ClipboardList, ChevronRight, Plus } from 'lucide-react';

type RecentPlan = {
  id: string;
  name: string;
  plan_date: string;
  patients: { id: string; full_name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: patientsCount }, { count: plansCount }, recent] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase.from('meal_plans').select('*', { count: 'exact', head: true }),
    supabase
      .from('meal_plans')
      .select('id, name, plan_date, patients(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);
  const recentPlans = (recent.data ?? []) as unknown as RecentPlan[];

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-medium" style={{ color: 'var(--ink)' }}>
          Inicio
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
          Bienvenido al sistema de planificación nutricional clínica.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard label="Pacientes" value={patientsCount ?? 0} href="/patients" icon={Users} />
        <StatCard label="Planes creados" value={plansCount ?? 0} href="/patients" icon={ClipboardList} />
      </div>

      <section>
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-medium" style={{ color: 'var(--ink)' }}>
            Planes recientes
          </h2>
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            <Plus size={14} /> Nuevo paciente
          </Link>
        </header>

        {recentPlans.length > 0 ? (
          <div
            className="rounded-lg border overflow-hidden bg-white"
            style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
          >
            {recentPlans.map((plan, idx) => {
              const href = plan.patients?.id
                ? `/patients/${plan.patients.id}/plans/${plan.id}`
                : '#';
              return (
                <Link
                  key={plan.id}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 row-hover ${
                    idx === 0 ? '' : 'border-t'
                  }`}
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                      {plan.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                      {plan.patients?.full_name ?? 'Sin paciente'}
                    </p>
                  </div>
                  <span className="font-mono text-xs shrink-0" style={{ color: 'var(--ink-soft)' }}>
                    {plan.plan_date}
                  </span>
                  <ChevronRight size={15} style={{ color: 'var(--ink-soft)' }} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-lg border p-10 text-center bg-white"
            style={{ borderColor: 'var(--rule)' }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>
              Aún no hay planes creados.
            </p>
            <Link
              href="/patients"
              className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Ir a Pacientes para crear un plan →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label, value, href, icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: typeof Users;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border p-5 bg-white hover:shadow-md transition-shadow"
      style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
          {label}
        </p>
        <Icon size={16} style={{ color: 'var(--ink-soft)' }} />
      </div>
      <p className="font-display text-3xl font-semibold" style={{ color: 'var(--accent)' }}>
        {value}
      </p>
    </Link>
  );
}
