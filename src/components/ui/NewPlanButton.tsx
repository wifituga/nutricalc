'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function NewPlanButton({
  patientId,
  label = 'Nuevo plan',
  disabled = false,
  blockedReason,
}: {
  patientId: string;
  label?: string;
  disabled?: boolean;
  blockedReason?: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    setCreating(true);
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, name: `Plan ${today}`, plan_date: today }),
    });

    if (res.ok) {
      const plan = await res.json();
      router.push(`/patients/${patientId}/plans/${plan.id}`);
    } else {
      setCreating(false);
      alert('Error al crear el plan');
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={creating || disabled}
      title={disabled ? blockedReason : undefined}
      className="inline-flex items-center gap-1.5 rounded-[7px] text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: 'var(--accent)', color: 'var(--paper)', padding: '10px 17px' }}
    >
      <Plus size={15} />
      {creating ? 'Creando...' : label}
    </button>
  );
}
