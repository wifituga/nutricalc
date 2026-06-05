import React from 'react';

/* ============================================================
 * NutriCalc — componentes compartidos del sistema de diseño v2
 * Tailwind v4 + CSS vars (estilos inline). Sin librerías nuevas.
 * ============================================================ */

type CSSVars = React.CSSProperties;

/* ---------- Card ---------- */
export function Card({
  children,
  className = '',
  style,
  as: As = 'div',
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSVars;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={`rounded-[10px] border ${className}`}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--rule)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </As>
  );
}

/* ---------- Eyebrow / label ---------- */
export function Eyebrow({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: CSSVars }) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase ${className}`}
      style={{ letterSpacing: '.12em', color: 'var(--ink-faint)', ...style }}
    >
      {children}
    </p>
  );
}

/* ---------- Badge ---------- */
export type BadgeVariant = 'brand' | 'neutral' | 'ok' | 'warn' | 'danger';

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string; dot: string }> = {
  brand:   { bg: 'var(--accent-soft)',  color: 'var(--accent-deep)', border: '#e0cfba', dot: 'var(--accent)' },
  neutral: { bg: 'var(--surface-sunk)', color: 'var(--ink-soft)',    border: 'var(--rule)', dot: 'var(--ink-faint)' },
  ok:      { bg: 'var(--c-ok-bg)',      color: 'var(--c-ok)',        border: '#bcd8c2', dot: 'var(--c-ok)' },
  warn:    { bg: 'var(--c-low-bg)',     color: 'var(--c-low)',       border: '#e6d3a0', dot: 'var(--c-low)' },
  danger:  { bg: 'var(--c-def-bg)',     color: 'var(--c-def)',       border: '#e8c3ba', dot: 'var(--c-def)' },
};

export function Badge({
  variant = 'neutral',
  dot = false,
  children,
  className = '',
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const s = BADGE_STYLES[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border leading-tight ${className}`}
      style={{ padding: '4px 11px', background: s.bg, color: s.color, borderColor: s.border }}
    >
      {dot && <span className="rounded-full" style={{ width: 6, height: 6, background: s.dot }} />}
      {children}
    </span>
  );
}

/* ---------- Level (semáforo 5 niveles) ---------- */
export type LevelKey = 'def' | 'low' | 'ok' | 'high' | 'exc' | 'null';

const LEVEL_META: Record<LevelKey, { icon: string; label: string; color: string; bg: string }> = {
  def:  { icon: '▼▼', label: 'Deficiente', color: 'var(--c-def)',  bg: 'var(--c-def-bg)' },
  low:  { icon: '▼',  label: 'Bajo',       color: 'var(--c-low)',  bg: 'var(--c-low-bg)' },
  ok:   { icon: '✓',  label: 'En rango',   color: 'var(--c-ok)',   bg: 'var(--c-ok-bg)' },
  high: { icon: '▲',  label: 'Alto',       color: 'var(--c-high)', bg: 'var(--c-low-bg)' },
  exc:  { icon: '▲▲', label: 'Excesivo',   color: 'var(--c-exc)',  bg: 'var(--c-def-bg)' },
  null: { icon: '—',  label: 'Sin dato',   color: 'var(--c-null)', bg: 'var(--c-null-bg)' },
};

export function levelLabel(level: LevelKey) {
  return LEVEL_META[level].label;
}

