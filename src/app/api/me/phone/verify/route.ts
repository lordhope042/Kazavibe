import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { checkOtp } from '@/lib/otp';
import { parseContact } from '@/lib/validators';

export const POST = route(async (req, _c, me) => {
  const b = z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }).parse(await req.json());
  const c = parseContact(b.phone);
  if (!c || !('phone' in c)) return fail('Enter a valid phone number.');
  if (!hit('phone-v:' + me.id, 10, 900_000)) return fail('Too many attempts. Try again in a few minutes.', 429);
  if (!(await checkOtp(c.phone, 'PHONE_VERIFY', b.code))) return fail('That code is wrong or has expired.');
  try { await prisma.user.update({ where: { id: me.id }, data: { phone: c.phone, phoneVerifiedAt: new Date() } }); }
  catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return fail('That number cannot be used on this account.'); throw e; }
  return ok({ ok: true });
});
