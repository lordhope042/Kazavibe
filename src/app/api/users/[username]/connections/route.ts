import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { visibleProfile } from '@/lib/privacy';
import { avatarUrl } from '@/lib/posts';

// Who follows a member / who they follow. Private profiles show these lists only to themselves and their followers.
export const GET = route(async (req, { params }, me) => {
  const type = new URL(req.url).searchParams.get('type') === 'following' ? 'following' : 'followers';
  const t = await visibleProfile(me.id, params.username);
  if (!t) return fail('Member not found', 404);
  if (t.userId !== me.id && t.visibility === 'PRIVATE' && !(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: t.userId } } }))) return fail('This profile is private.', 403);
  const clean = { status: 'ACTIVE' as const, blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } } };
  const prof = { select: { id: true, profile: { select: { username: true, displayName: true, avatarPath: true, area: true, verified: true } } } } as const;
  const people = type === 'followers'
    ? (await prisma.follow.findMany({ where: { followingId: t.userId, follower: clean }, orderBy: { createdAt: 'desc' }, take: 100, select: { follower: prof } })).map((r) => r.follower)
    : (await prisma.follow.findMany({ where: { followerId: t.userId, following: clean }, orderBy: { createdAt: 'desc' }, take: 100, select: { following: prof } })).map((r) => r.following);
  const ids = people.map((x) => x.id);
  const [f, r] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: me.id, followingId: { in: ids } }, select: { followingId: true } }),
    prisma.followRequest.findMany({ where: { fromId: me.id, toId: { in: ids } }, select: { toId: true } }),
  ]);
  const fs = new Set(f.map((x) => x.followingId)), rs = new Set(r.map((x) => x.toId));
  return ok(people.map((x) => ({ username: x.profile!.username, displayName: x.profile!.displayName, area: x.profile!.area, verified: x.profile!.verified, avatarUrl: avatarUrl(x.profile!.avatarPath), mine: x.id === me.id, state: fs.has(x.id) ? 'following' : rs.has(x.id) ? 'requested' : 'none' })));
});
