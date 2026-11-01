import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { LIMITS, planOf } from '@/lib/plan';
export const GET = route(async (_r, _c, me) => {
  const plan = planOf(me);
  const used = await prisma.interest.count({ where: { fromId: me.id, kind: 'LIKE', createdAt: { gte: new Date(Date.now() - 864e5) } } });
  return ok({ plan, expiresAt: me.planExpiresAt, likesPerDay: LIMITS[plan].likesPerDay, likesLeft: Math.max(0, LIMITS[plan].likesPerDay - used) });
});
