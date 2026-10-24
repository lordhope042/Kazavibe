'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Slim progress bar at the top while a write request or page change is running.
 * It stays on as ONE continuous bar across chained steps (save, then redirect, then refresh),
 * and only appears if the wait is longer than 150 ms, so quick actions never flash anything.
 * Uploads also show a small, non-blocking "Uploading" pill after 0.8 s. Nothing covers the screen.
 */
export default function GlobalSpinner() {
  const path = usePathname();
  const [pending, setPending] = useState(0), [uploads, setUploads] = useState(0), [nav, setNav] = useState(false);
  const [bar, setBar] = useState(false), [pill, setPill] = useState(false);

  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (input, init) => {
      const m = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      if (m === 'GET' || m === 'HEAD') return orig(input, init);
      const up = init?.body instanceof FormData;
      setPending((n) => n + 1); if (up) setUploads((n) => n + 1);
      try { return await orig(input, init); } finally { setPending((n) => Math.max(0, n - 1)); if (up) setUploads((n) => Math.max(0, n - 1)); }
    };
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && (u.search === location.search || u.hash))) return;
      setNav(true);
    };
    document.addEventListener('click', click);
    return () => { window.fetch = orig; document.removeEventListener('click', click); };
  }, []);

  useEffect(() => setNav(false), [path]);
  useEffect(() => { if (!nav) return; const t = setTimeout(() => setNav(false), 8000); return () => clearTimeout(t); }, [nav]);
  const active = pending > 0 || nav;
  useEffect(() => {
    const t = setTimeout(() => setBar(active), active ? 150 : 400); // short grace period when finishing keeps chained steps as one bar
    return () => clearTimeout(t);
  }, [active]);
  useEffect(() => {
    if (uploads === 0) { setPill(false); return; }
    const t = setTimeout(() => setPill(true), 800);
    return () => clearTimeout(t);
  }, [uploads]);

  return (
    <>
      {bar && <div role="progressbar" aria-label="Loading" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-brand-600/15"><div className="kv-bar h-full rounded-full bg-gradient-to-r from-brand-600 to-amber-500" /></div>}
      {pill && <div role="status" aria-live="polite" className="kv-fade pointer-events-none fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-2xl sm:bottom-8"><span className="kv-spin h-5 w-5 rounded-full border-2 border-line border-t-brand-600" /><span className="text-sm font-semibold">Uploading…</span></div>}
    </>
  );
}
