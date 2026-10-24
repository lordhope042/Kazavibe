'use client';
import { useEffect, useState } from 'react';
import { useT } from './LangProvider';
export default function ThemeToggle({ className = 'btn-ghost btn-sm' }: { className?: string }) {
  const [light, setLight] = useState(false), t = useT();
  useEffect(() => {
    let t: string | null = null;
    try { t = localStorage.getItem('kv-theme'); } catch {}
    if (t) document.documentElement.dataset.theme = t;
    setLight((t ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'light');
  }, []);
  function toggle() {
    const next = light ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('kv-theme', next); } catch {}
    setLight(!light);
  }
  return <button onClick={toggle} className={className}><i className={`fa-solid ${light ? 'fa-moon' : 'fa-sun'} mr-1.5`} />{t(light ? 'dark_mode' : 'light_mode')}</button>;
}
