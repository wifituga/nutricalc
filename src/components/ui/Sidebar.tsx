'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';

const NAV = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/patients', label: 'Pacientes' },
];

export default function Sidebar({ userName, clinicName }: { userName: string; clinicName: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 flex flex-col border-r shrink-0"
      style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--rule)' }}>
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--accent)' }}>
          NutriCalc
        </span>
        {clinicName && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-soft)' }}>
            {clinicName}
          </p>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded text-sm transition-colors"
              style={{
                background: active ? 'var(--paper)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-soft)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t text-xs" style={{ borderColor: 'var(--rule)' }}>
        <p className="truncate font-medium" style={{ color: 'var(--ink)' }}>{userName}</p>
        <form action={logout} className="mt-2">
          <button
            type="submit"
            className="text-xs hover:underline"
            style={{ color: 'var(--ink-soft)' }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
