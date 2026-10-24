import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
const Sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });
export const POST = route(async (req, _c, me) => {
  const s = Sub.parse(await req.json());
  await prisma.pushSub.upsert({ where: { endpoint: s.endpoint }, create: { userId: me.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth }, update: { userId: me.id, p256dh: s.keys.p256dh, auth: s.keys.auth } });
  return ok({ ok: true });
});
export const DELETE = route(async (req, _c, me) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(await req.json());
  await prisma.pushSub.deleteMany({ where: { endpoint, userId: me.id } });
  return ok({ ok: true });
});
