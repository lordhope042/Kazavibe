import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { visibleProfile } from '@/lib/privacy';
import { avatarUrl } from '@/lib/posts';
import Avatar from '@/components/Avatar';
import Feed from '@/components/Feed';
import ProfileActions from '@/components/ProfileActions';

export default async function Page({ params }: { params: { username: string } }) {
  const me = (await currentUser())!;
  const p = await visibleProfile(me.id, params.username);
  if (!p) notFound();
  const self = p.userId === me.id;
  const [f, req] = self ? [null, null] : await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: p.userId } } }),
    prisma.followRequest.findUnique({ where: { fromId_toId: { fromId: me.id, toId: p.userId } } }),
  ]);
  const canSee = self || p.visibility === 'PUBLIC' || !!f; // enforced on the server; the posts API applies the same rule
  const [followers, following, posts] = canSee ? await Promise.all([
    prisma.follow.count({ where: { followingId: p.userId } }), prisma.follow.count({ where: { followerId: p.userId } }),
    prisma.post.count({ where: { authorId: p.userId, status: 'VISIBLE' } }),
  ]) : [null, null, null];
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6 text-center">
        <div className="flex justify-center"><Avatar src={avatarUrl(p.avatarPath)} name={p.displayName} size={96} /></div>
        <h1 className="mt-3 text-2xl font-black">{p.displayName}{p.verified && <i className="fa-solid fa-circle-check ml-1.5 text-base text-brand-500" title="Verified" />}</h1>
        <p className="text-sm text-muted">@{p.username} · <i className="fa-solid fa-location-dot" /> {p.area} · {p.visibility === 'PRIVATE' ? 'Private' : 'Public'}</p>
        {canSee ? (<>
          {p.bio && <p className="mt-3 text-soft">{p.bio}</p>}
          {p.interests.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-1.5">{p.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div>}
          <div className="mt-4 flex justify-center gap-10"><div><b className="block text-lg">{posts}</b><span className="text-xs text-muted">Posts</span></div><div><b className="block text-lg">{followers}</b><span className="text-xs text-muted">Followers</span></div><div><b className="block text-lg">{following}</b><span className="text-xs text-muted">Following</span></div></div>
        </>) : <p className="mt-4 text-soft">This profile is private. Follow to send a request.</p>}
        {self ? <Link href="/settings" className="btn btn-sm mt-4 inline-block">Edit profile</Link> : <ProfileActions username={p.username} initial={f ? 'following' : req ? 'requested' : 'none'} />}
      </div>
      {canSee && <Feed feed="user" username={p.username} empty="No posts yet." />}
    </div>
  );
}
