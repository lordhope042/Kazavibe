'use client';
import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';

/** Phone browsers only: offers to install the app. Hidden once installed, and for 14 days after being dismissed. */
export default function InstallBanner() {
  const [show, setShow] = useState(false), [ios, setIos] = useState(false), [canPrompt, setCanPrompt] = useState(false);
  const ev = useRef<any>(null);
  useEffect(() => {
    if (matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone || !matchMedia('(max-width: 640px)').matches) return;
    let at = 0; try { at = Number(localStorage.getItem('kv-install-dismissed') || 0); } catch {}
    if (Date.now() - at < 14 * 864e5) return;
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const h = (e: any) => { e.preventDefault(); ev.current = e; setCanPrompt(true); setShow(true); };
    window.addEventListener('beforeinstallprompt', h);
    const t = setTimeout(() => { if (apple) { setIos(true); setShow(true); } }, 4000);
    return () => { window.removeEventListener('beforeinstallprompt', h); clearTimeout(t); };
  }, []);
  const close = () => { setShow(false); try { localStorage.setItem('kv-install-dismissed', String(Date.now())); } catch {} };
  async function install() { const e = ev.current; if (!e) return; e.prompt(); await e.userChoice; ev.current = null; setShow(false); }
  if (!show) return null;
  return (
    <div role="region" aria-label="Install the app" className="kv-install fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-2xl sm:hidden">
      <Logo size={34} markOnly />
      <div className="min-w-0 flex-1"><b className="block text-sm">Get the KazaVibe app</b><p className="text-xs text-muted">{ios && !canPrompt ? 'Tap Share, then Add to Home Screen.' : 'Faster, full screen, with notifications.'}</p></div>
      {canPrompt && <button className="btn btn-sm" onClick={install}>Install</button>}
      <button aria-label="Not now" className="p-1 text-muted" onClick={close}><i className="fa-solid fa-xmark" /></button>
    </div>
  );
}
