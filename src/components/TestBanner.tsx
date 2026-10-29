'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const KEY = 'kv_testbanner_day';
const today = () => new Date().toISOString().slice(0, 10);

/** Reminder that the free Plus tier is a 10-day test. Dismissed for the rest of the day; comes back tomorrow. */
export default function TestBanner() {
  const [until, setUntil] = useState<string | null>(null);
  useEffect(() => {
    try { if (localStorage.getItem(KEY) === today()) return; } catch {}
    api<any>('/api/plan').then((x) => { if (x.ok && x.data.freeForAll) setUntil(x.data.freeUntil); });
  }, []);
  if (!until) return null;
  const date = new Date(until).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  const days = Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 864e5));
  function close() { try { localStorage.setItem(KEY, today()); } catch {} setUntil(null); }
  return (
    <div role="status" className="border-b border-brand-600/30 bg-brand-600/10 px-4 py-2 text-center text-xs text-soft sm:text-sm">
      <b className="text-fg">Test period:</b> all Plus features are free for 10 days (until {date}{days > 0 ? `, ${days} day${days === 1 ? '' : 's'} left` : ''}). After that, Plus is a paid plan.{' '}
      <Link href="/feedback" className="font-semibold text-brand-500 underline">Share your feedback</Link>
      <button onClick={close} aria-label="Dismiss" className="ml-3 text-muted hover:text-fg"><i className="fa-solid fa-xmark" /></button>
    </div>
  );
}
