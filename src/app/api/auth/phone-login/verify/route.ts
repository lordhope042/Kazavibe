import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { route, ok, fail } from '@/lib/http';
import { hitDb } from '@/lib/ratelimit';
import { checkOtp } from '@/lib/otp';
import { parseContact } from '@/lib/validators';

export const POST = route(async (req) => {
  const b = z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }).parse(await req.json());
  const c = parseContact(b.phone), ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if (!(await hitDb(`pl-v:${ip}`, 20, 900_000))) return fail('Too many attempts. Try again in a few minutes.', 429);
  const BAD = 'That code is wrong or has expired.';
  if (!c || !('phone' in c)) return fail(BAD);
  const u = await prisma.user.findUnique({ where: { phone: c.phone } });
  if (!u?.phoneVerifiedAt || u.status === 'SUSPENDED' || !(await checkOtp(c.phone, 'PHONE_LOGIN', b.code))) return fail(BAD);
  await createSession(u.id);
  return ok({ ok: true });
}, false);
