import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { getVisiblePost } from '@/lib/posts';
import { notify } from '@/lib/notify';
export const POST = route(async (_r, { params }, me) => {
  const p = await getVisiblePost(me.id, params.id);
  if (!p) return fail('Post not found', 404);
  const key = { postId_userId: { postId: p.id, userId: me.id } };
  if (!(await prisma.like.findUnique({ where: key }))) { await prisma.like.create({ data: { postId: p.id, userId: me.id } }); await notify(p.authorId, me.id, 'like', p.id); }
  return ok({ ok: true });
});
export const DELETE = route(async (_r, { params }, me) => { await prisma.like.deleteMany({ where: { postId: params.id, userId: me.id } }); return ok({ ok: true }); });
