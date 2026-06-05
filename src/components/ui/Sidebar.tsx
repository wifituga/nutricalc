'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Users, Menu, X, Search } from 'lucide-react';
import { logout } from '@/app/login/actions';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/patients', label: 'Pacientes', icon: Users },
];

function openPalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
}

export default function Sidebar({ userName, clinicName }: { userName: string; clinicName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const SidebarBody = (
    <aside
      className="flex flex-col border-r shrink-0 h-full"
      style={{ width: 220, background: 'var(--paper-warm)', borderColor: 'var(--rule)', padding: '18px 14px' }}
    >
      {/* Marca */}
      <div className="flex items-center justify-between" style={{ padding: '4px 6px 18px' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="grid place-items-center font-display font-semibold text-white shrink-0"
            style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--accent)', fontSize: 16 }}
          >
            N
          </span>
          <span className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--ink)' }}>
            NutriCalc
          </span>
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

      {/* Búsqueda ⌘K */}
      <button
        onClick={openPalette}
        className="flex items-center gap-2 w-full text-left mb-4.5"
        style={{
          fontSize: 12.5,
          color: 'var(--ink-faint)',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--r-md)',
          padding: '8px 10px',
          marginBottom: 18,
        }}
      >
        <Search size={14} />
        <span>Buscar…</span>
        <kbd
          className="mono ml-auto"
          style={{ fontSize: 10, fontWeight: 600, background: 'var(--surface-sunk)', border: '1px solid var(--rule)', borderRadius: 4, padding: '1px 5px', color: 'var(--ink-soft)' }}
        >
          Ctrl K
        </kbd>
      </button>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 transition-colors"
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--r-md)',
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent-deep)' : 'var(--ink-soft)',
              }}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer usuario / clínica */}
      <div className="mt-auto border-t" style={{ borderColor: 'var(--rule)', padding: '14px 8px 4px' }}>
        <p className="font-semibold truncate" style={{ fontSize: 13, color: 'var(--ink)' }}>
          {userName}
        </p>
        {clinicName && (
          <p className="truncate" style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
            {clinicName}
          </p>
        )}
        <form action={logout} className="mt-2">
          <button type="submit" className="text-xs hover:underline" style={{ color: 'var(--ink-soft)' }}>
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
        <span className="flex items-center gap-2">
          <span
            className="grid place-items-center font-display font-semibold text-white"
            style={{ width: 22, height: 22, borderRadius: 'var(--r-xs)', background: 'var(--accent)', fontSize: 13 }}
          >
            N
          </span>
          <span className="font-semibold" style={{ fontSize: 15, color: 'var(--ink)' }}>
            NutriCalc
          </span>
        </span>
        <button onClick={openPalette} aria-label="Buscar" className="p-1.5 rounded hover:bg-[color:var(--paper)]" style={{ color: 'var(--ink)' }}>
          <Search size={17} />
        </button>
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
          <div className="absolute top-0 left-0 bottom-0" onClick={(e) => e.stopPropagation()}>
            {SidebarBody}
          </div>
        </div>
      )}
    </>
  );
}
