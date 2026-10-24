import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { visibleProfile } from '@/lib/privacy';
import { avatarUrl } from '@/lib/posts';
import { markDelivered, preview, statusOf, visibleMsg } from '@/lib/messages';

const prof = { select: { id: true, profile: { select: { username: true, displayName: true, avatarPath: true } } } } as const;

export const GET = route(async (_r, _c, me) => {
  await markDelivered(me.id);
  const vis = visibleMsg(me.id);
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ userAId: me.id }, { userBId: me.id }], userA: { blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } } }, userB: { blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } } } },
    orderBy: { updatedAt: 'desc' }, take: 100,
    select: {
      id: true, accepted: true, initiatorId: true, userAId: true, pinnedA: true, pinnedB: true, archivedA: true, archivedB: true, userA: prof, userB: prof,
      messages: { where: vis, orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, kind: true, senderId: true, readAt: true, deliveredAt: true, deletedAt: true, createdAt: true } },
      _count: { select: { messages: { where: { senderId: { not: me.id }, readAt: null, deletedAt: null, ...vis } } } },
    },
  });
  return ok(rows.map((c) => {
    const o = c.userA.id === me.id ? c.userB : c.userA, isA = c.userAId === me.id, m = c.messages[0];
    return {
      id: c.id, accepted: c.accepted, isRequest: !c.accepted && c.initiatorId !== me.id, pinned: isA ? c.pinnedA : c.pinnedB, archived: isA ? c.archivedA : c.archivedB,
      username: o.profile!.username, displayName: o.profile!.displayName, avatarUrl: avatarUrl(o.profile!.avatarPath),
      last: m ? preview(m.deletedAt ? 'DELETED' : m.kind, m.body) : '', lastAt: m?.createdAt ?? null, lastMine: m?.senderId === me.id, lastStatus: m ? statusOf(m) : 'sent', unread: c._count.messages,
    };
  }));
});

// Mutual followers can chat directly; everyone else starts a message request. Following alone is never consent.
export const POST = route(async (req, _c, me) => {
  const { username } = z.object({ username: z.string().min(1) }).parse(await req.json());
  const t = await visibleProfile(me.id, username);
  if (!t || t.userId === me.id) return fail('Member not found', 404);
  const [userAId, userBId] = [me.id, t.userId].sort();
  let c = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (!c) {
    const mutual = (await prisma.follow.count({ where: { OR: [{ followerId: me.id, followingId: t.userId }, { followerId: t.userId, followingId: me.id }] } })) === 2;
    c = await prisma.conversation.create({ data: { userAId, userBId, initiatorId: me.id, accepted: mutual } });
  }
  return ok({ id: c.id });
});
