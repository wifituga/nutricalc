'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Users, Menu, X } from 'lucide-react';
import { logout } from '@/app/login/actions';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/patients', label: 'Pacientes', icon: Users },
];

export default function Sidebar({ userName, clinicName }: { userName: string; clinicName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const SidebarBody = (
    <aside
      className="w-56 flex flex-col border-r shrink-0 h-full"
      style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}
    >
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--rule)' }}
      >
        <div className="min-w-0">
          <span
            className="font-display text-xl font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            NutriCalc
          </span>
          {clinicName && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-soft)' }}>
              {clinicName}
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          className="md:hidden p-1 rounded hover:bg-[color:var(--paper)]"
          style={{ color: 'var(--ink-soft)' }}
        >
          <X size={16} />
        </button>
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

      <div
        className="px-5 py-4 border-t text-xs space-y-2"
        style={{ borderColor: 'var(--rule)' }}
      >
        <p className="truncate font-medium" style={{ color: 'var(--ink)' }}>
          {userName}
        </p>
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

  return (
    <>
      {/* Mobile top bar (visible <md) */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-12 border-b"
        style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)' }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="p-1.5 rounded hover:bg-[color:var(--paper)]"
          style={{ color: 'var(--ink)' }}
        >
          <Menu size={18} />
        </button>
        <span
          className="font-display text-base font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          NutriCalc
        </span>
        <span className="w-7" /> {/* spacer for symmetric alignment */}
      </header>

      {/* Desktop sidebar (always visible >=md) */}
      <div className="hidden md:flex">{SidebarBody}</div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute top-0 left-0 bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            {SidebarBody}
          </div>
        </div>
      )}
    </>
  );
}
