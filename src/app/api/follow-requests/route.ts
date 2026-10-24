import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
export const GET = route(async (_r, _c, me) => {
  const rows = await prisma.followRequest.findMany({
    where: { toId: me.id, from: { status: 'ACTIVE', blockedBy: { none: { blockerId: me.id } } } },
    orderBy: { createdAt: 'desc' }, take: 50,
    select: { id: true, createdAt: true, from: { select: { profile: { select: { username: true, displayName: true } } } } },
  });
  return ok(rows.map((r) => ({ id: r.id, createdAt: r.createdAt, ...r.from.profile })));
});
