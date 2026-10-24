import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { avatarUrl } from '@/lib/posts';
import { planOf } from '@/lib/plan';

// "Who liked you" is a Plus feature. Free members only get the count.
export const GET = route(async (_r, _c, me) => {
  const rows = await prisma.interest.findMany({
    where: { toId: me.id, kind: 'LIKE', from: { status: 'ACTIVE', blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } }, profile: { datingIntent: true }, interestsGot: { none: { fromId: me.id } } } },
    orderBy: { createdAt: 'desc' }, take: 50,
    select: { from: { select: { profile: { select: { username: true, displayName: true, area: true, intent: true, avatarPath: true } } } } },
  });
  const plus = planOf(me) === 'PLUS';
  return ok({ count: rows.length, locked: !plus, items: plus ? rows.map((r) => { const p = r.from.profile!; return { username: p.username, displayName: p.displayName, area: p.area, intent: p.intent, avatarUrl: avatarUrl(p.avatarPath) }; }) : [] });
});
