import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hash } from '@/lib/auth';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { checkOtp } from '@/lib/otp';

const S = z.object({
  email: z.string().trim().toLowerCase().email(), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});
export const POST = route(async (req) => {
  const b = S.parse(await req.json());
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if (!hit(`reset:${ip}:${b.email}`, 10, 3_600_000)) return fail('Too many attempts. Try again later.', 429);
  const u = await prisma.user.findUnique({ where: { email: b.email } });
  if (!u || !(await checkOtp(b.email, 'RESET', b.code))) return fail('That code is wrong or has expired.', 400);
  // Changing the password also signs out every existing session (see passwordChangedAt in auth.ts) and proves email ownership.
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hash(b.password), passwordChangedAt: new Date(), emailVerifiedAt: u.emailVerifiedAt ?? new Date() } });
  return ok({ ok: true });
}, false);
