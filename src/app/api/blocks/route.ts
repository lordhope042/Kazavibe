import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';

const S = z.object({ username: z.string().min(1) });

export const GET = route(async (_r, _c, me) => {
  const rows = await prisma.block.findMany({ where: { blockerId: me.id }, select: { blocked: { select: { profile: { select: { username: true, displayName: true } } } } } });
  return ok(rows.map((r) => r.blocked.profile));
});

export const POST = route(async (req, _c, me) => {
  const { username } = S.parse(await req.json());
  const p = await prisma.profile.findUnique({ where: { username } });
  if (!p || p.userId === me.id) return fail('Member not found', 404);
  const pair = [{ followerId: me.id, followingId: p.userId }, { followerId: p.userId, followingId: me.id }];
  await prisma.$transaction([
    prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: me.id, blockedId: p.userId } }, create: { blockerId: me.id, blockedId: p.userId }, update: {} }),
    prisma.follow.deleteMany({ where: { OR: pair } }),
    prisma.followRequest.deleteMany({ where: { OR: [{ fromId: me.id, toId: p.userId }, { fromId: p.userId, toId: me.id }] } }),
    prisma.interest.deleteMany({ where: { OR: [{ fromId: me.id, toId: p.userId }, { fromId: p.userId, toId: me.id }] } }),
    prisma.match.deleteMany({ where: { OR: [{ userAId: me.id, userBId: p.userId }, { userAId: p.userId, userBId: me.id }] } }),
  ]);
  return ok({ ok: true });
});

export const DELETE = route(async (req, _c, me) => {
  const { username } = S.parse(await req.json());
  const p = await prisma.profile.findUnique({ where: { username } });
  if (!p) return fail('Member not found', 404);
  await prisma.block.deleteMany({ where: { blockerId: me.id, blockedId: p.userId } });
  return ok({ ok: true });
});
