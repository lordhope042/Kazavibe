'use client';
import { useEffect, useState } from 'react';
import Logo from './Logo';
/** A short branded launch screen, only when opened as an installed app, once per session. */
export default function SplashScreen() {
  const [show, setShow] = useState(false), [fade, setFade] = useState(false);
  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    let seen = false; try { seen = sessionStorage.getItem('kv-splash') === '1'; } catch {}
    if (!standalone || seen) return;
    try { sessionStorage.setItem('kv-splash', '1'); } catch {}
    setShow(true);
    const a = setTimeout(() => setFade(true), 700), b = setTimeout(() => setShow(false), 1000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (!show) return null;
  return <div aria-hidden="true" className={`fixed inset-0 z-[200] grid place-items-center bg-[#0A0D14] text-white transition-opacity duration-300 ${fade ? 'opacity-0' : 'opacity-100'}`}><div className="text-center"><div className="flex justify-center"><Logo size={84} markOnly /></div><p className="mt-4 text-2xl font-extrabold">Kaza<span className="text-brand-500">Vibe</span></p><p className="mt-1 text-xs text-white/60">Your People. Your Vibe. Your Community.</p></div></div>;
}
