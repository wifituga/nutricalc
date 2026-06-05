'use client';

import { Share2, Printer } from 'lucide-react';

export default function ShareBar({ title }: { title: string }) {
  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    // Fallback: WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`, '_blank');
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 border-t print:hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--rule)', boxShadow: '0 -4px 14px rgba(46,36,22,.08)' }}
    >
      <div className="max-w-xl mx-auto w-full flex gap-3">
        <button
          onClick={() => window.print()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-[7px] border text-sm font-medium"
          style={{ background: 'var(--surface)', borderColor: 'var(--rule-strong)', color: 'var(--ink)', padding: '11px 14px' }}
        >
          <Printer size={16} /> Guardar
        </button>
        <button
          onClick={share}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-[7px] text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--paper)', padding: '11px 14px' }}
        >
          <Share2 size={16} /> Compartir
        </button>
      </div>
    </div>
  );
}
