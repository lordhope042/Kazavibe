import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { avatarUrl } from '@/lib/posts';
import { cleanupCalls } from '@/lib/calls';
export const GET = route(async (_r, _c, me) => {
  await cleanupCalls();
  const c = await prisma.call.findFirst({
    where: { calleeId: me.id, status: 'RINGING', caller: { blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } } } },
    orderBy: { createdAt: 'desc' }, select: { id: true, kind: true, caller: { select: { profile: { select: { username: true, displayName: true, avatarPath: true } } } } },
  });
  const p = c?.caller.profile;
  return ok({ call: c && p ? { id: c.id, kind: c.kind, from: { username: p.username, displayName: p.displayName, avatarUrl: avatarUrl(p.avatarPath) } } : null });
});
