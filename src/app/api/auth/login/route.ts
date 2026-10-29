import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verify, createSession } from '@/lib/auth';
import { route, ok, fail } from '@/lib/http';
import { hitDb } from '@/lib/ratelimit';
import { parseContact } from '@/lib/validators';

const S = z.object({ contact: z.string().trim().min(1, 'Enter your email or phone'), password: z.string().min(1, 'Enter your password') });
const BAD = 'Incorrect login details.'; // never reveals whether the account exists

export const POST = route(async (req) => {
  const b = S.parse(await req.json());
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if (!(await hitDb(`login:${ip}:${b.contact.toLowerCase()}`, 8, 15 * 60_000))) return fail('Too many attempts. Try again in a few minutes.', 429);
  const c = parseContact(b.contact);
  if (!c) return fail(BAD, 401);
  const u = await prisma.user.findUnique({ where: 'email' in c ? { email: c.email } : { phone: c.phone } });
  if (!u || !(await verify(b.password, u.passwordHash))) return fail(BAD, 401);
  if (u.status === 'SUSPENDED') return fail('This account is unavailable.', 403);
  await createSession(u.id);
  return ok({ ok: true });
}, false);
