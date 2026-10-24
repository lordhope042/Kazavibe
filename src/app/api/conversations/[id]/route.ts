import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { removeFile } from '@/lib/media';

const S = z.object({ action: z.enum(['accept', 'decline', 'pin', 'unpin', 'archive', 'unarchive']) });
export const POST = route(async (req, { params }, me) => {
  const { action } = S.parse(await req.json());
  const c = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!c || (c.userAId !== me.id && c.userBId !== me.id)) return fail('Conversation not found', 404);
  const isA = c.userAId === me.id;
  if (action === 'accept' || action === 'decline') {
    if (c.initiatorId === me.id) return fail('Request not found', 404); // only the recipient decides
    if (action === 'accept') await prisma.conversation.update({ where: { id: c.id }, data: { accepted: true } });
    else {
      const files = await prisma.message.findMany({ where: { conversationId: c.id, mediaPath: { not: null } }, select: { mediaPath: true } });
      await prisma.conversation.delete({ where: { id: c.id } });
      await Promise.all(files.map((f) => removeFile(f.mediaPath)));
    }
    return ok({ ok: true });
  }
  // Pin and archive are personal: they only change what this member sees.
  if (action === 'pin') {
    const pinned = await prisma.conversation.count({ where: { OR: [{ userAId: me.id, pinnedA: true }, { userBId: me.id, pinnedB: true }] } });
    if (pinned >= 3) return fail('You can pin up to 3 chats.');
    await prisma.conversation.update({ where: { id: c.id }, data: isA ? { pinnedA: true } : { pinnedB: true } });
  } else if (action === 'unpin') await prisma.conversation.update({ where: { id: c.id }, data: isA ? { pinnedA: false } : { pinnedB: false } });
  else if (action === 'archive') await prisma.conversation.update({ where: { id: c.id }, data: isA ? { archivedA: true, pinnedA: false } : { archivedB: true, pinnedB: false } });
  else await prisma.conversation.update({ where: { id: c.id }, data: isA ? { archivedA: false } : { archivedB: false } });
  return ok({ ok: true });
});
