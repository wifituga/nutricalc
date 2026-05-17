import PatientForm from '@/components/ui/PatientForm';

export default function NewPatientPage() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--ink)' }}>
        Nuevo paciente
      </h1>
      <PatientForm />
    </div>
  );
}
