'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { api } from '@/lib/client';

/** Phone Home: a row of people to meet, like stories. The first tile starts a new post. */
export default function StoryRow() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/api/discover?limit=12').then((x) => x.ok && setRows(x.data)); }, []);
  return (
    <div className="no-scrollbar -mx-3 mb-3 flex gap-3 overflow-x-auto px-3 pb-1" aria-label="People to meet">
      <button onClick={() => window.dispatchEvent(new Event('kv:compose'))} className="flex w-[68px] shrink-0 flex-col items-center gap-1 text-[11px] text-soft">
        <span className="grid h-[66px] w-[66px] place-items-center rounded-full border-2 border-dashed border-brand-600 text-xl text-brand-500"><i className="fa-solid fa-plus" /></span>Your post
      </button>
      {rows.map((r) => (
        <Link key={r.username} href={`/profile/${r.username}`} className="flex w-[68px] shrink-0 flex-col items-center gap-1 text-[11px] text-soft">
          <span className="rounded-full bg-gradient-to-tr from-brand-600 to-amber-500 p-[2px]"><span className="block rounded-full bg-bg p-[2px]"><Avatar src={r.avatarUrl} name={r.displayName} size={58} /></span></span>
          <span className="w-full truncate text-center">{r.displayName.split(' ')[0]}</span>
        </Link>))}
    </div>
  );
}
