import { login } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--accent)' }}>
            NutriCalc
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            Calculadora Nutricional Clínica
          </p>
        </div>

        <div className="rounded-lg border p-8" style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}>
          <form action={login} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1"
                style={{
                  background: 'var(--paper)',
                  borderColor: 'var(--rule)',
                  color: 'var(--ink)',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1"
                style={{
                  background: 'var(--paper)',
                  borderColor: 'var(--rule)',
                  color: 'var(--ink)',
                }}
              />
            </div>

            <ErrorMessage searchParams={searchParams} />

            <button
              type="submit"
              className="w-full py-2 px-4 rounded text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--paper)' }}
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

async function ErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  if (!params.error) return null;
  return (
    <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>
      {params.error}
    </p>
  );
}
