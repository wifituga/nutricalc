import type { AlertLevel } from '@/lib/types';

const STYLES: Record<AlertLevel, { bg: string; text: string; label: string }> = {
  ok:      { bg: 'rgba(45,106,62,0.12)',  text: 'var(--ok)',      label: 'OK' },
  warn:    { bg: 'rgba(184,130,0,0.12)',  text: 'var(--warn)',    label: 'Atención' },
  alert:   { bg: 'rgba(168,52,28,0.12)', text: 'var(--danger)',  label: 'Excede' },
  neutral: { bg: 'transparent',           text: 'var(--ink-soft)', label: '' },
};

export default function AlertBadge({ level }: { level: AlertLevel }) {
  const s = STYLES[level];
  if (level === 'neutral') return null;
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}