export function Level({
  level,
  label,
  compact = false,
  className = '',
}: {
  level: LevelKey;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const m = LEVEL_META[level];
  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold rounded-full ${className}`}
      style={{ fontSize: 12.5, padding: compact ? '3px 9px 3px 7px' : '5px 12px 5px 9px', color: m.color, background: m.bg }}
    >
      <span className="mono text-center" style={{ fontSize: 12, width: 18, letterSpacing: '-1px' }}>
        {m.icon}
      </span>
      {!compact && (label ?? m.label)}
    </span>
  );
}

/* ---------- NullValue / PartialValue ---------- */
export function NullValue({ chip = false }: { chip?: boolean }) {
  if (chip) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full"
        style={{ color: 'var(--c-null)', background: 'var(--c-null-bg)', padding: '2px 8px' }}
      >
        — sin dato
      </span>
    );
  }
  return <span className="mono" style={{ color: 'var(--c-null)' }}>—</span>;
}

export function PartialValue({
  value,
  unit,
  size = 14,
}: {
  value: React.ReactNode;
  unit?: string;
  size?: number;
}) {
  return (
    <span className="mono font-semibold" style={{ color: 'var(--c-low)', fontSize: size }}>
      ≥ {value}
      {unit && <span style={{ fontSize: size * 0.5, color: 'var(--ink-faint)', fontWeight: 500, marginLeft: 3 }}>{unit}</span>}
    </span>
  );
}

/* ---------- DataCell ---------- */
export function DataCell({
  label,
  value,
  unit,
  note,
  isNull = false,
  className = '',
  style,
}: {
  label: string;
  value?: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  isNull?: boolean;
  className?: string;
  style?: CSSVars;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-[7px] border p-3.5 sm:p-4 ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--rule)', ...style }}
    >
      <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.08em', color: 'var(--ink-faint)' }}>
        {label}
      </span>
      {isNull ? (
        <span className="mono font-semibold leading-none" style={{ fontSize: 26, color: 'var(--c-null)' }}>—</span>
      ) : (
        <span className="mono font-semibold leading-none" style={{ fontSize: 26, letterSpacing: '-.01em', color: 'var(--ink)' }}>
          {value}
          {unit && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-faint)', marginLeft: 3 }}>{unit}</span>}
        </span>
      )}
      {note && <span className="text-[11.5px]" style={{ color: isNull ? 'var(--c-null)' : 'var(--ink-soft)' }}>{note}</span>}
    </div>
  );
}

/* ---------- Alert ---------- */
export type AlertVariant = 'conflict' | 'warn' | 'info';

const ALERT_STYLES: Record<AlertVariant, { bg: string; border: string; icon: string; iconBg: string; titleColor: string; bodyColor: string }> = {
  conflict: { bg: 'var(--c-def-bg)',   border: '#e8c3ba', icon: '!', iconBg: 'var(--c-def)', titleColor: 'var(--c-def)',      bodyColor: '#7e2c1c' },
  warn:     { bg: 'var(--c-low-bg)',    border: '#e6d3a0', icon: '!', iconBg: 'var(--c-low)', titleColor: 'var(--c-low)',      bodyColor: '#6a5320' },
  info:     { bg: 'var(--accent-soft)', border: '#e0cfba', icon: 'i', iconBg: 'var(--accent)', titleColor: 'var(--accent-deep)', bodyColor: '#6a4f33' },
};

export function Alert({
  variant = 'info',
  title,
  children,
  actions,
  className = '',
}: {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const s = ALERT_STYLES[variant];
  return (
    <div
      className={`flex gap-3 rounded-[7px] border ${className}`}
      style={{ padding: '15px 17px', background: s.bg, borderColor: s.border }}
    >
      <div
        className="shrink-0 grid place-items-center mono font-bold text-white rounded-full mt-0.5"
        style={{ width: 22, height: 22, fontSize: 13, background: s.iconBg }}
        aria-hidden
      >
        {s.icon}
      </div>
      <div className="min-w-0">
        {title && <div className="font-semibold mb-0.5" style={{ fontSize: 13.5, color: s.titleColor }}>{title}</div>}
        {children && <div style={{ fontSize: 13, lineHeight: 1.55, color: s.bodyColor }}>{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 mt-3">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({
  name,
  size = 36,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className={`inline-grid place-items-center shrink-0 font-display font-semibold rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'var(--accent-soft)',
        color: 'var(--accent-deep)',
        border: '1px solid #e0cfba',
      }}
    >
      {initials || '·'}
    </span>
  );
}

/* ---------- Btn ---------- */
export type BtnVariant = 'primary' | 'ghost' | 'danger';

export function Btn({
  variant = 'ghost',
  children,
  className = '',
  style,
  ...rest
}: {
  variant?: BtnVariant;
  children: React.ReactNode;
  className?: string;
  style?: CSSVars;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-[5px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles: Record<BtnVariant, CSSVars> = {
    primary: { background: 'var(--accent)', color: 'var(--paper)', padding: '8px 14px' },
    ghost:   { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '7px 13px' },
    danger:  { background: 'var(--c-def)', color: '#fff', padding: '8px 14px' },
  };
  return (
    <button className={`${base} ${className}`} style={{ ...styles[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-10 text-center ${className}`}>
      {icon && <div className="mx-auto mb-3" style={{ color: 'var(--ink-faint)' }}>{icon}</div>}
      <p className="font-display font-medium" style={{ fontSize: 17, color: 'var(--ink)' }}>{title}</p>
      {description && <p className="text-sm mt-1.5" style={{ color: 'var(--ink-soft)' }}>{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({
  width = '100%',
  height = 14,
  className = '',
  style,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSVars;
}) {
  return <span className={`block nc-skeleton ${className}`} style={{ width, height, ...style }} aria-hidden />;
}
