'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
      <div className="flex-1 relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar alimento o código TPCA (ej. A49, A4...)"
          className="w-full px-3 py-2 rounded border text-sm focus:outline-none"
          style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            Buscando...
          </span>
        )}
      </div>

      <select
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        className="px-2 py-2 rounded border text-sm"
        style={{ background: 'var(--paper-warm)', borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
      >
        {GROUPS.map((g) => (
          <option key={g.letter} value={g.letter}>{g.label}</option>
        ))}
      </select>

      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-12 z-50 mt-1 rounded-lg border shadow-sm overflow-hidden"
          style={{ background: 'var(--paper)', borderColor: 'var(--rule)' }}
        >
          {results.map((food, i) => (
            <button
              key={food.id}
              onClick={() => handleSelect(food)}
              onMouseEnter={() => setActive(i)}
              className="w-full text-left px-4 py-2.5 border-b last:border-b-0 transition-colors"
              style={{
                borderColor: 'var(--rule)',
                background: i === active ? 'var(--paper-warm)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-xs shrink-0"
                  style={{ color: 'var(--accent)', minWidth: '2.5rem' }}
                >
                  {food.code}
                </span>
                <span className="text-sm truncate" style={{ color: 'var(--ink)' }} title={food.name}>
                  {highlight(food.name, query)}
                </span>
                <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--ink-soft)' }}>
                  {food.per_100g.energia_kcal != null
                    ? `${food.per_100g.energia_kcal} kcal`
                    : '—'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
