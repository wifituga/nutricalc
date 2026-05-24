'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Home, Plus, Loader2 } from 'lucide-react';

type Patient = { id: string; full_name: string; document_id: string | null };

type Action =
  | { kind: 'navigate'; label: string; hint?: string; href: string; icon: typeof Home }
  | { kind: 'patient'; label: string; hint?: string; id: string };

const STATIC_ACTIONS: Action[] = [
  { kind: 'navigate', label: 'Inicio', hint: 'Dashboard', href: '/dashboard', icon: Home },
  { kind: 'navigate', label: 'Pacientes', hint: 'Listado completo', href: '/patients', icon: Users },
  { kind: 'navigate', label: 'Nuevo paciente', hint: 'Crear paciente', href: '/patients/new', icon: Plus },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery('');
      setActive(0);
    }
  }, [open]);

  // Search patients debounced
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setPatients([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}&limit=8`);
        if (res.ok) {
          const json = await res.json();
          setPatients(json.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  const filteredStatic = STATIC_ACTIONS.filter((a) =>
    !query.trim() || a.label.toLowerCase().includes(query.toLowerCase()),
  );
  const patientActions: Action[] = patients.map((p) => ({
    kind: 'patient' as const,
    label: p.full_name,
    hint: p.document_id ?? undefined,
    id: p.id,
  }));
  const actions: Action[] = [...filteredStatic, ...patientActions];

  const close = useCallback(() => setOpen(false), []);
  const runAction = useCallback((a: Action) => {
    if (a.kind === 'navigate') router.push(a.href);
    else router.push(`/patients/${a.id}`);
    setOpen(false);
  }, [router]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(actions.length - 1, 0)));
  }, [actions.length]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, actions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (actions[active]) runAction(actions[active]);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden bg-white"
        style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: 'var(--rule)' }}
        >
          <Search size={16} style={{ color: 'var(--ink-soft)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar paciente o navegar…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
          {loading && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--ink-soft)' }} />}
          <kbd
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
          >
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scroll-fade">
          {actions.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
              {query.trim().length < 2 ? 'Escribe para buscar pacientes' : 'Sin resultados'}
            </p>
          ) : (
            <ul>
              {actions.map((a, i) => {
                const isActive = i === active;
                return (
                  <li key={`${a.kind}-${i}`}>
                    <button
                      onClick={() => runAction(a)}
                      onMouseEnter={() => setActive(i)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                      style={{
                        background: isActive ? 'var(--paper-warm)' : 'transparent',
                        color: 'var(--ink)',
                      }}
                    >
                      {a.kind === 'navigate' ? (
                        <a.icon size={14} style={{ color: 'var(--ink-soft)' }} />
                      ) : (
                        <Users size={14} style={{ color: 'var(--ink-soft)' }} />
                      )}
                      <span className="text-sm flex-1 truncate">{a.label}</span>
                      {a.hint && (
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: 'var(--ink-soft)' }}
                        >
                          {a.hint}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="flex items-center justify-between px-3 py-2 border-t text-[11px]"
          style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)', background: 'var(--paper-warm)' }}
        >
          <span>
            <kbd className="font-mono">↑↓</kbd> navegar · <kbd className="font-mono">Enter</kbd> abrir
          </span>
          <span>
            <kbd className="font-mono">Ctrl+K</kbd> para abrir
          </span>
        </div>
      </div>
    </div>
  );
}
