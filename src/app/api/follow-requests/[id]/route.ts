import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { notify } from '@/lib/notify';

export const POST = route(async (req, { params }, me) => {
  const { action } = z.object({ action: z.enum(['approve', 'decline']) }).parse(await req.json());
  const r = await prisma.followRequest.findUnique({ where: { id: params.id } });
  if (!r || r.toId !== me.id) return fail('Request not found', 404); // only the recipient may act
  await prisma.$transaction([
    ...(action === 'approve' ? [prisma.follow.upsert({ where: { followerId_followingId: { followerId: r.fromId, followingId: me.id } }, create: { followerId: r.fromId, followingId: me.id }, update: {} })] : []),
    prisma.followRequest.delete({ where: { id: r.id } }),
  ]);
  if (action === 'approve') await notify(r.fromId, me.id, 'request_approved');
  return ok({ ok: true });
});
