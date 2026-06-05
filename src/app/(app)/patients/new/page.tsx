import PatientForm from '@/components/ui/PatientForm';

export default function NewPatientPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="font-display font-semibold mb-5" style={{ fontSize: 28, letterSpacing: '-.015em', color: 'var(--ink)' }}>
        Nuevo paciente
      </h1>
      <PatientForm />
    </div>
  );
}
