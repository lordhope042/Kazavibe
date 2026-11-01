'use client';
import { useEffect, useRef, useState } from 'react';

/** Pull down at the top of the page to refresh, like a phone app. Only reacts to touch screens. */
export default function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: React.ReactNode }) {
  const [pull, setPull] = useState(0), [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null), pullRef = useRef(0), busyRef = useRef(false), refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  useEffect(() => {
    const set = (n: number) => { pullRef.current = n; setPull(n); };
    const ts = (e: TouchEvent) => { if (window.scrollY <= 0 && !busyRef.current) start.current = e.touches[0].clientY; };
    const tm = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy > 0 && window.scrollY <= 0) set(Math.min(90, dy * 0.5)); else { start.current = null; set(0); }
    };
    const te = async () => {
      if (start.current === null) return;
      start.current = null;
      if (pullRef.current >= 60) { busyRef.current = true; setBusy(true); set(48); try { await refresh.current(); } finally { busyRef.current = false; setBusy(false); set(0); } } else set(0);
    };
    window.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', te);
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te); };
  }, []);
  return (
    <div>
      <div style={{ height: pull }} className="grid place-items-center overflow-hidden text-brand-500 transition-[height] duration-150" aria-hidden="true">
        {pull > 8 && <i className={`fa-solid ${busy ? 'fa-circle-notch fa-spin' : 'fa-arrow-down'} text-lg ${pull >= 60 && !busy ? 'rotate-180' : ''} transition-transform`} />}
      </div>
      {children}
    </div>
  );
}
