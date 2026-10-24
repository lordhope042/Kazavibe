import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { blockedBetween } from '@/lib/privacy';
import { saveUpload } from '@/lib/media';
import { shapeMsg } from '@/lib/messages';
import { pushMessage } from '@/lib/push';

const KIND = { image: 'IMAGE', video: 'VIDEO', audio: 'VOICE', doc: 'FILE' } as const;

// Voice notes (kind=voice) and file/photo/video attachments in a chat. Same request rules as text messages.
export const POST = route(async (req, { params }, me) => {
  if (!hit('att:' + me.id, 40, 3_600_000)) return fail('You are sending files too fast. Try again later.', 429);
  const c = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!c || (c.userAId !== me.id && c.userBId !== me.id)) return fail('Conversation not found', 404);
  if (await blockedBetween(me.id, c.userAId === me.id ? c.userBId : c.userAId)) return fail('Conversation not found', 404);
  if (!c.accepted) {
    if (c.initiatorId !== me.id) return fail('Accept this request to reply.', 403);
    if ((await prisma.message.count({ where: { conversationId: c.id, senderId: me.id } })) >= 1) return fail('Wait for them to accept your request before sending more.', 403);
  }
  const fd = await req.formData(), file = fd.get('file');
  if (!(file instanceof File)) return fail('Choose a file.');
  const voice = fd.get('kind') === 'voice';
  const { name, kind } = await saveUpload(file, voice ? ['audio'] : ['image', 'video', 'doc']);
  const dur = voice ? Math.min(300, Math.max(0, parseInt(String(fd.get('durationSec') ?? '0'), 10) || 0)) : null;
  const fileName = kind === 'doc' ? file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 100) : null;
  const m = await prisma.message.create({ data: { conversationId: c.id, senderId: me.id, body: '', kind: KIND[kind], mediaPath: name, fileName, durationSec: dur } });
  await prisma.conversation.update({ where: { id: c.id }, data: { updatedAt: new Date(), ...(c.userAId !== me.id ? { archivedA: false } : { archivedB: false }) } }); // a new message brings the chat out of the recipient's archive
  void pushMessage(c.userAId === me.id ? c.userBId : c.userAId, me.profile!.displayName, m.kind, !c.accepted);
  return ok(shapeMsg(m, me.id), 201);
});
