import { z } from 'zod';
import { prisma } from '@/lib/db';
import { route, ok } from '@/lib/http';
import { hit } from '@/lib/ratelimit';
import { issueOtp, recentlySent } from '@/lib/otp';
import { parseContact } from '@/lib/validators';

// Same answer whether or not the number has an account. SMS costs money, so the limits are tight.
export const POST = route(async (req) => {
  const { phone } = z.object({ phone: z.string().min(7).max(20) }).parse(await req.json());
  const c = parseContact(phone), ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if (c && 'phone' in c && hit('pl-ip:' + ip, 10, 3_600_000) && hit('pl:' + c.phone, 3, 3_600_000)) {
    const u = await prisma.user.findUnique({ where: { phone: c.phone } });
    if (u?.phoneVerifiedAt && u.status !== 'SUSPENDED' && !(await recentlySent(c.phone, 'PHONE_LOGIN'))) {
      try { await issueOtp(c.phone, 'PHONE_LOGIN'); } catch (e) { console.error('SMS failed:', e); }
    }
  }
  return ok({ ok: true });
}, false);
