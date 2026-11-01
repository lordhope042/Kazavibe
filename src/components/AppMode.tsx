'use client';
import { useEffect } from 'react';
/** Marks the page as running "as an installed app" so CSS can switch on app-style behaviour. */
export default function AppMode() {
  useEffect(() => {
    const mq = matchMedia('(display-mode: standalone)');
    const set = () => { document.documentElement.dataset.app = mq.matches || (navigator as any).standalone === true ? 'true' : 'false'; };
    set(); mq.addEventListener?.('change', set);
    return () => mq.removeEventListener?.('change', set);
  }, []);
  return null;
}
