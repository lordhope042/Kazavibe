'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
/** A brief branded entry screen on first visit and after logout; PWA launches also get it. */
export default function SplashScreen() {
  const path = usePathname();
  const [show, setShow] = useState(false), [fade, setFade] = useState(false);
  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    let seen = false; try { seen = sessionStorage.getItem('kv-splash') === '1'; } catch {}
    let afterLogout = false;
    try {
      afterLogout = path === '/' && sessionStorage.getItem('kv-show-splash') === '1';
      if (afterLogout) sessionStorage.removeItem('kv-show-splash');
    } catch {}
    if (!(standalone && !seen) && !(path === '/' && !seen) && !afterLogout) return;
    try { sessionStorage.setItem('kv-splash', '1'); } catch {}
    setFade(false);
    setShow(true);
    const a = setTimeout(() => setFade(true), 650), b = setTimeout(() => setShow(false), 950);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [path]);
  if (!show) return null;
  return <div aria-hidden="true" className={`fixed inset-0 z-[200] grid place-items-center bg-[#0A0D14] px-6 text-white transition-opacity duration-300 ${fade ? 'opacity-0' : 'opacity-100'}`}><div className="text-center"><div className="flex justify-center"><Logo size={84} markOnly /></div><p className="mt-4 text-2xl font-extrabold">Kaza<span className="text-brand-500">Vibe</span></p><p className="mt-1 text-xs text-white/60">Your People. Your Vibe. Your Community.</p><span className="kv-loader-ring mx-auto mt-7 block h-5 w-5" /></div></div>;
}
