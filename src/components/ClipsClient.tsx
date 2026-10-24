'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Comments from './Comments';
import FollowButton from './FollowButton';
import { api } from '@/lib/client';
import type { PostT } from './PostCard';

function Clip({ c, muted, setMuted }: { c: PostT; muted: boolean; setMuted: (m: boolean) => void }) {
  const box = useRef<HTMLElement>(null), vid = useRef<HTMLVideoElement>(null);
  const [p, setP] = useState(c), [cm, setCm] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { const v = vid.current; if (!v) return; if (e.intersectionRatio > 0.6) v.play().catch(() => {}); else { v.pause(); } }, { threshold: [0, 0.6, 1] });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  async function like() { const nx = !p.liked; setP({ ...p, liked: nx, likes: p.likes + (nx ? 1 : -1) }); const x = await api(`/api/posts/${p.id}/like`, nx ? 'POST' : 'DELETE'); if (!x.ok) setP(p); }
  async function save() { const nx = !p.saved; setP({ ...p, saved: nx }); await api(`/api/posts/${p.id}/save`, nx ? 'POST' : 'DELETE'); }
  const Btn = ({ on, ic, n, label, f }: { on?: boolean; ic: string; n?: number | string; label: string; f: () => void }) =>
    <button onClick={f} aria-label={label} aria-pressed={on} className={`flex flex-col items-center text-xs ${on ? 'text-brand-500' : 'text-white'}`}><i className={`${on ? 'fa-solid' : 'fa-regular'} ${ic} text-2xl drop-shadow`} />{n}</button>;
  return (
    <section ref={box} className="relative h-full snap-start overflow-hidden rounded-3xl bg-black">
      <video ref={vid} src={p.mediaUrl} loop playsInline muted={muted} preload="metadata" onClick={(e) => { const v = e.currentTarget; v.paused ? v.play() : v.pause(); }} className="h-full w-full object-cover" />
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <Btn on={p.liked} ic="fa-heart" n={p.likes} label="Like" f={like} />
        <Btn ic="fa-comment" n={p.comments} label="Comments" f={() => setCm(true)} />
        <Btn on={p.saved} ic="fa-bookmark" label="Save" f={save} />
        <button onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'} className="text-white"><i className={`fa-solid ${muted ? 'fa-volume-xmark' : 'fa-volume-high'} text-xl drop-shadow`} /></button>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pr-16 text-white">
        <div className="flex items-center gap-2"><Link href={`/profile/${p.author.username}`} className="font-bold">@{p.author.username}</Link>{!p.mine && <FollowButton username={p.author.username} initial={p.following ? 'following' : 'none'} />}</div>
        {p.caption && <p className="mt-1 line-clamp-3 text-sm">{p.caption}</p>}
      </div>
      {cm && <div className="absolute inset-x-0 bottom-0 max-h-[70%] overflow-y-auto rounded-t-3xl bg-card text-fg"><div className="flex items-center justify-between px-4 pt-3"><b>Comments</b><button aria-label="Close comments" onClick={() => setCm(false)}><i className="fa-solid fa-xmark" /></button></div><Comments postId={p.id} onCount={(d) => setP((x) => ({ ...x, comments: x.comments + d }))} /></div>}
    </section>
  );
}

export default function ClipsClient() {
  const [tab, setTab] = useState<'clips-following' | 'clips'>('clips-following'), [items, setItems] = useState<PostT[] | null>(null), [next, setNext] = useState<string | null>(null), [muted, setMuted] = useState(true);
  const load = useCallback(async (cursor?: string) => {
    const x = await api<{ items: PostT[]; next: string | null }>(`/api/posts?feed=${tab}${cursor ? `&cursor=${cursor}` : ''}`);
    if (!x.ok) return;
    setNext(x.data.next); setItems((cur) => (cursor && cur ? [...cur, ...x.data.items] : x.data.items));
  }, [tab]);
  useEffect(() => { setItems(null); load(); }, [load]);
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex justify-center gap-2">
        {([['clips-following', 'Following'], ['clips', 'Discover']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip ${tab === k ? 'chip-on' : ''}`}>{l}</button>)}
      </div>
      <div className="no-scrollbar h-[calc(100dvh-11rem)] snap-y snap-mandatory space-y-3 overflow-y-auto">
        {items === null ? <p className="text-center text-muted">Loading…</p> : items.length === 0 ? <div className="card p-8 text-center text-soft">{tab === 'clips-following' ? 'No clips from people you follow yet. Try the Discover tab.' : 'No clips yet. Be the first to post one.'}</div> :
          <>{items.map((c) => <div key={c.id} className="h-full snap-start"><Clip c={c} muted={muted} setMuted={setMuted} /></div>)}
            {next && <button className="btn-ghost mx-auto block" onClick={() => load(next)}>Load more</button>}</>}
      </div>
    </div>
  );
}
