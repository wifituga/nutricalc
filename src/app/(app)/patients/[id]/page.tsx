import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import NewPlanButton from '@/components/ui/NewPlanButton';
import PatientTabs, { type TabDef, type HeaderBadge } from '@/components/ui/PatientTabs';
import { Card, DataCell, Badge, Alert, EmptyState } from '@/components/ui/primitives';
import { ageInYears } from '@/lib/calculations/age';
import { classifyIMC } from '@/lib/calculations/healthyWeight';
import { resolvePatientTargets } from '@/lib/calculations/patientTargets';
import { COMORBIDITY_LABELS } from '@/lib/calculations/clinicalOverrides';
import { patientBadges } from '@/lib/patientDisplay';
import RequirementsDetail from '@/components/plan/RequirementsDetail';
import { ClinicalDisclaimer } from '@/components/ui/ClinicalDisclaimer';
import MeasurementHistory from '@/components/ui/MeasurementHistory';

const AREA_LABELS: Record<string, string> = { urbana: 'Urbana', rural: 'Rural' };
const LIFESTYLE_LABELS: Record<string, string> = { ligero: 'Ligero', no_ligero: 'No ligero' };

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: patient }, { data: plans }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase
      .from('meal_plans')
      .select('id, name, plan_date, notes, calculated_vct')
      .eq('patient_id', id)
      .order('plan_date', { ascending: false }),
  ]);

  if (!patient) notFound();

  const age = patient.birth_date ? ageInYears(new Date(patient.birth_date)) : null;
  const { vct, merged, comorbidities } = await resolvePatientTargets(supabase, patient);
  const imc = patient.height_cm && patient.weight_kg
    ? patient.weight_kg / Math.pow(patient.height_cm / 100, 2)
    : null;
  const conflicts = Object.values(merged).filter((m) => m.conflict);
  const blocked = conflicts.length > 0;
  const planList = plans ?? [];

  // Identidad del header
  const metaParts = [
    age != null ? `${age} a` : null,
    patient.sex ? (patient.sex === 'F' ? '♀ Femenino' : '♂ Masculino') : null,
    patient.document_id ? `DNI ${patient.document_id}` : null,
  ].filter(Boolean);
  const headerBadges: HeaderBadge[] = patientBadges(patient);
  if (blocked) headerBadges.unshift({ label: 'Conflicto clínico', variant: 'danger', dot: true });

  // ---------- Paneles ----------
  const antropometriaCards = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <DataCell label="Talla" value={patient.height_cm ?? undefined} unit="cm" isNull={!patient.height_cm} />
      <DataCell label="Peso actual" value={patient.weight_kg ?? undefined} unit="kg" isNull={!patient.weight_kg} />
      {patient.weight_pregest_kg != null && <DataCell label="Peso pregest." value={patient.weight_pregest_kg} unit="kg" />}
      {imc != null && age != null
        ? <DataCell label="IMC actual" value={imc.toFixed(1)} note={classifyIMC(imc, age).label} />
        : <DataCell label="IMC actual" isNull note="faltan datos" />}
      {vct && <DataCell label="Peso usado" value={vct.weightUsed.toFixed(1)} unit="kg" note={vct.weightSource === 'actual' ? 'actual' : vct.weightSource === 'healthy' ? 'saludable' : 'pregestacional'} />}
      <DataCell label="Área" value={patient.residence_area ? AREA_LABELS[patient.residence_area] : undefined} isNull={!patient.residence_area} />
      <DataCell label="Actividad" value={patient.lifestyle ? LIFESTYLE_LABELS[patient.lifestyle] : undefined} isNull={!patient.lifestyle} />
    </div>
  );

  const energyBlock = vct ? (
    <Card className="p-5">
      <h3 className="font-semibold mb-1" style={{ fontSize: 15, color: 'var(--ink)' }}>Requerimiento energético</h3>
      <p className="text-[12px] mb-3" style={{ color: 'var(--ink-faint)' }}>FAO/OMS 2004 · adaptación CENAN Perú</p>
      <div className="space-y-1.5">
        {vct.tmb > 0 && <EnergyRow label="TMB" value={`${Math.round(vct.tmb)} kcal/día`} />}
        {vct.naf != null && <EnergyRow label="NAF" value={vct.naf.toFixed(2)} />}
        <EnergyRow label="GET" value={`${Math.round(vct.get)} kcal/día`} />
        {vct.encdt > 0 && <EnergyRow label="ENCDT (crecimiento)" value={`+${vct.encdt} kcal/día`} />}
        {vct.adicion > 0 && <EnergyRow label="Adición fisiológica" value={`+${vct.adicion} kcal/día`} />}
        <div className="pt-2 mt-1 border-t" style={{ borderColor: 'var(--rule)' }}>
          <EnergyRow label="VCT" value={`${Math.round(vct.vct)} kcal/día`} highlight />
        </div>
      </div>
      <Link href={`/patients/${id}/calculation`} className="inline-flex items-center gap-1 text-xs mt-3 hover:underline" style={{ color: 'var(--accent)' }}>
        Ver cálculo paso a paso →
      </Link>
    </Card>
  ) : (
    <Card className="p-5">
      <h3 className="font-semibold mb-1" style={{ fontSize: 15, color: 'var(--ink)' }}>Requerimiento energético</h3>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        Complete fecha de nacimiento, sexo, talla, peso, área de residencia y nivel de actividad para calcular el VCT.
      </p>
    </Card>
  );

  const perfilClinico = (comorbidities.length > 0 || blocked) ? (
    <Card className="p-5">
      <h3 className="font-semibold mb-3" style={{ fontSize: 15, color: 'var(--ink)' }}>Perfil clínico activo</h3>
      <div className="flex flex-wrap gap-2">
        {comorbidities.map((c) => <Badge key={c} variant="neutral">{COMORBIDITY_LABELS[c] ?? c}</Badge>)}
      </div>
      {blocked && (
        <div className="mt-3">
          <Alert variant="conflict" title="Conflicto clínico — requiere tu decisión">
            Hay rangos incompatibles entre comorbilidades (revisa la pestaña Requerimientos). El VCT objetivo queda en pausa y “Armar plan” está deshabilitado hasta resolverlo.
          </Alert>
        </div>
      )}
    </Card>
  ) : null;

  const planesPanel = planList.length > 0 ? (
    <div className="space-y-2">
      {planList.map((plan) => (
        <Link key={plan.id} href={`/patients/${id}/plans/${plan.id}`}
          className="flex items-center gap-3 rounded-[10px] border p-4 row-hover"
          style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)', color: 'inherit' }}>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{plan.name}</h3>
            <p className="text-xs mt-0.5 mono" style={{ color: 'var(--ink-soft)' }}>
              {plan.plan_date}{plan.calculated_vct ? ` · ${Math.round(plan.calculated_vct)} kcal` : ''}
            </p>
          </div>
          <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--ink-faint)' }} />
        </Link>
      ))}
    </div>
  ) : (
    <EmptyState title="Sin planes aún" description="Crea el primero con el botón “Armar plan”." />
  );

  // Resumen = vistazo de 5 segundos
  const resumen = (
    <div className="space-y-4">
      {perfilClinico}
      {antropometriaCards}
      {energyBlock}
      {planList.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ fontSize: 15, color: 'var(--ink)' }}>Planes recientes</h3>
            <NewPlanButton patientId={id} label="Nuevo plan" disabled={blocked} blockedReason="Resuelve el conflicto clínico primero" />
          </div>
          <div className="space-y-2">
            {planList.slice(0, 3).map((plan) => (
              <Link key={plan.id} href={`/patients/${id}/plans/${plan.id}`} className="flex items-center gap-3 row-hover rounded-md px-2 py-2 -mx-2" style={{ color: 'inherit' }}>
                <span className="min-w-0 flex-1 text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{plan.name}</span>
                <span className="mono text-xs shrink-0" style={{ color: 'var(--ink-soft)' }}>{plan.plan_date}</span>
                <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />
              </Link>
            ))}
          </div>
        </Card>
      )}
      <ClinicalDisclaimer variant="banner" />
    </div>
  );

  const antroEnergia = (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-3" style={{ fontSize: 15, color: 'var(--ink)' }}>Antropometría</h3>
        {antropometriaCards}
        {patient.notes && <p className="text-sm pt-3 mt-3 border-t" style={{ color: 'var(--ink)', borderColor: 'var(--rule)' }}>{patient.notes}</p>}
      </Card>
      {energyBlock}
    </div>
  );

  const tabs: TabDef[] = [
    { key: 'resumen', label: 'Resumen', node: resumen },
    { key: 'antro', label: 'Antropometría y energía', node: antroEnergia },
    { key: 'reqs', label: 'Requerimientos', node: <RequirementsDetail merged={merged} comorbidities={comorbidities} /> },
    { key: 'planes', label: 'Planes', count: planList.length, node: planesPanel },
    { key: 'hist', label: 'Historial', node: <MeasurementHistory patientId={id} heightCmHint={patient.height_cm} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <PatientTabs
        patientId={id}
        name={patient.full_name}
        metaLine={metaParts.join('  ·  ')}
        badges={headerBadges}
        vct={vct ? Math.round(vct.vct) : null}
        blocked={blocked}
        blockedReason="Resuelve el conflicto clínico entre comorbilidades primero"
        tabs={tabs}
      />
    </div>
  );
}

function EnergyRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={highlight ? 'font-display font-medium' : 'text-sm'} style={{ fontSize: highlight ? 16 : undefined, color: highlight ? 'var(--ink)' : 'var(--ink-soft)' }}>
        {label}
      </span>
      <span className="mono font-semibold" style={{ fontSize: highlight ? 18 : 14, color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}
