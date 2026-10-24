import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { avatarUrl } from '@/lib/posts';
import { markDelivered, visibleMsg } from '@/lib/messages';

export const GET = route(async (req, _c, me) => {
  if (new URL(req.url).searchParams.get('count')) {
    await markDelivered(me.id); // the recipient's app is open, so their incoming messages count as delivered
    const [unread, unreadMessages] = await Promise.all([
      prisma.notification.count({ where: { userId: me.id, readAt: null } }),
      prisma.message.count({ where: { senderId: { not: me.id }, readAt: null, deletedAt: null, ...visibleMsg(me.id) } }),
    ]);
    return ok({ unread, unreadMessages });
  }
  const rows = await prisma.notification.findMany({
    where: { userId: me.id, actor: { status: 'ACTIVE', blockedBy: { none: { blockerId: me.id } } } }, orderBy: { createdAt: 'desc' }, take: 40,
    select: { id: true, type: true, postId: true, readAt: true, createdAt: true, actor: { select: { profile: { select: { username: true, displayName: true, avatarPath: true } } } } },
  });
  return ok(rows.map((n) => ({ id: n.id, type: n.type, postId: n.postId, read: !!n.readAt, createdAt: n.createdAt, username: n.actor.profile!.username, displayName: n.actor.profile!.displayName, avatarUrl: avatarUrl(n.actor.profile!.avatarPath) })));
});
export const POST = route(async (_r, _c, me) => { await prisma.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } }); return ok({ ok: true }); });
