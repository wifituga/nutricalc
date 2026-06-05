'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField() {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name="password"
        type={show ? 'text' : 'password'}
        required
        autoComplete="current-password"
        className="w-full rounded-[7px] border text-sm focus:outline-none"
        style={{ background: 'var(--surface)', borderColor: 'var(--rule-strong)', color: 'var(--ink)', padding: '10px 38px 10px 12px' }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
        style={{ color: 'var(--ink-faint)' }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
