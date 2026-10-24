'use client';
import { useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import Comments from './Comments';
import FollowButton from './FollowButton';
import { api, ago } from '@/lib/client';
import { REPORT_CATEGORIES } from '@/lib/areas';

export type PostT = { id: string; kind: 'PHOTO' | 'CLIP'; mediaUrl: string; caption: string; audience: string; createdAt: string; mine: boolean; following: boolean; likes: number; comments: number; liked: boolean; saved: boolean; author: { username: string; displayName: string; avatarUrl: string | null; verified: boolean } };

export default function PostCard({ post, onDeleted }: { post: PostT; onDeleted: (id: string) => void }) {
  const [p, setP] = useState(post), [open, setOpen] = useState(false), [msg, setMsg] = useState('');
  async function like() { const nx = !p.liked; setP({ ...p, liked: nx, likes: p.likes + (nx ? 1 : -1) }); const x = await api(`/api/posts/${p.id}/like`, nx ? 'POST' : 'DELETE'); if (!x.ok) setP(p); }
  async function save() { const nx = !p.saved; setP({ ...p, saved: nx }); const x = await api(`/api/posts/${p.id}/save`, nx ? 'POST' : 'DELETE'); if (!x.ok) setP(p); }
  async function del() { if (confirm('Delete this post permanently?') && (await api(`/api/posts/${p.id}`, 'DELETE')).ok) onDeleted(p.id); }
  async function report(category: string) { if (!category) return; const x = await api('/api/reports', 'POST', { postId: p.id, category }); setMsg(x.ok ? 'Report sent. Thank you.' : x.data.error ?? 'Could not send report.'); }
  const a = p.author;
  return (
    <article className="card overflow-hidden shadow-xl">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar src={a.avatarUrl} name={a.displayName} />
          <div><Link href={`/profile/${a.username}`} className="text-sm font-bold hover:underline">{a.displayName}{a.verified && <i className="fa-solid fa-circle-check ml-1 text-xs text-brand-500" title="Verified" />}</Link>
            <p className="text-xs text-muted">@{a.username} · {ago(p.createdAt)}{p.audience === 'FOLLOWERS' && ' · Followers'}</p></div>
        </div>
        {p.mine ? <button onClick={del} aria-label="Delete post" className="text-muted hover:text-danger"><i className="fa-regular fa-trash-can" /></button> : <FollowButton username={a.username} initial={p.following ? 'following' : 'none'} />}
      </div>
      {p.kind === 'CLIP' ? <video src={p.mediaUrl} controls playsInline preload="metadata" className="max-h-[75vh] w-full bg-black" /> : <img src={p.mediaUrl} alt={p.caption || `Photo by ${a.displayName}`} loading="lazy" className="max-h-[75vh] w-full object-cover" />}
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
