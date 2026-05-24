'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type TraceResult = {
  patient_id: string;
  trace: Record<string, { label: string; data: Record<string, unknown> }>;
  sources: Record<string, string>;
};

function humanizeKey(k: string): string {
  return k
    .replace(/_/g, ' ')
    .replace(/\bg\b/g, 'g')
    .replace(/\bkg\b/g, 'kg')
    .replace(/\bkcal\b/g, 'kcal')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v.toString();
    return (Math.round(v * 100) / 100).toString();
  }
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(vacío)';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function CalculationTrace({ result }: { result: TraceResult }) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link
        href={`/patients/${result.patient_id}`}
        className="text-xs inline-flex items-center gap-1 hover:underline"
        style={{ color: 'var(--ink-soft)' }}
      >
        <ArrowLeft size={12} /> Volver al paciente
      </Link>

      <header>
        <h1 className="font-display text-3xl font-medium mb-1" style={{ color: 'var(--ink)' }}>
          Cálculo paso a paso
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Desglose completo del cálculo de requerimientos para este paciente.
        </p>
      </header>

      <ol className="space-y-3">
        {Object.entries(result.trace).map(([key, step], idx) => (
          <li key={key}>
            <section
              className="bg-white border rounded-lg overflow-hidden"
              style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
            >
              <header
                className="flex items-center gap-3 px-5 py-3 border-b"
                style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
              >
                <span
                  className="font-mono text-xs flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                  style={{ background: 'var(--accent)', color: 'var(--paper)' }}
                >
                  {idx + 1}
                </span>
                <h2 className="font-display text-base font-medium" style={{ color: 'var(--ink)' }}>
                  {step.label}
                </h2>
              </header>
              <dl className="divide-y" style={{ borderColor: 'var(--rule)' }}>
                {Object.entries(step.data).map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2 text-sm"
                  >
                    <dt style={{ color: 'var(--ink-soft)' }}>{humanizeKey(k)}</dt>
                    <dd className="font-mono" style={{ color: 'var(--ink)' }}>
                      {formatValue(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </li>
        ))}
      </ol>

      <footer
        className="pt-6 border-t text-xs space-y-1"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
      >
        <p className="font-medium" style={{ color: 'var(--ink)' }}>Fuentes</p>
        <p>Energía: {result.sources.energia}</p>
        <p>DRIs: {result.sources.dris}</p>
        <p>Overrides clínicos: {result.sources.overrides}</p>
      </footer>
    </div>
  );
}
