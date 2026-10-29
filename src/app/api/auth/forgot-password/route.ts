import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { hitDb } from '@/lib/ratelimit';
import { issueOtp, recentlySent } from '@/lib/otp';

// Always answers the same way, so nobody can use this to find out which emails have accounts.
export const POST = route(async (req) => {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address') }).parse(await req.json());
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if ((await hitDb('fp-ip:' + ip, 15, 3_600_000)) && (await hitDb('fp:' + email, 4, 3_600_000))) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u && u.status !== 'SUSPENDED' && !(await recentlySent(email, 'RESET'))) {
      try { await issueOtp(email, 'RESET'); } catch (e) { console.error('Could not send reset email:', e); }
    }
  }
  return ok({ ok: true });
}, false);
