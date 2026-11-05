import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { visibleProfile } from '@/lib/privacy';
import { avatarUrl } from '@/lib/posts';
import ProfileView from '@/components/ProfileView';

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
  // Private details are only sent to the browser when the viewer is allowed to see them.
  return <ProfileView d={{ username: p.username, displayName: p.displayName, verified: p.verified, area: p.area, visibility: p.visibility, bio: canSee ? p.bio : '', interests: canSee ? p.interests : [], avatarUrl: avatarUrl(p.avatarPath), canSee, self, followers, following, posts, state: f ? 'following' : req ? 'requested' : 'none' }} />;
}
