import { login } from './actions';
import { ShieldCheck } from 'lucide-react';
import PasswordField from './PasswordField';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ background: 'var(--paper)' }}>
      {/* Panel editorial izquierdo */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #5b3a1f 0%, #6b4423 55%, #7a5230 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center font-display font-semibold" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,.15)', fontSize: 18 }}>N</span>
          <span className="font-semibold" style={{ fontSize: 16 }}>NutriCalc</span>
        </div>

        <div>
          <h1 className="font-display font-semibold leading-tight" style={{ fontSize: 40, letterSpacing: '-.02em' }}>
            Planificación nutricional clínica, con rigor peruano.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,.85)' }}>
            Requerimientos personalizados, base TPCA del INS/CENAN y medidas caseras peruanas.
          </p>
        </div>

        <ul className="space-y-2.5 text-[13px]" style={{ color: 'rgba(255,255,255,.9)' }}>
          {['TPCA · INS/CENAN Perú', 'FAO/OMS 2004 + DRIs IOM/NASEM', 'Datos protegidos · Ley N.° 29733'].map((s) => (
            <li key={s} className="flex items-center gap-2.5">
              <span className="rounded-full" style={{ width: 5, height: 5, background: 'rgba(255,255,255,.7)' }} />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Formulario derecho */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--accent)' }}>NutriCalc</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Calculadora Nutricional Clínica</p>
          </div>

          <h2 className="font-display font-semibold mb-1" style={{ fontSize: 24, color: 'var(--ink)' }}>Bienvenida</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>Ingresa con tu cuenta de la clínica.</p>

          <form action={login} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Correo electrónico</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-[7px] border text-sm focus:outline-none"
                style={{ background: 'var(--surface)', borderColor: 'var(--rule-strong)', color: 'var(--ink)', padding: '10px 12px' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Contraseña</label>
              <PasswordField />
            </div>

            <ErrorMessage searchParams={searchParams} />

            <button
              type="submit"
              className="w-full rounded-[7px] text-sm font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--paper)', padding: '11px 16px' }}
            >
              Ingresar
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-6 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
            <ShieldCheck size={13} /> Conexión segura · Ley N.° 29733
          </div>
        </div>
      </div>
    </div>
  );
}

async function ErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  if (!params.error) return null;
  return (
    <div className="rounded-[7px] border px-3 py-2.5 text-[13px]" style={{ background: 'var(--c-def-bg)', borderColor: '#e8c3ba', color: 'var(--c-def)' }}>
      {params.error}
      <p className="text-[11px] mt-1" style={{ color: '#7e2c1c' }}>Tras 5 intentos fallidos la cuenta se bloquea temporalmente.</p>
    </div>
  );
}
