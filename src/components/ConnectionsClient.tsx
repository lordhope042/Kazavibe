'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import FollowButton, { type FollowState } from './FollowButton';
import { RowSkeleton } from './Skeleton';
import { api } from '@/lib/client';

type P = { username: string; displayName: string; area: string; verified: boolean; avatarUrl: string | null; mine: boolean; state: FollowState };
export default function ConnectionsClient({ username, initialTab }: { username: string; initialTab: 'followers' | 'following' }) {
  const [tab, setTab] = useState(initialTab), [rows, setRows] = useState<P[] | null>(null), [err, setErr] = useState('');
  useEffect(() => {
    setRows(null); setErr('');
    api<P[]>(`/api/users/${username}/connections?type=${tab}`).then((x) => { if (x.ok) setRows(x.data); else { setRows([]); setErr((x.data as any).error ?? 'Could not load this list.'); } });
  }, [username, tab]);
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-3 text-sm text-muted">@{username}</p>
      <div className="mb-3 flex gap-2">{(['followers', 'following'] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`chip capitalize ${tab === k ? 'chip-on' : ''}`}>{k}</button>)}</div>
      {err ? <p role="alert" className="py-10 text-center text-soft"><i className="fa-solid fa-lock mb-2 block text-2xl text-muted" />{err}</p>
        : rows === null ? <div className="space-y-2"><RowSkeleton /><RowSkeleton /><RowSkeleton /></div>
        : rows.length === 0 ? <p className="py-14 text-center text-soft">{tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
        : <ul className="space-y-2">{rows.map((r) => (
          <li key={r.username} className="card flex items-center gap-3 p-3"><Avatar src={r.avatarUrl} name={r.displayName} size={48} />
            <Link href={`/profile/${r.username}`} className="min-w-0 flex-1"><b className="block truncate text-sm">{r.displayName}{r.verified && <i className="fa-solid fa-circle-check ml-1 text-xs text-brand-500" />}</b><span className="block truncate text-xs text-muted">@{r.username} · {r.area}</span></Link>
            {!r.mine && <FollowButton username={r.username} initial={r.state} />}</li>))}</ul>}
    </div>
  );
}
