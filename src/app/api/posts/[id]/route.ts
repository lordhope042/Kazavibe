import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { removeFile } from '@/lib/media';
export const DELETE = route(async (_r, { params }, me) => {
  const p = await prisma.post.findUnique({ where: { id: params.id } });
  if (!p || p.authorId !== me.id) return fail('Post not found', 404);
  await prisma.post.delete({ where: { id: p.id } });
  await removeFile(p.mediaPath);
  return ok({ ok: true });
});
