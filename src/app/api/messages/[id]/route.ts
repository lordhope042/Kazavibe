import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { removeFile } from '@/lib/media';
import { blockedBetween } from '@/lib/privacy';

const S = z.object({ action: z.enum(['delete_me', 'delete_all', 'pin', 'unpin']) });
const WINDOW_MS = 48 * 3600_000; // "Delete for everyone" works for 48 hours, like WhatsApp.

export const POST = route(async (req, { params }, me) => {
  const { action } = S.parse(await req.json());
  const m = await prisma.message.findUnique({ where: { id: params.id }, include: { conversation: true } });
  if (!m || (m.conversation.userAId !== me.id && m.conversation.userBId !== me.id)) return fail('Message not found', 404);
  const isA = m.conversation.userAId === me.id, other = isA ? m.conversation.userBId : m.conversation.userAId;
  if (action === 'delete_me') {
    await prisma.message.update({ where: { id: m.id }, data: isA ? { hiddenA: true, pinned: false } : { hiddenB: true, pinned: false } });
  } else if (action === 'delete_all') {
    if (m.senderId !== me.id) return fail('You can only delete your own messages for everyone.', 403);
    if (m.deletedAt) return ok({ ok: true });
    if (Date.now() - m.createdAt.getTime() > WINDOW_MS) return fail('You can delete a message for everyone only within 48 hours.');
    await prisma.message.update({ where: { id: m.id }, data: { deletedAt: new Date(), body: '', pinned: false, mediaPath: null, fileName: null, durationSec: null } });
    await removeFile(m.mediaPath); // the file is erased for both people
  } else if (action === 'pin') {
    if (m.deletedAt) return fail('That message was deleted.');
    if (await blockedBetween(me.id, other)) return fail('Message not found', 404);
    if ((await prisma.message.count({ where: { conversationId: m.conversationId, pinned: true, deletedAt: null } })) >= 3) return fail('You can pin up to 3 messages in a chat.');
    await prisma.message.update({ where: { id: m.id }, data: { pinned: true } });
  } else await prisma.message.update({ where: { id: m.id }, data: { pinned: false } });
  return ok({ ok: true });
});
