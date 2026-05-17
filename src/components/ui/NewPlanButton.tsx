'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewPlanButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    setCreating(true);
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        name: `Plan ${today}`,
        plan_date: today,
      }),
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
      disabled={creating}
      className="px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50"
      style={{ background: 'var(--accent)', color: 'var(--paper)' }}
    >
      {creating ? 'Creando...' : 'Nuevo plan'}
    </button>
  );
}
