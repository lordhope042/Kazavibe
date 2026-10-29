import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { PLANS } from '@/lib/billing';
import { planOf, plusFreeNow, FREE_UNTIL } from '@/lib/plan';
export const GET = route(async (_r, _c, me) => {
  const payments = await prisma.payment.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 10, select: { reference: true, planId: true, amountKobo: true, status: true, createdAt: true } });
  return ok({ plan: planOf(me), freeForAll: plusFreeNow(), freeUntil: FREE_UNTIL, expiresAt: me.planExpiresAt, plans: PLANS, hasEmail: !!me.email, payments: payments.map((p) => ({ ...p, amountNgn: p.amountKobo / 100 })) });
});
