'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { api, ago } from '@/lib/client';
const TEXT: Record<string, string> = { like: 'liked your post', comment: 'commented on your post', follow: 'started following you', follow_request: 'requested to follow you', request_approved: 'approved your follow request', match: 'matched with you. Say hello!', reply: 'replied to your comment', verified: 'Your account is now verified', verification_rejected: 'Your verification was not approved. See Settings to try again' };
export default function NotificationsClient() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api<any[]>('/api/notifications').then(async (x) => { if (x.ok) { setRows(x.data); await api('/api/notifications', 'POST'); } else setRows([]); }); }, []);
  return (
    <div className="mx-auto max-w-2xl"><h1 className="mb-4 text-2xl font-black">Notifications</h1>
      {rows === null ? <p className="text-muted">Loading…</p> : rows.length === 0 ? <div className="card p-8 text-center text-soft">You&apos;re all caught up.</div> :
        <ul className="space-y-2">{rows.map((n) => <li key={n.id}><Link href={n.type === 'follow_request' ? '/settings' : n.type === 'match' ? `/messages?u=${n.username}` : `/profile/${n.username}`} className={`card flex items-center gap-3 p-3 hover:bg-hover ${n.read ? '' : 'border-brand-600/50'}`}><Avatar src={n.avatarUrl} name={n.displayName} size={42} /><p className="flex-1 text-sm"><b>{n.displayName}</b> <span className="text-soft">{TEXT[n.type] ?? 'interacted with you'}</span></p><span className="text-xs text-muted">{ago(n.createdAt)}</span></Link></li>)}</ul>}
    </div>
  );
}
