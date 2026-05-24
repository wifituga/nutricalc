'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, LineChart } from 'lucide-react';

type Measurement = {
  id: string;
  measured_at: string;
  height_cm: number | null;
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
};

interface Props {
  patientId: string;
  heightCmHint?: number | null;
}

const TODAY = new Date().toISOString().split('T')[0];

export default function MeasurementHistory({ patientId, heightCmHint }: Props) {
  const [items, setItems] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    measured_at: TODAY,
    height_cm: '',
    weight_kg: '',
    waist_cm: '',
    hip_cm: '',
    body_fat_pct: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/measurements`);
    if (res.ok) {
      const json = await res.json();
      setItems(json.data ?? []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [patientId]);

  async function add() {
    setError('');
    const num = (s: string) => s.trim() === '' ? null : Number(s);
    const body = {
      measured_at: form.measured_at,
      height_cm: num(form.height_cm),
      weight_kg: num(form.weight_kg),
      waist_cm: num(form.waist_cm),
      hip_cm: num(form.hip_cm),
      body_fat_pct: num(form.body_fat_pct),
    };
    setSaving(true);
    const res = await fetch(`/api/patients/${patientId}/measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Error al guardar');
      return;
    }
    setForm({ measured_at: TODAY, height_cm: '', weight_kg: '', waist_cm: '', hip_cm: '', body_fat_pct: '' });
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    if (!window.confirm('¿Eliminar medición?')) return;
    await fetch(`/api/patients/${patientId}/measurements/${id}`, { method: 'DELETE' });
    load();
  }

  // simple sparkline for weight if 2+ measurements
  const weightSeries = items
    .filter((m) => m.weight_kg != null)
    .slice()
    .reverse() // chrono
    .map((m) => ({ date: m.measured_at, w: m.weight_kg as number }));

  return (
    <section
      className="bg-white border rounded-lg p-5 space-y-4"
      style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
    >
      <header className="flex items-center justify-between">
        <div>
          <h2
            className="font-display text-base font-medium flex items-center gap-1.5"
            style={{ color: 'var(--ink)' }}
          >
            <LineChart size={15} /> Histórico antropométrico
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Registra cambios de peso y mediciones en el tiempo.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setForm((f) => ({ ...f, height_cm: heightCmHint ? String(heightCmHint) : '' }));
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm bg-white hover:bg-[color:var(--paper-warm)] transition-colors"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            <Plus size={13} /> Nueva medición
          </button>
        )}
      </header>

      {adding && (
        <div
          className="rounded-md border p-3"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-warm)' }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Fecha">
              <input type="date" value={form.measured_at} max={TODAY}
                onChange={(e) => setForm({ ...form, measured_at: e.target.value })}
                className="w-full text-sm px-2 py-1.5 rounded border font-mono"
                style={{ background: 'white', borderColor: 'var(--rule)' }}
              />
            </Field>
            <Field label="Peso (kg)">
              <input type="number" step={0.1} value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                className="w-full text-sm px-2 py-1.5 rounded border font-mono"
                style={{ background: 'white', borderColor: 'var(--rule)' }}
              />
            </Field>
            <Field label="Talla (cm)">
              <input type="number" step={0.5} value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                className="w-full text-sm px-2 py-1.5 rounded border font-mono"
                style={{ background: 'white', borderColor: 'var(--rule)' }}
              />
            </Field>
            <Field label="Cintura (cm)">
              <input type="number" step={0.5} value={form.waist_cm}
                onChange={(e) => setForm({ ...form, waist_cm: e.target.value })}
                className="w-full text-sm px-2 py-1.5 rounded border font-mono"
                style={{ background: 'white', borderColor: 'var(--rule)' }}
              />
            </Field>
            <Field label="Cadera (cm)">
              <input type="number" step={0.5} value={form.hip_cm}
                onChange={(e) => setForm({ ...form, hip_cm: e.target.value })}
                className="w-full text-sm px-2 py-1.5 rounded border font-mono"
                style={{ background: 'white', borderColor: 'var(--rule)' }}
              />
            </Field>
            <Field label="% Grasa corporal">
              <input type="number" step={0.1} value={form.body_fat_pct}
                onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })}
                className="w-full text-sm px-2 py-1.5 rounded border font-mono"
                style={{ background: 'white', borderColor: 'var(--rule)' }}
              />
            </Field>
          </div>
          {error && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setAdding(false); setError(''); }}
              className="px-3 py-1.5 rounded text-sm"
              style={{ color: 'var(--ink-soft)' }}
            >
              Cancelar
            </button>
            <button
              onClick={add}
              disabled={saving}
              className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--paper)' }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {weightSeries.length >= 2 && (
        <WeightSparkline series={weightSeries} />
      )}

      {loading ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--ink-soft)' }}>
          Aún no hay mediciones registradas.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--ink-soft)' }}>
                <th className="text-left text-xs uppercase tracking-wide font-medium py-1">Fecha</th>
                <th className="text-right text-xs uppercase tracking-wide font-medium py-1">Peso</th>
                <th className="text-right text-xs uppercase tracking-wide font-medium py-1">Talla</th>
                <th className="text-right text-xs uppercase tracking-wide font-medium py-1">IMC</th>
                <th className="text-right text-xs uppercase tracking-wide font-medium py-1">Cintura</th>
                <th className="text-right text-xs uppercase tracking-wide font-medium py-1">% Grasa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => {
                const h = m.height_cm ?? heightCmHint ?? null;
                const imc = m.weight_kg != null && h != null
                  ? (m.weight_kg / Math.pow(h / 100, 2)).toFixed(1)
                  : '—';
                return (
                  <tr key={m.id} className="border-t" style={{ borderColor: 'var(--rule)' }}>
                    <td className="py-1.5 font-mono text-xs" style={{ color: 'var(--ink)' }}>
                      {m.measured_at}
                    </td>
                    <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink)' }}>
                      {m.weight_kg != null ? `${m.weight_kg} kg` : '—'}
                    </td>
                    <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>
                      {m.height_cm != null ? `${m.height_cm} cm` : '—'}
                    </td>
                    <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>
                      {imc}
                    </td>
                    <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>
                      {m.waist_cm != null ? `${m.waist_cm} cm` : '—'}
                    </td>
                    <td className="py-1.5 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>
                      {m.body_fat_pct != null ? `${m.body_fat_pct}%` : '—'}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => remove(m.id)}
                        aria-label="Eliminar"
                        className="p-1.5 rounded hover:bg-[color:var(--paper-warm)]"
                        style={{ color: 'var(--ink-soft)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function WeightSparkline({ series }: { series: { date: string; w: number }[] }) {
  const w = 260, h = 50, pad = 4;
  const min = Math.min(...series.map((p) => p.w));
  const max = Math.max(...series.map((p) => p.w));
  const range = max - min || 1;
  const stepX = (w - 2 * pad) / Math.max(series.length - 1, 1);
  const points = series.map((p, i) => {
    const x = pad + stepX * i;
    const y = h - pad - ((p.w - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = series[series.length - 1].w;
  const first = series[0].w;
  const delta = last - first;
  return (
    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
      <svg width={w} height={h} className="shrink-0">
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          points={points}
        />
        {series.map((p, i) => {
          const x = pad + stepX * i;
          const y = h - pad - ((p.w - min) / range) * (h - 2 * pad);
          return <circle key={i} cx={x} cy={y} r={2} fill="var(--accent)" />;
        })}
      </svg>
      <div className="font-mono">
        {min.toFixed(1)}–{max.toFixed(1)} kg
        <span
          className="ml-2"
          style={{ color: delta > 0 ? 'var(--warn)' : delta < 0 ? 'var(--ok)' : 'var(--ink-soft)' }}
        >
          ({delta >= 0 ? '+' : ''}{delta.toFixed(1)} kg)
        </span>
      </div>
    </div>
  );
}
