'use client';

import { ReactNode } from 'react';
import { ageInYears } from '@/lib/calculations/age';
import { imcSaludable, pesoSaludable } from '@/lib/calculations/healthyWeight';

export function FormCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="bg-white border rounded-lg p-5 space-y-4"
      style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
    >
      <header>
        <h2 className="font-display text-base font-medium" style={{ color: 'var(--ink)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
        )}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function FormRow({ children, cols = 1 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const gridCols = cols === 2 ? 'grid-cols-1 sm:grid-cols-2'
                  : cols === 3 ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1';
  return <div className={`grid ${gridCols} gap-4`}>{children}</div>;
}

export function Field({ label, hint, suffix, required, children }: {
  label: string;
  hint?: string;
  suffix?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm" style={{ color: 'var(--ink)' }}>
          {label}
          {required && <span className="ml-0.5" style={{ color: 'var(--accent)' }}>*</span>}
        </span>
        {suffix && (
          <span className="text-xs font-mono" style={{ color: 'var(--ink-soft)' }}>{suffix}</span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-xs mt-1 italic" style={{ color: 'var(--ink-soft)' }}>{hint}</p>
      )}
    </label>
  );
}

export function RadioPill({ checked, onClick, label }: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 px-4 py-2 text-sm rounded-md border transition-colors"
      style={
        checked
          ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }
          : { background: 'white', color: 'var(--ink-soft)', borderColor: 'var(--rule)' }
      }
    >
      {label}
    </button>
  );
}

export function CheckboxRow({ checked, onChange, label, hint }: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded"
        style={{ accentColor: 'var(--accent)' }}
      />
      <div className="flex-1">
        <span className="text-sm" style={{ color: 'var(--ink)' }}>{label}</span>
        {hint && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{hint}</p>
        )}
      </div>
    </label>
  );
}

export function NumberInput({
  value, onChange, min, max, step, placeholder, required,
}: {
  value?: number | null;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type="number"
      required={required}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : parseFloat(v));
      }}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onFocus={(e) => e.currentTarget.select()}
      className="w-full px-3 py-2 rounded-md border text-sm font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      style={{ background: 'white', borderColor: 'var(--rule)', color: 'var(--ink)' }}
    />
  );
}

export function InfoCard({ variant = 'info', children }: {
  variant?: 'info' | 'warn';
  children: ReactNode;
}) {
  return (
    <div
      className="border rounded-md px-4 py-3 text-sm"
      style={{
        background: variant === 'warn' ? '#fdf6e3' : 'var(--paper-warm)',
        borderColor: variant === 'warn' ? 'var(--warn)' : 'var(--rule)',
        color: 'var(--ink)',
      }}
    >
      {children}
    </div>
  );
}

export function classifyIMC(imc: number): string {
  if (imc < 18.5) return 'bajo peso';
  if (imc < 25) return 'normal';
  if (imc < 30) return 'sobrepeso';
  return 'obesidad';
}

export function LiveAnthropometryBlock({
  birthDate, heightCm, weightKg, weightPregestKg, isPregnancy,
}: {
  birthDate?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  weightPregestKg?: number | null;
  isPregnancy: boolean;
}) {
  if (!birthDate || !heightCm || !weightKg) return null;
  const ageY = ageInYears(new Date(birthDate));
  const heightM = heightCm / 100;
  const refWeight = isPregnancy && weightPregestKg ? weightPregestKg : weightKg;

  const imc = refWeight / (heightM * heightM);
  const imcSal = imcSaludable(ageY);
  const pesoSal = pesoSaludable(heightM, ageY);
  const weightToUse = imc > imcSal ? pesoSal : refWeight;

  return (
    <div
      className="mt-1 p-3 border rounded-md text-sm"
      style={{ background: 'var(--paper)', borderColor: 'var(--rule)' }}
    >
      <div className="grid grid-cols-3 gap-4">
        <Metric label={isPregnancy ? 'IMC pregestacional' : 'IMC actual'}
          value={imc.toFixed(1)} hint={classifyIMC(imc)} />
        <Metric label="Peso saludable"
          value={`${pesoSal.toFixed(1)} kg`} hint={`IMC ${imcSal}`} />
        <Metric label="Peso usado en cálculos"
          value={`${weightToUse.toFixed(1)} kg`}
          hint={imc > imcSal ? 'saludable' : 'actual'} />
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div className="font-mono text-base" style={{ color: 'var(--ink)' }}>
        {value}
        <span className="text-xs ml-1.5" style={{ color: 'var(--ink-soft)' }}>{hint}</span>
      </div>
    </div>
  );
}

export const btnPrimary =
  'px-5 py-2.5 rounded-md text-sm font-medium transition-colors';
export const btnSecondary =
  'px-5 py-2.5 border rounded-md text-sm transition-colors';
export const inputClass =
  'w-full px-3 py-2 rounded-md border text-sm focus:outline-none';
