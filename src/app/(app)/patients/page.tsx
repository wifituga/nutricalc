import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Search, ChevronRight, UserPlus } from 'lucide-react';
import type { Patient } from '@/lib/types';
import {
  fmtNum, quickVCT, ageOf, isAnthropometryComplete, patientBadges,
} from '@/lib/patientDisplay';
import { Badge, Avatar, EmptyState, Btn } from '@/components/ui/primitives';

type FilterKey = 'all' | 'with_plan' | 'incomplete' | 'no_plan';

const FILTERS: { key: FilterKey; label: string; warn?: boolean }[] = [
  { key: 'all', label: 'Pacientes activos' },
  { key: 'with_plan', label: 'Con plan' },
  { key: 'incomplete', label: 'Datos incompletos', warn: true },
  { key: 'no_plan', label: 'Sin plan' },
];

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q, filter } = await searchParams;
  const activeFilter = (FILTERS.some((f) => f.key === filter) ? filter : 'all') as FilterKey;
  const supabase = await createClient();

  let query = supabase
    .from('patients')
    .select(
      'id, full_name, document_id, comorbidities, birth_date, sex, height_cm, weight_kg, weight_pregest_kg, residence_area, lifestyle, physiological_state, is_athlete, created_at, updated_at',
    )
    .order('full_name');

  const term = q?.trim();
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,document_id.ilike.%${term}%`);
  }

  const [{ data: rawPatients }, { data: plans }] = await Promise.all([
    query,
    supabase.from('meal_plans').select('patient_id, plan_date').order('plan_date', { ascending: false }),
  ]);

  // Último plan por paciente
  const lastPlan = new Map<string, string>();
  for (const pl of plans ?? []) {
    if (pl.patient_id && !lastPlan.has(pl.patient_id)) lastPlan.set(pl.patient_id, pl.plan_date);
  }

  type Row = Partial<Patient> & { _vct: number | null; _age: number | null; _complete: boolean; _lastPlan: string | null };
  const rows: Row[] = (rawPatients ?? []).map((p) => ({
    ...(p as Partial<Patient>),
    _vct: quickVCT(p as never),
    _age: ageOf((p as Partial<Patient>).birth_date ?? null),
    _complete: isAnthropometryComplete(p as never),
    _lastPlan: lastPlan.get((p as Partial<Patient>).id as string) ?? null,
  }));

  // Conteos (sobre el conjunto buscado)
  const counts = {
    all: rows.length,
    with_plan: rows.filter((r) => r._lastPlan).length,
    incomplete: rows.filter((r) => !r._complete).length,
    no_plan: rows.filter((r) => !r._lastPlan).length,
  };

  const filtered = rows.filter((r) => {
    if (activeFilter === 'with_plan') return !!r._lastPlan;
    if (activeFilter === 'no_plan') return !r._lastPlan;
    if (activeFilter === 'incomplete') return !r._complete;
    return true;
  });

  const qs = (next: Partial<{ q: string; filter: FilterKey }>) => {
    const sp = new URLSearchParams();
    if (next.q ?? term) sp.set('q', (next.q ?? term) as string);
    const f = next.filter ?? activeFilter;
    if (f && f !== 'all') sp.set('filter', f);
    const s = sp.toString();
    return s ? `/patients?${s}` : '/patients';
  };

  return (
    <div className="max-w-6xl">
      {/* Encabezado */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: 28, letterSpacing: '-.015em', color: 'var(--ink)' }}>
            Pacientes
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {counts.all === 0 ? 'Aún no hay pacientes' : `${counts.all} ${counts.all === 1 ? 'paciente' : 'pacientes'}`}
            {term && ` · resultado para "${term}"`}
          </p>
        </div>
        <Link href="/patients/new" className="self-start sm:self-auto">
          <Btn variant="primary"><Plus size={15} /> Nuevo paciente</Btn>
        </Link>
      </header>

      {/* Tira de conteos = filtros */}
      <div className="flex gap-2.5 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const sel = f.key === activeFilter;
          const n = counts[f.key];
          return (
            <Link
              key={f.key}
              href={qs({ filter: f.key })}
              className="flex-1 min-w-[140px] rounded-[7px] border transition-colors"
              style={{
                background: sel ? 'var(--accent-soft)' : 'var(--surface)',
                borderColor: sel ? '#dcc6ad' : 'var(--rule)',
                boxShadow: 'var(--shadow-card)',
                padding: '13px 16px',
              }}
            >
              <div className="mono font-semibold leading-none" style={{ fontSize: 24, color: f.warn && n > 0 ? 'var(--c-low)' : 'var(--ink)' }}>
                {fmtNum(n)}
              </div>
              <div className="text-[11.5px] mt-1.5" style={{ color: 'var(--ink-soft)' }}>{f.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Buscador */}
      <form method="GET" className="flex items-center gap-2.5 mb-4">
        {activeFilter !== 'all' && <input type="hidden" name="filter" value={activeFilter} />}
        <div
          className="flex-1 flex items-center gap-2.5 rounded-[7px] border"
          style={{ background: 'var(--surface)', borderColor: 'var(--rule-strong)', padding: '9px 14px' }}
        >
          <Search size={15} style={{ color: 'var(--ink-faint)' }} />
          <input
            name="q"
            defaultValue={term}
            placeholder="Buscar por nombre o DNI…"
            className="flex-1 bg-transparent text-[13.5px] focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
          <span className="mono text-[11px] shrink-0" style={{ color: filtered.length === 0 && term ? 'var(--c-low)' : 'var(--ink-faint)' }}>
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
      </form>

      {filtered.length > 0 ? (
        <>
          {/* TABLA — desktop */}
          <div
            className="hidden md:block rounded-[10px] border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
          >
            <div
              className="grid items-center"
              style={{ gridTemplateColumns: '2.4fr 1fr 2fr 1.4fr 0.7fr 36px', gap: 14, padding: '11px 18px', background: 'var(--surface-sunk)', borderBottom: '1px solid var(--rule)' }}
            >
              {['Paciente', 'Edad / sexo', 'Comorbilidades', 'Último plan'].map((h) => (
                <span key={h} className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '.07em', color: 'var(--ink-faint)' }}>{h}</span>
              ))}
              <span className="text-[10px] font-semibold uppercase text-right" style={{ letterSpacing: '.07em', color: 'var(--ink-faint)' }}>VCT</span>
              <span />
            </div>

            {filtered.map((p, idx) => {
              const badges = patientBadges(p as never);
              return (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}`}
                  className="grid items-center row-hover"
                  style={{ gridTemplateColumns: '2.4fr 1fr 2fr 1.4fr 0.7fr 36px', gap: 14, padding: '13px 18px', borderTop: idx === 0 ? 'none' : '1px solid var(--rule)', color: 'inherit' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.full_name ?? '·'} />
                    <div className="min-w-0">
                      <div className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--ink)' }}>{p.full_name}</div>
                      <div className="mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>DNI {p.document_id ?? '—'}</div>
                    </div>
                  </div>
                  <div className="mono text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
                    {p._age != null ? `${p.sex === 'F' ? '♀' : p.sex === 'M' ? '♂' : ''} ${p._age} a` : '—'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!p._complete && <Badge variant="warn" dot>Datos incompletos</Badge>}
                    {badges.slice(0, 3).map((b, i) => <Badge key={i} variant={b.variant} dot={b.dot}>{b.label}</Badge>)}
                    {badges.length > 3 && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>+{badges.length - 3}</span>}
                    {p._complete && badges.length === 0 && <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>—</span>}
                  </div>
                  <div className="mono text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
                    {p._lastPlan ?? '—'}
                    <span className="block text-[10px]" style={{ color: 'var(--ink-faint)' }}>{p._lastPlan ? 'plan vigente' : 'sin plan'}</span>
                  </div>
                  <div className="mono text-right font-semibold text-[13.5px]" style={{ color: p._vct == null ? 'var(--c-null)' : 'var(--ink)' }}>
                    {p._vct == null ? '—' : fmtNum(p._vct)}
                  </div>
                  <ChevronRight size={16} className="justify-self-end" style={{ color: 'var(--ink-faint)' }} />
                </Link>
              );
            })}
          </div>

          {/* CARDS — móvil */}
          <div className="md:hidden flex flex-col gap-2.5">
            {filtered.map((p) => {
              const badges = patientBadges(p as never);
              return (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}`}
                  className="rounded-[7px] border block"
                  style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)', padding: 13, color: 'inherit' }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={p.full_name ?? '·'} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--ink)' }}>{p.full_name}</div>
                      <div className="mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                        {p.sex === 'F' ? '♀' : p.sex === 'M' ? '♂' : ''} {p._age != null ? `${p._age} a · ` : ''}DNI {p.document_id ?? '—'}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--ink-faint)' }} />
                  </div>
                  {(badges.length > 0 || !p._complete) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {!p._complete && <Badge variant="warn" dot>Datos incompletos</Badge>}
                      {badges.slice(0, 3).map((b, i) => <Badge key={i} variant={b.variant} dot={b.dot}>{b.label}</Badge>)}
                    </div>
                  )}
                  <div className="flex justify-between mt-2.5 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>
                    <span>Último plan {p._lastPlan ?? '—'}</span>
                    <span className="mono font-semibold" style={{ color: p._vct == null ? 'var(--c-null)' : 'var(--ink)' }}>
                      {p._vct == null ? 'sin VCT' : `VCT ${fmtNum(p._vct)}`} · {p._lastPlan ? 'vigente' : 'sin plan'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="text-[12.5px] mt-3" style={{ color: 'var(--ink-soft)' }}>
            Mostrando <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> de {counts.all} pacientes
          </p>
        </>
      ) : counts.all === 0 && !term ? (
        <EmptyState
          icon={<UserPlus size={28} />}
          title="Aún no tienes pacientes"
          description="Registra a tu primer paciente con su antropometría y NutriCalc calculará el requerimiento energético automáticamente."
          action={<Link href="/patients/new"><Btn variant="primary"><Plus size={15} /> Registrar paciente</Btn></Link>}
        />
      ) : (
        <EmptyState
          icon={<Search size={26} />}
          title={term ? `Sin coincidencias para "${term}"` : 'Sin pacientes en este filtro'}
          description={term ? 'Revisa el nombre o el DNI.' : 'Prueba con otro filtro.'}
          action={
            <Link href="/patients" className="text-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Limpiar búsqueda y filtros
            </Link>
          }
        />
      )}
    </div>
  );
}
