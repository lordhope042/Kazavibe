import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { getVisiblePost } from '@/lib/posts';
export const POST = route(async (_r, { params }, me) => {
  const p = await getVisiblePost(me.id, params.id);
  if (!p) return fail('Post not found', 404);
  await prisma.save.upsert({ where: { postId_userId: { postId: p.id, userId: me.id } }, create: { postId: p.id, userId: me.id }, update: {} });
  return ok({ ok: true });
});
export const DELETE = route(async (_r, { params }, me) => { await prisma.save.deleteMany({ where: { postId: params.id, userId: me.id } }); return ok({ ok: true }); });
