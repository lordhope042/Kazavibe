'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';

const urlB64 = (s: string) => { const b = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(b), (c) => c.charCodeAt(0)); };

export default function AppSettings() {
  const [supported, setSupported] = useState(false), [subbed, setSubbed] = useState(false), [msg, setMsg] = useState(''), [canInstall, setCanInstall] = useState(false), [iosHint, setIosHint] = useState(false);
  const deferred = useRef<any>(null);
  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setSubbed(!!s)).catch(() => {});
    setIosHint(/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches);
    const h = (e: any) => { e.preventDefault(); deferred.current = e; setCanInstall(true); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  async function enable() {
    setMsg('');
    try {
      const k = await api<any>('/api/push/key');
      if (!k.data.key) return setMsg('Push notifications are not set up on the server yet.');
      if ((await Notification.requestPermission()) !== 'granted') return setMsg('Notifications are blocked. Allow them in your browser settings, then try again.');
      const sub = await (await navigator.serviceWorker.ready).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(k.data.key) });
      const j = sub.toJSON(), x = await api('/api/push/subscribe', 'POST', { endpoint: j.endpoint, keys: j.keys });
      if (x.ok) { setSubbed(true); setMsg('Notifications are on for this device.'); } else setMsg('Could not save your subscription.');
    } catch { setMsg('Could not turn on notifications on this device.'); }
  }
  async function disable() {
    const s = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (s) { await api('/api/push/subscribe', 'DELETE', { endpoint: s.endpoint }); await s.unsubscribe(); }
    setSubbed(false); setMsg('Notifications are off for this device.');
  }
  async function install() { const e = deferred.current; if (!e) return; e.prompt(); await e.userChoice; deferred.current = null; setCanInstall(false); }
  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-bold">App and notifications</h2>
      {canInstall && <div className="flex items-center justify-between gap-3"><p className="text-sm text-soft">Install KazaVibe on this device for quick access.</p><button className="btn btn-sm" onClick={install}>Install app</button></div>}
      {iosHint && <p className="text-sm text-soft">To install on iPhone: tap the Share button, then <b>Add to Home Screen</b>. Notifications work after it&apos;s installed.</p>}
      {supported ? (
        <div className="flex items-center justify-between gap-3"><p className="text-sm text-soft">Push notifications for messages, likes, replies and matches. Message alerts show who wrote, never what they wrote.</p>
          {subbed ? <button className="btn-ghost btn-sm" onClick={disable}>Turn off</button> : <button className="btn btn-sm" onClick={enable}>Turn on</button>}</div>
      ) : <p className="text-sm text-muted">This browser does not support push notifications.</p>}
      <p role="status" className="text-sm text-good">{msg}</p>
    </div>
  );
}
