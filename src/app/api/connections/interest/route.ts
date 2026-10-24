import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { visibleProfile } from '@/lib/privacy';
import { LIMITS, planOf, sortedPair } from '@/lib/plan';
import { notify } from '@/lib/notify';

const S = z.object({ username: z.string().min(1), action: z.enum(['like', 'pass']) });

// A like is private. Nothing is sent to the other person unless they have already liked you (then it becomes a match).
export const POST = route(async (req, _c, me) => {
  const b = S.parse(await req.json());
  if (!me.profile!.datingIntent) return fail('Turn on "Open to dating" first.', 403);
  const t = await visibleProfile(me.id, b.username);
  if (!t || t.userId === me.id || !t.datingIntent) return fail('Member not found', 404);
  const key = { fromId_toId: { fromId: me.id, toId: t.userId } };
  if (b.action === 'pass') {
    await prisma.interest.upsert({ where: key, create: { fromId: me.id, toId: t.userId, kind: 'PASS' }, update: { kind: 'PASS' } });
    return ok({ matched: false });
  }
  const existing = await prisma.interest.findUnique({ where: key });
  if (existing?.kind !== 'LIKE') {
    const plan = planOf(me), cap = LIMITS[plan].likesPerDay;
    const used = await prisma.interest.count({ where: { fromId: me.id, kind: 'LIKE', createdAt: { gte: new Date(Date.now() - 864e5) } } });
    if (used >= cap) return fail(plan === 'FREE' ? `You've used your ${cap} likes for today. Plus members get ${LIMITS.PLUS.likesPerDay}.` : 'Daily like limit reached. Try again tomorrow.', 429);
    await prisma.interest.upsert({ where: key, create: { fromId: me.id, toId: t.userId, kind: 'LIKE' }, update: { kind: 'LIKE', createdAt: new Date() } });
  }
  const back = await prisma.interest.findUnique({ where: { fromId_toId: { fromId: t.userId, toId: me.id } } });
  if (back?.kind !== 'LIKE') return ok({ matched: false });
  const [userAId, userBId] = sortedPair(me.id, t.userId);
  await prisma.$transaction([
    prisma.match.upsert({ where: { userAId_userBId: { userAId, userBId } }, create: { userAId, userBId }, update: {} }),
    prisma.conversation.upsert({ where: { userAId_userBId: { userAId, userBId } }, create: { userAId, userBId, initiatorId: me.id, accepted: true }, update: { accepted: true } }),
  ]);
  await Promise.all([notify(t.userId, me.id, 'match'), notify(me.id, t.userId, 'match')]);
  return ok({ matched: true, username: t.username });
});
