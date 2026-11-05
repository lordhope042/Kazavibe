'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { RowSkeleton } from './Skeleton';
import { useAppUI } from './AppUI';
import { api, ago } from '@/lib/client';

const TEXT: Record<string, string> = { like: 'liked your post', comment: 'commented on your post', follow: 'started following you', follow_request: 'requested to follow you', request_approved: 'approved your follow request', match: 'matched with you. Say hello!', reply: 'replied to your comment', verified: 'Your account is now verified', verification_rejected: 'Your verification was not approved. See Settings to try again' };
const ICON: Record<string, string> = { like: 'fa-heart', comment: 'fa-comment', reply: 'fa-reply', follow: 'fa-user-plus', follow_request: 'fa-user-clock', request_approved: 'fa-user-check', match: 'fa-heart-circle-check', verified: 'fa-circle-check', verification_rejected: 'fa-circle-xmark' };
const FILTERS: [string, string, string[] | null][] = [['all', 'All', null], ['follows', 'Follows', ['follow', 'follow_request', 'request_approved']], ['likes', 'Likes', ['like']], ['comments', 'Comments', ['comment', 'reply']]];
const href = (n: any) => (n.type === 'follow_request' ? '/settings' : n.type === 'match' ? `/messages?u=${n.username}` : `/profile/${n.username}`);

export default function NotificationsClient() {
  const app = useAppUI();
  const [rows, setRows] = useState<any[] | null>(null), [f, setF] = useState('all');
  useEffect(() => { api<any[]>('/api/notifications').then(async (x) => { if (x.ok) { setRows(x.data); await api('/api/notifications', 'POST'); } else setRows([]); }); }, []);
  const types = FILTERS.find(([k]) => k === f)![2], list = (rows ?? []).filter((n) => !types || types.includes(n.type));
  const today = new Date().toDateString(), groups: [string, any[]][] = [['Today', list.filter((n) => new Date(n.createdAt).toDateString() === today)], ['Earlier', list.filter((n) => new Date(n.createdAt).toDateString() !== today)]];
  if (!app) return ( // ---------- website: unchanged ----------
    <div className="mx-auto max-w-2xl"><h1 className="mb-4 text-2xl font-black">Notifications</h1>
      {rows === null ? <div className="space-y-2"><RowSkeleton /><RowSkeleton /><RowSkeleton /></div> : rows.length === 0 ? <div className="card p-8 text-center text-soft">You&apos;re all caught up.</div> :
        <ul className="space-y-2">{rows.map((n) => <li key={n.id}><Link href={href(n)} className={`card flex items-center gap-3 p-3 hover:bg-hover ${n.read ? '' : 'border-brand-600/50'}`}><Avatar src={n.avatarUrl} name={n.displayName} size={42} /><p className="flex-1 text-sm"><b>{n.displayName}</b> <span className="text-soft">{TEXT[n.type] ?? 'interacted with you'}</span></p><span className="text-xs text-muted">{ago(n.createdAt)}</span></Link></li>)}</ul>}
    </div>
  );
  return ( // ---------- phone ----------
    <div className="-mx-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-3">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={`chip shrink-0 ${f === k ? 'chip-on' : ''}`}>{l}</button>)}</div>
      {rows === null ? <div className="space-y-2 px-3"><RowSkeleton /><RowSkeleton /><RowSkeleton /></div> : list.length === 0 ? <p className="px-6 py-16 text-center text-soft"><i className="fa-regular fa-bell mb-2 block text-3xl text-muted" />Nothing here yet.</p> :
        groups.filter(([, g]) => g.length).map(([title, g]) => (
          <section key={title}><h2 className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
            <ul className="divide-y divide-line border-y border-line bg-card">{g.map((n) => (
              <li key={n.id}><Link href={href(n)} className="flex items-center gap-3 px-4 py-3 active:bg-hover">
                <span className="relative shrink-0"><Avatar src={n.avatarUrl} name={n.displayName} size={46} /><span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-card bg-brand-600 text-[9px] text-white"><i className={`fa-solid ${ICON[n.type] ?? 'fa-bell'}`} /></span></span>
                <p className="min-w-0 flex-1 text-sm leading-snug"><b>{n.displayName}</b> <span className="text-soft">{TEXT[n.type] ?? 'interacted with you'}</span><span className="block text-xs text-muted">{ago(n.createdAt)}</span></p>
                {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" aria-label="New" />}
              </Link></li>))}</ul></section>))}
    </div>
  );
}
