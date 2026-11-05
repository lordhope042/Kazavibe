'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import PhotoFill from './PhotoFill';
import FollowButton, { type FollowState } from './FollowButton';
import { RowSkeleton, Skeleton } from './Skeleton';
import { useAppUI } from './AppUI';
import { AREAS } from '@/lib/areas';
import { api } from '@/lib/client';

type Row = { username: string; displayName: string; area: string; verified: boolean; bio: string; state: FollowState; avatarUrl: string | null; sameArea: boolean };

const Tile = ({ r }: { r: Row }) => (
  <div className="overflow-hidden rounded-2xl border border-line bg-card">
    <Link href={`/profile/${r.username}`} className="relative block aspect-[4/5]">
      <PhotoFill src={r.avatarUrl} name={r.displayName} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-10 text-white">
        <b className="block truncate text-sm">{r.displayName}{r.verified && <i className="fa-solid fa-circle-check ml-1 text-[10px] text-brand-500" />}</b>
        <span className="block truncate text-[11px] text-white/80"><i className="fa-solid fa-location-dot mr-1" />{r.area}</span>
      </div>
    </Link>
    <div className="p-2 [&>button]:w-full"><FollowButton username={r.username} initial={r.state} /></div>
  </div>
);

export default function DiscoverClient({ mode, initialQ = '', initialArea = '', paused = false, myArea = '' }: { mode: 'discover' | 'nearby'; initialQ?: string; initialArea?: string; paused?: boolean; myArea?: string }) {
  const app = useAppUI();
  const [q, setQ] = useState(initialQ), [area, setArea] = useState(initialArea), [verified, setVerified] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null), [err, setErr] = useState(''), [off, setOff] = useState(paused);
  useEffect(() => {
    if (mode === 'nearby' && off) { setRows([]); return; }
    const t = setTimeout(async () => {
      const x = await api<Row[]>(`/api/discover?q=${encodeURIComponent(q)}&area=${encodeURIComponent(area)}${verified ? '&verified=1' : ''}${mode === 'nearby' ? '&nearby=1' : ''}`);
      if (x.ok) { setRows(x.data); setErr(''); } else setErr('Could not load members. Try again.');
    }, 250);
    return () => clearTimeout(t);
  }, [q, area, verified, mode, off]);
  async function togglePause() { const nx = !off; setOff(nx); await api('/api/me', 'PATCH', { locationPaused: nx }); }
  const pause = mode === 'nearby' && (
    <div className="card mb-4 flex items-center gap-3 p-4"><i className="fa-solid fa-location-dot text-brand-500" /><div className="flex-1 text-sm"><b>Show me in Nearby</b><p className="text-xs text-muted">Turn off to hide yourself and pause nearby discovery.</p></div>
      <button role="switch" aria-checked={!off} aria-label="Show me in Nearby" onClick={togglePause} className={`relative h-6 w-11 shrink-0 rounded-full border border-line transition ${off ? 'bg-input' : 'bg-brand-600'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${off ? 'left-0.5' : 'left-5'}`} /></button></div>);
  const body = mode === 'nearby' && off ? <p className="mt-6 text-soft">Nearby is paused. Switch it on to see people in your area.</p> : null;

  if (app) { // ---------- phone: search + filter chips + photo grid ----------
    const chip = (on: boolean) => `chip shrink-0 ${on ? 'chip-on' : ''}`;
    return (
      <div className="-mx-3 -mt-3">
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 space-y-2 border-b border-line bg-bg/95 px-3 pb-2.5 pt-3 backdrop-blur">
          <label className="flex items-center rounded-full border border-line bg-input px-4 py-2.5 focus-within:border-brand-600"><i className="fa-solid fa-magnifying-glass text-sm text-muted" />
            <input type="search" aria-label="Search members" placeholder="Search people, interests…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-2.5 w-full bg-transparent outline-none placeholder:text-muted" /></label>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <button className={chip(!area && !verified)} onClick={() => { setArea(''); setVerified(false); }}>All</button>
            {myArea && <button className={chip(area === myArea)} onClick={() => setArea(area === myArea ? '' : myArea)}>Near me</button>}
            <button className={chip(verified)} onClick={() => setVerified(!verified)}><i className="fa-solid fa-circle-check mr-1 text-brand-500" />Verified</button>
            <Link href={mode === 'nearby' ? '/discover' : '/nearby'} className="chip shrink-0"><i className="fa-solid fa-location-arrow mr-1" />{mode === 'nearby' ? 'People' : 'Nearby'}</Link>
            {AREAS.map((a) => <button key={a} className={chip(area === a)} onClick={() => setArea(area === a ? '' : a)}>{a}</button>)}
          </div>
        </div>
        <div className="px-3 pt-3">
          {pause}
          <p role="alert" className="text-sm text-danger">{err}</p>
          {body ?? (rows === null ? <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)}</div>
            : rows.length === 0 ? <p className="py-16 text-center text-soft"><i className="fa-regular fa-face-smile mb-2 block text-3xl text-muted" />No one matches. Try another filter.</p>
            : <div className="grid grid-cols-2 gap-3">{rows.map((r) => <Tile key={r.username} r={r} />)}</div>)}
        </div>
      </div>
    );
  }

  return ( // ---------- website: unchanged ----------
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black">{mode === 'nearby' ? 'People Nearby' : 'Discover People'}</h1>
      <p className="mb-4 text-sm text-muted">{mode === 'nearby' ? 'Based on the area you chose, never your exact location.' : 'Find friends and creators around Kazaure.'}</p>
      <div className="mb-4 flex gap-2"><Link href="/discover" className={`chip ${mode === 'discover' ? 'chip-on' : ''}`}>People</Link><Link href="/nearby" className={`chip ${mode === 'nearby' ? 'chip-on' : ''}`}>Nearby</Link></div>
      {pause}
      <div className="flex gap-2">
        <input className="inp" type="search" placeholder="Search by name or username" aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="inp w-auto" aria-label="Area" value={area} onChange={(e) => setArea(e.target.value)}><option value="">All areas</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
      </div>
      <p role="alert" className="mt-3 text-sm text-danger">{err}</p>
      {body ?? (rows === null ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton /></div> : rows.length === 0 ? <p className="mt-6 text-soft">No members found. Try another search or area, or invite friends to join.</p> : (
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
        </ul>))}
    </div>
  );
}
