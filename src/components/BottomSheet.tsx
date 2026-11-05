'use client';
import { useEffect } from 'react';
/** Slides up from the bottom on phones (centred card on larger screens). Tap outside or press Escape to close. */
export default function BottomSheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[85] flex items-end bg-black/55 sm:items-center sm:justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-card pb-[env(safe-area-inset-bottom)] sm:max-w-md sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-card px-4 pt-2"><div className="mx-auto h-1 w-10 rounded-full bg-line" /><div className="flex items-center justify-between py-2.5"><b>{title}</b><button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-hover"><i className="fa-solid fa-xmark" /></button></div></div>
        {children}
      </div>
    </div>
  );
}
