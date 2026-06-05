'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { Food } from '@/lib/types';

const GROUPS = [
  { letter: '', label: 'Todos los grupos' },
  { letter: 'A', label: 'A · Cereales' },
  { letter: 'B', label: 'B · Verduras' },
  { letter: 'C', label: 'C · Frutas' },
  { letter: 'D', label: 'D · Grasas' },
  { letter: 'E', label: 'E · Pescados' },
  { letter: 'F', label: 'F · Carnes' },
  { letter: 'G', label: 'G · Lácteos' },
  { letter: 'H', label: 'H · Bebidas' },
  { letter: 'J', label: 'J · Huevos' },
  { letter: 'K', label: 'K · Azúcares' },
  { letter: 'L', label: 'L · Misceláneos' },
  { letter: 'Q', label: 'Q · Infantiles' },
  { letter: 'T', label: 'T · Leguminosas' },
  { letter: 'U', label: 'U · Tubérculos' },
  { letter: 'S', label: 'S · Preparaciones' },
];

function highlight(text: string, q: string) {
  const term = q.trim();
  if (!term) return text;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: 'transparent', color: 'var(--accent)', fontWeight: 600 }}>
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}

export default function FoodSearch({ onSelect }: { onSelect: (food: Food) => void }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string, g: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, group: g, limit: '12' });
      const res = await fetch(`/api/foods?${params}`);
      const json = await res.json();
      setResults(json.data ?? []);
      setActive(0);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim() && !group) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query, group), 300);
  }, [query, group, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(food: Food) {
    onSelect(food);
    setQuery('');
    setOpen(false);
    setResults([]);
    setActive(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) handleSelect(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex gap-2">
      <div
        className="flex-1 flex items-center gap-2.5 rounded-[7px] border"
        style={{ background: 'var(--surface)', borderColor: 'var(--rule-strong)', padding: '10px 14px' }}
      >
        <Search size={16} style={{ color: 'var(--ink-faint)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar alimento o código TPCA (ej. A49)…"
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: 'var(--ink)' }}
        />
        {loading && <span className="text-[11px] shrink-0" style={{ color: 'var(--ink-faint)' }}>Buscando…</span>}
      </div>

      <select
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        className="rounded-[7px] border text-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--rule-strong)', color: 'var(--ink-soft)', padding: '0 10px' }}
      >
        {GROUPS.map((g) => (
          <option key={g.letter} value={g.letter}>{g.label}</option>
        ))}
      </select>

      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-12 z-50 mt-1.5 rounded-[10px] border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: 'var(--shadow-pop)' }}
        >
          {results.map((food, i) => (
            <button
              key={food.id}
              onClick={() => handleSelect(food)}
              onMouseEnter={() => setActive(i)}
              className="w-full text-left border-b last:border-b-0 transition-colors"
              style={{ borderColor: 'var(--rule)', background: i === active ? 'var(--accent-soft)' : 'transparent', padding: '9px 14px' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="mono text-[11.5px] font-semibold shrink-0" style={{ color: 'var(--accent)', minWidth: '2.6rem' }}>
                  {food.code}
                </span>
                <span className="text-sm truncate" style={{ color: 'var(--ink)' }} title={food.name}>
                  {highlight(food.name, query)}
                </span>
                {food.group_letter === 'S' && (
                  <span
                    className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent-deep)', border: '1px solid #e0cfba' }}
                    title="Preparación completa (TPCA 2025 grupo S)"
                  >
                    prep
                  </span>
                )}
                <span className="mono text-[11.5px] ml-auto shrink-0" style={{ color: food.per_100g.energia_kcal != null ? 'var(--ink-soft)' : 'var(--c-null)' }}>
                  {food.per_100g.energia_kcal != null ? `${food.per_100g.energia_kcal} kcal/100g` : '—'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
