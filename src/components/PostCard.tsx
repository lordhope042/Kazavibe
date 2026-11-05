'use client';
import { useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import Comments from './Comments';
import FollowButton from './FollowButton';
import BottomSheet from './BottomSheet';
import { useAppUI } from './AppUI';
import { api, ago } from '@/lib/client';
import { tap } from '@/lib/haptic';
import { REPORT_CATEGORIES } from '@/lib/areas';

export type PostT = { id: string; kind: 'PHOTO' | 'CLIP'; mediaUrl: string; caption: string; audience: string; createdAt: string; mine: boolean; following: boolean; likes: number; comments: number; liked: boolean; saved: boolean; author: { username: string; displayName: string; avatarUrl: string | null; verified: boolean } };

export default function PostCard({ post, onDeleted }: { post: PostT; onDeleted: (id: string) => void }) {
  const app = useAppUI();
  const [p, setP] = useState(post), [open, setOpen] = useState(false), [msg, setMsg] = useState(''), [menu, setMenu] = useState(false);
  async function like() { tap(); const nx = !p.liked; setP({ ...p, liked: nx, likes: p.likes + (nx ? 1 : -1) }); const x = await api(`/api/posts/${p.id}/like`, nx ? 'POST' : 'DELETE'); if (!x.ok) setP(p); }
  async function save() { const nx = !p.saved; setP({ ...p, saved: nx }); const x = await api(`/api/posts/${p.id}/save`, nx ? 'POST' : 'DELETE'); if (!x.ok) setP(p); }
  async function del() { if (confirm('Delete this post permanently?') && (await api(`/api/posts/${p.id}`, 'DELETE')).ok) onDeleted(p.id); }
  async function report(category: string) { if (!category) return; const x = await api('/api/reports', 'POST', { postId: p.id, category }); setMenu(false); setMsg(x.ok ? 'Report sent. Thank you.' : x.data.error ?? 'Could not send report.'); }
  async function share() { const url = `${location.origin}/profile/${p.author.username}`; try { if (navigator.share) await navigator.share({ title: `${p.author.displayName} on KazaVibe`, url }); else { await navigator.clipboard.writeText(url); setMsg('Link copied'); } } catch { /* cancelled */ } }
  const a = p.author;
  const media = p.kind === 'CLIP'
    ? <video src={p.mediaUrl} controls playsInline preload="metadata" className="max-h-[75vh] w-full bg-black" />
    : <img src={p.mediaUrl} alt={p.caption || `Photo by ${a.displayName}`} loading="lazy" className={`w-full object-cover ${app ? 'aspect-[4/5]' : 'max-h-[75vh]'}`} />;
  const count = (c: number) => (c === 1 ? '1 comment' : `${c} comments`);

  if (app) return ( // ---------- phone: edge-to-edge, like a social app ----------
    <article className="-mx-3 border-y border-line bg-card">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link href={`/profile/${a.username}`}><Avatar src={a.avatarUrl} name={a.displayName} size={38} /></Link>
        <div className="min-w-0 flex-1"><Link href={`/profile/${a.username}`} className="block truncate text-sm font-bold">{a.displayName}{a.verified && <i className="fa-solid fa-circle-check ml-1 text-xs text-brand-500" title="Verified" />}</Link><p className="truncate text-xs text-muted">{a.username} · {ago(p.createdAt)}{p.audience === 'FOLLOWERS' && ' · Followers'}</p></div>
        {!p.mine && !p.following && <FollowButton username={a.username} initial="none" />}
        <button aria-label="More" onClick={() => setMenu(true)} className="grid h-9 w-9 place-items-center rounded-full text-muted active:bg-hover"><i className="fa-solid fa-ellipsis" /></button>
      </div>
      {media}
      <div className="flex items-center gap-5 px-3 pt-3 text-2xl">
        <button onClick={like} aria-label="Like" aria-pressed={p.liked} className={`transition active:scale-125 ${p.liked ? 'text-brand-500' : ''}`}><i className={`${p.liked ? 'fa-solid' : 'fa-regular'} fa-heart`} /></button>
        <button onClick={() => setOpen(true)} aria-label="Comments"><i className="fa-regular fa-comment" /></button>
        <button onClick={share} aria-label="Share"><i className="fa-regular fa-paper-plane" /></button>
        <button onClick={save} aria-label="Save" aria-pressed={p.saved} className={`ml-auto ${p.saved ? 'text-brand-500' : ''}`}><i className={`${p.saved ? 'fa-solid' : 'fa-regular'} fa-bookmark`} /></button>
      </div>
      <p className="px-3 pt-2 text-sm font-bold">{p.likes} {p.likes === 1 ? 'like' : 'likes'}</p>
      {p.caption && <p className="px-3 pt-0.5 text-sm text-soft"><b className="text-fg">{a.username}</b> {p.caption}</p>}
      <button onClick={() => setOpen(true)} className="block px-3 pb-3 pt-1 text-sm text-muted">{p.comments ? `View ${count(p.comments)}` : 'Add a comment…'}</button>
      <p role="status" className="px-3 pb-2 text-xs text-good empty:hidden">{msg}</p>
      {open && <BottomSheet title="Comments" onClose={() => setOpen(false)}><Comments postId={p.id} onCount={(d) => setP((x) => ({ ...x, comments: x.comments + d }))} /></BottomSheet>}
      {menu && (
        <BottomSheet title="Post options" onClose={() => setMenu(false)}>
          {p.mine ? <button onClick={() => { setMenu(false); del(); }} className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-danger"><i className="fa-regular fa-trash-can w-5 text-center" />Delete post</button> : (
            <><p className="px-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Report this post</p>
              {REPORT_CATEGORIES.map((c) => <button key={c} onClick={() => report(c)} className="block w-full px-5 py-3 text-left text-sm capitalize active:bg-hover">{c.replaceAll('_', ' ').toLowerCase()}</button>)}</>)}
        </BottomSheet>)}
    </article>
  );

  return ( // ---------- website: unchanged ----------
    <article className="card overflow-hidden shadow-xl">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar src={a.avatarUrl} name={a.displayName} />
          <div><Link href={`/profile/${a.username}`} className="text-sm font-bold hover:underline">{a.displayName}{a.verified && <i className="fa-solid fa-circle-check ml-1 text-xs text-brand-500" title="Verified" />}</Link>
            <p className="text-xs text-muted">@{a.username} · {ago(p.createdAt)}{p.audience === 'FOLLOWERS' && ' · Followers'}</p></div>
        </div>
        {p.mine ? <button onClick={del} aria-label="Delete post" className="text-muted hover:text-danger"><i className="fa-regular fa-trash-can" /></button> : <FollowButton username={a.username} initial={p.following ? 'following' : 'none'} />}
      </div>
      {media}
      <div className="flex items-center gap-5 px-4 pt-3 text-lg text-muted">
        <button onClick={like} aria-label="Like" aria-pressed={p.liked} className={`flex items-center gap-1.5 text-sm ${p.liked ? 'text-brand-500' : 'hover:text-fg'}`}><i className={`${p.liked ? 'fa-solid' : 'fa-regular'} fa-heart text-lg`} />{p.likes}</button>
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Comments" className="flex items-center gap-1.5 text-sm hover:text-fg"><i className="fa-regular fa-comment text-lg" />{p.comments}</button>
        <button onClick={save} aria-label="Save" aria-pressed={p.saved} className={`ml-auto ${p.saved ? 'text-brand-500' : 'hover:text-fg'}`}><i className={`${p.saved ? 'fa-solid' : 'fa-regular'} fa-bookmark`} /></button>
        {!p.mine && <select aria-label="Report this post" defaultValue="" onChange={(e) => { report(e.target.value); e.target.value = ''; }} className="w-7 cursor-pointer appearance-none bg-transparent text-transparent" title="Report"><option value="">⚑</option>{REPORT_CATEGORIES.map((c) => <option key={c} value={c} className="text-black">{c.replaceAll('_', ' ').toLowerCase()}</option>)}</select>}
      </div>
      {p.caption && <p className="px-4 pt-2 text-sm text-soft"><b className="text-fg">{a.username}</b> {p.caption}</p>}
      <p role="status" className="px-4 text-xs text-good">{msg}</p>
      {open ? <Comments postId={p.id} onCount={(d) => setP((x) => ({ ...x, comments: x.comments + d }))} /> : <div className="h-3" />}
    </article>
  );
}
