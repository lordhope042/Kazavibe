import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { visibleProfile } from '@/lib/privacy';
import { notify } from '@/lib/notify';

export const POST = route(async (_r, { params }, me) => {
  const t = await visibleProfile(me.id, params.username);
  if (!t) return fail('Member not found', 404);
  if (t.userId === me.id) return fail("You can't follow yourself");
  if (t.visibility === 'PRIVATE') {
    await prisma.followRequest.upsert({ where: { fromId_toId: { fromId: me.id, toId: t.userId } }, create: { fromId: me.id, toId: t.userId }, update: {} });
    await notify(t.userId, me.id, 'follow_request');
    return ok({ status: 'requested' });
  }
  await prisma.follow.upsert({ where: { followerId_followingId: { followerId: me.id, followingId: t.userId } }, create: { followerId: me.id, followingId: t.userId }, update: {} });
  await notify(t.userId, me.id, 'follow');
  return ok({ status: 'following' });
});

export const DELETE = route(async (_r, { params }, me) => {
  const p = await prisma.profile.findUnique({ where: { username: params.username } });
  if (!p) return fail('Member not found', 404);
  await prisma.$transaction([
    prisma.follow.deleteMany({ where: { followerId: me.id, followingId: p.userId } }),
    prisma.followRequest.deleteMany({ where: { fromId: me.id, toId: p.userId } }),
  ]);
  return ok({ status: 'none' });
});
