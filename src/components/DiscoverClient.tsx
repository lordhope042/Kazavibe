'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import FollowButton, { type FollowState } from './FollowButton';
import { AREAS } from '@/lib/areas';
import { api } from '@/lib/client';

type Row = { username: string; displayName: string; area: string; verified: boolean; bio: string; state: FollowState; avatarUrl: string | null; sameArea: boolean };

export default function DiscoverClient({ mode, initialQ = '', initialArea = '', paused = false }: { mode: 'discover' | 'nearby'; initialQ?: string; initialArea?: string; paused?: boolean }) {
  const [q, setQ] = useState(initialQ), [area, setArea] = useState(initialArea), [rows, setRows] = useState<Row[] | null>(null), [err, setErr] = useState(''), [off, setOff] = useState(paused);
  useEffect(() => {
    if (mode === 'nearby' && off) { setRows([]); return; }
    const t = setTimeout(async () => {
      const x = await api<Row[]>(`/api/discover?q=${encodeURIComponent(q)}&area=${encodeURIComponent(area)}${mode === 'nearby' ? '&nearby=1' : ''}`);
      if (x.ok) { setRows(x.data); setErr(''); } else setErr('Could not load members. Try again.');
    }, 250);
    return () => clearTimeout(t);
  }, [q, area, mode, off]);
  async function togglePause() { const nx = !off; setOff(nx); await api('/api/me', 'PATCH', { locationPaused: nx }); }
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black">{mode === 'nearby' ? 'People Nearby' : 'Discover People'}</h1>
      <p className="mb-4 text-sm text-muted">{mode === 'nearby' ? 'Based on the area you chose, never your exact location.' : 'Find friends and creators around Kazaure.'}</p>
      {mode === 'nearby' && <div className="card mb-4 flex items-center gap-3 p-4"><i className="fa-solid fa-location-dot text-brand-500" /><div className="flex-1 text-sm"><b>Show me in Nearby</b><p className="text-xs text-muted">Turn off to hide yourself and pause nearby discovery.</p></div>
        <button role="switch" aria-checked={!off} aria-label="Show me in Nearby" onClick={togglePause} className={`relative h-6 w-11 rounded-full border border-line transition ${off ? 'bg-input' : 'bg-brand-600'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${off ? 'left-0.5' : 'left-5'}`} /></button></div>}
      <div className="flex gap-2">
        <input className="inp" type="search" placeholder="Search by name or username" aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="inp w-auto" aria-label="Area" value={area} onChange={(e) => setArea(e.target.value)}><option value="">All areas</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
      </div>
      <p role="alert" className="mt-3 text-sm text-danger">{err}</p>
      {mode === 'nearby' && off ? <p className="mt-6 text-soft">Nearby is paused. Switch it on to see people in your area.</p>
        : rows === null ? <p className="mt-6 text-muted">Loading…</p> : rows.length === 0 ? <p className="mt-6 text-soft">No members found. Try another search or area, or invite friends to join.</p> : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.username} className="card flex items-center gap-3 p-3">
              <Avatar src={r.avatarUrl} name={r.displayName} size={52} />
              <Link href={`/profile/${r.username}`} className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.displayName}{r.verified && <i className="fa-solid fa-circle-check ml-1 text-xs text-brand-500" />}</div>
                <div className="truncate text-xs text-muted">@{r.username}</div>
                <div className="truncate text-xs text-brand-500"><i className="fa-solid fa-location-dot mr-1" />{r.area}{mode === 'nearby' && r.sameArea && ' · Your area'}</div>
              </Link>
              <FollowButton username={r.username} initial={r.state} />
            </li>))}
        </ul>)}
    </div>
  );
}
