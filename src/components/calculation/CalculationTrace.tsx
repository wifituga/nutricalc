'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type TraceResult = {
  patient_id: string;
  trace: Record<string, { label: string; data: Record<string, unknown> }>;
  sources: Record<string, string>;
};

function formatKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(vacío)';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function CalculationTrace({ result }: { result: TraceResult }) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Link
        href={`/patients/${result.patient_id}`}
        className="text-xs inline-flex items-center gap-1 mb-2 hover:underline"
        style={{ color: 'var(--ink-soft)' }}
      >
        <ArrowLeft size={12} /> Volver al paciente
      </Link>

      <header>
        <h1 className="font-display text-2xl font-medium mb-1" style={{ color: 'var(--ink)' }}>
          Cálculo paso a paso
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Desglose completo del cálculo de requerimientos para este paciente.
        </p>
      </header>

      <div className="space-y-3">
        {Object.entries(result.trace).map(([key, step], idx) => (
          <section
            key={key}
            className="bg-white border rounded-lg p-4"
            style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
          >
            <header className="flex items-baseline gap-2 mb-3">
              <span className="font-mono text-sm" style={{ color: 'var(--accent)' }}>{idx + 1}.</span>
              <h2 className="font-display text-base font-medium" style={{ color: 'var(--ink)' }}>
                {step.label}
              </h2>
            </header>
            <div className="font-mono text-xs space-y-1 pl-6">
              {Object.entries(step.data).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="min-w-[160px]" style={{ color: 'var(--ink-soft)' }}>
                    {formatKey(k)}:
                  </span>
                  <span style={{ color: 'var(--ink)' }}>{formatValue(v)}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer
        className="pt-6 border-t text-xs space-y-1"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
      >
        <p><strong>Fuentes:</strong></p>
        <p>Energía: {result.sources.energia}</p>
        <p>DRIs: {result.sources.dris}</p>
        <p>Overrides clínicos: {result.sources.overrides}</p>
      </footer>
    </div>
  );
}
