import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { avatarUrl, getVisiblePost } from '@/lib/posts';
import { blockedBetween } from '@/lib/privacy';
import { notify } from '@/lib/notify';

const sel = { id: true, body: true, createdAt: true, parentId: true, authorId: true, author: { select: { profile: { select: { username: true, displayName: true, avatarPath: true } } } } } as const;
const out = (c: any, me: string, postAuthor: string) => ({ id: c.id, body: c.body, createdAt: c.createdAt, parentId: c.parentId, canDelete: c.authorId === me || postAuthor === me, username: c.author.profile.username, displayName: c.author.profile.displayName, avatarUrl: avatarUrl(c.author.profile.avatarPath) });

export const GET = route(async (_r, { params }, me) => {
  const p = await getVisiblePost(me.id, params.id);
  if (!p) return fail('Post not found', 404);
  const rows = await prisma.comment.findMany({ where: { postId: p.id, status: 'VISIBLE', author: { status: 'ACTIVE', blockedBy: { none: { blockerId: me.id } }, blocking: { none: { blockedId: me.id } } } }, select: sel, orderBy: { createdAt: 'asc' }, take: 200 });
  return ok(rows.map((c) => out(c, me.id, p.authorId)));
});

// One level of replies: replying to a reply attaches to the same top-level comment (the client adds @username).
export const POST = route(async (req, { params }, me) => {
  if (!hit('cmt:' + me.id, 30, 600_000)) return fail('Slow down a little.', 429);
  const b = z.object({ body: z.string().trim().min(1, 'Write something first').max(300), parentId: z.string().optional() }).parse(await req.json());
  const p = await getVisiblePost(me.id, params.id);
  if (!p) return fail('Post not found', 404);
  let parentId: string | null = null, parentAuthor: string | null = null;
  if (b.parentId) {
    const par = await prisma.comment.findFirst({ where: { id: b.parentId, postId: p.id, status: 'VISIBLE' } });
    if (!par || (await blockedBetween(me.id, par.authorId))) return fail('That comment is no longer available.', 404);
    parentId = par.parentId ?? par.id; parentAuthor = par.authorId;
  }
  const c = await prisma.comment.create({ data: { postId: p.id, authorId: me.id, body: b.body, parentId }, select: sel });
  if (parentAuthor) await notify(parentAuthor, me.id, 'reply', p.id);
  if (parentAuthor !== p.authorId) await notify(p.authorId, me.id, 'comment', p.id);
  return ok(out(c, me.id, p.authorId), 201);
});
