import { getAlertConfig, type AlertLevel } from '@/lib/calculations/nutrientTargets';

export default function AlertBadge({ level }: { level: AlertLevel }) {
  const c = getAlertConfig(level);
  return (
    <span
      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
      style={{
        color: c.color,
        borderColor: c.color,
        backgroundColor: `color-mix(in srgb, ${c.color} 8%, transparent)`,
      }}
      title={c.message}
    >
      {c.label}
    </span>
  );
}
