import fs from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { prisma } from '@/lib/db';
import { route, fail } from '@/lib/http';
import { DIR, DOC_EXT, MIME, NAME_RE } from '@/lib/media';
import { visibleTo } from '@/lib/posts';
import { blockedBetween } from '@/lib/privacy';
import { areMatched, planOf } from '@/lib/plan';

// Private media: every request is authorised against the post/profile it belongs to. Supports Range for video seeking.
export const GET = route(async (req, { params }, me) => {
  const name = String(params.name);
  if (!NAME_RE.test(name)) return fail('Not found', 404);
  let download: string | null = null, noStore = false;
  const avatar = await prisma.profile.findFirst({ where: { avatarPath: name }, select: { userId: true, hidePhoto: true, user: { select: { plan: true, planExpiresAt: true } } } });
  if (avatar) {
    if (await blockedBetween(me.id, avatar.userId)) return fail('Not found', 404);
    // Plus feature: owner's profile photo is visible only to them, staff and matches. The file itself is withheld, not just blurred.
    if (avatar.hidePhoto && planOf(avatar.user) === 'PLUS' && avatar.userId !== me.id && me.role === 'MEMBER' && !(await areMatched(me.id, avatar.userId))) return fail('Not found', 404);
  }
  else {
    const post = await prisma.post.findFirst({ where: { mediaPath: name, ...visibleTo(me.id) }, select: { id: true } });
    if (!post) {
      // Chat attachments: only the two people in the conversation. Staff can never open them.
      const msg = await prisma.message.findFirst({ where: { mediaPath: name, conversation: { OR: [{ userAId: me.id }, { userBId: me.id }] } }, select: { fileName: true, conversation: { select: { userAId: true, userBId: true } } } });
      if (msg) {
        const other = msg.conversation.userAId === me.id ? msg.conversation.userBId : msg.conversation.userAId;
        if (await blockedBetween(me.id, other)) return fail('Not found', 404);
        download = msg.fileName ?? name;
      } else {
        const staffPost = ['ADMIN', 'MODERATOR'].includes(me.role) && (await prisma.post.findUnique({ where: { mediaPath: name }, select: { id: true } }));
        // Verification selfies: administrators only, never cached.
        const selfie = !staffPost && me.role === 'ADMIN' && (await prisma.verification.findFirst({ where: { selfiePath: name }, select: { id: true } }));
        if (!staffPost && !selfie) return fail('Not found', 404);
        if (selfie) noStore = true;
      }
    }
  }
  const file = path.join(DIR, name);
  const st = await stat(file).catch(() => null);
  if (!st) return fail('Not found', 404);
  const h: Record<string, string> = { 'Content-Type': MIME[path.extname(name).slice(1)], 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' };
  if (noStore) h['Cache-Control'] = 'private, no-store';
  if (download && DOC_EXT.includes(path.extname(name).slice(1))) h['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(download)}`;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
  if (m) {
    let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : st.size - 1;
    if (!m[1] && m[2]) { start = Math.max(0, st.size - +m[2]); end = st.size - 1; }
    if (start > end || end >= st.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${st.size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })) as any, { status: 206, headers: { ...h, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)) as any, { headers: { ...h, 'Content-Length': String(st.size) } });
});
