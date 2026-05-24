'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users } from 'lucide-react';
import { logout } from '@/app/login/actions';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/patients', label: 'Pacientes', icon: Users },
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
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors"
              style={{
                background: active ? 'var(--paper)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-soft)',
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t text-xs space-y-2" style={{ borderColor: 'var(--rule)' }}>
        <p className="truncate font-medium" style={{ color: 'var(--ink)' }}>{userName}</p>
        <p className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>
          <kbd
            className="font-mono px-1 py-0.5 rounded border text-[10px]"
            style={{ borderColor: 'var(--rule)' }}
          >
            Ctrl+K
          </kbd>{' '}
          búsqueda rápida
        </p>
        <form action={logout}>
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
