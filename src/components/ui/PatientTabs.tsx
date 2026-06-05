'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import NewPlanButton from './NewPlanButton';
import DeletePatientButton from './DeletePatientButton';
import { Badge, type BadgeVariant } from './primitives';
import { fmtNum } from '@/lib/patientDisplay';

export type TabDef = { key: string; label: string; count?: number; node: ReactNode };
export type HeaderBadge = { label: string; variant: BadgeVariant; dot?: boolean };

export default function PatientTabs({
  patientId,
  name,
  metaLine,
  badges,
  vct,
  blocked,
  blockedReason,
  tabs,
}: {
  patientId: string;
  name: string;
  metaLine: string;
  badges: HeaderBadge[];
  vct: number | null;
  blocked: boolean;
  blockedReason?: string;
  tabs: TabDef[];
}) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Atajos de teclado: 1–5 saltan, ←/→ ciclan
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key >= '1' && e.key <= String(Math.min(tabs.length, 9))) {
        setActive(Number(e.key) - 1);
      } else if (e.key === 'ArrowRight') {
        setActive((a) => (a + 1) % tabs.length);
      } else if (e.key === 'ArrowLeft') {
        setActive((a) => (a - 1 + tabs.length) % tabs.length);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs.length]);

  return (
    <div>
      {/* Header sticky de identidad */}
      <header
        className="sticky top-12 md:top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
      >
        <Link href="/patients" className="inline-flex items-center gap-1.5 text-[12.5px] pt-3 hover:underline" style={{ color: 'var(--ink-soft)' }}>
          <ArrowLeft size={13} /> Pacientes
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4 pt-2 pb-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-semibold leading-tight break-words" style={{ fontSize: 27, letterSpacing: '-.015em', color: 'var(--ink)' }}>
              {name}
            </h1>
            <div className="flex items-center flex-wrap gap-2.5 mt-1.5">
              <span className="mono text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>{metaLine}</span>
              {badges.map((b, i) => <Badge key={i} variant={b.variant} dot={b.dot}>{b.label}</Badge>)}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '.1em', color: 'var(--ink-faint)' }}>VCT objetivo</div>
              <div className="mono font-semibold leading-none mt-0.5" style={{ fontSize: 24, color: blocked ? 'var(--c-null)' : 'var(--ink)' }}>
                {blocked || vct == null ? '—' : fmtNum(vct)}
                <span className="text-[12px] font-medium ml-1" style={{ color: 'var(--ink-faint)' }}>kcal</span>
              </div>
            </div>
            <NewPlanButton patientId={patientId} label="Armar plan" disabled={blocked} blockedReason={blockedReason} />
          </div>
        </div>

        {/* Acciones secundarias */}
        <div className="flex items-center gap-3 pb-2 -mt-1">
          <Link href={`/patients/${patientId}/edit`} className="inline-flex items-center gap-1.5 text-[12.5px] hover:underline" style={{ color: 'var(--ink-soft)' }}>
            <Pencil size={12} /> Editar
          </Link>
          <DeletePatientButton patientId={patientId} />
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Secciones del paciente" className="flex gap-0.5 overflow-x-auto border-t" style={{ borderColor: 'var(--rule)' }}>
          {tabs.map((t, i) => {
            const on = i === active;
            return (
              <button
                key={t.key}
                ref={(el) => { tabRefs.current[i] = el; }}
                role="tab"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                className="relative flex items-center gap-2 font-semibold whitespace-nowrap"
                style={{ fontSize: 13.5, padding: '12px 14px', background: 'none', border: 'none', color: on ? 'var(--accent-deep)' : 'var(--ink-faint)' }}
              >
                {t.label}
                {t.count != null && (
                  <span className="mono rounded-full" style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', background: on ? 'var(--accent-soft)' : 'var(--surface-sunk)', color: on ? 'var(--accent-deep)' : 'var(--ink-soft)' }}>
                    {t.count}
                  </span>
                )}
                {on && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-t" style={{ background: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      </header>

      {/* Panel activo */}
      <div role="tabpanel" className="pt-5 nc-tabfade" key={active}>
        {tabs[active]?.node}
      </div>
    </div>
  );
}
