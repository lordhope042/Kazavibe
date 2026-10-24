import { randomInt } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { removeFile } from '@/lib/media';

const latest = (userId: string) => prisma.verification.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
export const GET = route(async (_r, _c, me) => {
  const v = await latest(me.id);
  return ok({ verified: me.profile!.verified, status: v?.status ?? null, code: v?.status === 'STARTED' ? v.code : null, reason: v?.status === 'REJECTED' ? v.reason : null });
});

// Step 1: the member agrees to the terms and gets a random code to write on paper and hold in the selfie.
export const POST = route(async (req, _c, me) => {
  z.object({ consent: z.literal(true, { errorMap: () => ({ message: 'You must agree before starting.' }) }) }).parse(await req.json());
  if (me.profile!.verified) return fail('You are already verified.');
  const v = await latest(me.id);
  if (v?.status === 'PENDING') return fail('Your verification is being reviewed.');
  if (v?.status === 'STARTED' && Date.now() - v.createdAt.getTime() < 3600_000) return ok({ code: v.code });
  if (!hit('ver:' + me.id, 5, 86_400_000)) return fail('Too many attempts today. Try again tomorrow.', 429);
  const n = await prisma.verification.create({ data: { userId: me.id, code: String(randomInt(1000, 10000)), consentAt: new Date() } });
  return ok({ code: n.code });
});

export const DELETE = route(async (_r, _c, me) => {
  const rows = await prisma.verification.findMany({ where: { userId: me.id, status: { in: ['STARTED', 'PENDING'] } } });
  await prisma.verification.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await Promise.all(rows.map((r) => removeFile(r.selfiePath)));
  return ok({ ok: true });
});
