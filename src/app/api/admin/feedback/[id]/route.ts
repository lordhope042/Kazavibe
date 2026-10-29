import { z } from 'zod';
import { prisma } from '@/lib/db';
import { staff, ok, fail } from '@/lib/http';

export const POST = staff(async (req, ctx) => {
  const { handled } = z.object({ handled: z.boolean() }).parse(await req.json());
  const r = await prisma.feedback.updateMany({ where: { id: ctx.params.id }, data: { handled } });
  return r.count ? ok({ ok: true }) : fail('Not found', 404);
});
