'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PostCard, { type PostT } from './PostCard';
import { api } from '@/lib/client';

export default function Feed({ feed, username, empty }: { feed: string; username?: string; empty?: React.ReactNode }) {
  const [items, setItems] = useState<PostT[] | null>(null), [next, setNext] = useState<string | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const load = useCallback(async (cursor?: string) => {
    setBusy(true);
    const qs = new URLSearchParams({ feed, ...(username ? { username } : {}), ...(cursor ? { cursor } : {}) });
    const x = await api<{ items: PostT[]; next: string | null }>(`/api/posts?${qs}`);
    setBusy(false);
    if (!x.ok) return setErr('Could not load posts.');
    setErr(''); setNext(x.data.next); setItems((cur) => (cursor && cur ? [...cur, ...x.data.items] : x.data.items));
  }, [feed, username]);
  useEffect(() => { load(); const h = () => load(); window.addEventListener('kv:posted', h); return () => window.removeEventListener('kv:posted', h); }, [load]);
  if (items === null) return <p className="text-muted">{err || 'Loading…'}</p>;
  if (!items.length) return <div className="card p-8 text-center text-soft">{empty ?? <>Nothing here yet. <Link href="/discover" className="text-brand-500 underline">Find people to follow</Link>.</>}</div>;
  return (
    <div className="space-y-6">
      {items.map((p) => <PostCard key={p.id} post={p} onDeleted={(id) => setItems((l) => l!.filter((x) => x.id !== id))} />)}
      {next && <button className="btn-ghost mx-auto block" disabled={busy} onClick={() => load(next)}>{busy ? 'Loading…' : 'Load more'}</button>}
      <p role="alert" className="text-center text-sm text-danger">{err}</p>
    </div>
  );
}
