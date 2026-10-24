import { prisma } from '@/lib/db';
import { staff, ok } from '@/lib/http';

export const GET = staff(async (_r, _c, me) => {
  const now = new Date(), since = new Date(Date.now() - 30 * 864e5);
  const [members, newMembers, photos, clips, openReports, restricted, plusMembers] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.post.count({ where: { kind: 'PHOTO', status: 'VISIBLE' } }), prisma.post.count({ where: { kind: 'CLIP', status: 'VISIBLE' } }),
    prisma.report.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }), prisma.user.count({ where: { status: { not: 'ACTIVE' } } }),
    prisma.user.count({ where: { plan: 'PLUS', OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] } }),
  ]);
  // Money figures are for administrators only, not moderators.
  const money = me.role === 'ADMIN'
    ? await Promise.all([prisma.payment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: since } }, _sum: { amountKobo: true } }), prisma.payment.count({ where: { status: 'REVIEW' } })])
    : null;
  return ok({ members, newMembers, photos, clips, openReports, restricted, plusMembers, ...(money ? { revenue30: (money[0]._sum.amountKobo ?? 0) / 100, reviewPayments: money[1] } : {}) });
});
