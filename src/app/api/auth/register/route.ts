import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hash, createSession } from '@/lib/auth';
import { route, ok, fail } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { ageOf, parseContact } from '@/lib/validators';
import { issueOtp } from '@/lib/otp';

const S = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(60),
  contact: z.string().trim().min(5).max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  dateOfBirth: z.string().min(1, 'Enter your date of birth'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Accept the Terms and Privacy Policy' }) }),
});

export const POST = route(async (req) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if (!hit('reg:' + ip, 10, 3_600_000)) return fail('Too many attempts. Try again later.', 429);
  const b = S.parse(await req.json());
  const dob = new Date(b.dateOfBirth);
  if (isNaN(+dob) || ageOf(dob) > 120) return fail('Enter a valid date of birth.');
  if (ageOf(dob) < 18) return fail('KazaVibe is for adults 18 and over.', 403); // enforced server-side
  const c = parseContact(b.contact);
  if (!c || !('email' in c)) return fail('Enter a valid email address.'); // email is needed to verify the account
  const base = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 12) || 'member';
  try {
    const u = await prisma.user.create({
      data: { ...c, passwordHash: await hash(b.password), dateOfBirth: dob,
        profile: { create: { displayName: b.name, username: `${base}_${Math.floor(1000 + Math.random() * 9000)}` } } },
    });
    await createSession(u.id);
    let emailSent = true;
    try { await issueOtp(c.email, 'VERIFY'); } catch (e) { console.error('Could not send verification email:', e); emailSent = false; }
    return ok({ ok: true, emailSent }, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return fail('We could not create an account with those details.', 409);
    throw e;
  }
}, false);
