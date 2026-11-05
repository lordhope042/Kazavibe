'use client';
import { useCallback, useEffect, useState } from 'react';
import PostCard, { type PostT } from './PostCard';
import { Skeleton } from './Skeleton';
import { api } from '@/lib/client';

/** Phone profile: posts as a 3-column grid. Tap one to open a scrollable viewer starting there. */
export default function PostGrid({ username }: { username: string }) {
  const [items, setItems] = useState<PostT[] | null>(null), [next, setNext] = useState<string | null>(null), [view, setView] = useState<number | null>(null);
  const load = useCallback(async (cursor?: string) => {
    const x = await api<{ items: PostT[]; next: string | null }>(`/api/posts?feed=user&username=${encodeURIComponent(username)}${cursor ? `&cursor=${cursor}` : ''}`);
    if (!x.ok) return setItems((c) => c ?? []);
    setNext(x.data.next); setItems((c) => (cursor && c ? [...c, ...x.data.items] : x.data.items));
  }, [username]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (view === null) return; const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, [view]);
  if (items === null) return <div className="grid grid-cols-3 gap-0.5">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>;
  if (!items.length) return <p className="py-14 text-center text-soft"><i className="fa-regular fa-image mb-2 block text-3xl text-muted" />No posts yet.</p>;
  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {items.map((p, i) => (
          <button key={p.id} onClick={() => setView(i)} aria-label={p.caption || (p.kind === 'CLIP' ? 'Open clip' : 'Open photo')} className="relative aspect-square overflow-hidden bg-input">
            {p.kind === 'CLIP' ? <video src={`${p.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={p.mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
            {p.kind === 'CLIP' && <i className="fa-solid fa-play absolute right-1.5 top-1.5 text-xs text-white drop-shadow" />}
          </button>))}
      </div>
      {next && <button className="btn-ghost mx-auto my-4 block" onClick={() => load(next)}>Load more</button>}
      {view !== null && (
        <div className="fixed inset-0 z-[85] overflow-y-auto bg-bg px-3 pb-8" role="dialog" aria-modal="true" aria-label="Posts">
          <div className="sticky top-0 z-10 -mx-3 flex items-center gap-2 border-b border-line bg-card/95 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur"><button aria-label="Back" onClick={() => setView(null)} className="grid h-10 w-10 place-items-center rounded-full text-lg active:bg-hover"><i className="fa-solid fa-chevron-left" /></button><b>Posts</b></div>
          <div className="space-y-2 pt-3">{items.slice(view).map((p) => <PostCard key={p.id} post={p} onDeleted={(id) => setItems((l) => (l ?? []).filter((x) => x.id !== id))} />)}</div>
        </div>)}
    </>
  );
}
