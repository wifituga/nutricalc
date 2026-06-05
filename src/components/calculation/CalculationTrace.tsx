'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';

type TraceResult = {
  patient_id: string;
  trace: Record<string, { label: string; data: Record<string, unknown> }>;
  sources: Record<string, string>;
};

function humanizeKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toString() : (Math.round(v * 100) / 100).toString();
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(vacío)';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function CalculationTrace({ result }: { result: TraceResult }) {
  const steps = Object.entries(result.trace);

  return (
    <div className="mx-auto px-2 sm:px-0 space-y-6" style={{ maxWidth: 780 }}>
      <Link href={`/patients/${result.patient_id}`} className="text-[12.5px] inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--ink-soft)' }}>
        <ArrowLeft size={13} /> Volver al paciente
      </Link>

      <header>
        <h1 className="font-display font-semibold mb-1" style={{ fontSize: 30, letterSpacing: '-.015em', color: 'var(--ink)' }}>
          Cálculo paso a paso
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Memoria auditable del requerimiento energético: cada paso muestra sus variables y su resultado. Lo aplicado es exactamente lo auditado.
        </p>
      </header>

      {/* Timeline de pasos */}
      <ol className="relative space-y-4 pl-7">
        <span className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: 'var(--rule)' }} aria-hidden />
        {steps.map(([key, step], idx) => (
          <li key={key} className="relative">
            <span
              className="absolute -left-7 grid place-items-center mono font-semibold text-white rounded-full"
              style={{ width: 23, height: 23, top: 2, background: 'var(--accent)', fontSize: 11 }}
            >
              {idx + 1}
            </span>
            <section className="rounded-[10px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}>
              <header className="px-5 py-2.5 border-b" style={{ borderColor: 'var(--rule)', background: 'var(--surface-sunk)' }}>
                <h2 className="font-semibold" style={{ fontSize: 14, color: 'var(--ink)' }}>{step.label}</h2>
              </header>
              <dl>
                {Object.entries(step.data).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--rule)' }}>
                    <dt style={{ color: 'var(--ink-soft)' }}>{humanizeKey(k)}</dt>
                    <dd className="mono font-semibold" style={{ color: 'var(--ink)' }}>{formatValue(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </li>
        ))}
      </ol>

      {/* Fuentes como badges */}
      <footer className="pt-5 border-t" style={{ borderColor: 'var(--rule)' }}>
        <p className="text-[11px] font-semibold uppercase mb-2.5" style={{ letterSpacing: '.08em', color: 'var(--ink-faint)' }}>Fuentes</p>
        <div className="flex flex-wrap gap-2">
          {result.sources.energia && <Badge variant="brand">Energía · {result.sources.energia}</Badge>}
          {result.sources.dris && <Badge variant="brand">DRIs · {result.sources.dris}</Badge>}
          {result.sources.overrides && <Badge variant="brand">Overrides · {result.sources.overrides}</Badge>}
        </div>
        <p className="text-[11.5px] mt-3 italic" style={{ color: 'var(--ink-faint)' }}>
          El ajuste clínico final es juicio profesional del nutricionista colegiado, no una fórmula automática.
        </p>
      </footer>
    </div>
  );
}
