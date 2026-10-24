import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { REPORT_CATEGORIES } from '@/lib/areas';

const S = z.object({ username: z.string().optional(), postId: z.string().optional(), category: z.enum(REPORT_CATEGORIES), details: z.string().max(1000).optional() })
  .refine((v) => v.username || v.postId, 'Nothing to report');

export const POST = route(async (req, _c, me) => {
  if (!hit('report:' + me.id, 20, 3_600_000)) return fail('Too many reports. Try again later.', 429);
  const b = S.parse(await req.json());
  let targetType = 'USER', targetId: string;
  if (b.postId) {
    const p = await prisma.post.findUnique({ where: { id: b.postId } });
    if (!p || p.authorId === me.id) return fail('Post not found', 404);
    targetType = 'POST'; targetId = p.id;
  } else {
    const p = await prisma.profile.findUnique({ where: { username: b.username! } });
    if (!p || p.userId === me.id) return fail('Member not found', 404);
    targetId = p.userId;
  }
  await prisma.report.create({ data: { reporterId: me.id, targetType, targetId, category: b.category, details: b.details } });
  return ok({ ok: true }, 201);
});
