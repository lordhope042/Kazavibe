'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import FollowButton from './FollowButton';
import { api } from '@/lib/client';
export default function Suggestions() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/api/discover?limit=30').then((x) => x.ok && setRows(x.data.filter((r) => r.state === 'none').slice(0, 5))); }, []);
  if (!rows.length) return null;
  return (
    <div className="card sticky top-20 p-4"><h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">People to follow</h2>
      <ul className="space-y-3">{rows.map((r) => <li key={r.username} className="flex items-center gap-3"><Avatar src={r.avatarUrl} name={r.displayName} size={36} /><Link href={`/profile/${r.username}`} className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{r.displayName}</div><div className="truncate text-xs text-muted">{r.area}</div></Link><FollowButton username={r.username} initial="none" /></li>)}</ul>
      <Link href="/discover" className="mt-3 block text-center text-xs text-brand-500">See all</Link></div>
  );
}
