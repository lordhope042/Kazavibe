import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { blockedBetween } from '@/lib/privacy';
import { avatarUrl } from '@/lib/posts';
import { preview, shapeMsg, statusOf, visibleMsg } from '@/lib/messages';
import { pushMessage } from '@/lib/push';

async function load(id: string, me: string) {
  const c = await prisma.conversation.findUnique({ where: { id }, include: { userA: { select: { id: true, profile: true } }, userB: { select: { id: true, profile: true } } } });
  if (!c || (c.userAId !== me && c.userBId !== me)) return null;
  const o = c.userA.id === me ? c.userB : c.userA;
  if (await blockedBetween(me, o.id)) return null;
  return { c, o };
}

export const GET = route(async (req, { params }, me) => {
  const x = await load(params.id, me.id);
  if (!x) return fail('Conversation not found', 404);
  const after = new URL(req.url).searchParams.get('after'), vis = visibleMsg(me.id), now = new Date();
  // Opening the chat = delivered + read for everything they sent me.
  await prisma.message.updateMany({ where: { conversationId: x.c.id, senderId: { not: me.id }, deliveredAt: null }, data: { deliveredAt: now } });
  await prisma.message.updateMany({ where: { conversationId: x.c.id, senderId: { not: me.id }, readAt: null }, data: { readAt: now } });
  const rows = after
    ? await prisma.message.findMany({ where: { conversationId: x.c.id, createdAt: { gt: new Date(after) }, ...vis }, orderBy: { createdAt: 'asc' }, take: 100 })
    : (await prisma.message.findMany({ where: { conversationId: x.c.id, ...vis }, orderBy: { createdAt: 'desc' }, take: 100 })).reverse();
  const [recent, pins] = await Promise.all([
    prisma.message.findMany({ where: { conversationId: x.c.id, ...vis }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, readAt: true, deliveredAt: true, deletedAt: true, pinned: true } }),
    prisma.message.findMany({ where: { conversationId: x.c.id, pinned: true, deletedAt: null, ...vis }, orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, kind: true, body: true } }),
  ]);
  return ok({
    conv: { id: x.c.id, accepted: x.c.accepted, isRequest: !x.c.accepted && x.c.initiatorId !== me.id, username: x.o.profile!.username, displayName: x.o.profile!.displayName, avatarUrl: avatarUrl(x.o.profile!.avatarPath) },
    messages: rows.map((m) => shapeMsg(m, me.id)),
    updates: recent.map((m) => ({ id: m.id, status: statusOf(m), deleted: !!m.deletedAt, pinned: m.pinned && !m.deletedAt })), // ticks, deletions and pins on messages already on screen
    pins: pins.map((p) => ({ id: p.id, text: preview(p.kind, p.body) })),
  });
});

export const POST = route(async (req, { params }, me) => {
  if (!hit('msg:' + me.id, 30, 60_000)) return fail('You are sending messages too fast.', 429);
  const { body } = z.object({ body: z.string().trim().min(1).max(1000) }).parse(await req.json());
  const x = await load(params.id, me.id);
  if (!x) return fail('Conversation not found', 404);
  if (!x.c.accepted) {
    if (x.c.initiatorId !== me.id) return fail('Accept this request to reply.', 403);
    if ((await prisma.message.count({ where: { conversationId: x.c.id, senderId: me.id } })) >= 1) return fail('Wait for them to accept your request before sending more.', 403);
  }
  const m = await prisma.message.create({ data: { conversationId: x.c.id, senderId: me.id, body } });
  await prisma.conversation.update({ where: { id: x.c.id }, data: { updatedAt: new Date(), ...(x.c.userAId !== me.id ? { archivedA: false } : { archivedB: false }) } }); // a new message brings the chat out of the recipient's archive
  void pushMessage(x.o.id, me.profile!.displayName, 'TEXT', !x.c.accepted);
  return ok(shapeMsg(m, me.id), 201);
});
