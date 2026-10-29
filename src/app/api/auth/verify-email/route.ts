import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hitDb } from '@/lib/ratelimit';
import { checkOtp } from '@/lib/otp';

export const POST = route(async (req, _c, me) => {
  const { code } = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }).parse(await req.json());
  if (!me.email) return fail('No email on this account.');
  if (me.emailVerifiedAt) return ok({ ok: true });
  if (!(await hitDb('verify:' + me.id, 10, 15 * 60_000))) return fail('Too many attempts. Try again in a few minutes.', 429);
  if (!(await checkOtp(me.email, 'VERIFY', code))) return fail('That code is wrong or has expired.', 400);
  await prisma.user.update({ where: { id: me.id }, data: { emailVerifiedAt: new Date() } });
  return ok({ ok: true });
}, true, true);
