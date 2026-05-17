import { Info } from 'lucide-react';

export function ClinicalDisclaimer({ variant = 'inline' }: { variant?: 'inline' | 'banner' }) {
  const isBanner = variant === 'banner';
  return (
    <div
      role="note"
      className={
        isBanner
          ? 'flex items-start gap-2.5 px-4 py-3 border rounded-md text-sm'
          : 'flex items-start gap-2 text-xs italic'
      }
      style={
        isBanner
          ? { background: 'var(--paper-warm)', borderColor: 'var(--rule)', color: 'var(--ink-soft)' }
          : { color: 'var(--ink-soft)' }
      }
    >
      <Info size={isBanner ? 16 : 13} className="shrink-0 mt-0.5" />
      <p>
        Esta herramienta provee cálculos basados en TPCA 2023, FAO/OMS 2004 e
        IOM/NASEM DRIs. Los valores son referenciales y deben ser validados por
        un nutricionista colegiado antes de uso clínico. La app no diagnostica
        ni prescribe.
      </p>
    </div>
  );
}
