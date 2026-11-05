'use client';
import { useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import Feed from './Feed';
import PostGrid from './PostGrid';
import ProfileActions from './ProfileActions';
import { useAppUI } from './AppUI';
import type { FollowState } from './FollowButton';

export type ProfileData = { username: string; displayName: string; verified: boolean; area: string; visibility: 'PUBLIC' | 'PRIVATE'; bio: string; interests: string[]; avatarUrl: string | null; canSee: boolean; self: boolean; followers: number | null; following: number | null; posts: number | null; state: FollowState };

export default function ProfileView({ d }: { d: ProfileData }) {
  const app = useAppUI(), [tab, setTab] = useState<'posts' | 'about'>('posts');
  const conn = (t: 'followers' | 'following') => `/profile/${d.username}/connections?tab=${t}`;
  const check = d.verified && <i className="fa-solid fa-circle-check ml-1.5 text-brand-500" title="Verified" />;

  if (!app) return ( // ---------- website: unchanged (counts are now links) ----------
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6 text-center">
        <div className="flex justify-center"><Avatar src={d.avatarUrl} name={d.displayName} size={96} /></div>
        <h1 className="mt-3 text-2xl font-black">{d.displayName}{check}</h1>
        <p className="text-sm text-muted">@{d.username} · <i className="fa-solid fa-location-dot" /> {d.area} · {d.visibility === 'PRIVATE' ? 'Private' : 'Public'}</p>
        {d.canSee ? (<>
          {d.bio && <p className="mt-3 text-soft">{d.bio}</p>}
          {d.interests.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-1.5">{d.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div>}
          <div className="mt-4 flex justify-center gap-10"><div><b className="block text-lg">{d.posts}</b><span className="text-xs text-muted">Posts</span></div>
            <Link href={conn('followers')}><b className="block text-lg">{d.followers}</b><span className="text-xs text-muted">Followers</span></Link><Link href={conn('following')}><b className="block text-lg">{d.following}</b><span className="text-xs text-muted">Following</span></Link></div>
        </>) : <p className="mt-4 text-soft">This profile is private. Follow to send a request.</p>}
        {d.self ? <Link href="/settings" className="btn btn-sm mt-4 inline-block">Edit profile</Link> : <ProfileActions username={d.username} initial={d.state} />}
      </div>
      {d.canSee && <Feed feed="user" username={d.username} empty="No posts yet." />}
    </div>
  );

  return ( // ---------- phone: cover, overlapping photo, stats, tabs, post grid ----------
    <div className="-mx-3 -mt-3">
      <div className="h-32 bg-gradient-to-br from-brand-600 via-amber-500 to-brand-500" aria-hidden="true" />
      <div className="px-4">
        <div className="-mt-12 flex items-end justify-between"><span className="rounded-full border-4 border-bg bg-bg"><Avatar src={d.avatarUrl} name={d.displayName} size={92} /></span>
          {d.self && <Link href="/settings" className="btn-ghost btn-sm mb-1">Edit profile</Link>}</div>
        <h1 className="mt-2 text-xl font-black">{d.displayName}{check}</h1>
        <p className="text-sm text-muted">@{d.username} · <i className="fa-solid fa-location-dot" /> {d.area} · {d.visibility === 'PRIVATE' ? 'Private' : 'Public'}</p>
        {d.canSee ? (<>
          {d.bio && <p className="mt-2 text-sm text-soft">{d.bio}</p>}
          <div className="mt-4 grid grid-cols-3 rounded-2xl border border-line bg-card py-3 text-center">
            <div><b className="block text-lg">{d.posts}</b><span className="text-xs text-muted">Posts</span></div>
            <Link href={conn('followers')} className="border-x border-line"><b className="block text-lg">{d.followers}</b><span className="text-xs text-muted">Followers</span></Link>
            <Link href={conn('following')}><b className="block text-lg">{d.following}</b><span className="text-xs text-muted">Following</span></Link>
          </div>
        </>) : <p className="mt-3 rounded-2xl border border-line bg-card p-4 text-sm text-soft"><i className="fa-solid fa-lock mr-1.5 text-brand-500" />This profile is private. Follow to send a request.</p>}
        {!d.self && <div className="mt-3 [&>div]:mt-0"><ProfileActions username={d.username} initial={d.state} /></div>}
      </div>
      {d.canSee && (
        <>
          <div className="mt-4 flex border-b border-line" role="tablist">
            {(['posts', 'about'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 py-3 text-sm font-semibold capitalize ${tab === k ? 'border-b-2 border-brand-500 text-brand-500' : 'text-muted'}`}><i className={`fa-solid ${k === 'posts' ? 'fa-table-cells' : 'fa-circle-info'} mr-1.5`} />{k}</button>)}
          </div>
          {tab === 'posts' ? <PostGrid username={d.username} /> : (
            <div className="space-y-4 p-4 text-sm">
              <div><h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Bio</h2><p className="text-soft">{d.bio || 'No bio yet.'}</p></div>
              <div><h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">Interests</h2>{d.interests.length ? <div className="flex flex-wrap gap-1.5">{d.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div> : <p className="text-soft">None added.</p>}</div>
              <div><h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Area</h2><p className="text-soft"><i className="fa-solid fa-location-dot mr-1.5 text-brand-500" />{d.area}</p></div>
            </div>)}
        </>)}
    </div>
  );
}
