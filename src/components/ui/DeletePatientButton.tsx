'use client';

import { useRouter } from 'next/navigation';

export default function DeletePatientButton({ patientId }: { patientId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('¿Eliminar este paciente y todos sus planes?')) return;

    const res = await fetch(`/api/patients/${patientId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/patients');
      router.refresh();
    } else {
      alert('Error al eliminar');
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="px-3 py-1.5 rounded border text-sm"
      style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
    >
      Eliminar
    </button>
  );
}
