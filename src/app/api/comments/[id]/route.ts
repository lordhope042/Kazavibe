import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
// The comment's author or the post's owner can delete it. Replies under it are removed too.
export const DELETE = route(async (_r, { params }, me) => {
  const c = await prisma.comment.findUnique({ where: { id: params.id }, select: { id: true, authorId: true, post: { select: { authorId: true } } } });
  if (!c || (c.authorId !== me.id && c.post.authorId !== me.id)) return fail('Comment not found', 404);
  await prisma.comment.delete({ where: { id: c.id } });
  return ok({ ok: true });
});
