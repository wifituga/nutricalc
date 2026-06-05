import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Users, ClipboardList, ChevronRight, Plus, UserPlus, AlertTriangle, FilePlus } from 'lucide-react';
import { isAnthropometryComplete, fmtNum } from '@/lib/patientDisplay';
import { Card, Avatar, Badge } from '@/components/ui/primitives';

type RecentPlan = {
  id: string;
  name: string;
  plan_date: string;
  patients: { id: string; full_name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: { user } }, { data: patients }, { data: plans }, recent] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('patients').select('id, full_name, birth_date, sex, height_cm, weight_kg, residence_area, lifestyle'),
    supabase.from('meal_plans').select('id, patient_id'),
    supabase
      .from('meal_plans')
      .select('id, name, plan_date, patients(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  let greetingName = '';
  if (user) {
    const { data: n } = await admin.from('nutritionists').select('full_name').eq('id', user.id).single();
    greetingName = (n?.full_name ?? '').split(' ')[0] ?? '';
  }

  const recentPlans = (recent.data ?? []) as unknown as RecentPlan[];
  const patientsList = patients ?? [];
  const planList = plans ?? [];
  const patientsWithPlan = new Set(planList.map((p) => p.patient_id));

  const incomplete = patientsList.filter((p) => !isAnthropometryComplete(p as never));
  const noPlan = patientsList.filter((p) => !patientsWithPlan.has(p.id));

  const stats = [
    { label: 'Pacientes', value: patientsList.length, href: '/patients', icon: Users },
    { label: 'Con plan', value: patientsWithPlan.size, href: '/patients?filter=with_plan', icon: ClipboardList },
    { label: 'Datos incompletos', value: incomplete.length, href: '/patients?filter=incomplete', icon: AlertTriangle, warn: true },
    { label: 'Sin plan', value: noPlan.length, href: '/patients?filter=no_plan', icon: FilePlus },
  ];

  // Pendientes accionables (datos reales)
  const pendientes = [
    ...incomplete.slice(0, 4).map((p) => ({ id: p.id, name: p.full_name, reason: 'Antropometría incompleta', variant: 'warn' as const, href: `/patients/${p.id}/edit` })),
    ...noPlan.filter((p) => isAnthropometryComplete(p as never)).slice(0, 4).map((p) => ({ id: p.id, name: p.full_name, reason: 'Sin plan armado', variant: 'neutral' as const, href: `/patients/${p.id}` })),
  ].slice(0, 6);

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display font-semibold" style={{ fontSize: 28, letterSpacing: '-.015em', color: 'var(--ink)' }}>
          Hola{greetingName ? `, ${greetingName}` : ''}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
          {patientsList.length === 0
            ? 'Empieza registrando a tu primer paciente.'
            : `Tienes ${patientsList.length} ${patientsList.length === 1 ? 'paciente' : 'pacientes'}${incomplete.length > 0 ? ` · ${incomplete.length} requieren completar datos` : ''}.`}
        </p>
      </header>

      {/* Banda de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-[10px] border p-4 transition-shadow hover:shadow-md" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase" style={{ letterSpacing: '.06em', color: 'var(--ink-faint)' }}>{s.label}</span>
              <s.icon size={15} style={{ color: 'var(--ink-faint)' }} />
            </div>
            <div className="mono font-semibold leading-none" style={{ fontSize: 28, color: s.warn && s.value > 0 ? 'var(--c-low)' : 'var(--accent)' }}>
              {fmtNum(s.value)}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pendientes */}
        <section>
          <h2 className="font-display font-medium mb-3" style={{ fontSize: 18, color: 'var(--ink)' }}>Pendientes</h2>
          {pendientes.length > 0 ? (
            <Card className="overflow-hidden">
              {pendientes.map((p, i) => (
                <Link key={p.id + p.reason} href={p.href} className="flex items-center gap-3 px-4 py-3 row-hover" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--rule)', color: 'inherit' }}>
                  <Avatar name={p.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{p.name}</p>
                  </div>
                  <Badge variant={p.variant} dot={p.variant === 'warn'}>{p.reason}</Badge>
                  <ChevronRight size={15} style={{ color: 'var(--ink-faint)' }} />
                </Link>
              ))}
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Sin pendientes. Todo al día. ✓</p>
            </Card>
          )}
        </section>

        {/* Planes recientes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-medium" style={{ fontSize: 18, color: 'var(--ink)' }}>Planes recientes</h2>
            <Link href="/patients/new" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> Nuevo paciente
            </Link>
          </div>
          {recentPlans.length > 0 ? (
            <Card className="overflow-hidden">
              {recentPlans.map((plan, idx) => {
                const href = plan.patients?.id ? `/patients/${plan.patients.id}/plans/${plan.id}` : '#';
                return (
                  <Link key={plan.id} href={href} className="flex items-center gap-3 px-4 py-3 row-hover" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--rule)', color: 'inherit' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{plan.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{plan.patients?.full_name ?? 'Sin paciente'}</p>
                    </div>
                    <span className="mono text-xs shrink-0" style={{ color: 'var(--ink-faint)' }}>{plan.plan_date}</span>
                    <ChevronRight size={15} style={{ color: 'var(--ink-faint)' }} />
                  </Link>
                );
              })}
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <UserPlus size={26} className="mx-auto mb-2" style={{ color: 'var(--ink-faint)' }} />
              <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>Aún no hay planes creados.</p>
              <Link href="/patients" className="text-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>Ir a Pacientes →</Link>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
