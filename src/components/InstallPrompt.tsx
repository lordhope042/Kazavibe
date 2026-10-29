'use client';
import { useEffect, useRef, useState } from 'react';

const KEY = 'kv_install_dismissed', SNOOZE_MS = 3 * 864e5;
type Mode = 'native' | 'ios' | 'manual' | null;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
const isMobile = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || isIos();
const snoozed = () => { try { const t = Number(localStorage.getItem(KEY)); return !!t && Date.now() - t < SNOOZE_MS; } catch { return false; } };

/** "Install KazaVibe" pop-up. Shows on phones (Android and iPhone) as well as laptops, once the page has settled. */
export default function InstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const deferred = useRef<any>(null);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;
    let timer: ReturnType<typeof setTimeout>;
    const onPrompt = (e: any) => { e.preventDefault(); deferred.current = e; clearTimeout(timer); timer = setTimeout(() => setMode('native'), 3500); };
    const onInstalled = () => { setMode(null); deferred.current = null; };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    // Browsers that never fire beforeinstallprompt (iPhone, Firefox on Android): show manual steps on phones only.
    if (isIos()) timer = setTimeout(() => setMode('ios'), 4000);
    else if (isMobile()) timer = setTimeout(() => { if (!deferred.current) setMode('manual'); }, 6000);
    return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  function dismiss() { try { localStorage.setItem(KEY, String(Date.now())); } catch {} setMode(null); }
  async function install() {
    const e = deferred.current;
    if (!e) return;
    e.prompt();
    const c = await e.userChoice.catch(() => null);
    deferred.current = null; setMode(null);
    if (c?.outcome !== 'accepted') dismiss();
  }
  if (!mode) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96 sm:p-0" role="dialog" aria-label="Install KazaVibe">
      <div className="card flex items-start gap-3 p-4 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Get the KazaVibe app</p>
          {mode === 'native' && <p className="mt-0.5 text-sm text-soft">Add KazaVibe to your home screen for faster access and message alerts.</p>}
          {mode === 'ios' && <p className="mt-0.5 text-sm text-soft">Tap the <b>Share</b> button <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden /> in your browser, then choose <b>Add to Home Screen</b>.</p>}
          {mode === 'manual' && <p className="mt-0.5 text-sm text-soft">Open your browser menu <i className="fa-solid fa-ellipsis-vertical" aria-hidden /> and tap <b>Install app</b> or <b>Add to Home screen</b>.</p>}
          <div className="mt-3 flex gap-2">
            {mode === 'native' && <button className="btn btn-sm" onClick={install}>Install</button>}
            <button className="btn-ghost btn-sm" onClick={dismiss}>{mode === 'native' ? 'Not now' : 'Got it'}</button>
          </div>
        </div>
        <button className="text-muted hover:text-fg" onClick={dismiss} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
      </div>
    </div>
  );
}
